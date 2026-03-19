import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, Message } from 'discord.js';
import { readdir } from 'fs/promises';
import { GroqProvider } from './core/lib/core/groq_provider.js';
import { FileSystem } from './core/lib/data/file_system.js';
import { ToolRegistry } from './core/lib/tools.js';
import { TokenTracker } from './core/lib/analytics/token_tracker.js';
import { Nomenclature } from './core/lib/utils/nomenclature.js';
import { TokenTruncationInterceptor } from './core/lib/interceptors/token_truncation.js';
import { LoggingInterceptor } from './core/lib/interceptors/logging.js';
import { MemoryCompressor } from './core/lib/services/compressor.js';
import { KairosEngine } from './core/lib/engine/kairos.js';
import { log } from './core/lib/utils/logger.js';
import { TerminalAdapter } from './core/lib/adapters/terminal.js';
import { ConsoleInterceptor } from './core/lib/utils/console_interceptor.js';
import { BossAgentService, NormalizedMessage } from './core/lib/services/boss_agent_service.js';

// Initialize console logging to files - this captures ALL console output
ConsoleInterceptor.getInstance().intercept();

// --- Configuration ---
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const TERMINAL_MODE = process.env.TERMINAL_MODE === 'true';
const KAIROS_ENABLED = process.env.KAIROS_ENABLED !== 'false';
const COMPRESSION_ENABLED = process.env.COMPRESSION_ENABLED !== 'false';
const MAX_TOOL_ROUNDS = parseInt(process.env.MAX_TOOL_ROUNDS || '10', 10);

// In terminal mode, Discord token is optional
if (!TERMINAL_MODE && !DISCORD_BOT_TOKEN) {
  console.error('Error: DISCORD_BOT_TOKEN is not set in environment variables.');
  process.exit(1);
}
if (!GROQ_API_KEY) {
  console.error('Error: GROQ_API_KEY is not set in environment variables.');
  process.exit(1);
}

const groqModels = [
  process.env.GROQ_MODEL,
  process.env.GROQ_MODEL_2,
  process.env.GROQ_MODEL_3
].filter(Boolean) as string[];

const groq = new GroqProvider(GROQ_API_KEY, groqModels.length > 0 ? groqModels : undefined, process.env.GROQ_WHISPER_MODEL);
const fileSystem = new FileSystem();
const nomenclature = new Nomenclature();
const tokenTracker = new TokenTracker();
const tools = new ToolRegistry(fileSystem, nomenclature, tokenTracker);
tools.addInterceptor(new TokenTruncationInterceptor(tokenTracker));
tools.addInterceptor(new LoggingInterceptor());
const compressor = new MemoryCompressor(groq, fileSystem);
const bossAgentService = new BossAgentService(
  groq,
  fileSystem,
  tools,
  tokenTracker,
  compressor,
  groqModels,
  MAX_TOOL_ROUNDS
);

// --- Lane Queue Management ---
const sessionQueues = new Map<string, Promise<void>>();

async function enqueueTask(sessionId: string, task: () => Promise<void>) {
  const previousTask = sessionQueues.get(sessionId) || Promise.resolve();
  const newTask = previousTask.then(async () => {
    try {
      await task();
    } catch (err) {
      console.error(`[QUEUE] Error in session ${sessionId}:`, err);
    }
  });
  sessionQueues.set(sessionId, newTask);
}

// Load Nomenclature catalog on startup
nomenclature.loadCatalog().catch((err: any) => console.error('Nomenclature load failed:', err));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel], // Required for DM support
});

/**
 * Core reasoning and execution loop
 */
async function processMessage(message: NormalizedMessage) {
  return bossAgentService.processMessage(message);
}

// --- Kairos Engine Initialization ---
const kairos = new KairosEngine(async (tickMsg) => {
  // Discover active sessions by reading session_history/
  const sessionDir = './data/session_history';
  try {
    const files = await readdir(sessionDir);
    // Exclude archived sessions (pattern: {id}_{ISO_TIMESTAMP}.json)
    const sessionIds = files
      .filter(f => f.endsWith('.json') && !/_\d{4}-/.test(f))
      .map(f => f.replace('.json', ''));

    log(`[KAIROS] Firing tick for ${sessionIds.length} sessions.`);
    
    for (const sessionId of sessionIds) {
      // Map the generic tick message to a specific session
      const sessionMsg: NormalizedMessage = {
        ...tickMsg,
        sessionId,
        reply: async (content) => {
          console.log(`\n[BOSS] ${content}\n`);
          try {
            const channel = await client.channels.fetch(sessionId);
            if (channel && 'send' in channel) {
              return await (channel as any).send(content);
            }
          } catch (err) {
            console.error(`[KAIROS] Failed to send reply to session ${sessionId}:`, err);
          }
        },
        send: async (content) => {
          console.log(`\n[BOSS] ${content}\n`);
          try {
            const channel = await client.channels.fetch(sessionId);
            if (channel && 'send' in channel) {
              return await (channel as any).send(content);
            }
          } catch (err) {
            console.error(`[KAIROS] Failed to send to session ${sessionId}:`, err);
          }
        },
        sendTyping: async () => {
          try {
            const channel = await client.channels.fetch(sessionId);
            if (channel && 'sendTyping' in channel) {
              await (channel as any).sendTyping();
            }
          } catch {}
        }
      };

      enqueueTask(sessionId, () => processMessage(sessionMsg));
    }
  } catch (err) {
    console.error(`[KAIROS] Error discovering sessions:`, err);
  }
});

// --- Message Handler ---
client.on('messageCreate', async (message: Message) => {
  if (message.author.bot) return;

  const sessionId = String(message.channel.id);

  // Log incoming message to terminal
  console.log(`\n[USER] ${message.author.tag}: ${message.content}${message.attachments.size > 0 ? ` [${message.attachments.size} attachment(s)]` : ''}\n`);

  const normalized: NormalizedMessage = {
    sessionId,
    authorId: message.author.id,
    authorTag: message.author.tag,
    content: message.content,
    attachments: message.attachments.map(a => ({ url: a.url, contentType: a.contentType || undefined })),
    reply: async (content: string) => {
      console.log(`\n[BOSS] ${content}\n`);
      return await message.reply(content);
    },
    send: async (content: string) => {
      console.log(`\n[BOSS] ${content}\n`);
      if (message.channel.isTextBased()) {
        return await (message.channel as any).send(content);
      }
      throw new Error('Channel does not support sending messages');
    },
    sendTyping: () => {
      if (message.channel.isTextBased()) {
        return (message.channel as any).sendTyping();
      }
    }
  };

  enqueueTask(sessionId, () => processMessage(normalized));
});

client.once('ready', () => {
  if (client.user) {
    log(`Boss Agent is online as ${client.user.tag}`);
    if (KAIROS_ENABLED) {
      log('[FEATURE] Kairos proactive mode enabled');
      kairos.start();
    } else {
      log('[FEATURE] Kairos proactive mode disabled - running in reactive mode only');
    }
  }
});

// --- Terminal Mode ---
if (TERMINAL_MODE) {
  log('[TERMINAL] Starting in terminal mode...');
  
  // Create terminal adapter for a single session
  const terminalSessionId = 'terminal-session';
  const terminalAdapter = new TerminalAdapter(terminalSessionId, processMessage);
  
  terminalAdapter.start();
} else {
  // Discord mode
  client.login(DISCORD_BOT_TOKEN);
}
