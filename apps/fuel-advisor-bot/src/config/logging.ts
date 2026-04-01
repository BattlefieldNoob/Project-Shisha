import { config } from './env'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export class Logger {
  level: LogLevel

  constructor(level: LogLevel = 'info') {
    this.level = level
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    }
    return levels[level] >= levels[this.level]
  }

  private format(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString()
    const metaPart = meta ? ` | ${JSON.stringify(meta)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaPart}`
  }

  debug(msg: string, meta?: any) {
    if (this.shouldLog('debug')) console.debug(this.format('debug', msg, meta))
  }

  info(msg: string, meta?: any) {
    if (this.shouldLog('info')) console.info(this.format('info', msg, meta))
  }

  warn(msg: string, meta?: any) {
    if (this.shouldLog('warn')) console.warn(this.format('warn', msg, meta))
  }

  error(msg: string, meta?: any) {
    if (this.shouldLog('error')) console.error(this.format('error', msg, meta))
  }
}

export const logger = new Logger(config.LOG_LEVEL as LogLevel)
