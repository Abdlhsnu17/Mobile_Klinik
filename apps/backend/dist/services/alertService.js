"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertService = void 0;
const collectionService_1 = require("./collectionService");
// Ambang default (hari) untuk peringatan proaktif. Bisa dioverride via query.
const DEFAULT_EXPIRY_DAYS = 30;
const DEFAULT_MAINTENANCE_DAYS = 14;
const MS_PER_DAY = 1000 * 60 * 60 * 24;
function daysUntil(dateValue, today) {
    if (!dateValue)
        return null;
    const target = new Date(dateValue);
    if (Number.isNaN(target.getTime()))
        return null;
    const startOfTarget = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
    const startOfToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    return Math.round((startOfTarget - startOfToday) / MS_PER_DAY);
}
function isActiveMedicine(medicine) {
    // Kolom isActive tersimpan sebagai tinyint (0/1) atau boolean; anggap aktif bila
    // tidak eksplisit dimatikan (0 / false).
    const flag = medicine.isActive;
    return flag !== false && flag !== 0;
}
function buildLowStockAlerts(medicines) {
    const alerts = [];
    for (const medicine of medicines) {
        if (!isActiveMedicine(medicine))
            continue;
        const minStock = Number(medicine.minStock ?? 0);
        const stock = Number(medicine.stock ?? 0);
        if (minStock <= 0 || stock > minStock)
            continue;
        const isEmpty = stock <= 0;
        alerts.push({
            id: `low-stock-${medicine.id}`,
            category: "stok-menipis",
            severity: isEmpty ? "critical" : "warning",
            title: isEmpty ? `Stok habis: ${medicine.name}` : `Stok menipis: ${medicine.name}`,
            detail: `Sisa ${stock} ${medicine.unit ?? "unit"} (minimum ${minStock} ${medicine.unit ?? "unit"}).`,
            referenceId: medicine.id,
            referenceType: "medicine",
            currentValue: stock,
            thresholdValue: minStock,
            unit: medicine.unit,
        });
    }
    return alerts;
}
function buildExpiryAlerts(medicines, today, expiryDays) {
    const alerts = [];
    for (const medicine of medicines) {
        if (!isActiveMedicine(medicine))
            continue;
        const days = daysUntil(medicine.expiryDate, today);
        if (days === null || days > expiryDays)
            continue;
        const expired = days < 0;
        alerts.push({
            id: `expiry-${medicine.id}`,
            category: "obat-kadaluarsa",
            severity: expired ? "critical" : "warning",
            title: expired
                ? `Obat kedaluwarsa: ${medicine.name}`
                : `Obat mendekati kedaluwarsa: ${medicine.name}`,
            detail: expired
                ? `Kedaluwarsa ${Math.abs(days)} hari lalu (${medicine.expiryDate}).`
                : `Kedaluwarsa dalam ${days} hari (${medicine.expiryDate}).`,
            referenceId: medicine.id,
            referenceType: "medicine",
            dueDate: medicine.expiryDate,
            daysRemaining: days,
        });
    }
    return alerts;
}
function buildMaintenanceAlerts(equipments, today, maintenanceDays) {
    const alerts = [];
    for (const equipment of equipments) {
        if (equipment.status === "Tidak Aktif")
            continue;
        const days = daysUntil(equipment.nextMaintenanceDate, today);
        if (days === null || days > maintenanceDays)
            continue;
        const overdue = days < 0;
        alerts.push({
            id: `maintenance-${equipment.id}`,
            category: "maintenance-alat",
            severity: overdue ? "critical" : "warning",
            title: overdue
                ? `Maintenance terlewat: ${equipment.name}`
                : `Maintenance akan jatuh tempo: ${equipment.name}`,
            detail: overdue
                ? `Terlambat ${Math.abs(days)} hari (jadwal ${equipment.nextMaintenanceDate}).`
                : `Jatuh tempo dalam ${days} hari (${equipment.nextMaintenanceDate}).`,
            referenceId: equipment.id,
            referenceType: "medical-equipment",
            dueDate: equipment.nextMaintenanceDate,
            daysRemaining: days,
        });
    }
    return alerts;
}
const SEVERITY_RANK = { critical: 0, warning: 1 };
class AlertService {
    static async getOperationalAlerts(options) {
        const expiryDays = Number.isFinite(options?.expiryDays) ? Number(options?.expiryDays) : DEFAULT_EXPIRY_DAYS;
        const maintenanceDays = Number.isFinite(options?.maintenanceDays)
            ? Number(options?.maintenanceDays)
            : DEFAULT_MAINTENANCE_DAYS;
        const today = new Date();
        const [medicines, equipments] = await Promise.all([
            collectionService_1.CollectionService.list("medicines"),
            collectionService_1.CollectionService.list("medicalEquipments"),
        ]);
        const alerts = [
            ...buildLowStockAlerts(medicines),
            ...buildExpiryAlerts(medicines, today, expiryDays),
            ...buildMaintenanceAlerts(equipments, today, maintenanceDays),
        ].sort((a, b) => {
            if (SEVERITY_RANK[a.severity] !== SEVERITY_RANK[b.severity]) {
                return SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
            }
            return (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0);
        });
        const byCategory = alerts.reduce((acc, alert) => {
            acc[alert.category] += 1;
            return acc;
        }, { "stok-menipis": 0, "obat-kadaluarsa": 0, "maintenance-alat": 0 });
        return {
            generatedAt: today.toISOString(),
            thresholds: { expiryDays, maintenanceDays },
            summary: {
                total: alerts.length,
                critical: alerts.filter((alert) => alert.severity === "critical").length,
                warning: alerts.filter((alert) => alert.severity === "warning").length,
                byCategory,
            },
            alerts,
        };
    }
}
exports.AlertService = AlertService;
//# sourceMappingURL=alertService.js.map