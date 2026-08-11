"use client"

type ClientErrorContext = {
  module: string
  action: string
  entityId?: string | null
  method?: string
  path?: string
  status?: number
}

type ErrorPayload = {
  message?: unknown
  requestId?: unknown
  error?: {
    message?: unknown
    code?: unknown
    details?: unknown
  }
}

type ApiErrorContext = {
  method?: string
  path?: string
  status?: number
  payloadMessage?: string | null
  fallbackMessage?: string
  error?: unknown
}

function serializeError(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: getErrorMessage(error),
      stack: error.stack,
    }
  }

  return error
}

export function getErrorMessage(error: unknown, fallback = "Terjadi kesalahan."): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "string" && error.trim()) return error
  return fallback
}

export function createErrorDescription(error: unknown, context: ClientErrorContext): string {
  const details = [
    `Modul: ${context.module}`,
    `Aksi: ${context.action}`,
    context.entityId ? `ID: ${context.entityId}` : null,
    context.method && context.path ? `Endpoint: ${context.method} ${context.path}` : null,
    context.status ? `Status: HTTP ${context.status}` : null,
    `Penyebab: ${getErrorMessage(error)}`,
  ].filter(Boolean)

  return details.join(" | ")
}

export function logClientError(error: unknown, context: ClientErrorContext) {
  console.error("[client-error]", {
    ...context,
    message: getErrorMessage(error),
    error: serializeError(error),
  })
}

export function getApiPayloadMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null
  const { message, error } = payload as ErrorPayload
  if (typeof message === "string" && message.trim()) return message
  if (error && typeof error.message === "string" && error.message.trim()) return error.message
  return null
}

export function getApiRequestId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null
  const { requestId } = payload as ErrorPayload
  return typeof requestId === "string" && requestId.trim() ? requestId : null
}

export function getFriendlyApiErrorMessage({
  method,
  path,
  status,
  payloadMessage,
  fallbackMessage = "Terjadi kesalahan. Silakan coba lagi.",
  error,
}: ApiErrorContext): string {
  const message = payloadMessage?.trim()
  if (message) return message

  if (error) {
    const rawMessage = getErrorMessage(error, "").trim()
    if (rawMessage) return rawMessage
  }

  if (status === 400 || status === 422) {
    return "Data belum valid. Periksa kembali isian Anda."
  }

  if (status === 401) {
    if (path?.startsWith("/auth/login")) {
      return "Username atau password salah."
    }
    return "Sesi Anda telah berakhir. Silakan masuk kembali."
  }

  if (status === 403) {
    return "Anda tidak memiliki izin untuk melakukan aksi ini."
  }

  if (status === 404) {
    return "Data yang diminta tidak ditemukan."
  }

  if (status === 409) {
    return "Data sudah ada atau terjadi konflik. Muat ulang lalu coba lagi."
  }

  if (typeof status === "number" && status >= 500) {
    return "Terjadi kesalahan pada server. Silakan coba lagi."
  }

  if (method && path) {
    return `${method} ${path} gagal. ${fallbackMessage}`
  }

  return fallbackMessage
}
