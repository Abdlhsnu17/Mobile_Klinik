"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.medicineService = void 0;
const crypto_1 = require("crypto");
const httpError_1 = require("../../utils/httpError");
const medicine_repository_1 = require("./medicine.repository");
/**
 * Updates an existing medicine record.
 * @param id The ID of the medicine to update.
 * @param payload The data to update.
 * @returns The complete updated medicine data.
 */
const update = async (id, payload) => {
    const existingMedicine = await medicine_repository_1.medicineRepository.findById(id);
    if (!existingMedicine) {
        throw (0, httpError_1.createHttpError)(404, 'Obat tidak ditemukan.');
    }
    // Kolom `updatedAt` di tabel `medicines` sudah ON UPDATE CURRENT_TIMESTAMP,
    // jadi tidak perlu (dan tidak boleh) dikirim manual: MySQL menolak string
    // ISO 8601 ("...T...Z") untuk kolom datetime, hanya menerima "YYYY-MM-DD HH:MM:SS".
    const updateData = {
        ...payload,
    };
    // Automatically update status based on stock if stock is being changed
    if (typeof payload.stock === 'number') {
        const minStock = payload.minStock ?? existingMedicine.minStock;
        if (payload.stock <= 0) {
            updateData.status = 'Habis';
        }
        else if (payload.stock <= minStock) {
            updateData.status = 'Stok Rendah';
        }
        else {
            updateData.status = 'Tersedia';
        }
    }
    await medicine_repository_1.medicineRepository.update(id, updateData);
    const updatedMedicine = await medicine_repository_1.medicineRepository.findById(id);
    if (!updatedMedicine) {
        throw (0, httpError_1.createHttpError)(500, 'Gagal mengambil data obat setelah proses pembaruan.');
    }
    return updatedMedicine;
};
const getStockMovements = async (limit, medicineId) => {
    return medicine_repository_1.medicineRepository.findStockMovements(limit, medicineId);
};
/**
 * Koreksi stok manual di luar alur dispense/retur resep: penyesuaian bebas
 * (barang rusak, hibah, salah input) maupun hasil stock opname fisik.
 *
 * Selisih selalu ditulis ke `stock_movements` supaya kartu stok tetap utuh —
 * inilah alasan stok tidak boleh diubah lewat PUT /medicines biasa.
 *
 * Untuk obat yang sudah punya batch, koreksi wajib menunjuk satu batch: kalau
 * hanya agregat `medicines.stock` yang diubah, angkanya akan menyimpang dari
 * total rincian batch pada sinkronisasi berikutnya.
 */
const adjustStock = async (input) => {
    const medicine = await medicine_repository_1.medicineRepository.findById(input.medicineId);
    if (!medicine) {
        throw (0, httpError_1.createHttpError)(404, 'Obat tidak ditemukan.');
    }
    const batchCount = (await medicine_repository_1.medicineRepository.countBatches(input.medicineId)) ?? 0;
    if (batchCount > 0 && !input.batchId) {
        throw (0, httpError_1.createHttpError)(400, `${medicine.name} sudah dikelola per batch. Pilih batch yang akan dikoreksi.`);
    }
    const batch = input.batchId ? await medicine_repository_1.medicineRepository.findBatchById(input.batchId) : null;
    if (input.batchId && (!batch || batch.medicineId !== medicine.id)) {
        throw (0, httpError_1.createHttpError)(404, 'Batch obat tidak ditemukan.');
    }
    // Opname mencatat hasil hitung fisik, jadi selisihnya diturunkan dari jumlah
    // tercatat saat ini; adjustment sudah menyatakan selisihnya secara langsung.
    const recordedQuantity = batch ? batch.quantity : medicine.stock;
    const quantityChange = input.reason === 'stock-opname'
        ? input.countedStock - recordedQuantity
        : input.quantityChange;
    if (quantityChange === 0) {
        throw (0, httpError_1.createHttpError)(400, 'Tidak ada selisih stok yang perlu dicatat.');
    }
    if (recordedQuantity + quantityChange < 0) {
        throw (0, httpError_1.createHttpError)(409, `Penyesuaian membuat stok ${medicine.name} menjadi negatif. Jumlah tercatat: ${recordedQuantity}, perubahan: ${quantityChange}.`);
    }
    let updated;
    if (batch) {
        const applied = await medicine_repository_1.medicineRepository.changeBatchQuantity(batch.id, quantityChange);
        if (!applied) {
            throw (0, httpError_1.createHttpError)(409, 'Sisa batch berubah saat koreksi diproses. Muat ulang lalu coba lagi.');
        }
        updated = await syncStockFromBatches(medicine.id);
    }
    else {
        updated = await update(medicine.id, { stock: medicine.stock + quantityChange });
    }
    await medicine_repository_1.medicineRepository.recordStockMovement({
        medicineId: medicine.id,
        batchId: batch?.id,
        quantityChange,
        reason: input.reason,
        notes: input.notes,
    });
    return { medicine: updated, quantityChange };
};
const getBatches = async (medicineId) => {
    return medicine_repository_1.medicineRepository.findBatches(medicineId);
};
/**
 * Menyelaraskan `medicines.stock` dengan total sisa seluruh batch. Dipanggil
 * setiap kali batch berubah supaya angka agregat yang dibaca modul lain
 * (depo farmasi, dashboard, laporan) tidak pernah menyimpang dari rincian batch.
 */
const syncStockFromBatches = async (medicineId) => {
    const total = await medicine_repository_1.medicineRepository.sumBatchQuantity(medicineId);
    return update(medicineId, { stock: total });
};
/** Mencatat penerimaan barang dari supplier sebagai batch baru. */
const receiveBatch = async (input) => {
    const medicine = await medicine_repository_1.medicineRepository.findById(input.medicineId);
    if (!medicine) {
        throw (0, httpError_1.createHttpError)(404, 'Obat tidak ditemukan.');
    }
    if (input.quantity <= 0) {
        throw (0, httpError_1.createHttpError)(400, 'Jumlah penerimaan batch harus lebih dari nol.');
    }
    const batchId = `BATCH-${(0, crypto_1.randomUUID)()}`;
    await medicine_repository_1.medicineRepository.createBatch({
        id: batchId,
        medicineId: medicine.id,
        batchNumber: input.batchNumber,
        expiryDate: input.expiryDate,
        quantity: input.quantity,
        buyPrice: input.buyPrice,
        supplier: input.supplier,
        notes: input.notes,
    });
    await medicine_repository_1.medicineRepository.recordStockMovement({
        medicineId: medicine.id,
        batchId,
        quantityChange: input.quantity,
        reason: 'receipt',
        notes: input.notes ?? `Penerimaan batch ${input.batchNumber}`,
    });
    const updatedMedicine = await syncStockFromBatches(medicine.id);
    const batch = await medicine_repository_1.medicineRepository.findBatchById(batchId);
    if (!batch) {
        throw (0, httpError_1.createHttpError)(500, 'Gagal mengambil data batch setelah penerimaan.');
    }
    return { medicine: updatedMedicine, batch };
};
/**
 * Mengurangi stok untuk penyerahan resep dengan urutan FEFO: batch yang paling
 * cepat kedaluwarsa dihabiskan lebih dulu.
 *
 * Obat lama yang belum punya batch sama sekali tetap dilayani lewat pengurangan
 * `medicines.stock` seperti sebelumnya, sehingga data yang ada sekarang tidak
 * perlu dimigrasi lebih dulu agar apotek bisa terus melayani.
 *
 * Mengembalikan rincian batch yang terpakai supaya pemanggil bisa mencatatnya.
 */
const consumeStockFefo = async (params) => {
    const medicine = await medicine_repository_1.medicineRepository.findById(params.medicineId);
    if (!medicine) {
        throw (0, httpError_1.createHttpError)(404, 'Obat tidak ditemukan.');
    }
    const batches = (await medicine_repository_1.medicineRepository.findDispensableBatches(params.medicineId)) ?? [];
    if (batches.length === 0) {
        const hasAnyBatch = (await medicine_repository_1.medicineRepository.countBatches(params.medicineId)) ?? 0;
        if (hasAnyBatch > 0) {
            throw (0, httpError_1.createHttpError)(409, `Tidak ada batch ${medicine.name} yang masih berlaku. Periksa tanggal kedaluwarsa di kartu stok.`);
        }
        // Jalur kompatibilitas untuk obat yang belum dipecah per batch.
        if (medicine.stock < params.quantity) {
            throw (0, httpError_1.createHttpError)(409, `Stok ${medicine.name} tidak cukup. Tersedia: ${medicine.stock}, diminta: ${params.quantity}.`);
        }
        await update(medicine.id, { stock: medicine.stock - params.quantity });
        await medicine_repository_1.medicineRepository.recordStockMovement({
            medicineId: medicine.id,
            quantityChange: -params.quantity,
            reason: 'dispense',
            referenceId: params.referenceId,
            notes: params.notes,
        });
        return [{ batchId: null, batchNumber: null, quantity: params.quantity }];
    }
    const available = batches.reduce((total, batch) => total + batch.quantity, 0);
    if (available < params.quantity) {
        throw (0, httpError_1.createHttpError)(409, `Stok ${medicine.name} yang masih berlaku tidak cukup. Tersedia: ${available}, diminta: ${params.quantity}.`);
    }
    const consumed = [];
    let remaining = params.quantity;
    for (const batch of batches) {
        if (remaining <= 0)
            break;
        const takeFromBatch = Math.min(batch.quantity, remaining);
        const applied = await medicine_repository_1.medicineRepository.changeBatchQuantity(batch.id, -takeFromBatch);
        if (!applied) {
            // Batch keburu dipakai transaksi lain sejak dibaca; lanjut ke batch berikutnya
            // dan biarkan sisa permintaan dipenuhi dari sana.
            continue;
        }
        await medicine_repository_1.medicineRepository.recordStockMovement({
            medicineId: medicine.id,
            batchId: batch.id,
            quantityChange: -takeFromBatch,
            reason: 'dispense',
            referenceId: params.referenceId,
            notes: params.notes,
        });
        consumed.push({ batchId: batch.id, batchNumber: batch.batchNumber, quantity: takeFromBatch });
        remaining -= takeFromBatch;
    }
    if (remaining > 0) {
        throw (0, httpError_1.createHttpError)(409, `Stok ${medicine.name} berubah saat penyerahan diproses. Ulangi penyerahan resep ini.`);
    }
    await syncStockFromBatches(medicine.id);
    return consumed;
};
/**
 * Mengembalikan stok ke batch asalnya saat penyerahan dibatalkan. Bila mutasi
 * aslinya tidak terikat batch (obat lama), stok agregat yang dikembalikan.
 */
const returnStockToBatches = async (params) => {
    const medicine = await medicine_repository_1.medicineRepository.findById(params.medicineId);
    if (!medicine) {
        throw (0, httpError_1.createHttpError)(404, 'Obat tidak ditemukan.');
    }
    for (const entry of params.entries) {
        if (entry.batchId) {
            await medicine_repository_1.medicineRepository.changeBatchQuantity(entry.batchId, entry.quantity);
        }
        await medicine_repository_1.medicineRepository.recordStockMovement({
            medicineId: medicine.id,
            batchId: entry.batchId ?? undefined,
            quantityChange: entry.quantity,
            reason: 'adjustment',
            referenceId: params.referenceId,
            notes: params.notes,
        });
    }
    const hasBatches = (await medicine_repository_1.medicineRepository.countBatches(params.medicineId)) ?? 0;
    if (hasBatches > 0) {
        await syncStockFromBatches(medicine.id);
        return;
    }
    const returnedTotal = params.entries.reduce((total, entry) => total + entry.quantity, 0);
    await update(medicine.id, { stock: medicine.stock + returnedTotal });
};
exports.medicineService = {
    getStockMovements,
    update,
    adjustStock,
    getBatches,
    receiveBatch,
    consumeStockFefo,
    returnStockToBatches,
    syncStockFromBatches,
};
//# sourceMappingURL=medicine.service.js.map