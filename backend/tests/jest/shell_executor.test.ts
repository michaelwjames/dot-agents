import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ShellExecutor } from '../../src/core/lib/executors/shell_executor.js';

describe('ShellExecutor', () => {
  let executor: ShellExecutor;

  beforeEach(async () => {
    executor = new ShellExecutor();
  });

  it('should return stdout, stderr, and exitCode on success', async () => {
    const result = await executor.run('echo "success"');
    expect(result.stdout).toBe('success');
    expect(result.stderr).toBe('');
    expect(result.exitCode).toBe(0);
  });

  it('should return error details on failure', async () => {
    const result = await executor.run('ls /non-existent-directory-12345');
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('No such file or directory');
  });
});
