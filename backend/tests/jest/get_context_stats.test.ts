import { describe, it, expect, beforeEach } from '@jest/globals';
import { GetContextStatsTool } from '../../src/core/lib/tools/get_context_stats.js';
import { TokenTracker } from '../../src/core/lib/analytics/token_tracker.js';

describe('GetContextStatsTool', () => {
  let tool: GetContextStatsTool;
  let tracker: TokenTracker;

  beforeEach(() => {
    tracker = new TokenTracker();
    tool = new GetContextStatsTool(tracker);
  });

  it('should return stats for default model', async () => {
    const result = await tool.execute({});
    expect(result).toContain('LLaMA 4 Scout 17B');
  });
});
