import { Router } from "express"
import { requireRole } from "../middlewares/auth"
import { AlertService } from "../services/alertService"
import { sendSuccess } from "../utils/apiResponse"

export const alertsRouter = Router()

// Peringatan operasional dilihat staf klinis & farmasi; resepsionis/kasir (umum) tidak.
const requireAlertsAccess = requireRole("admin", "teknis", "perawat", "dokter", "bidan")

function parsePositiveInt(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
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
alertsRouter.get("/", requireAlertsAccess, async (req, res, next) => {
  try {
    const data = await AlertService.getOperationalAlerts({
      expiryDays: parsePositiveInt(req.query.expiryDays),
      maintenanceDays: parsePositiveInt(req.query.maintenanceDays),
    })
    sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
})
