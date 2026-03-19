import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { DisplayLargeOutputTool } from '../../src/core/lib/tools/display_large_output.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('DisplayLargeOutputTool', () => {
  let tool: DisplayLargeOutputTool;
  let testRoot: string;

  beforeEach(async () => {
    testRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'large-output-test-'));
    tool = new DisplayLargeOutputTool({} as any);
    (tool as any).projectRoot = testRoot;
    await fs.ensureDir(path.join(testRoot, 'data', 'large_outputs'));
  });

  afterEach(async () => {
    await fs.remove(testRoot);
  });

  it('should save large output to a file', async () => {
    const content = 'This is a very large content';
    const result = await tool.execute({ content, filename: 'test.txt' });

    expect(result).toContain('[LARGE OUTPUT SAVED]');
    expect(result).toContain('data/large_outputs/test.txt');

    const savedContent = await fs.readFile(path.join(testRoot, 'data', 'large_outputs', 'test.txt'), 'utf-8');
    expect(savedContent).toBe(content);
  });
});
