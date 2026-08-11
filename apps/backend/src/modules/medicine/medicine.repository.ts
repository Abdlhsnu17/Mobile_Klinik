import type { Medicine, MedicineBatch, StockMovement, StockMovementReason } from "@sistem-klinik/types";
import db from "@sistem-klinik/database";

type StockMovementPayload = {
  medicineId: string;
  batchId?: string;
  quantityChange: number;
  reason: StockMovementReason;
  referenceId?: string;
  notes?: string;
};

type CreateBatchPayload = {
  id: string;
  medicineId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  buyPrice?: number;
  supplier?: string;
  notes?: string;
};

const findById = async (id: string): Promise<Medicine | null> => {
  const [rows] = await db.query('SELECT * FROM medicines WHERE id = ?', [id]);
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }
  return (rows as Medicine[])[0];
};

const update = async (id: string, data: Partial<Medicine>): Promise<void> => {
  await db.query('UPDATE medicines SET ? WHERE id = ?', [data, id]);
};

const recordStockMovement = async (payload: StockMovementPayload): Promise<void> => {
  await db.query(
    `INSERT INTO stock_movements (medicineId, batchId, quantityChange, reason, referenceId, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      payload.medicineId,
      payload.batchId ?? null,
      payload.quantityChange,
      payload.reason,
      payload.referenceId ?? null,
      payload.notes ?? null,
    ],
  );
};

const findStockMovements = async (limit = 100, medicineId?: string): Promise<StockMovement[]> => {
  const safeLimit = Math.max(1, Math.min(limit, 500));
  const [rows] = await db.query(
    `SELECT
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
     LIMIT ?`,
    medicineId ? [medicineId, safeLimit] : [safeLimit],
  );
  return rows as StockMovement[];
};

/**
 * Batch mana saja yang terpakai saat sebuah permintaan farmasi diserahkan.
 * Dibaca ulang dari kartu stok saat penyerahan dibatalkan, supaya stok kembali
 * ke batch asalnya tanpa perlu menyimpan alokasi di tabel permintaan farmasi.
 */
const findDispenseAllocations = async (
  referenceId: string,
): Promise<{ medicineId: string; batchId: string | null; quantity: number }[]> => {
  const [rows] = await db.query(
    `SELECT medicineId, batchId, SUM(-quantityChange) as quantity
     FROM stock_movements
     WHERE referenceId = ? AND reason = 'dispense'
     GROUP BY medicineId, batchId`,
    [referenceId],
  );
  return (rows as { medicineId: string; batchId: string | null; quantity: number | string }[]).map((row) => ({
    medicineId: row.medicineId,
    batchId: row.batchId,
    quantity: Number(row.quantity),
  }));
};

const findBatches = async (medicineId?: string): Promise<MedicineBatch[]> => {
  const [rows] = await db.query(
    `SELECT b.*, m.name as medicineName
     FROM medicine_batches b
     LEFT JOIN medicines m ON m.id = b.medicineId
     ${medicineId ? 'WHERE b.medicineId = ?' : ''}
     ORDER BY b.expiryDate ASC, b.receivedAt ASC`,
    medicineId ? [medicineId] : [],
  );
  return rows as MedicineBatch[];
};

/**
 * Batch yang masih layak diserahkan, diurutkan sesuai FEFO: kedaluwarsa terdekat
 * lebih dulu, lalu yang lebih dulu diterima. Batch yang sudah lewat tanggal
 * kedaluwarsa sengaja tidak ikut supaya tidak pernah terpilih saat dispensing.
 */
const findDispensableBatches = async (medicineId: string): Promise<MedicineBatch[]> => {
  const [rows] = await db.query(
    `SELECT * FROM medicine_batches
     WHERE medicineId = ? AND quantity > 0 AND expiryDate >= CURDATE()
     ORDER BY expiryDate ASC, receivedAt ASC`,
    [medicineId],
  );
  return rows as MedicineBatch[];
};

const createBatch = async (payload: CreateBatchPayload): Promise<void> => {
  await db.query(
    `INSERT INTO medicine_batches
       (id, medicineId, batchNumber, expiryDate, quantity, initialQuantity, buyPrice, supplier, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.id,
      payload.medicineId,
      payload.batchNumber,
      payload.expiryDate,
      payload.quantity,
      payload.quantity,
      payload.buyPrice ?? 0,
      payload.supplier ?? null,
      payload.notes ?? null,
    ],
  );
};

const findBatchById = async (id: string): Promise<MedicineBatch | null> => {
  const [rows] = await db.query('SELECT * FROM medicine_batches WHERE id = ?', [id]);
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return (rows as MedicineBatch[])[0];
};

/**
 * Mengubah sisa batch secara relatif. Syarat `quantity + ? >= 0` dievaluasi
 * oleh MySQL dalam satu pernyataan, sehingga dua dispensing yang berbarengan
 * tidak bisa sama-sama lolos dan membuat sisa batch menjadi negatif.
 * Mengembalikan `false` bila tidak ada baris yang berubah.
 */
const changeBatchQuantity = async (batchId: string, quantityChange: number): Promise<boolean> => {
  const [result] = await db.query(
    `UPDATE medicine_batches
     SET quantity = quantity + ?
     WHERE id = ? AND quantity + ? >= 0`,
    [quantityChange, batchId, quantityChange],
  );
  return (result as { affectedRows?: number }).affectedRows === 1;
};

const sumBatchQuantity = async (medicineId: string): Promise<number> => {
  const [rows] = await db.query(
    'SELECT COALESCE(SUM(quantity), 0) as total FROM medicine_batches WHERE medicineId = ?',
    [medicineId],
  );
  const total = (rows as { total: number | string }[])[0]?.total ?? 0;
  return Number(total);
};

const countBatches = async (medicineId: string): Promise<number> => {
  const [rows] = await db.query(
    'SELECT COUNT(*) as total FROM medicine_batches WHERE medicineId = ?',
    [medicineId],
  );
  return Number((rows as { total: number | string }[])[0]?.total ?? 0);
};

export const medicineRepository = {
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
