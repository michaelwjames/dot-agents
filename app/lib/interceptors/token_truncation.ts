import { ToolInterceptor } from './base.js';
import { TokenTracker } from '../analytics/token_tracker.js';
import fs from 'fs-extra';
import path from 'path';
import { log } from '../utils/logger.js';

/**
 * Interceptor that saves large tool outputs to files instead of truncating them.
 * Default threshold is 2000 tokens.
 */
export class TokenTruncationInterceptor implements ToolInterceptor {
  private tokenTracker: TokenTracker;
  private threshold: number;
  private projectRoot: string;
  private recentTruncatedFiles = new Set<string>();
  private maxRecentFiles = 100;

  constructor(tokenTracker: TokenTracker, threshold = 2000) {
    this.tokenTracker = tokenTracker;
    this.threshold = threshold;
    this.projectRoot = path.resolve();
  }

  async postExecute(toolName: string, args: any, result: string): Promise<string> {
    // Never truncate read_memory output — it causes an infinite loop where
    // the LLM reads the truncated file, which gets truncated again to a new file, etc.
    if (toolName === 'read_memory') {
      return result;
    }

    const tokenCount = this.tokenTracker.countTokens(result);

    if (tokenCount > this.threshold) {
      log(`[TRUNCATION] Tool "${toolName}" output (${tokenCount} tokens) exceeds threshold (${this.threshold}). Saving to file...`);
      
      // Save the large output to a file
      const outputDir = path.join(this.projectRoot, 'data', 'large_outputs');
      await fs.ensureDir(outputDir);
      
      const outputFilename = `${toolName}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.txt`;
      const filepath = path.join(outputDir, outputFilename);
      
      await fs.writeFile(filepath, result, 'utf-8');
      
      // Track this file as recently truncated
      this.recentTruncatedFiles.add(outputFilename);
      if (this.recentTruncatedFiles.size > this.maxRecentFiles) {
        const oldest = Array.from(this.recentTruncatedFiles)[0];
        this.recentTruncatedFiles.delete(oldest);
      }
      
      const contentLength = result.length;
      
      return `[LARGE OUTPUT SAVED]
Tool: ${toolName}
File: data/large_outputs/${outputFilename}
Size: ${contentLength} characters (${tokenCount} tokens)

The large output has been saved to a file to avoid consuming ${tokenCount} tokens from your context budget.

You can:
1. Use 'read_memory' to read specific sections: read_memory with filename "large_outputs/${outputFilename}"
2. Use shell commands to filter/search: cat data/large_outputs/${outputFilename} | grep "pattern"
3. View the file directly in your IDE

First 500 characters preview:
${result.slice(0, 500)}...`;
    }

    return result;
  }

  // Check if a filename was recently created by truncation
  isRecentlyTruncated(filename: string): boolean {
    const cleanFilename = filename.replace(/^data\/large_outputs\//, '').replace(/^large_outputs\//, '');
    return this.recentTruncatedFiles.has(cleanFilename);
  }
}
