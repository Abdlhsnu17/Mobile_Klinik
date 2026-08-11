import type {
    Medicine,
    MedicineBatch,
    ReceiveBatchPayload,
    StockMovement,
    StockMovementReason,
} from '@sistem-klinik/types';
import { randomUUID } from 'crypto';
import { createHttpError } from '../../utils/httpError';
import { medicineRepository } from './medicine.repository';

/**
 * Updates an existing medicine record.
 * @param id The ID of the medicine to update.
 * @param payload The data to update.
 * @returns The complete updated medicine data.
 */
const update = async (id: string, payload: Partial<Medicine>): Promise<Medicine> => {
    const existingMedicine = await medicineRepository.findById(id);
    if (!existingMedicine) {
        throw createHttpError(404, 'Obat tidak ditemukan.');
    }

    // Kolom `updatedAt` di tabel `medicines` sudah ON UPDATE CURRENT_TIMESTAMP,
    // jadi tidak perlu (dan tidak boleh) dikirim manual: MySQL menolak string
    // ISO 8601 ("...T...Z") untuk kolom datetime, hanya menerima "YYYY-MM-DD HH:MM:SS".
    const updateData: Partial<Medicine> = {
        ...payload,
    };
    
    // Automatically update status based on stock if stock is being changed
    if (typeof payload.stock === 'number') {
        const minStock = payload.minStock ?? existingMedicine.minStock;
        if (payload.stock <= 0) {
            updateData.status = 'Habis';
        } else if (payload.stock <= minStock) {
            updateData.status = 'Stok Rendah';
        } else {
            updateData.status = 'Tersedia';
        }
    }

    await medicineRepository.update(id, updateData);

    const updatedMedicine = await medicineRepository.findById(id);
    if (!updatedMedicine) {
        throw createHttpError(500, 'Gagal mengambil data obat setelah proses pembaruan.');
    }
    
    return updatedMedicine;
};

const getStockMovements = async (limit?: number, medicineId?: string): Promise<StockMovement[]> => {
    return medicineRepository.findStockMovements(limit, medicineId);
}

type AdjustStockInput = {
    medicineId: string
    /** "adjustment" memakai `quantityChange`, "stock-opname" memakai `countedStock`. */
    reason: Extract<StockMovementReason, 'adjustment' | 'stock-opname'>
    quantityChange?: number
    countedStock?: number
    /** Wajib bila obat sudah dipecah per batch: koreksi selalu menyasar satu batch. */
    batchId?: string
    notes?: string
}

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
const adjustStock = async (input: AdjustStockInput): Promise<{ medicine: Medicine; quantityChange: number }> => {
    const medicine = await medicineRepository.findById(input.medicineId);
    if (!medicine) {
        throw createHttpError(404, 'Obat tidak ditemukan.');
    }

    const batchCount = (await medicineRepository.countBatches(input.medicineId)) ?? 0;
    if (batchCount > 0 && !input.batchId) {
        throw createHttpError(
            400,
            `${medicine.name} sudah dikelola per batch. Pilih batch yang akan dikoreksi.`,
        );
    }

    const batch = input.batchId ? await medicineRepository.findBatchById(input.batchId) : null;
    if (input.batchId && (!batch || batch.medicineId !== medicine.id)) {
        throw createHttpError(404, 'Batch obat tidak ditemukan.');
    }

    // Opname mencatat hasil hitung fisik, jadi selisihnya diturunkan dari jumlah
    // tercatat saat ini; adjustment sudah menyatakan selisihnya secara langsung.
    const recordedQuantity = batch ? batch.quantity : medicine.stock;
    const quantityChange =
        input.reason === 'stock-opname'
            ? (input.countedStock as number) - recordedQuantity
            : (input.quantityChange as number);

    if (quantityChange === 0) {
        throw createHttpError(400, 'Tidak ada selisih stok yang perlu dicatat.');
    }

    if (recordedQuantity + quantityChange < 0) {
        throw createHttpError(
            409,
            `Penyesuaian membuat stok ${medicine.name} menjadi negatif. Jumlah tercatat: ${recordedQuantity}, perubahan: ${quantityChange}.`,
        );
    }

    let updated: Medicine;
    if (batch) {
        const applied = await medicineRepository.changeBatchQuantity(batch.id, quantityChange);
        if (!applied) {
            throw createHttpError(409, 'Sisa batch berubah saat koreksi diproses. Muat ulang lalu coba lagi.');
        }
        updated = await syncStockFromBatches(medicine.id);
    } else {
        updated = await update(medicine.id, { stock: medicine.stock + quantityChange });
    }

    await medicineRepository.recordStockMovement({
        medicineId: medicine.id,
        batchId: batch?.id,
        quantityChange,
        reason: input.reason,
        notes: input.notes,
    });

    return { medicine: updated, quantityChange };
};

const getBatches = async (medicineId?: string): Promise<MedicineBatch[]> => {
    return medicineRepository.findBatches(medicineId);
};

/**
 * Menyelaraskan `medicines.stock` dengan total sisa seluruh batch. Dipanggil
 * setiap kali batch berubah supaya angka agregat yang dibaca modul lain
 * (depo farmasi, dashboard, laporan) tidak pernah menyimpang dari rincian batch.
 */
const syncStockFromBatches = async (medicineId: string): Promise<Medicine> => {
    const total = await medicineRepository.sumBatchQuantity(medicineId);
    return update(medicineId, { stock: total });
};

type ReceiveBatchInput = ReceiveBatchPayload & { medicineId: string };

/** Mencatat penerimaan barang dari supplier sebagai batch baru. */
const receiveBatch = async (input: ReceiveBatchInput): Promise<{ medicine: Medicine; batch: MedicineBatch }> => {
    const medicine = await medicineRepository.findById(input.medicineId);
    if (!medicine) {
        throw createHttpError(404, 'Obat tidak ditemukan.');
    }
    if (input.quantity <= 0) {
        throw createHttpError(400, 'Jumlah penerimaan batch harus lebih dari nol.');
    }

    const batchId = `BATCH-${randomUUID()}`;
    await medicineRepository.createBatch({
        id: batchId,
        medicineId: medicine.id,
        batchNumber: input.batchNumber,
        expiryDate: input.expiryDate,
        quantity: input.quantity,
        buyPrice: input.buyPrice,
        supplier: input.supplier,
        notes: input.notes,
    });

    await medicineRepository.recordStockMovement({
        medicineId: medicine.id,
        batchId,
        quantityChange: input.quantity,
        reason: 'receipt',
        notes: input.notes ?? `Penerimaan batch ${input.batchNumber}`,
    });

    const updatedMedicine = await syncStockFromBatches(medicine.id);
    const batch = await medicineRepository.findBatchById(batchId);
    if (!batch) {
        throw createHttpError(500, 'Gagal mengambil data batch setelah penerimaan.');
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
const consumeStockFefo = async (params: {
    medicineId: string
    quantity: number
    referenceId?: string
    notes?: string
}): Promise<{ batchId: string | null; batchNumber: string | null; quantity: number }[]> => {
    const medicine = await medicineRepository.findById(params.medicineId);
    if (!medicine) {
        throw createHttpError(404, 'Obat tidak ditemukan.');
    }

    const batches = (await medicineRepository.findDispensableBatches(params.medicineId)) ?? [];

    if (batches.length === 0) {
        const hasAnyBatch = (await medicineRepository.countBatches(params.medicineId)) ?? 0;
        if (hasAnyBatch > 0) {
            throw createHttpError(
                409,
                `Tidak ada batch ${medicine.name} yang masih berlaku. Periksa tanggal kedaluwarsa di kartu stok.`,
            );
        }

        // Jalur kompatibilitas untuk obat yang belum dipecah per batch.
        if (medicine.stock < params.quantity) {
            throw createHttpError(
                409,
                `Stok ${medicine.name} tidak cukup. Tersedia: ${medicine.stock}, diminta: ${params.quantity}.`,
            );
        }
        await update(medicine.id, { stock: medicine.stock - params.quantity });
        await medicineRepository.recordStockMovement({
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
        throw createHttpError(
            409,
            `Stok ${medicine.name} yang masih berlaku tidak cukup. Tersedia: ${available}, diminta: ${params.quantity}.`,
        );
    }

    const consumed: { batchId: string | null; batchNumber: string | null; quantity: number }[] = [];
    let remaining = params.quantity;

    for (const batch of batches) {
        if (remaining <= 0) break;

        const takeFromBatch = Math.min(batch.quantity, remaining);
        const applied = await medicineRepository.changeBatchQuantity(batch.id, -takeFromBatch);
        if (!applied) {
            // Batch keburu dipakai transaksi lain sejak dibaca; lanjut ke batch berikutnya
            // dan biarkan sisa permintaan dipenuhi dari sana.
            continue;
        }

        await medicineRepository.recordStockMovement({
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
        throw createHttpError(
            409,
            `Stok ${medicine.name} berubah saat penyerahan diproses. Ulangi penyerahan resep ini.`,
        );
    }

    await syncStockFromBatches(medicine.id);
    return consumed;
};

/**
 * Mengembalikan stok ke batch asalnya saat penyerahan dibatalkan. Bila mutasi
 * aslinya tidak terikat batch (obat lama), stok agregat yang dikembalikan.
 */
const returnStockToBatches = async (params: {
    medicineId: string
    entries: { batchId: string | null; quantity: number }[]
    referenceId?: string
    notes?: string
}): Promise<void> => {
    const medicine = await medicineRepository.findById(params.medicineId);
    if (!medicine) {
        throw createHttpError(404, 'Obat tidak ditemukan.');
    }

    for (const entry of params.entries) {
        if (entry.batchId) {
            await medicineRepository.changeBatchQuantity(entry.batchId, entry.quantity);
        }
        await medicineRepository.recordStockMovement({
            medicineId: medicine.id,
            batchId: entry.batchId ?? undefined,
            quantityChange: entry.quantity,
            reason: 'adjustment',
            referenceId: params.referenceId,
            notes: params.notes,
        });
    }

    const hasBatches = (await medicineRepository.countBatches(params.medicineId)) ?? 0;
    if (hasBatches > 0) {
        await syncStockFromBatches(medicine.id);
        return;
    }

    const returnedTotal = params.entries.reduce((total, entry) => total + entry.quantity, 0);
    await update(medicine.id, { stock: medicine.stock + returnedTotal });
};

export const medicineService = {
    getStockMovements,
    update,
    adjustStock,
    getBatches,
    receiveBatch,
    consumeStockFefo,
    returnStockToBatches,
    syncStockFromBatches,
};
