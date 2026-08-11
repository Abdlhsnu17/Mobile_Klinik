"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.medicineRepository = void 0;
const database_1 = __importDefault(require("@sistem-klinik/database"));
const findById = async (id) => {
    const [rows] = await database_1.default.query('SELECT * FROM medicines WHERE id = ?', [id]);
    if (!Array.isArray(rows) || rows.length === 0) {
        return null;
    }
    return rows[0];
};
const update = async (id, data) => {
    await database_1.default.query('UPDATE medicines SET ? WHERE id = ?', [data, id]);
};
const recordStockMovement = async (payload) => {
    await database_1.default.query(`INSERT INTO stock_movements (medicineId, batchId, quantityChange, reason, referenceId, notes)
     VALUES (?, ?, ?, ?, ?, ?)`, [
        payload.medicineId,
        payload.batchId ?? null,
        payload.quantityChange,
        payload.reason,
        payload.referenceId ?? null,
        payload.notes ?? null,
    ]);
};
const findStockMovements = async (limit = 100, medicineId) => {
    const safeLimit = Math.max(1, Math.min(limit, 500));
    const [rows] = await database_1.default.query(`SELECT
       sm.id,
       sm.medicineId,
       m.name as medicineName,
       sm.batchId,
       b.batchNumber,
       sm.quantityChange,
       sm.reason,
       sm.referenceId,
       sm.notes,
       sm.createdAt
     FROM stock_movements sm
     LEFT JOIN medicines m ON m.id = sm.medicineId
     LEFT JOIN medicine_batches b ON b.id = sm.batchId
     ${medicineId ? 'WHERE sm.medicineId = ?' : ''}
     ORDER BY sm.createdAt DESC, sm.id DESC
     LIMIT ?`, medicineId ? [medicineId, safeLimit] : [safeLimit]);
    return rows;
};
/**
 * Batch mana saja yang terpakai saat sebuah permintaan farmasi diserahkan.
 * Dibaca ulang dari kartu stok saat penyerahan dibatalkan, supaya stok kembali
 * ke batch asalnya tanpa perlu menyimpan alokasi di tabel permintaan farmasi.
 */
const findDispenseAllocations = async (referenceId) => {
    const [rows] = await database_1.default.query(`SELECT medicineId, batchId, SUM(-quantityChange) as quantity
     FROM stock_movements
     WHERE referenceId = ? AND reason = 'dispense'
     GROUP BY medicineId, batchId`, [referenceId]);
    return rows.map((row) => ({
        medicineId: row.medicineId,
        batchId: row.batchId,
        quantity: Number(row.quantity),
    }));
};
const findBatches = async (medicineId) => {
    const [rows] = await database_1.default.query(`SELECT b.*, m.name as medicineName
     FROM medicine_batches b
     LEFT JOIN medicines m ON m.id = b.medicineId
     ${medicineId ? 'WHERE b.medicineId = ?' : ''}
     ORDER BY b.expiryDate ASC, b.receivedAt ASC`, medicineId ? [medicineId] : []);
    return rows;
};
/**
 * Batch yang masih layak diserahkan, diurutkan sesuai FEFO: kedaluwarsa terdekat
 * lebih dulu, lalu yang lebih dulu diterima. Batch yang sudah lewat tanggal
 * kedaluwarsa sengaja tidak ikut supaya tidak pernah terpilih saat dispensing.
 */
const findDispensableBatches = async (medicineId) => {
    const [rows] = await database_1.default.query(`SELECT * FROM medicine_batches
     WHERE medicineId = ? AND quantity > 0 AND expiryDate >= CURDATE()
     ORDER BY expiryDate ASC, receivedAt ASC`, [medicineId]);
    return rows;
};
const createBatch = async (payload) => {
    await database_1.default.query(`INSERT INTO medicine_batches
       (id, medicineId, batchNumber, expiryDate, quantity, initialQuantity, buyPrice, supplier, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        payload.id,
        payload.medicineId,
        payload.batchNumber,
        payload.expiryDate,
        payload.quantity,
        payload.quantity,
        payload.buyPrice ?? 0,
        payload.supplier ?? null,
        payload.notes ?? null,
    ]);
};
const findBatchById = async (id) => {
    const [rows] = await database_1.default.query('SELECT * FROM medicine_batches WHERE id = ?', [id]);
    if (!Array.isArray(rows) || rows.length === 0)
        return null;
    return rows[0];
};
/**
 * Mengubah sisa batch secara relatif. Syarat `quantity + ? >= 0` dievaluasi
 * oleh MySQL dalam satu pernyataan, sehingga dua dispensing yang berbarengan
 * tidak bisa sama-sama lolos dan membuat sisa batch menjadi negatif.
 * Mengembalikan `false` bila tidak ada baris yang berubah.
 */
const changeBatchQuantity = async (batchId, quantityChange) => {
    const [result] = await database_1.default.query(`UPDATE medicine_batches
     SET quantity = quantity + ?
     WHERE id = ? AND quantity + ? >= 0`, [quantityChange, batchId, quantityChange]);
    return result.affectedRows === 1;
};
const sumBatchQuantity = async (medicineId) => {
    const [rows] = await database_1.default.query('SELECT COALESCE(SUM(quantity), 0) as total FROM medicine_batches WHERE medicineId = ?', [medicineId]);
    const total = rows[0]?.total ?? 0;
    return Number(total);
};
const countBatches = async (medicineId) => {
    const [rows] = await database_1.default.query('SELECT COUNT(*) as total FROM medicine_batches WHERE medicineId = ?', [medicineId]);
    return Number(rows[0]?.total ?? 0);
};
exports.medicineRepository = {
    findById,
    update,
    recordStockMovement,
    findStockMovements,
    findDispenseAllocations,
    findBatches,
    findDispensableBatches,
    createBatch,
    findBatchById,
    changeBatchQuantity,
    sumBatchQuantity,
    countBatches,
};
//# sourceMappingURL=medicine.repository.js.map