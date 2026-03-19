import { Tool, ToolDefinition } from './base.js';
import { TokenTracker } from '../analytics/token_tracker.js';

/**
 * Tool to get detailed context statistics and rate limit status.
 */
export class GetContextStatsTool implements Tool {
  private tokenTracker: TokenTracker;

  readonly definition: ToolDefinition = {
    type: 'function',
    function: {
      name: 'get_context_stats',
      description: 'Get detailed statistics about the current context window usage, token consumption, and rate limits for the active model. Use this to monitor token usage and avoid hitting rate limits.',
      parameters: {
        type: 'object',
        properties: {
          model: {
            type: 'string',
            description: 'The model name to check stats for (optional, defaults to current primary model).',
          },
        },
        required: [],
      },
    },
  };

  constructor(tokenTracker: TokenTracker) {
    this.tokenTracker = tokenTracker;
  }

  async execute(args: any): Promise<string> {
    const model = args?.model || 'meta-llama/llama-4-scout-17b-16e-instruct';
    const rateLimitStats = this.tokenTracker.getRateLimitStats(model);
    return `Current rate limit stats for ${rateLimitStats.model}:\n${JSON.stringify(rateLimitStats, null, 2)}`;
  }
}
