import { Router } from "express"
import { collectionPermissions } from "../config/collectionPermissions"
import { requireRole } from "../middlewares/auth"
import { validate } from "../middlewares/validate"
import { body } from "express-validator"
import { ProcurementService } from "../services/procurementService"
import { sendSuccess } from "../utils/apiResponse"

export const procurementRouter = Router()

const requireProcurementWrite = requireRole(...collectionPermissions.purchaseOrders.write)

/**
 * @openapi
 * /purchase-orders/{id}/receive:
 *   post:
 *     tags: [Procurement]
 *     summary: Terima barang dari purchase order (menambah stok obat)
 *     responses:
 *       200: { description: PO diperbarui }
 */
procurementRouter.post(
  "/:id/receive",
  requireProcurementWrite,
  validate([
    body("items").isArray({ min: 1 }),
    body("items.*.medicineId").isString().trim().notEmpty(),
    body("items.*.receivedQuantity").isInt({ min: 1 }),
    body("items.*.batchNumber").isString().trim().notEmpty(),
    body("items.*.expiryDate").isString().trim().notEmpty(),
    body("items.*.buyPrice").optional().isFloat({ min: 0 }),
  ]),
  async (req, res, next) => {
    try {
      const updated = await ProcurementService.receivePurchaseOrder(req.params.id, req.body.items)
      sendSuccess(res, updated)
    } catch (error) {
      next(error)
    }
  },
)
