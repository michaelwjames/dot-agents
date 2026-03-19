import { Tool, ToolDefinition } from './base.js';
import { FileSystem } from '../data/file_system.js';

/**
 * Tool to save a note as a Markdown file.
 */
export class WriteNoteTool implements Tool {
  private fs: FileSystem;

  readonly definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'write_note',
      description: 'Save a new note to the data/memory directory as a Markdown file.',
      parameters: {
        type: 'object',
        properties: {
          filename: {
            type: 'string',
            description: 'The name of the file (e.g., report.md).',
          },
          content: {
            type: 'string',
            description: 'The content of the note in Markdown format.',
          },
        },
        required: ['filename', 'content'],
      },
    },
  };

  constructor(fs: FileSystem) {
    this.fs = fs;
  }

  async execute(args: any): Promise<string> {
    return await this.fs.writeNote(args.filename, args.content);
  }
}
