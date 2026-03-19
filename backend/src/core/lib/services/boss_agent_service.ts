import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { GroqProvider } from '../core/groq_provider.js';
import { FileSystem } from '../data/file_system.js';
import { ToolRegistry } from '../tools.js';
import { TokenTracker } from '../analytics/token_tracker.js';
import { getEncoding } from 'js-tiktoken';
import { log } from '../utils/logger.js';
import { sanitizeHistory, stripInternalFields } from "../history_sanitizer.js";
import { MemoryCompressor } from './compressor.js';

const enc = getEncoding('cl100k_base');

export interface NormalizedMessage {
  sessionId: string;
  authorId: string;
  authorTag: string;
  content: string;
  attachments?: { url: string; contentType?: string; buffer?: Buffer }[];
  reply: (content: string) => Promise<any>;
  send: (content: string) => Promise<any>;
  sendTyping?: () => Promise<void>;
}

export class BossAgentService {
  private groq: GroqProvider;
  private fileSystem: FileSystem;
  private tools: ToolRegistry;
  private tokenTracker: TokenTracker;
  private compressor: MemoryCompressor;
  private groqModels: string[];
  private maxToolRounds: number;

  constructor(
    groq: GroqProvider,
    fileSystem: FileSystem,
    tools: ToolRegistry,
    tokenTracker: TokenTracker,
    compressor: MemoryCompressor,
    groqModels: string[],
    maxToolRounds: number = 10
  ) {
    this.groq = groq;
    this.fileSystem = fileSystem;
    this.tools = tools;
    this.tokenTracker = tokenTracker;
    this.compressor = compressor;
    this.groqModels = groqModels;
    this.maxToolRounds = maxToolRounds;
  }

  async processMessage(message: NormalizedMessage): Promise<any> {
    const { sessionId } = message;
    let toolExecutionHistory: Array<{ name: string, args: string }> = [];

    try {
      let userText: string | null = null;

      // Handle voice/audio attachments — transcribe via Groq Whisper
      const audioAttachment = message.attachments?.find(a => {
        const ct = a.contentType || '';
        return ct.startsWith('audio/') || ct.includes('ogg') || ct.includes('webm');
      });

      if (audioAttachment) {
        const tempPath = path.join(tmpdir(), `boss_audio_${Date.now()}.ogg`);
        let buffer: Buffer;

        if (audioAttachment.buffer) {
          buffer = audioAttachment.buffer;
        } else {
          const response = await fetch(audioAttachment.url);
          buffer = Buffer.from(await response.arrayBuffer());
        }

        await writeFile(tempPath, buffer);

        try {
          userText = await this.groq.transcribe(tempPath);
          await message.reply(`🎤 *I heard:* "${userText}"`);
        } finally {
          await unlink(tempPath).catch(() => { });
        }
      }

      // Handle text content
      if (message.content) {
        userText = message.content;
      }

      // Skip if no processable content
      if (!userText) return;

      // Send typing indicator
      if (message.sendTyping) {
        await message.sendTyping();
      }

      // Load context
      const soulPrompt = await this.fileSystem.loadSoulPrompt();
      const fileIndex = await this.fileSystem.getFileSystemIndex();
      const history = await this.fileSystem.loadSession(sessionId);

      const baseSystemPrompt = `You are the "Boss Agent," a strictly obedient but personality-rich AI assistant.

CORE RULES:
1. Always address the user as "Boss."
2. For Jules AI agent operations (list sessions, get session, list activities, send message, approve plan, etc.), ALWAYS use the 'jules' tool — never run jules-* make targets directly via 'run_make'.
3. For all other operations, use 'run_make' with a predefined make target. You cannot run arbitrary shell commands.
4. You can save notes to memory using 'write_note'.
5. You have access to a lightweight index of files in vault/, memory/, and skills/ directories. Files marked with [ALWAYS_REMEMBER] are especially important.
6. Use the 'read_memory' tool to fetch the full content of any file from the index if you need it to answer the Boss.
7. Keep your responses concise and action-oriented unless the Boss asks for detail.
8. If the Boss sent a voice note, you received the transcribed text. Confirm what you heard before acting on ambiguous commands.
9. If you receive a [SYSTEM: KAIROS_TICK] message, you are waking up autonomously. Review your current context (especially tasks in memory and active Jules sessions). If nothing requires attention, reply with exactly 'NO_ACTION_REQUIRED' to prevent spamming the chat. If action is needed, use your tools or send a proactive message.

${soulPrompt ? `PERSONALITY:\n${soulPrompt}\n` : ''}`;

      const sessionContextPrompt = `--- SESSION CONTEXT ---
AVAILABLE FILES:
${fileIndex}

SYSTEM SNAPSHOT:
- Session ID: ${sessionId}
- Current Model: ${this.groqModels[0] || 'llama-3.3-70b-versatile'}
- Memory Location: data/memory/
- Vault Location: data/vault/
`;

      // Token-aware sliding window
      const MAX_CONTEXT_TOKENS = 6000;
      const HEADROOM = 1000;

      let currentTokens = enc.encode(baseSystemPrompt).length +
        enc.encode(sessionContextPrompt).length +
        enc.encode(userText).length + 500;

      let historyToInclude: any[] = [];
      let historyTokens = 0;
      let limitReached = false;
      for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        const msgTokens = enc.encode(msg.content || JSON.stringify(msg.tool_calls || '')).length;
        if (currentTokens + historyTokens + msgTokens > MAX_CONTEXT_TOKENS) {
          limitReached = true;
          break;
        }
        historyTokens += msgTokens;
        historyToInclude.unshift(msg);
      }

      if (limitReached) {
        while (historyToInclude.length > 1 && (currentTokens + historyTokens > (MAX_CONTEXT_TOKENS - HEADROOM))) {
          const dropped = historyToInclude.shift();
          const droppedTokens = enc.encode(dropped.content || JSON.stringify(dropped.tool_calls || '')).length;
          historyTokens -= droppedTokens;
        }
        log(`[CACHE_OPT] Limit reached. Truncated history to ${historyToInclude.length} messages.`);
      }

      let messages: any[] = [
        { role: 'system', content: baseSystemPrompt },
        ...historyToInclude,
        { role: 'system', content: sessionContextPrompt },
        { role: 'user', content: userText }
      ];

      const toolDefs = this.tools.getDefinitions();

      const currentModel = this.groqModels[0] || 'llama-3.3-70b-versatile';
      const contextStats = this.tokenTracker.calculateContextStats(
        baseSystemPrompt + sessionContextPrompt,
        historyToInclude,
        userText,
        toolDefs,
        currentModel
      );

      log(`[TOKEN] Context: ${contextStats.currentContextTokens} tokens`);

      let responseMessage = await this.safeChat(messages, toolDefs, 'main');
      this.tokenTracker.logRequest(contextStats.currentContextTokens);

      responseMessage = this.parseInlineToolCalls(responseMessage);
      let shouldSendFinalResponse = true;

      let toolRound = 0;
      while (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        if (toolRound >= this.maxToolRounds) {
          log(`[TOOL] Maximum tool rounds reached.`);
          break;
        }
        toolRound++;

        const currentToolCalls = responseMessage.tool_calls.map((tc: any) => ({
          name: tc.function.name,
          args: tc.function.arguments
        }));

        const repeatCount = toolExecutionHistory.filter((h, idx) => {
          const recentHistory = toolExecutionHistory.slice(Math.max(0, idx - 2));
          return recentHistory.some((h: any) =>
            currentToolCalls.some((ct: any) => ct.name === h.name && ct.args === h.args)
          );
        }).length;

        if (repeatCount >= 3) {
          log(`[LOOP_DETECTION] Detected repeated tool execution pattern.`);
          responseMessage.tool_calls = [];
          responseMessage.content = 'Error: I detected a loop in tool execution.';
          break;
        }

        for (const tc of currentToolCalls) {
          toolExecutionHistory.push({ name: tc.name, args: tc.args });
        }
        if (toolExecutionHistory.length > 20) {
          toolExecutionHistory = toolExecutionHistory.slice(-20);
        }

        messages.push(responseMessage);

        const toolResults = await Promise.all(
          responseMessage.tool_calls.map(async (toolCall: any) => {
            const { name, arguments: argsString } = toolCall.function;
            const args = JSON.parse(argsString);
            log(`[TOOL] Executing ${name} with args:`, args);
            const result = await this.tools.execute(name, args, { sessionId, send: message.send });
            return {
              role: "tool",
              tool_call_id: toolCall.id,
              name,
              content: result,
            };
          })
        );

        const filteredToolResults = toolResults.filter(tr => {
          try {
            const parsed = JSON.parse(tr.content);
            return parsed.stdout !== "__NO_RESPONSE_NEEDED__";
          } catch {
            return true;
          }
        });

        const hasNoResponseTool = toolResults.some(tr => {
          try {
            const parsed = JSON.parse(tr.content);
            return parsed.stdout === "__NO_RESPONSE_NEEDED__";
          } catch {
            return false;
          }
        });

        if (hasNoResponseTool) {
          shouldSendFinalResponse = false;
          break;
        }

        if (filteredToolResults.length > 0) {
          messages.push(...filteredToolResults.map(tr => ({ ...tr, content: stripInternalFields(tr.content) })));
          if (message.sendTyping) {
            await message.sendTyping();
          }
          responseMessage = await this.safeChat(messages, toolDefs, `tool_round_${toolRound}`);
          responseMessage = this.parseInlineToolCalls(responseMessage);
        } else {
          shouldSendFinalResponse = false;
          break;
        }
      }

      const replyText = responseMessage.content || 'Done, Boss. No further output.';

      if (!shouldSendFinalResponse) {
        log(`[PROCESSOR] Skipping final response due to no-response pattern.`);
        return;
      }

      if (replyText.trim() === 'NO_ACTION_REQUIRED') {
        log(`[PROCESSOR] LLM requested silent output.`);
      } else {
        if (replyText.length <= 2000) {
          await message.reply(replyText);
        } else {
          const chunks = this.splitMessage(replyText, 2000);
          for (const chunk of chunks) {
            await message.send(chunk);
          }
        }
      }

      messages.push(responseMessage);
      const updatedHistory = messages.filter((m: any, index: number) => {
        if (index === 0 && m.role === 'system') return false;
        return true;
      }).slice(-50);

      await this.fileSystem.saveSession(sessionId, sanitizeHistory(updatedHistory));

      if (this.compressor) {
        const historyTokens = updatedHistory.reduce((sum, m) => sum + enc.encode(m.content || JSON.stringify(m.tool_calls || '')).length, 0);
        if (updatedHistory.length > 20 || historyTokens > 4000) {
          this.compressor.compressSession(sessionId, updatedHistory).catch((err: any) => console.error(`[COMPRESSOR] Error in background compression:`, err));
        }
      }

      const rateLimitStats = this.tokenTracker.getRateLimitStats(currentModel);
      return {
        inputTokens: contextStats.currentContextTokens,
        outputTokens: contextStats.estimatedResponseTokens,
        model: rateLimitStats.model,
        systemPromptTokens: contextStats.systemPromptTokens,
        historyTokens: contextStats.historyTokens,
        userMessageTokens: contextStats.userMessageTokens,
        toolDefinitionTokens: contextStats.toolDefinitionsTokens,
        percentOfContextWindow: contextStats.percentOfContextWindow,
        tpmUsed: rateLimitStats.percentOfTPM,
        tpdUsed: rateLimitStats.percentOfTPD
      };

    } catch (error: any) {
      console.error('Error handling message:', error);
      try {
        await message.reply(`Sorry Boss, I hit a snag: ${error.message}`);
      } catch (sendError) {
        console.error('Could not send error message:', sendError);
      }
      return {
        error: error.message,
        model: this.groqModels[0] || 'llama-3.3-70b-versatile'
      };
    }
  }

  private async safeChat(msgs: any[], defs: any[], callType: string = 'main'): Promise<any> {
    let attempts = 0;
    while (attempts < 3) {
      try {
        return await this.groq.chat(msgs, defs);
      } catch (err: any) {
        if (err?.status === 400 && err?.error?.error?.code === 'tool_use_failed') {
          attempts++;
          console.warn(`[WARN] Model hallucinated tool call (attempt ${attempts}). Retrying...`);
          msgs.push({
            role: 'user',
            content: 'CRITICAL ERROR: Your previous response caused a "tool_use_failed" error. You MUST output strictly valid JSON matching the tool schema. Do NOT output raw markdown or text.'
          });
          continue;
        }
        throw err;
      }
    }
    throw new Error('Max retries exceeded for tool calls.');
  }

  private parseInlineToolCalls(msg: any) {
    if (!msg.content) return msg;

    const inlineToolCalls = [];
    let cleanedContent = msg.content;

    const functionRegex1 = /<function\/([^>]+)>([\s\S]*?)<\/function>/g;
    let match;
    while ((match = functionRegex1.exec(msg.content)) !== null) {
      const name = match[1];
      const argsString = match[2].trim();

      try {
        JSON.parse(argsString);
        inlineToolCalls.push({
          id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'function',
          function: {
            name,
            arguments: argsString
          }
        });
        cleanedContent = cleanedContent.replace(match[0], '').trim();
      } catch (e) {
        console.warn(`[WARN] Failed to parse inline tool call JSON for ${name}`);
      }
    }

    const functionRegex2 = /<function\/([^=]+)=/g;
    while ((match = functionRegex2.exec(msg.content)) !== null) {
      const name = match[1];
      const startIdx = match.index + match[0].length;

      let depth = 0;
      let endIdx = startIdx;
      let foundStart = false;

      for (let i = startIdx; i < msg.content.length; i++) {
        const char = msg.content[i];
        if (char === '{') {
          depth++;
          foundStart = true;
        } else if (char === '}') {
          depth--;
          if (foundStart && depth === 0) {
            endIdx = i + 1;
            break;
          }
        }
      }

      if (foundStart && depth === 0) {
        const argsString = msg.content.substring(startIdx, endIdx);
        try {
          JSON.parse(argsString);
          inlineToolCalls.push({
            id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'function',
            function: {
              name,
              arguments: argsString
            }
          });
          const fullMatch = msg.content.substring(match.index, endIdx);
          cleanedContent = cleanedContent.replace(fullMatch, '').trim();
        } catch (e) {
          console.warn(`[WARN] Failed to parse inline tool call JSON for ${name}`);
        }
      }
    }

    if (inlineToolCalls.length > 0) {
      msg.tool_calls = (msg.tool_calls || []).concat(inlineToolCalls);
      msg.content = cleanedContent || null;
    }
    return msg;
  }

  private splitMessage(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > maxLength) {
      let splitIndex = remaining.lastIndexOf('\n', maxLength);
      if (splitIndex === -1 || splitIndex < maxLength / 2) {
        splitIndex = maxLength;
      }
      chunks.push(remaining.slice(0, splitIndex));
      remaining = remaining.slice(splitIndex).trimStart();
    }

    if (remaining.length > 0) {
      chunks.push(remaining);
    }

    return chunks;
  }
}
