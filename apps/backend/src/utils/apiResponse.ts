import type { Response } from "express";

type ApiErrorPayload = {
  code: string
  message: string
  details?: unknown
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, meta?: Record<string, unknown>) {
  const requestId = res.req.requestId
  return res.status(statusCode).json({
    data,
    ...(meta ? { meta } : {}),
    ...(requestId ? { requestId } : {}),
  })
}

export function sendError(
  res: Response,
  statusCode: number,
  payload: ApiErrorPayload,
) {
  const requestId = res.req.requestId
  return res.status(statusCode).json({
    error: payload,
    ...(requestId ? { requestId } : {}),
  })
}
