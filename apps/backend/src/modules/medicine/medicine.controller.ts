import type { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../utils/apiResponse';
import { AuditService } from '../../services/auditService';
import { medicineService } from './medicine.service';

const getStockMovements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const medicineId = typeof req.query.medicineId === 'string' ? req.query.medicineId : undefined;
    const movements = await medicineService.getStockMovements(limit, medicineId);
    sendSuccess(res, movements);
  } catch (error) {
    next(error);
  }
};

const adjustStock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason, quantityChange, countedStock, batchId, notes } = req.body;
    const { medicine, quantityChange: appliedChange } = await medicineService.adjustStock({
      medicineId: req.params.id,
      reason,
      quantityChange: quantityChange === undefined ? undefined : Number(quantityChange),
      countedStock: countedStock === undefined ? undefined : Number(countedStock),
      batchId,
      notes,
    });

    await AuditService.record({
      collection: 'medicines',
      itemId: medicine.id,
      action: 'update',
      user: req.user,
      before: { stock: medicine.stock - appliedChange },
      after: { stock: medicine.stock },
      reason: notes ? `${reason}: ${notes}` : reason,
    });

    sendSuccess(res, medicine);
  } catch (error) {
    next(error);
  }
};

const getBatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const medicineId = typeof req.query.medicineId === 'string' ? req.query.medicineId : undefined;
    const batches = await medicineService.getBatches(medicineId);
    sendSuccess(res, batches);
  } catch (error) {
    next(error);
  }
};

const receiveBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { batchNumber, expiryDate, quantity, buyPrice, supplier, notes } = req.body;
    const { medicine, batch } = await medicineService.receiveBatch({
      medicineId: req.params.id,
      batchNumber,
      expiryDate,
      quantity: Number(quantity),
      buyPrice: buyPrice === undefined ? undefined : Number(buyPrice),
      supplier,
      notes,
    });

    await AuditService.record({
      collection: 'medicines',
      itemId: medicine.id,
      action: 'update',
      user: req.user,
      before: { stock: medicine.stock - batch.quantity },
      after: { stock: medicine.stock },
      reason: `receipt: batch ${batch.batchNumber} (${batch.quantity})`,
    });

    sendSuccess(res, batch, 201);
  } catch (error) {
    next(error);
  }
};

export const medicineController = {
  getStockMovements,
  adjustStock,
  getBatches,
  receiveBatch,
};
