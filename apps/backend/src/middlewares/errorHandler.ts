import type { NextFunction, Request, Response } from "express";
import { error as logError, warn as logWarn } from "../config/logger";
import { sendError } from "../utils/apiResponse";

interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

/**
 * Menerjemahkan error dari library / driver DB yang tidak membawa `statusCode`
 * menjadi status HTTP + pesan yang aman. Error yang sudah dibuat lewat
 * createHttpError() (punya `statusCode`) dihormati apa adanya.
 */
function classifyError(err: AppError): { statusCode: number; message?: string } {
  if (typeof err.statusCode === "number") {
    return { statusCode: err.statusCode };
  }

  switch (err.name) {
    case "TokenExpiredError":
      return { statusCode: 401, message: "Sesi Anda telah berakhir, silakan login kembali." };
    case "JsonWebTokenError":
      return { statusCode: 401, message: "Token akses tidak valid." };
    case "MulterError":
      return { statusCode: 400, message: "Upload file tidak valid." };
    case "ValidationError": // Joi
      return { statusCode: 400, message: err.message };
  }

  // Kode error MySQL (mysql2). Catatan: 23505/23503 adalah SQLSTATE PostgreSQL,
  // tidak berlaku di sini karena proyek memakai MySQL.
  switch (err.code) {
    case "ER_DUP_ENTRY":
      return { statusCode: 409, message: "Data sudah ada atau duplikat." };
    case "ER_NO_REFERENCED_ROW":
    case "ER_NO_REFERENCED_ROW_2":
      return { statusCode: 400, message: "Data rujukan tidak ditemukan." };
    case "ER_ROW_IS_REFERENCED":
    case "ER_ROW_IS_REFERENCED_2":
      return { statusCode: 409, message: "Data masih dirujuk oleh data lain dan tidak dapat diubah/dihapus." };
  }

  return { statusCode: 500 };
}

function getPublicErrorMessage(err: AppError, statusCode: number, overrideMessage?: string): string {
  const message = overrideMessage?.trim() || err.message?.trim()

  if (statusCode >= 500) {
    return "Terjadi kesalahan internal pada server. Silakan coba lagi.";
  }

  if (message) {
    return message;
  }

  if (statusCode === 404) return "Data yang diminta tidak ditemukan.";
  if (statusCode === 401) return "Sesi Anda telah berakhir. Silakan masuk kembali.";
  if (statusCode === 403) return "Anda tidak memiliki izin untuk melakukan aksi ini.";
  if (statusCode === 409) return "Data sudah ada atau terjadi konflik. Muat ulang lalu coba lagi.";
  if (statusCode === 422 || statusCode === 400) return "Data belum valid. Periksa kembali isian Anda.";

  return "Terjadi kesalahan. Silakan coba lagi.";
}

export function notFoundHandler(req: Request, res: Response) {
  sendError(res, 404, { code: "NOT_FOUND", message: "Endpoint tidak ditemukan" })
}

export function errorHandler(err: AppError, req: Request, res: Response, _next: NextFunction) {
  const { statusCode, message: classifiedMessage } = classifyError(err);
  const message = getPublicErrorMessage(err, statusCode, classifiedMessage);
  const requestId = req.requestId ?? req.headers["x-request-id"] ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const logContext = {
    requestId,
    method: req.method,
    path: req.originalUrl || req.path,
    statusCode,
    userId: req.user?.id ?? null,
    role: req.user?.role ?? null,
  }

  if (statusCode >= 500) {
    logError("Request gagal diproses", err, logContext)
  } else {
    // Penolakan 4xx adalah hasil request yang sudah diperkirakan (misalnya sesi
    // belum ada/kedaluwarsa), bukan kegagalan proses backend. Catat tanpa stack
    // trace dan tanpa mengirimnya ke stderr sebagai error merah.
    logWarn("Request ditolak", { ...logContext, message: err.message })
  }

  const errorCode = statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : `HTTP_${statusCode}`
  // Detail terstruktur (mis. daftar field yang gagal validasi) hanya diteruskan
  // untuk error 4xx; error 5xx sengaja tidak membocorkan detail internal.
  const details = statusCode < 500 ? err.details : undefined
  sendError(res, statusCode, { code: errorCode, message, ...(details !== undefined ? { details } : {}) })
}
