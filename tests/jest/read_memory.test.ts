import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ReadMemoryTool } from '../../app/lib/tools/read_memory.js';

describe('ReadMemoryTool', () => {
  let tool: ReadMemoryTool;
  let fsMock: any;

  beforeEach(() => {
    fsMock = {
      readFileContent: jest.fn().mockResolvedValue('file content' as any)
    };
    tool = new ReadMemoryTool(fsMock as any);
    (ReadMemoryTool as any).recentReads.clear();
  });

  it('should read file content using FileSystem', async () => {
    const result = await tool.execute({ filename: 'test.md' });
    expect(result).toBe('file content');
  });

  it('should detect repeated reads and stop loops', async () => {
    await tool.execute({ filename: 'loop.md' });
    await tool.execute({ filename: 'loop.md' });
    await tool.execute({ filename: 'loop.md' });
    const result = await tool.execute({ filename: 'loop.md' });
    expect(result).toContain('repeatedly reading the same file');
  });
});
