import type { NextFunction, Request, Response } from "express";
import * as userService from "../services/userService";
import { sanitizeUser } from "../utils";
import { sendSuccess } from "../utils/apiResponse";
import { createHttpError } from "../utils/httpError";

export async function updateAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    const file = req.file;

    if (!userId) {
      throw createHttpError(401, "Otentikasi diperlukan.");
    }

    if (!file) {
      throw createHttpError(400, "File avatar tidak ditemukan.");
    }

    const updatedUser = await userService.updateAvatar(userId, file.path);

    sendSuccess(res, { user: sanitizeUser(updatedUser) });
  } catch (error) {
    next(error);
  }
}
