import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ToolRegistry } from '../../src/core/lib/tools.js';
import { FileSystem } from '../../src/core/lib/data/file_system.js';
import { Nomenclature } from '../../src/core/lib/utils/nomenclature.js';
import { TokenTracker } from '../../src/core/lib/analytics/token_tracker.js';

describe('ToolRegistry', () => {
  let fs: FileSystem;
  let nomenclature: Nomenclature;
  let tracker: TokenTracker;
  let registry: ToolRegistry;

  beforeEach(() => {
    fs = new FileSystem();
    nomenclature = new Nomenclature();
    tracker = new TokenTracker();
    registry = new ToolRegistry(fs, nomenclature, tracker);
  });

  it('should register core tools', () => {
    const definitions = registry.getDefinitions();
    const names = definitions.map(d => d.function.name);
    expect(names).toContain('run_make');
    expect(names).toContain('write_note');
    expect(names).toContain('read_memory');
    expect(names).toContain('get_context_stats');
    expect(names).toContain('jules');
    expect(names).toContain('display_large_output');
  });

  it('should execute a registered tool', async () => {
    (fs as any).writeNote = jest.fn().mockResolvedValue('saved' as any);
    const result = await registry.execute('write_note', { filename: 'test.md', content: 'hello' });
    expect(result).toBe('saved');
  });

  it('should fallback to make for unknown tools', async () => {
    (registry as any).make.run = jest.fn().mockResolvedValue({ stdout: 'make output', stderr: '', exitCode: 0 } as any);
    const result = await registry.execute('unknown_tool', { arg: 'val' });
    expect(result).toContain('make output');
  });

  it('should run interceptors', async () => {
    const interceptor = {
      preExecute: jest.fn().mockImplementation((name: string, args: any) => ({ ...args, added: true })),
      postExecute: jest.fn().mockImplementation((name: string, args: any, result: string) => result + ' intercepted')
    };
    registry.addInterceptor(interceptor as any);
    (fs as any).writeNote = jest.fn().mockResolvedValue('saved' as any);

    const result = await registry.execute('write_note', { filename: 'test.md', content: 'hello' });

    expect(interceptor.preExecute).toHaveBeenCalled();
    expect(interceptor.postExecute).toHaveBeenCalled();
    expect(result).toBe('saved intercepted');
  });
});
