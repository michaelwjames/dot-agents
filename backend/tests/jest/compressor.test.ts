import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MemoryCompressor } from '../../app/lib/services/compressor.js';

describe('MemoryCompressor', () => {
  let groqMock: any;
  let fsMock: any;
  let compressor: MemoryCompressor;

  beforeEach(() => {
    groqMock = {
      chat: jest.fn().mockResolvedValue({ content: 'summarized content' } as any)
    };
    fsMock = {
      saveSession: jest.fn().mockResolvedValue(undefined as any)
    };
    compressor = new MemoryCompressor(groqMock as any, fsMock as any);
  });

  it('should not compress if history is short', async () => {
    const history = Array(5).fill({ role: 'user', content: 'hi' });
    await compressor.compressSession('session1', history);
    expect(groqMock.chat).not.toHaveBeenCalled();
  });

  it('should compress long history', async () => {
    const history = Array(15).fill({ role: 'user', content: 'hi' });
    await compressor.compressSession('session1', history);

    expect(groqMock.chat).toHaveBeenCalled();
    expect(fsMock.saveSession).toHaveBeenCalled();
  });
});
