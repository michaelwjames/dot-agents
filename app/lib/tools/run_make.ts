import { Tool, ToolDefinition } from './base.js';
import { MakeExecutor } from '../executors/make_executor.js';

/**
 * Tool to execute a predefined make target.
 * Description is dynamically updated with available targets after construction.
 */
export class RunMakeTool implements Tool {
  private make: MakeExecutor;

  definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'run_make',
      description: 'Execute a predefined make target. Only targets defined in the root Makefile are allowed. You cannot run arbitrary shell commands. Do NOT use this for Jules operations — use the jules tool instead.',
      parameters: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description: 'The make target to run (e.g., "git-status", "pr-list", "pr-diff").',
          },
          args: {
            type: 'object',
            description: 'Key-value arguments passed to make (e.g., {"PR_NUMBER": "42"}).',
            additionalProperties: { type: 'string' },
          },
        },
        required: ['target'],
      },
    },
  };

  constructor(make: MakeExecutor) {
    this.make = make;
  }

  async execute(args: any): Promise<string> {
    const cmdResult = await this.make.run(args.target, args.args);
    return `STDOUT: ${cmdResult.stdout}\nSTDERR: ${cmdResult.stderr}\nExit Code: ${cmdResult.exitCode}`;
  }
}
