type LogLevel = "info" | "success" | "warn" | "error"

type LogContext = Record<string, unknown>

function normalizeError(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
    }
  }

  return err
}

function writeLog(level: LogLevel, message: string, context?: LogContext) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context ? { context } : {}),
  }

  const output = JSON.stringify(entry)

  if (level === "warn") {
    console.warn(output)
    return
  }

  if (level === "error") {
    console.error(output)
    return
  }

  console.log(output)
}

export const success = (message: string, context?: LogContext) => writeLog("success", message, context)
export const warn = (message: string, context?: LogContext) => writeLog("warn", message, context)
export const info = (message: string, context?: LogContext) => writeLog("info", message, context)
export const error = (message: string, err?: unknown, context?: LogContext) =>
  writeLog("error", message, {
    ...(context ?? {}),
    ...(err ? { error: normalizeError(err) } : {}),
  })
