import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    interface Request {
      requestId?: string
    }
  }
}

const REQUEST_ID_HEADER = "x-request-id"

function normalizeRequestId(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.length > 128) return null
  return trimmed
}

export function attachRequestContext(req: Request, res: Response, next: NextFunction) {
  const headerValue = normalizeRequestId(req.headers[REQUEST_ID_HEADER])
  const requestId = headerValue ?? randomUUID()

  req.requestId = requestId
  res.setHeader(REQUEST_ID_HEADER, requestId)

  next()
}
