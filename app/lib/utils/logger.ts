/**
 * Logging utility with timestamps for boss-agent
 */

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

  log(...args: any[]): void {
    console.log(this.getTimestamp(), this.prefix, ...args);
  }

  error(...args: any[]): void {
    console.error(this.getTimestamp(), this.prefix, 'ERROR:', ...args);
  }

  warn(...args: any[]): void {
    console.warn(this.getTimestamp(), this.prefix, 'WARN:', ...args);
  }

  info(...args: any[]): void {
    console.info(this.getTimestamp(), this.prefix, 'INFO:', ...args);
  }

  debug(...args: any[]): void {
    if (process.env.DEBUG === 'true') {
      console.debug(this.getTimestamp(), this.prefix, 'DEBUG:', ...args);
    }
  }
}

// Convenience functions for direct usage
export const log = (...args: any[]) => Logger.getInstance().log(...args);
export const logError = (...args: any[]) => Logger.getInstance().error(...args);
export const logWarn = (...args: any[]) => Logger.getInstance().warn(...args);
export const logInfo = (...args: any[]) => Logger.getInstance().info(...args);
export const logDebug = (...args: any[]) => Logger.getInstance().debug(...args);
