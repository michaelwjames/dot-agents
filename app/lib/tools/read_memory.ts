import { Tool, ToolDefinition } from './base.js';
import { FileSystem } from '../data/file_system.js';
import { log } from '../utils/logger.js';

/**
 * Tool to read the full content of a file from the vault, memory, or skills directory.
 */
export class ReadMemoryTool implements Tool {
  private fs: FileSystem;
  private static recentReads = new Map<string, number>();
  private static maxRecentReads = 50;

  readonly definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'read_memory',
      description: 'Read the full content of a file from the vault, memory, or skills directory.',
      parameters: {
        type: 'object',
        properties: {
          filename: {
            type: 'string',
            description: "The name of the file to read (e.g., 'project_plan.md').",
          },
        },
        required: ['filename'],
      },
    },
  };

  constructor(fs: FileSystem) {
    this.fs = fs;
  }

  async execute(args: any): Promise<string> {
    const filename = args.filename;

    // Check for repeated reads of the same file (loop detection)
    const readCount = ReadMemoryTool.recentReads.get(filename) || 0;
    ReadMemoryTool.recentReads.set(filename, readCount + 1);

    // Clean up old entries
    if (ReadMemoryTool.recentReads.size > ReadMemoryTool.maxRecentReads) {
      const oldest = Array.from(ReadMemoryTool.recentReads.keys())[0];
      ReadMemoryTool.recentReads.delete(oldest);
    }

    // Detect loop: if reading the same file 3+ times, stop
    if (readCount >= 3) {
      log(`[LOOP_DETECTION] Detected repeated reads of file: ${filename} (${readCount} times). Stopping loop.`);
      return `Error: You are repeatedly reading the same file "${filename}". This file contains large content that was previously truncated. Please use shell commands to filter/search instead: cat ${filename} | grep "pattern"`;
    }

    try {
      return await this.fs.readFileContent(args.filename);
    } catch (error: any) {
      return `Error: ${error.message}`;
    }
  }
}
