"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cashierRouter = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const collectionPermissions_1 = require("../config/collectionPermissions");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const cashierService_1 = require("../services/cashierService");
const apiResponse_1 = require("../utils/apiResponse");
exports.cashierRouter = (0, express_1.Router)();
const requireCashierAccess = (0, auth_1.requireRole)(...collectionPermissions_1.collectionPermissions.cashierClosings.read);
const requireCashierWrite = (0, auth_1.requireRole)(...collectionPermissions_1.collectionPermissions.cashierClosings.write);
function isoDate(value) {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value))
        return value.slice(0, 10);
    return new Date().toISOString().slice(0, 10);
}
/**
 * @openapi
 * /cashier/summary:
 *   get:
 *     tags: [Cashier]
 *     summary: Ringkasan kas untuk satu tanggal
 */
exports.cashierRouter.get("/summary", requireCashierAccess, async (req, res, next) => {
    try {
        const summary = await cashierService_1.CashierService.getDailySummary(isoDate(req.query.date));
        (0, apiResponse_1.sendSuccess)(res, summary);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /cashier/close:
 *   post:
 *     tags: [Cashier]
 *     summary: Tutup kas — hitung selisih dan simpan rekam penutupan
 */
exports.cashierRouter.post("/close", requireCashierWrite, (0, validate_1.validate)([
    (0, express_validator_1.body)("closingDate").isString().trim().notEmpty(),
    (0, express_validator_1.body)("cashierName").isString().trim().notEmpty(),
    (0, express_validator_1.body)("openingBalance").isFloat({ min: 0 }),
    (0, express_validator_1.body)("countedCashTotal").isFloat({ min: 0 }),
    (0, express_validator_1.body)("notes").optional({ values: "falsy" }).isString(),
]), async (req, res, next) => {
    try {
        const closing = await cashierService_1.CashierService.closeShift({
            closingDate: isoDate(req.body.closingDate),
            cashierName: req.body.cashierName,
            openingBalance: Number(req.body.openingBalance),
            countedCashTotal: Number(req.body.countedCashTotal),
            notes: req.body.notes,
        });
        (0, apiResponse_1.sendSuccess)(res, closing, 201);
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=cashier.js.map