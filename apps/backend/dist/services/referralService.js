"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralService = void 0;
const utils_1 = require("../utils");
const httpError_1 = require("../utils/httpError");
const auditService_1 = require("./auditService");
const collectionService_1 = require("./collectionService");
const STATUS_TIMESTAMP_FIELD = {
    sent: "sentAt",
    received: "receivedAt",
    "followed-up": "followedUpAt",
    rejected: "rejectedAt",
    completed: "completedAt",
};
const ALLOWED_TRANSITIONS = {
    draft: ["sent"],
    sent: ["received", "rejected"],
    received: ["followed-up", "rejected"],
    "followed-up": ["completed"],
    rejected: [],
    completed: [],
};
class ReferralService {
    static async list(filters) {
        const referrals = await collectionService_1.CollectionService.list("referrals");
        if (!filters)
            return referrals;
        return referrals.filter((referral) => {
            if (filters.patientId && referral.patientId !== filters.patientId)
                return false;
            if (filters.status && referral.status !== filters.status)
                return false;
            if (filters.direction && referral.direction !== filters.direction)
                return false;
            if (filters.facilityId && referral.facilityId !== filters.facilityId)
                return false;
            if (filters.from && referral.createdAt < filters.from)
                return false;
            if (filters.to && referral.createdAt > filters.to)
                return false;
            return true;
        });
    }
    static async getById(id) {
        const referral = await collectionService_1.CollectionService.findById("referrals", id);
        if (!referral)
            throw (0, httpError_1.createHttpError)(404, "Rujukan tidak ditemukan.");
        return referral;
    }
    static async createOutgoing(payload, user) {
        if (!payload.patientId || !payload.patientName) {
            throw (0, httpError_1.createHttpError)(400, "Data pasien wajib diisi.");
        }
        if (!payload.facilityName) {
            throw (0, httpError_1.createHttpError)(400, "Fasilitas tujuan wajib diisi.");
        }
        if (!payload.reason) {
            throw (0, httpError_1.createHttpError)(400, "Alasan rujukan wajib diisi.");
        }
        const created = await collectionService_1.CollectionService.createItem("referrals", {
            ...payload,
            direction: "outgoing",
            status: payload.status ?? "draft",
            createdAt: (0, utils_1.now)(),
            updatedAt: (0, utils_1.now)(),
        });
        await auditService_1.AuditService.record({
            collection: "referrals",
            itemId: created.id,
            action: "create",
            user,
            after: created,
        });
        return created;
    }
    static async createIncoming(payload, user) {
        if (!payload.patientId || !payload.patientName) {
            throw (0, httpError_1.createHttpError)(400, "Data pasien wajib diisi.");
        }
        if (!payload.facilityName) {
            throw (0, httpError_1.createHttpError)(400, "Fasilitas asal wajib diisi.");
        }
        if (!payload.reason) {
            throw (0, httpError_1.createHttpError)(400, "Alasan rujukan wajib diisi.");
        }
        const created = await collectionService_1.CollectionService.createItem("referrals", {
            ...payload,
            direction: "incoming",
            status: payload.status ?? "received",
            receivedAt: payload.status === "received" || !payload.status ? (0, utils_1.now)() : payload.receivedAt,
            createdAt: (0, utils_1.now)(),
            updatedAt: (0, utils_1.now)(),
        });
        await auditService_1.AuditService.record({
            collection: "referrals",
            itemId: created.id,
            action: "create",
            user,
            after: created,
        });
        return created;
    }
    static async createFromMedicalRecord(record, doctor, patient) {
        if (record.clinicalDecision !== "referral")
            return null;
        const existing = await this.list({ patientId: record.patientId });
        const alreadyLinked = existing.find((referral) => referral.medicalRecordId === record.id);
        if (alreadyLinked)
            return alreadyLinked;
        const facilities = await collectionService_1.CollectionService.list("referralFacilities");
        const matchedFacility = record.referralDestination
            ? facilities.find((facility) => facility.name.toLowerCase() === record.referralDestination?.toLowerCase())
            : undefined;
        return collectionService_1.CollectionService.createItem("referrals", {
            direction: "outgoing",
            patientId: record.patientId,
            patientName: patient?.name ?? "Pasien tidak dikenal",
            medicalRecordId: record.id,
            doctorId: doctor?.id ?? record.doctorId,
            doctorName: doctor?.name ?? record.doctorName,
            facilityId: matchedFacility?.id,
            facilityName: matchedFacility?.name ?? record.referralDestination ?? "Belum ditentukan",
            diagnosis: record.diagnosis,
            reason: record.diagnosis ?? "Rujukan dari hasil pemeriksaan",
            status: "draft",
            createdAt: (0, utils_1.now)(),
            updatedAt: (0, utils_1.now)(),
        });
    }
    static async update(id, payload) {
        const existing = await this.getById(id);
        if (existing.status !== "draft") {
            throw (0, httpError_1.createHttpError)(409, "Rujukan yang sudah dikirim tidak dapat diedit.");
        }
        return collectionService_1.CollectionService.updateItem("referrals", id, { ...payload, updatedAt: (0, utils_1.now)() });
    }
    static async updateStatus(id, nextStatus, notes, user) {
        const existing = await this.getById(id);
        const allowed = ALLOWED_TRANSITIONS[existing.status] ?? [];
        if (!allowed.includes(nextStatus)) {
            throw (0, httpError_1.createHttpError)(409, `Status rujukan tidak dapat diubah dari "${existing.status}" ke "${nextStatus}".`);
        }
        const timestampField = STATUS_TIMESTAMP_FIELD[nextStatus];
        const payload = {
            status: nextStatus,
            updatedAt: (0, utils_1.now)(),
            ...(notes ? { notes } : {}),
            ...(timestampField ? { [timestampField]: (0, utils_1.now)() } : {}),
        };
        const updated = await collectionService_1.CollectionService.updateItem("referrals", id, payload);
        await auditService_1.AuditService.record({
            collection: "referrals",
            itemId: id,
            action: "status-change",
            user,
            before: existing,
            after: updated,
            reason: notes,
        });
        return updated;
    }
    static async remove(id) {
        const existing = await this.getById(id);
        if (existing.status !== "draft") {
            throw (0, httpError_1.createHttpError)(409, "Hanya rujukan berstatus draf yang dapat dihapus.");
        }
        return collectionService_1.CollectionService.deleteItem("referrals", id);
    }
}
exports.ReferralService = ReferralService;
//# sourceMappingURL=referralService.js.map