"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const alertService_1 = require("../services/alertService");
const apiResponse_1 = require("../utils/apiResponse");
exports.alertsRouter = (0, express_1.Router)();
// Peringatan operasional dilihat staf klinis & farmasi; resepsionis/kasir (umum) tidak.
const requireAlertsAccess = (0, auth_1.requireRole)("admin", "teknis", "perawat", "dokter", "bidan");
function parsePositiveInt(value) {
    if (typeof value !== "string")
        return undefined;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}
/**
 * @openapi
 * /alerts:
 *   get:
 *     tags: [Alerts]
 *     summary: Peringatan operasional (stok menipis, obat kedaluwarsa, maintenance alat)
 *     parameters:
 *       - in: query
 *         name: expiryDays
 *         schema: { type: integer }
 *       - in: query
 *         name: maintenanceDays
 *         schema: { type: integer }
 *     responses:
 *       200: { description: OK }
 */
exports.alertsRouter.get("/", requireAlertsAccess, async (req, res, next) => {
    try {
        const data = await alertService_1.AlertService.getOperationalAlerts({
            expiryDays: parsePositiveInt(req.query.expiryDays),
            maintenanceDays: parsePositiveInt(req.query.maintenanceDays),
        });
        (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=alerts.js.map