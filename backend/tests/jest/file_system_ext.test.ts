import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { FileSystem } from '../../src/core/lib/data/file_system.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('FileSystem Extended', () => {
  let fileSystem: FileSystem;
  let testRoot: string;
  let vaultPath: string;
  let memoryPath: string;
  let skillsPath: string;

  beforeEach(async () => {
    testRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-test-'));
    vaultPath = path.join(testRoot, 'vault');
    memoryPath = path.join(testRoot, 'memory');
    skillsPath = path.join(testRoot, 'skills');
    await fs.ensureDir(vaultPath);
    await fs.ensureDir(memoryPath);
    await fs.ensureDir(skillsPath);
    fileSystem = new FileSystem(vaultPath, memoryPath, skillsPath);
    // Overwrite internal data path for testing session history
    (fileSystem as any).sessionHistoryPath = path.join(testRoot, 'session_history');
    await fs.ensureDir((fileSystem as any).sessionHistoryPath);
  });

  afterEach(async () => {
    await fs.remove(testRoot);
  });

  describe('getFileSystemIndex', () => {
    it('should return a formatted index of files', async () => {
      await fs.writeFile(path.join(vaultPath, 'note1.md'), '---always_remember: true---\ncontent');
      await fs.writeFile(path.join(memoryPath, 'mem1.md'), 'memory content');

      const index = await fileSystem.getFileSystemIndex();
      expect(index).toContain('note1.md');
      expect(index).toContain('[ALWAYS_REMEMBER]');
      expect(index).toContain('mem1.md');
    });
  });

  describe('readFileContent', () => {
    it('should read file from vault', async () => {
      await fs.writeFile(path.join(vaultPath, 'test.md'), 'vault content');
      const content = await fileSystem.readFileContent('test.md');
      expect(content).toBe('vault content');
    });
  });

  describe('writeNote', () => {
    it('should write a note with frontmatter', async () => {
      const result = await fileSystem.writeNote('new-note', 'note content');
      expect(result).toBe('Note saved to new-note.md');
      const content = await fs.readFile(path.join(memoryPath, 'new-note.md'), 'utf-8');
      expect(content).toContain('---');
    });
  });

  describe('session management', () => {
    it('should save and load session', async () => {
      const sessionId = 'test-session';
      const messages = [{ role: 'user', content: 'hello' }];
      await fileSystem.saveSession(sessionId, messages);
      const loaded = await fileSystem.loadSession(sessionId);
      expect(loaded).toEqual(messages);
    });
  });
});
