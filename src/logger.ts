enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;

  private constructor() {
    this.logLevel = this.getLogLevelFromEnv();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private getLogLevelFromEnv(): LogLevel {
    const envLevel = process.env.AMQP_LOG_LEVEL;
    switch (envLevel) {
      case "DEBUG":
        return LogLevel.DEBUG;
      case "INFO":
        return LogLevel.INFO;
      case "WARN":
        return LogLevel.WARN;
      case "ERROR":
        return LogLevel.ERROR;
      case "NONE":
        return LogLevel.NONE;
      default:
        return LogLevel.INFO;
    }
  }

  private log(level: LogLevel, ...args: any[]): void {
    if (this.logLevel >= level) {
      const prefix = LogLevel[level].padEnd(5);
      console.log(`[${prefix}]`, ...args);
    }
  }

  public debug(...args: any[]): void {
    this.log(LogLevel.DEBUG, ...args);
  }

  public info(...args: any[]): void {
    this.log(LogLevel.INFO, ...args);
  }

  public warn(...args: any[]): void {
    this.log(LogLevel.WARN, ...args);
  }

  public error(...args: any[]): void {
    this.log(LogLevel.ERROR, ...args);
  }
  /*
  public debug(message: string): void {
    if (this.logLevel >= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`);
    }
  }

  public info(message: string): void {
    if (this.logLevel >= LogLevel.INFO) {
      console.log(`[INFO] ${message}`);
    }
  }

  public warn(message: string): void {
    if (this.logLevel >= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`);
    }
  }

  public error(message: string): void {
    if (this.logLevel >= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`);
    }
  }
  */
}

export const logger = Logger.getInstance();
