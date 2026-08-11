import { medicineService } from "../modules/medicine"
import type { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, ReceivePurchaseOrderLine } from "../types"
import { createHttpError } from "../utils/httpError"
import { CollectionService } from "./collectionService"

function computeStatus(items: PurchaseOrderItem[]): PurchaseOrderStatus {
  const fullyReceived = items.every((item) => (item.receivedQuantity ?? 0) >= item.quantity)
  if (fullyReceived) return "selesai"
  const anyReceived = items.some((item) => (item.receivedQuantity ?? 0) > 0)
  return anyReceived ? "diterima-sebagian" : "dipesan"
}

export class ProcurementService {
  /**
   * Menerima barang dari sebuah PO: menambah batch/stok obat (lewat medicineService.receiveBatch,
   * sumber tunggal logika stok) lalu memperbarui receivedQuantity dan status PO.
   */
  static async receivePurchaseOrder(
    purchaseOrderId: string,
    lines: ReceivePurchaseOrderLine[],
  ): Promise<PurchaseOrder> {
    if (!Array.isArray(lines) || lines.length === 0) {
      throw createHttpError(400, "Tidak ada baris penerimaan yang dikirim.")
    }

    const purchaseOrder = await CollectionService.findById("purchaseOrders", purchaseOrderId)
    if (!purchaseOrder) {
      throw createHttpError(404, "Purchase order tidak ditemukan.")
    }
    if (purchaseOrder.status === "selesai") {
      throw createHttpError(409, "Purchase order sudah selesai diterima seluruhnya.")
    }
    if (purchaseOrder.status === "batal") {
      throw createHttpError(409, "Purchase order telah dibatalkan.")
    }

    const items = purchaseOrder.items.map((item) => ({ ...item }))

    for (const line of lines) {
      const received = Number(line.receivedQuantity)
      if (!Number.isFinite(received) || received <= 0) continue

      const item = items.find((entry) => entry.medicineId === line.medicineId)
      if (!item) {
        throw createHttpError(422, `Obat ${line.medicineId} tidak ada dalam purchase order ini.`)
      }
      const outstanding = item.quantity - (item.receivedQuantity ?? 0)
      if (received > outstanding) {
        throw createHttpError(
          422,
          `Jumlah terima (${received}) melebihi sisa pesanan (${outstanding}) untuk ${item.medicineName}.`,
        )
      }
      if (!line.batchNumber || !line.expiryDate) {
        throw createHttpError(422, `Nomor batch dan tanggal kedaluwarsa wajib diisi untuk ${item.medicineName}.`)
      }

      await medicineService.receiveBatch({
        medicineId: item.medicineId,
        batchNumber: line.batchNumber,
        expiryDate: line.expiryDate,
        quantity: received,
        buyPrice: line.buyPrice ?? item.unitPrice,
        supplier: purchaseOrder.supplierName,
        notes: `Penerimaan PO ${purchaseOrder.poNumber}`,
      })

      item.receivedQuantity = (item.receivedQuantity ?? 0) + received
    }

    const updated = await CollectionService.updateItem("purchaseOrders", purchaseOrderId, {
      items,
      status: computeStatus(items),
    })
    if (!updated) {
      throw createHttpError(500, "Gagal memperbarui purchase order setelah penerimaan.")
    }
    return updated
  }
}
