/**
 * Logging utility with timestamps and database output for boss-agent
 */

import { db } from '../data/turso_db.js';

export class Logger {
  private static instance: Logger;
  private prefix: string;

  private constructor(prefix: string = '') {
    this.prefix = prefix;
  }

  static getInstance(prefix: string = ''): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(prefix);
    }
    return Logger.instance;
  }

  private getTimestamp(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    return `[${hours}:${minutes}:${seconds}.${milliseconds}]`;
  }

  private async writeToDB(level: string, ...args: any[]): Promise<void> {
    try {
      // Format log entry
      const timestamp = this.getTimestamp();
      const message = `${timestamp} ${this.prefix ? this.prefix + ' ' : ''}${args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')}`;
      
      // Save to Turso logs table
      await db.execute(
        `INSERT INTO logs (level, message, created_at)
         VALUES (?, ?, ?)`,
        [level || 'INFO', message, new Date().toISOString()]
      );
    } catch (error) {
      // Silently fail to avoid infinite loops, but log to console
      console.error('Failed to write to database log:', error);
    }
  }

  log(...args: any[]): void {
    this.writeToDB('INFO', ...args).catch(() => {});
  }

  error(...args: any[]): void {
    this.writeToDB('ERROR', ...args).catch(() => {});
  }

  warn(...args: any[]): void {
    this.writeToDB('WARN', ...args).catch(() => {});
  }

  info(...args: any[]): void {
    this.writeToDB('INFO', ...args).catch(() => {});
  }

  debug(...args: any[]): void {
    if (process.env.DEBUG === 'true') {
      this.writeToDB('DEBUG', ...args).catch(() => {});
    }
  }
}

// Convenience functions for direct usage
export const log = (...args: any[]) => Logger.getInstance().log(...args);
export const logError = (...args: any[]) => Logger.getInstance().error(...args);
export const logWarn = (...args: any[]) => Logger.getInstance().warn(...args);
export const logInfo = (...args: any[]) => Logger.getInstance().info(...args);
export const logDebug = (...args: any[]) => Logger.getInstance().debug(...args);
