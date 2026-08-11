"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcurementService = void 0;
const medicine_1 = require("../modules/medicine");
const httpError_1 = require("../utils/httpError");
const collectionService_1 = require("./collectionService");
function computeStatus(items) {
    const fullyReceived = items.every((item) => (item.receivedQuantity ?? 0) >= item.quantity);
    if (fullyReceived)
        return "selesai";
    const anyReceived = items.some((item) => (item.receivedQuantity ?? 0) > 0);
    return anyReceived ? "diterima-sebagian" : "dipesan";
}
class ProcurementService {
    /**
     * Menerima barang dari sebuah PO: menambah batch/stok obat (lewat medicineService.receiveBatch,
     * sumber tunggal logika stok) lalu memperbarui receivedQuantity dan status PO.
     */
    static async receivePurchaseOrder(purchaseOrderId, lines) {
        if (!Array.isArray(lines) || lines.length === 0) {
            throw (0, httpError_1.createHttpError)(400, "Tidak ada baris penerimaan yang dikirim.");
        }
        const purchaseOrder = await collectionService_1.CollectionService.findById("purchaseOrders", purchaseOrderId);
        if (!purchaseOrder) {
            throw (0, httpError_1.createHttpError)(404, "Purchase order tidak ditemukan.");
        }
        if (purchaseOrder.status === "selesai") {
            throw (0, httpError_1.createHttpError)(409, "Purchase order sudah selesai diterima seluruhnya.");
        }
        if (purchaseOrder.status === "batal") {
            throw (0, httpError_1.createHttpError)(409, "Purchase order telah dibatalkan.");
        }
        const items = purchaseOrder.items.map((item) => ({ ...item }));
        for (const line of lines) {
            const received = Number(line.receivedQuantity);
            if (!Number.isFinite(received) || received <= 0)
                continue;
            const item = items.find((entry) => entry.medicineId === line.medicineId);
            if (!item) {
                throw (0, httpError_1.createHttpError)(422, `Obat ${line.medicineId} tidak ada dalam purchase order ini.`);
            }
            const outstanding = item.quantity - (item.receivedQuantity ?? 0);
            if (received > outstanding) {
                throw (0, httpError_1.createHttpError)(422, `Jumlah terima (${received}) melebihi sisa pesanan (${outstanding}) untuk ${item.medicineName}.`);
            }
            if (!line.batchNumber || !line.expiryDate) {
                throw (0, httpError_1.createHttpError)(422, `Nomor batch dan tanggal kedaluwarsa wajib diisi untuk ${item.medicineName}.`);
            }
            await medicine_1.medicineService.receiveBatch({
                medicineId: item.medicineId,
                batchNumber: line.batchNumber,
                expiryDate: line.expiryDate,
                quantity: received,
                buyPrice: line.buyPrice ?? item.unitPrice,
                supplier: purchaseOrder.supplierName,
                notes: `Penerimaan PO ${purchaseOrder.poNumber}`,
            });
            item.receivedQuantity = (item.receivedQuantity ?? 0) + received;
        }
        const updated = await collectionService_1.CollectionService.updateItem("purchaseOrders", purchaseOrderId, {
            items,
            status: computeStatus(items),
        });
        if (!updated) {
            throw (0, httpError_1.createHttpError)(500, "Gagal memperbarui purchase order setelah penerimaan.");
        }
        return updated;
    }
}
exports.ProcurementService = ProcurementService;
//# sourceMappingURL=procurementService.js.map