import { createClient, Client, ResultSet } from '@libsql/client';
import 'dotenv/config';

class TursoDB {
  private client: Client;

  constructor() {
    const url = process.env.TURSO_DATABASE_URL || 'file:data/boss_agent.db';
    const authToken = process.env.TURSO_AUTH_TOKEN;

    this.client = createClient({
      url,
      authToken,
    });
  }

  async init(): Promise<void> {
    const statements = [
      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        last_activity_at TEXT NOT NULL,
        messages TEXT NOT NULL DEFAULT '[]'
      );`,
      `CREATE TABLE IF NOT EXISTS memory (
        filename TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        always_remember INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );`,
      `CREATE TABLE IF NOT EXISTS jules_cache (
        session_id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS cache (
        session_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        cache_data TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (session_id, user_id)
      );`
    ];

    for (const sql of statements) {
      await this.client.execute(sql);
    }
    console.log('[TursoDB] Database initialized.');
  }

  async execute(sql: string, args?: any[]): Promise<ResultSet> {
    return await this.client.execute({ sql, args: args || [] });
  }

  async batch(stmts: { sql: string; args?: any[] }[]): Promise<ResultSet[]> {
    return await this.client.batch(stmts.map(s => ({ sql: s.sql, args: s.args || [] })), 'write');
  }
}

export const db = new TursoDB();
