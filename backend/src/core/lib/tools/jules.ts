import { Tool, ToolDefinition, ToolContext } from './base.js';

const STDOUT_TRUNCATION_LIMIT = 500;
const DISCORD_CONTENT_LIMIT = 1900; // Leave some buffer under 2000 limit

/**
 * Tool to interact with the Jules AI agent.
 * @deprecated This tool currently relies on a Node client to be implemented in Spec #11.
 * For now, it is a stub that will be fully functional after Spec #11.
 */
export class JulesTool implements Tool {
  private _toRelativeTime(isoTimestamp: string): string {
    const parsed = Date.parse(isoTimestamp);
    if (Number.isNaN(parsed)) return isoTimestamp;

    const diffMs = Date.now() - parsed;
    const absMs = Math.abs(diffMs);
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    const format = (value: number, unit: string): string => {
      const plural = value === 1 ? unit : `${unit}s`;
      return diffMs >= 0 ? `${value} ${plural} ago` : `in ${value} ${plural}`;
    };

    if (absMs < minute) return diffMs >= 0 ? 'just now' : 'in a few seconds';
    if (absMs < hour) return format(Math.floor(absMs / minute), 'minute');
    if (absMs < day) return format(Math.floor(absMs / hour), 'hour');
    return format(Math.floor(absMs / day), 'day');
  }

  private _humanizeTimestamps(output: string): string {
    return output.replace(/\[([^\]]+)\]/g, (match, ts) => {
      const relative = this._toRelativeTime(ts);
      return relative === ts ? match : `[${relative}]`;
    });
  }

  readonly definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'jules',
      description: 'Interact with the Jules AI agent. Use this tool for ALL Jules operations. Pass sessionId as the session identifier.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: [
              'create',
              'list-sessions',
              'get-session',
              'get-session-status',
              'get-pending-feedback',
              'send-message',
              'approve-plan',
              'list-sources',
              'list-activities',
              'delete-session',
              'fetch-latest-sessions',
              'show-cached-sessions',
            ],
            description: 'The action to perform with Jules.',
          },
          prompt: {
            type: 'string',
            description: 'The instruction or message for Jules (used with create, send-message).',
          },
          repo: {
            type: 'string',
            description: 'The GitHub repository name (owner/repo) for the session.',
          },
          sessionId: {
            type: 'string',
            description: 'The ID of an existing Jules session.',
          },
          pageSize: {
            type: 'number',
            description: 'Number of items to return for list-sessions and list-activities (defaults to 10).',
          },
          extraArgs: {
            type: 'string',
            description: 'Any additional flags or arguments for the jules client.',
          },
        },
        required: ['action'],
      },
    },
  };

  async execute(_args: any, _context?: ToolContext): Promise<string> {
    return JSON.stringify({
      success: false,
      stdout: "Jules tool is temporarily unavailable during foundation refactor. It will be restored in Spec #11.",
      stderr: "Tool migration in progress.",
      exitCode: 1
    });
  }
}
