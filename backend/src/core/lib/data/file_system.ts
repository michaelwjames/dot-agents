import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { db } from './turso_db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface FileContent {
  file: string;
  content: string;
  chunkId?: number | null;
}

export interface ScoredFile extends FileContent {
  score: number;
}

export type FileChunk = FileContent;

export class FileSystem {
  private projectRoot: string;
  private bundledDataRoot: string;
  private vaultPath: string;
  private skillsPath: string;
  private soulPath: string;

  constructor(vaultPath?: string, _memoryPath?: string, skillsPath?: string) {
    const candidateRoots = [
      process.cwd(),
      path.resolve(__dirname, '..', '..', '..', '..', '..', '..'),
      path.resolve(__dirname, '..', '..', '..', '..', '..'),
      path.resolve(__dirname, '..', '..', '..', '..'),
      path.resolve(__dirname, '..', '..', '..')
    ];

    const resolvedRoot = candidateRoots.find(root => {
      if (!root || root === '/' || root.includes('tests')) {
        return false;
      }

      return fs.existsSync(path.join(root, 'data'));
    });

    this.projectRoot = resolvedRoot || process.cwd();

    if (!this.projectRoot || this.projectRoot === '/') {
      this.projectRoot = '/app';
    }

    this.bundledDataRoot = path.join(this.projectRoot, 'data');

    this.vaultPath = vaultPath || path.join(this.bundledDataRoot, 'vault');
    this.skillsPath = skillsPath || path.join(this.bundledDataRoot, 'skills');
    this.soulPath = path.join(this.bundledDataRoot, 'soul.md');
  }

  async loadSoulPrompt(): Promise<string> {
    try {
      if (await fs.pathExists(this.soulPath)) {
        return await fs.readFile(this.soulPath, 'utf-8');
      }
    } catch {
      // soul.md is optional
    }
    return '';
  }

  async getFileSystemIndex(): Promise<string> {
    // Vault and Skills are static/bundled files
    const vaultFiles = (await this._readDir(this.vaultPath)).sort((a, b) => a.file.localeCompare(b.file));
    const skillsFiles = (await this._readDir(this.skillsPath)).sort((a, b) => a.file.localeCompare(b.file));

    // Memory and Large Outputs are now in DB (using memory table for both for simplicity, or just memory)
    // Spec says: memory table in Turso replaces data/memory/*.md
    const memoryResult = await db.execute('SELECT filename, content, always_remember FROM memory ORDER BY filename ASC');
    const memoryFiles = memoryResult.rows.map(row => ({
      file: String(row.filename),
      content: String(row.content),
      always_remember: Boolean(row.always_remember)
    }));

    let index = "--- FILE SYSTEM INDEX ---\n";
    
    index += "\n[VAULT (data/vault/)]\n";
    index += vaultFiles.length > 0 
      ? vaultFiles.map(f => {
          const isAlways = f.content.includes('always_remember: true');
          return `- ${f.file} (${f.content.length} bytes)${isAlways ? ' [ALWAYS_REMEMBER]' : ''}`;
        }).join('\n')
      : "No vault notes found.\n";

    index += "\n\n[MEMORY (Database)]\n";
    index += memoryFiles.length > 0
      ? memoryFiles.map(f => {
          return `- ${f.file} (${f.content.length} bytes)${f.always_remember ? ' [ALWAYS_REMEMBER]' : ''}`;
        }).join('\n')
      : "No memory notes found.\n";

    index += "\n\n[SKILLS (data/skills/)]\n";
    index += skillsFiles.length > 0
      ? skillsFiles.map(f => `- ${f.file} (${f.content.length} bytes)`).join('\n')
      : "No skills found.\n";

    return index;
  }

  async readFileContent(filename: string): Promise<string> {
    const normalizedPath = path.normalize(filename);
    if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
      throw new Error('Invalid filename: path traversal or absolute path not allowed');
    }

    // 1. Check Database (Memory)
    const dbFilename = filename.endsWith('.md') ? filename : `${filename}.md`;
    const memResult = await db.execute('SELECT content FROM memory WHERE filename = ? OR filename = ?', [filename, dbFilename]);
    if (memResult.rows.length > 0) {
      return String(memResult.rows[0].content);
    }
    
    // 2. Check Static Files (Vault, Skills)
    const allowedRoots = [
      this.vaultPath,
      this.skillsPath,
      path.join(this.bundledDataRoot, 'skills')
    ];

    const candidates = [];
    candidates.push(path.join(this.bundledDataRoot, filename));

    for (const root of allowedRoots) {
      candidates.push(path.join(root, filename));
      if (!filename.endsWith('.md')) {
        candidates.push(path.join(root, `${filename}.md`));
      }
    }

    for (const p of candidates) {
      const resolved = path.resolve(p);
      const isAllowed = allowedRoots.some(root => resolved.startsWith(path.resolve(root)));

      if (isAllowed && await fs.pathExists(resolved) && (await fs.stat(resolved)).isFile()) {
        return await fs.readFile(resolved, 'utf-8');
      }
    }

    throw new Error(`File not found: ${filename}`);
  }

  private async _readDir(dirPath: string, mdOnly = true): Promise<FileContent[]> {
    if (!await fs.pathExists(dirPath)) return [];
    const files = await fs.readdir(dirPath);
    const targetFiles = mdOnly ? files.filter(f => f.endsWith('.md')) : files;

    const contents: FileContent[] = [];
    for (const file of targetFiles) {
      const filePath = path.join(dirPath, file);
      try {
        const stat = await fs.stat(filePath);
        if (stat.isFile()) {
          const content = await fs.readFile(filePath, 'utf-8');
          contents.push({ file, content });
        }
      } catch (err) {
        // Skip files that can't be read
      }
    }
    return contents;
  }

  async writeNote(filename: string, content: string): Promise<string> {
    if (!filename.endsWith('.md')) filename += '.md';

    let finalContent = content;
    let alwaysRemember = 0;

    if (!content.trim().startsWith('---')) {
      const title = filename.replace('.md', '').replace(/[-_]/g, ' ');
      const date = new Date().toISOString().split('T')[0];
      const frontmatter = `---
title: ${title}
tags: []
date_created: ${date}
always_remember: false
---

`;
      finalContent = frontmatter + content;
    } else {
      if (content.includes('always_remember: true')) {
        alwaysRemember = 1;
      }
    }

    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO memory (filename, content, always_remember, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(filename) DO UPDATE SET
         content = excluded.content,
         always_remember = excluded.always_remember,
         updated_at = excluded.updated_at`,
      [filename, finalContent, alwaysRemember, now, now]
    );

    return `Note saved to database: ${filename}`;
  }

  async saveSession(sessionId: string, messages: any[]): Promise<void> {
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO sessions (id, messages, last_activity_at)
       VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         messages = excluded.messages,
         last_activity_at = excluded.last_activity_at`,
      [sessionId, JSON.stringify(messages), now]
    );
  }

  async loadSession(sessionId: string): Promise<any[]> {
    const result = await db.execute('SELECT messages FROM sessions WHERE id = ?', [sessionId]);
    if (result.rows.length > 0) {
      try {
        return JSON.parse(String(result.rows[0].messages));
      } catch (e) {
        console.error(`Error parsing session ${sessionId}:`, e);
        return [];
      }
    }
    return [];
  }
}
