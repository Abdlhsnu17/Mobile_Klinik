"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.medicineController = void 0;
const apiResponse_1 = require("../../utils/apiResponse");
const auditService_1 = require("../../services/auditService");
const medicine_service_1 = require("./medicine.service");
const getStockMovements = async (req, res, next) => {
    try {
        const limit = req.query.limit ? Number(req.query.limit) : undefined;
        const medicineId = typeof req.query.medicineId === 'string' ? req.query.medicineId : undefined;
        const movements = await medicine_service_1.medicineService.getStockMovements(limit, medicineId);
        (0, apiResponse_1.sendSuccess)(res, movements);
    }
    catch (error) {
        next(error);
    }
};
const adjustStock = async (req, res, next) => {
    try {
        const { reason, quantityChange, countedStock, batchId, notes } = req.body;
        const { medicine, quantityChange: appliedChange } = await medicine_service_1.medicineService.adjustStock({
            medicineId: req.params.id,
            reason,
            quantityChange: quantityChange === undefined ? undefined : Number(quantityChange),
            countedStock: countedStock === undefined ? undefined : Number(countedStock),
            batchId,
            notes,
        });
        await auditService_1.AuditService.record({
            collection: 'medicines',
            itemId: medicine.id,
            action: 'update',
            user: req.user,
            before: { stock: medicine.stock - appliedChange },
            after: { stock: medicine.stock },
            reason: notes ? `${reason}: ${notes}` : reason,
        });
        (0, apiResponse_1.sendSuccess)(res, medicine);
    }
    catch (error) {
        next(error);
    }
};
const getBatches = async (req, res, next) => {
    try {
        const medicineId = typeof req.query.medicineId === 'string' ? req.query.medicineId : undefined;
        const batches = await medicine_service_1.medicineService.getBatches(medicineId);
        (0, apiResponse_1.sendSuccess)(res, batches);
    }
    catch (error) {
        next(error);
    }
};
const receiveBatch = async (req, res, next) => {
    try {
        const { batchNumber, expiryDate, quantity, buyPrice, supplier, notes } = req.body;
        const { medicine, batch } = await medicine_service_1.medicineService.receiveBatch({
            medicineId: req.params.id,
            batchNumber,
            expiryDate,
            quantity: Number(quantity),
            buyPrice: buyPrice === undefined ? undefined : Number(buyPrice),
            supplier,
            notes,
        });
        await auditService_1.AuditService.record({
            collection: 'medicines',
            itemId: medicine.id,
            action: 'update',
            user: req.user,
            before: { stock: medicine.stock - batch.quantity },
            after: { stock: medicine.stock },
            reason: `receipt: batch ${batch.batchNumber} (${batch.quantity})`,
        });
        (0, apiResponse_1.sendSuccess)(res, batch, 201);
    }
    catch (error) {
        next(error);
    }
};
exports.medicineController = {
    getStockMovements,
    adjustStock,
    getBatches,
    receiveBatch,
};
//# sourceMappingURL=medicine.controller.js.map