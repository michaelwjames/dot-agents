import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MakeExecutor } from '../../src/core/lib/executors/make_executor.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('MakeExecutor Integration', () => {
  let testRoot: string;
  let makefilePath: string;
  let executor: MakeExecutor;

  beforeEach(async () => {
    testRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'make-test-'));
    makefilePath = path.join(testRoot, 'Makefile');
    const content = `
test-target:
\t@echo "hello from make"

test-args:
\t@echo "arg is $(ARG)"

help:
\t@echo "make test-target # Run test"
\t@echo "make test-args # Run args"

error-target:
\texit 2
`;
    await fs.writeFile(makefilePath, content);
    executor = new MakeExecutor(makefilePath);
  });

  afterEach(async () => {
    await fs.remove(testRoot);
  });

  it('should identify targets from Makefile', () => {
    const targets = (executor as any).allowedTargets;
    expect(targets.has('test-target')).toBe(true);
    expect(targets.has('test-args')).toBe(true);
    expect(targets.has('help')).toBe(true);
  });

  it('should run a target', async () => {
    const result = await executor.run('test-target');
    expect(result.stdout).toBe('hello from make');
    expect(result.exitCode).toBe(0);
  });

  it('should run a target with arguments', async () => {
    const result = await executor.run('test-args', { ARG: 'world' });
    expect(result.stdout).toBe('arg is world');
    expect(result.exitCode).toBe(0);
  });

  it('should normalize and pass arguments', async () => {
    const result = await executor.run('test-args', { 'arg': 'normalized' });
    expect(result.stdout).toBe('arg is normalized');

    // Coverage for complex normalization
    const result2 = await executor.run('test-args', { 'session-id': 'sess123' });
    // In our simple Makefile, SESSION_ID won't match ARG, but it will test the code path.
    expect(result2.exitCode).toBe(0);
  });

  it('should handle execution errors', async () => {
    const result = await executor.run('error-target');
    expect(result.exitCode).toBe(2);
  });

  it('should reject unallowed targets', async () => {
    const result = await executor.run('dangerous-target');
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('not allowed');
  });

  it('should provide help', () => {
    const help = executor.getHelp();
    expect(help).toContain('make test-target');
    expect(help).toContain('make test-args');
  });

  it('should reload targets when Makefile changes', async () => {
    await fs.writeFile(makefilePath, 'new-target:');
    // Ensure mtime is actually later
    const stats = await fs.stat(makefilePath);
    await fs.utimes(makefilePath, stats.atime, new Date(stats.mtime.getTime() + 1000));
    executor.reload();
    expect((executor as any).allowedTargets.has('new-target')).toBe(true);
  });
});
