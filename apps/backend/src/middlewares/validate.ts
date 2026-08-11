import type { NextFunction, Request, Response } from "express"
import { body, validationResult, type ValidationChain } from "express-validator"
import { sendError } from "../utils/apiResponse"

export function validate(rules: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    for (const rule of rules) {
      await rule.run(req)
    }
    const result = validationResult(req)
    if (!result.isEmpty()) {
      return sendError(res, 400, {
        code: "VALIDATION_ERROR",
        message: "Data yang dikirim tidak valid",
        details: result.array().map((e) => ({ field: "path" in e ? e.path : undefined, message: e.msg })),
      })
    }
    next()
  }
}

export const requireNonEmptyBody = validate([
  body().custom((value) => {
    if (typeof value !== "object" || value === null || Array.isArray(value) || Object.keys(value).length === 0) {
      throw new Error("Body request tidak boleh kosong")
    }
    return true
  }),
])
