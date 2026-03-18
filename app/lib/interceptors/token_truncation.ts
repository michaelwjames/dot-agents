import type { ToolInterceptor } from './base.js';
import { TokenTracker } from '../analytics/token_tracker.js';
import fs from 'fs-extra';
import path from 'path';

/**
 * Interceptor that saves large tool outputs to files to save context tokens.
 */
export class TokenTruncationInterceptor implements ToolInterceptor {
  private tokenTracker: TokenTracker;
  private threshold: number;
  private outputDir: string;

  constructor(tokenTracker: TokenTracker, threshold = 2000, outputDir = 'data/large_outputs') {
    this.tokenTracker = tokenTracker;
    this.threshold = threshold;
    this.outputDir = outputDir;
    fs.ensureDirSync(this.outputDir);
  }

  async postExecute(toolName: string, args: any, result: string): Promise<string> {
    // Basic heuristic: check string length before doing expensive tokenization
    if (result.length < this.threshold * 2) return result;

    const tokens = this.tokenTracker.countTokens(result);
    if (tokens <= this.threshold) return result;

    const filename = `large_output_${Date.now()}_input.txt`;
    const filepath = path.join(this.outputDir, filename);
    await fs.writeFile(filepath, result);

    const message = `[TRUNCATED] Output was too large (${tokens} tokens) and has been saved to ${filepath}. Use display_large_output or read-file to see the full content.`;
    return JSON.stringify({
      stdout: message,
      _filepath: filepath,
      _truncated: true,
      _originalTokens: tokens
    });
  }
}
