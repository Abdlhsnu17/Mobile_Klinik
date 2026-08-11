import { Router } from "express"
import { body } from "express-validator"
import { collectionPermissions } from "../config/collectionPermissions"
import { requireRole } from "../middlewares/auth"
import { validate } from "../middlewares/validate"
import { CashierService } from "../services/cashierService"
import { sendSuccess } from "../utils/apiResponse"

export const cashierRouter = Router()

const requireCashierAccess = requireRole(...collectionPermissions.cashierClosings.read)
const requireCashierWrite = requireRole(...collectionPermissions.cashierClosings.write)

function isoDate(value: unknown): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  return new Date().toISOString().slice(0, 10)
}

/**
 * @openapi
 * /cashier/summary:
 *   get:
 *     tags: [Cashier]
 *     summary: Ringkasan kas untuk satu tanggal
 */
cashierRouter.get("/summary", requireCashierAccess, async (req, res, next) => {
  try {
    const summary = await CashierService.getDailySummary(isoDate(req.query.date))
    sendSuccess(res, summary)
  } catch (error) {
    next(error)
  }
})

/**
 * @openapi
 * /cashier/close:
 *   post:
 *     tags: [Cashier]
 *     summary: Tutup kas — hitung selisih dan simpan rekam penutupan
 */
cashierRouter.post(
  "/close",
  requireCashierWrite,
  validate([
    body("closingDate").isString().trim().notEmpty(),
    body("cashierName").isString().trim().notEmpty(),
    body("openingBalance").isFloat({ min: 0 }),
    body("countedCashTotal").isFloat({ min: 0 }),
    body("notes").optional({ values: "falsy" }).isString(),
  ]),
  async (req, res, next) => {
    try {
      const closing = await CashierService.closeShift({
        closingDate: isoDate(req.body.closingDate),
        cashierName: req.body.cashierName,
        openingBalance: Number(req.body.openingBalance),
        countedCashTotal: Number(req.body.countedCashTotal),
        notes: req.body.notes,
      })
      sendSuccess(res, closing, 201)
    } catch (error) {
      next(error)
    }
  },
)
