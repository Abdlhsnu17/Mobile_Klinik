"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const notificationService_1 = require("../services/notificationService");
const apiResponse_1 = require("../utils/apiResponse");
class NotificationController {
    static async sendNow(req, res, next) {
        try {
            const notification = await notificationService_1.NotificationService.dispatch(req.params.id);
            return (0, apiResponse_1.sendSuccess)(res, notification);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.NotificationController = NotificationController;
//# sourceMappingURL=notificationController.js.map