/**
 * Production-Safe Logging Utility
 *
 * Provides structured logging with automatic sensitive data filtering.
 * Only outputs to console in development mode.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogContext {
  [key: string]: any
}

/**
 * Sanitize log data to remove sensitive information
 */
function sanitizeLogData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data
  }

  const sensitiveKeys = [
    'password',
    'api_key',
    'apiKey',
    'token',
    'secret',
    'authorization',
    'auth',
    'cookie',
    'session',
  ]

  if (Array.isArray(data)) {
    return data.map(sanitizeLogData)
  }

  const sanitized: any = {}
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase()
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]'
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeLogData(value)
    } else {
      sanitized[key] = value
    }
  }
  return sanitized
}

/**
 * Format log message for output
 */
function formatLogMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString()
  const sanitizedContext = context ? sanitizeLogData(context) : {}
  const contextStr = Object.keys(sanitizedContext).length > 0
    ? ` ${JSON.stringify(sanitizedContext)}`
    : ''

  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
}

/**
 * Check if logging is enabled for production
 * In production, only errors are logged by default
 */
function shouldLog(level: LogLevel): boolean {
  const isDev = process.env.NODE_ENV === 'development'
  const isTest = process.env.NODE_ENV === 'test'

  // In test mode, suppress all logs unless explicitly enabled
  if (isTest) {
    return process.env.ENABLE_TEST_LOGS === 'true'
  }

  // In development, log everything
  if (isDev) {
    return true
  }

  // In production, only log warnings and errors
  return level === 'error' || level === 'warn'
}

/**
 * Core logging function
 */
function log(level: LogLevel, message: string, context?: LogContext): void {
  if (!shouldLog(level)) {
    return
  }

  const formattedMessage = formatLogMessage(level, message, context)

  switch (level) {
    case 'error':
      console.error(formattedMessage)
      break
    case 'warn':
      console.warn(formattedMessage)
      break
    case 'debug':
    case 'info':
    default:
      console.log(formattedMessage)
      break
  }
}

/**
 * Logger interface
 */
export const logger = {
  /**
   * Log informational message
   */
  info: (message: string, context?: LogContext) => {
    log('info', message, context)
  },

  /**
   * Log warning message
   */
  warn: (message: string, context?: LogContext) => {
    log('warn', message, context)
  },

  /**
   * Log error message
   */
  error: (message: string, error?: Error | unknown, context?: LogContext) => {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : String(error),
    }
    log('error', message, errorContext)
  },

  /**
   * Log debug message (only in development)
   */
  debug: (message: string, context?: LogContext) => {
    log('debug', message, context)
  },
}

export default logger
