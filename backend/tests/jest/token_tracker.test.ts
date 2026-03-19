import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TokenTracker } from '../../app/lib/analytics/token_tracker.js';

describe('TokenTracker', () => {
  let tracker: TokenTracker;

  beforeEach(() => {
    tracker = new TokenTracker();
  });

  describe('getModelLimits', () => {
    it('should return correct limits for a known model', () => {
      const limits = tracker.getModelLimits('mixtral-8x7b-32768');
      expect(limits.name).toBe('Mixtral 8x7B');
      expect(limits.contextWindow).toBe(32768);
    });

    it('should return default limits for an unknown model', () => {
      const limits = tracker.getModelLimits('unknown-model');
      expect(limits.name).toBe('unknown-model');
      expect(limits.contextWindow).toBe(8192);
    });
  });

  describe('countTokens', () => {
    it('should count tokens correctly for simple text', () => {
      const tokens = tracker.countTokens('Hello world');
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('calculateContextStats', () => {
    it('should calculate stats correctly', () => {
      const systemPrompt = 'System prompt';
      const history = [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello' }
      ];
      const userMessage = 'How are you?';
      const toolDefs = [{ name: 'test_tool' }];
      const modelName = 'mixtral-8x7b-32768';

      const stats = tracker.calculateContextStats(
        systemPrompt,
        history,
        userMessage,
        toolDefs,
        modelName
      );

      expect(stats.systemPromptTokens).toBeGreaterThan(0);
      expect(stats.historyTokens).toBeGreaterThan(0);
      expect(stats.userMessageTokens).toBeGreaterThan(0);
      expect(stats.toolDefinitionsTokens).toBeGreaterThan(0);
      expect(stats.currentContextTokens).toBe(
        stats.systemPromptTokens +
        stats.historyTokens +
        stats.userMessageTokens +
        stats.toolDefinitionsTokens
      );
    });
  });

  describe('logRequest and getRateLimitStats', () => {
    it('should track requests and calculate rate limit stats', () => {
      const modelName = 'mixtral-8x7b-32768';
      tracker.logRequest(100);
      tracker.logRequest(200);

      const stats = tracker.getRateLimitStats(modelName);
      expect(stats.requestsThisMinute).toBe(2);
      expect(stats.tokensThisMinute).toBe(300);
    });
  });

  describe('calculateTokenSavings', () => {
    it('should categorize savings correctly', () => {
      expect(tracker.calculateTokenSavings(100, 40).strategy).toContain('Aggressive');
      expect(tracker.calculateTokenSavings(100, 60).strategy).toContain('Moderate');
      expect(tracker.calculateTokenSavings(100, 80).strategy).toContain('Light');
      expect(tracker.calculateTokenSavings(100, 95).strategy).toContain('Minimal');
    });
  });

  describe('formatStats', () => {
    it('should return a formatted string', () => {
      const contextStats = tracker.calculateContextStats('', [], '', [], 'mixtral-8x7b-32768');
      const rateLimitStats = tracker.getRateLimitStats('mixtral-8x7b-32768');
      const formatted = tracker.formatStats(contextStats, rateLimitStats);

      expect(formatted).toContain('Context Window Stats');
      expect(formatted).toContain('Rate Limit Stats');
      expect(formatted).toContain('Mixtral 8x7B');
    });
  });
});
