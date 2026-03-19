import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Nomenclature } from '../../app/lib/utils/nomenclature.js';

describe('Nomenclature', () => {
  let nomenclature: Nomenclature;

  beforeEach(() => {
    nomenclature = new Nomenclature();
    (nomenclature as any).repos = [
      { name: 'boss-agent', url: 'https://github.com/user/boss-agent' },
      { name: 'web-frontend', url: 'https://github.com/user/web-frontend' }
    ];
  });

  describe('resolveRepoName', () => {
    it('should resolve exact match', () => {
      const result = nomenclature.resolveRepoName('boss-agent');
      expect(result.exact?.name).toBe('boss-agent');
    });

    it('should resolve fuzzy match (substring)', () => {
      const result = nomenclature.resolveRepoName('boss');
      expect(result.exact?.name).toBe('boss-agent');
    });

    it('should resolve fuzzy match (Levenshtein)', () => {
      const result = nomenclature.resolveRepoName('boss-agentt');
      expect(result.exact?.name).toBe('boss-agent');
    });

    it('should return multiple candidates if ambiguous', () => {
      (nomenclature as any).repos.push({ name: 'boss-bot', url: '...' });
      const result = nomenclature.resolveRepoName('boss');
      expect(result.exact).toBeNull();
      expect(result.candidates.length).toBeGreaterThan(1);
    });

    it('should return null if no repos loaded', () => {
      (nomenclature as any).repos = [];
      const result = nomenclature.resolveRepoName('boss');
      expect(result.exact).toBeNull();
    });

    it('should handle normalized input', () => {
      const result = nomenclature.resolveRepoName('boss_agent');
      expect(result.exact?.name).toBe('boss-agent');
    });
  });
});
