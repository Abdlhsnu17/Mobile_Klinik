"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.procurementRouter = void 0;
const express_1 = require("express");
const collectionPermissions_1 = require("../config/collectionPermissions");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const express_validator_1 = require("express-validator");
const procurementService_1 = require("../services/procurementService");
const apiResponse_1 = require("../utils/apiResponse");
exports.procurementRouter = (0, express_1.Router)();
const requireProcurementWrite = (0, auth_1.requireRole)(...collectionPermissions_1.collectionPermissions.purchaseOrders.write);
/**
 * @openapi
 * /purchase-orders/{id}/receive:
 *   post:
 *     tags: [Procurement]
 *     summary: Terima barang dari purchase order (menambah stok obat)
 *     responses:
 *       200: { description: PO diperbarui }
 */
exports.procurementRouter.post("/:id/receive", requireProcurementWrite, (0, validate_1.validate)([
    (0, express_validator_1.body)("items").isArray({ min: 1 }),
    (0, express_validator_1.body)("items.*.medicineId").isString().trim().notEmpty(),
    (0, express_validator_1.body)("items.*.receivedQuantity").isInt({ min: 1 }),
    (0, express_validator_1.body)("items.*.batchNumber").isString().trim().notEmpty(),
    (0, express_validator_1.body)("items.*.expiryDate").isString().trim().notEmpty(),
    (0, express_validator_1.body)("items.*.buyPrice").optional().isFloat({ min: 0 }),
]), async (req, res, next) => {
    try {
        const updated = await procurementService_1.ProcurementService.receivePurchaseOrder(req.params.id, req.body.items);
        (0, apiResponse_1.sendSuccess)(res, updated);
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=procurement.js.map