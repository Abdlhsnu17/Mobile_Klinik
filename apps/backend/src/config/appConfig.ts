import "dotenv/config"

export const DEFAULT_PORT = Number(process.env.PORT) || 4004
export const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000"
export const FRONTEND_ORIGINS = Array.from(
  new Set([
    ...FRONTEND_URL.split(","),
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
  ])
)
  .map((origin) => origin.trim())
  .filter(Boolean)
export const NODE_ENV = process.env.NODE_ENV || "development"
export const JWT_SECRET = process.env.JWT_SECRET || "dev-only-insecure-secret"
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h"
export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "clinic_auth_token"
export const AUTH_COOKIE_MAX_AGE_MS = Number(process.env.AUTH_COOKIE_MAX_AGE_MS) || 60 * 60 * 1000
export const BACKEND_PUBLIC_URL = (process.env.BACKEND_PUBLIC_URL || "").replace(/\/$/, "")
export const buildBackendUrl = (port: number) => BACKEND_PUBLIC_URL || `http://localhost:${port}`

export const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || "",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  user: process.env.SMTP_USER || "",
  password: process.env.SMTP_PASSWORD || "",
  from: process.env.SMTP_FROM || "",
}

export const WHATSAPP_GATEWAY = {
  url: process.env.WHATSAPP_GATEWAY_URL || "",
  token: process.env.WHATSAPP_GATEWAY_TOKEN || "",
}

export const SMS_GATEWAY = {
  url: process.env.SMS_GATEWAY_URL || "",
  token: process.env.SMS_GATEWAY_TOKEN || "",
}

export const NOTIFICATION_POLL_INTERVAL_MS = Math.max(
  5_000,
  Number(process.env.NOTIFICATION_POLL_INTERVAL_MS) || 30_000,
)

if (NODE_ENV === "production" && JWT_SECRET === "dev-only-insecure-secret") {
  throw new Error("JWT_SECRET must be set in production")
}
