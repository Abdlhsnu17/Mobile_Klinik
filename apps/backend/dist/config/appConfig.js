"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOTIFICATION_POLL_INTERVAL_MS = exports.SMS_GATEWAY = exports.WHATSAPP_GATEWAY = exports.SMTP_CONFIG = exports.buildBackendUrl = exports.BACKEND_PUBLIC_URL = exports.AUTH_COOKIE_MAX_AGE_MS = exports.AUTH_COOKIE_NAME = exports.JWT_EXPIRES_IN = exports.JWT_SECRET = exports.NODE_ENV = exports.FRONTEND_ORIGINS = exports.FRONTEND_URL = exports.DEFAULT_PORT = void 0;
require("dotenv/config");
exports.DEFAULT_PORT = Number(process.env.PORT) || 4004;
exports.FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
exports.FRONTEND_ORIGINS = Array.from(new Set([
    ...exports.FRONTEND_URL.split(","),
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]))
    .map((origin) => origin.trim())
    .filter(Boolean);
exports.NODE_ENV = process.env.NODE_ENV || "development";
exports.JWT_SECRET = process.env.JWT_SECRET || "dev-only-insecure-secret";
exports.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
exports.AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "clinic_auth_token";
exports.AUTH_COOKIE_MAX_AGE_MS = Number(process.env.AUTH_COOKIE_MAX_AGE_MS) || 60 * 60 * 1000;
exports.BACKEND_PUBLIC_URL = (process.env.BACKEND_PUBLIC_URL || "").replace(/\/$/, "");
const buildBackendUrl = (port) => exports.BACKEND_PUBLIC_URL || `http://localhost:${port}`;
exports.buildBackendUrl = buildBackendUrl;
exports.SMTP_CONFIG = {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    password: process.env.SMTP_PASSWORD || "",
    from: process.env.SMTP_FROM || "",
};
exports.WHATSAPP_GATEWAY = {
    url: process.env.WHATSAPP_GATEWAY_URL || "",
    token: process.env.WHATSAPP_GATEWAY_TOKEN || "",
};
exports.SMS_GATEWAY = {
    url: process.env.SMS_GATEWAY_URL || "",
    token: process.env.SMS_GATEWAY_TOKEN || "",
};
exports.NOTIFICATION_POLL_INTERVAL_MS = Math.max(5_000, Number(process.env.NOTIFICATION_POLL_INTERVAL_MS) || 30_000);
if (exports.NODE_ENV === "production" && exports.JWT_SECRET === "dev-only-insecure-secret") {
    throw new Error("JWT_SECRET must be set in production");
}
//# sourceMappingURL=appConfig.js.map