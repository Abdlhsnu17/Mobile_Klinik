import type { NextFunction, Request, Response } from "express"
import { NotificationService } from "../services/notificationService"
import { sendSuccess } from "../utils/apiResponse"

export class NotificationController {
  static async sendNow(req: Request, res: Response, next: NextFunction) {
    try {
      const notification = await NotificationService.dispatch(req.params.id)
      return sendSuccess(res, notification)
    } catch (error) {
      next(error)
    }
  }
}
