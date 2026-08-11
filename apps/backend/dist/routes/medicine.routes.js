"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const collectionPermissions_1 = require("../config/collectionPermissions");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const medicine_1 = require("../modules/medicine");
const router = (0, express_1.Router)();
// CRUD obat (create/read/update/delete) dilayani oleh generic collection route
// ("/medicines" via registerCollectionRoutes di index.ts), yang sudah punya
// validasi dan role permission untuk collection "medicines". Router ini hanya
// menangani endpoint tambahan yang tidak dicakup collection route tersebut,
// dan harus dimount SEBELUM registerCollectionRoutes agar tidak tertutup
// oleh pola generic "/:id".
router.get('/stock-movements', (0, auth_1.requireRole)(...collectionPermissions_1.collectionPermissions.medicines.read), medicine_1.medicineController.getStockMovements);
/**
 * @openapi
 * /medicines/{id}/stock-adjustment:
 *   post:
 *     tags: [Medicines]
 *     summary: Koreksi stok obat (penyesuaian manual atau hasil stock opname)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string, enum: [adjustment, stock-opname] }
 *               quantityChange: { type: number, description: "Selisih stok (+/-), wajib untuk reason 'adjustment'" }
 *               countedStock: { type: number, description: "Hasil hitung fisik, wajib untuk reason 'stock-opname'" }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Stok berhasil dikoreksi }
 *       400: { description: Data tidak valid atau tidak ada selisih stok }
 *       404: { description: Obat tidak ditemukan }
 *       409: { description: Penyesuaian membuat stok negatif }
 */
/**
 * @openapi
 * /medicines/batches:
 *   get:
 *     tags: [Medicines]
 *     summary: Daftar batch obat (opsional difilter per obat)
 *     parameters:
 *       - in: query
 *         name: medicineId
 *         schema: { type: string }
 *     responses:
 *       200: { description: Daftar batch }
 */
router.get('/batches', (0, auth_1.requireRole)(...collectionPermissions_1.collectionPermissions.medicines.read), medicine_1.medicineController.getBatches);
/**
 * @openapi
 * /medicines/{id}/batches:
 *   post:
 *     tags: [Medicines]
 *     summary: Catat penerimaan batch obat baru dari supplier
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [batchNumber, expiryDate, quantity]
 *             properties:
 *               batchNumber: { type: string }
 *               expiryDate: { type: string, format: date }
 *               quantity: { type: integer, minimum: 1 }
 *               buyPrice: { type: number }
 *               supplier: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Batch tercatat }
 *       400: { description: Data tidak valid }
 *       404: { description: Obat tidak ditemukan }
 */
router.post('/:id/batches', (0, auth_1.requireRole)(...collectionPermissions_1.collectionPermissions.medicines.write), (0, validate_1.validate)([
    (0, express_validator_1.body)('batchNumber').isString().trim().notEmpty(),
    (0, express_validator_1.body)('expiryDate').isISO8601().withMessage('expiryDate harus berformat tanggal YYYY-MM-DD'),
    (0, express_validator_1.body)('quantity').isInt({ min: 1 }),
    (0, express_validator_1.body)('buyPrice').optional().isFloat({ min: 0 }),
    (0, express_validator_1.body)('supplier').optional({ values: 'falsy' }).isString().trim(),
    (0, express_validator_1.body)('notes').optional({ values: 'falsy' }).isString().trim(),
]), medicine_1.medicineController.receiveBatch);
router.post('/:id/stock-adjustment', (0, auth_1.requireRole)(...collectionPermissions_1.collectionPermissions.medicines.write), (0, validate_1.validate)([
    (0, express_validator_1.body)('reason').isIn(['adjustment', 'stock-opname']),
    (0, express_validator_1.body)('batchId').optional({ values: 'falsy' }).isString().trim(),
    (0, express_validator_1.body)('quantityChange')
        .if((0, express_validator_1.body)('reason').equals('adjustment'))
        .isInt()
        .withMessage('quantityChange wajib berupa bilangan bulat untuk penyesuaian manual'),
    (0, express_validator_1.body)('countedStock')
        .if((0, express_validator_1.body)('reason').equals('stock-opname'))
        .isInt({ min: 0 })
        .withMessage('countedStock wajib berupa bilangan bulat >= 0 untuk stock opname'),
    (0, express_validator_1.body)('notes').optional({ values: 'falsy' }).isString().trim(),
]), medicine_1.medicineController.adjustStock);
exports.default = router;
//# sourceMappingURL=medicine.routes.js.map