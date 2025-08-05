// Simple logger utility
// In production, you might want to use a more sophisticated logging library like winston

export interface LogLevel {
  ERROR: "error";
  WARN: "warn";
  INFO: "info";
  DEBUG: "debug";
}

export const LOG_LEVELS: LogLevel = {
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
};

class Logger {
  private readonly isDevelopment = process.env.NODE_ENV === "development";
  private readonly logLevel = process.env.LOG_LEVEL || "info";

  private shouldLog(level: string): boolean {
    const levels = ["error", "warn", "info", "debug"];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const requestedLevelIndex = levels.indexOf(level);
    return requestedLevelIndex <= currentLevelIndex;
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const baseMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;

    if (meta && typeof meta === "object") {
      return `${baseMessage} ${JSON.stringify(meta)}`;
    }

    return baseMessage;
  }

  error(message: string, meta?: any): void {
    if (this.shouldLog("error")) {
      const formatted = this.formatMessage("error", message, meta);
      console.error(formatted);
    }
  }

  warn(message: string, meta?: any): void {
    if (this.shouldLog("warn")) {
      const formatted = this.formatMessage("warn", message, meta);
      console.warn(formatted);
    }
  }

  info(message: string, meta?: any): void {
    if (this.shouldLog("info")) {
      const formatted = this.formatMessage("info", message, meta);
      console.info(formatted);
    }
  }

  debug(message: string, meta?: any): void {
    if (this.shouldLog("debug") && this.isDevelopment) {
      const formatted = this.formatMessage("debug", message, meta);
      console.debug(formatted);
    }
  }
}

export const logger = new Logger();
