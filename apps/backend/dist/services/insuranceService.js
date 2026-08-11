"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsuranceService = void 0;
const utils_1 = require("../utils");
const httpError_1 = require("../utils/httpError");
const billingService_1 = require("./billingService");
const collectionService_1 = require("./collectionService");
/** Transisi status klaim yang diizinkan (state machine). */
const CLAIM_TRANSITIONS = {
    draft: ["submitted"],
    submitted: ["verified", "rejected"],
    verified: ["approved", "rejected"],
    approved: ["paid", "rejected"],
    paid: [],
    rejected: [],
};
const TERMINAL_CLAIM_STATUSES = ["paid", "rejected"];
function insuranceMethodFor(provider) {
    return provider === "bpjs" ? "bpjs" : "asuransi-swasta";
}
class InsuranceService {
    static async listProfiles() {
        return collectionService_1.CollectionService.list("insuranceProfiles");
    }
    static async createProfile(data) {
        const payload = {
            ...data,
            id: data.id,
            createdAt: data.createdAt ?? (0, utils_1.now)(),
            updatedAt: (0, utils_1.now)(),
        };
        const created = await collectionService_1.CollectionService.createItem("insuranceProfiles", payload);
        await billingService_1.BillingService.syncByPatientId(created.patientId);
        return created;
    }
    static async updateProfile(id, data) {
        const existing = await collectionService_1.CollectionService.findById("insuranceProfiles", id);
        const updated = await collectionService_1.CollectionService.updateItem("insuranceProfiles", id, {
            ...data,
            updatedAt: (0, utils_1.now)(),
        });
        if (existing?.patientId) {
            await billingService_1.BillingService.syncByPatientId(existing.patientId);
        }
        if (updated?.patientId && updated.patientId !== existing?.patientId) {
            await billingService_1.BillingService.syncByPatientId(updated.patientId);
        }
        return updated;
    }
    static async deleteProfile(id) {
        const existing = await collectionService_1.CollectionService.findById("insuranceProfiles", id);
        const deleted = await collectionService_1.CollectionService.deleteItem("insuranceProfiles", id);
        if (deleted && existing?.patientId) {
            await billingService_1.BillingService.syncByPatientId(existing.patientId);
        }
        return deleted;
    }
    static async listBridgeMembers() {
        return collectionService_1.CollectionService.list("insuranceBridgeMembers");
    }
    static async verifyBpjs(participantNumber) {
        const members = await this.listBridgeMembers();
        const member = members.find((entry) => entry.participantNumber === participantNumber);
        if (!member) {
            return {
                success: false,
                message: "Nomor peserta tidak terdaftar di sistem bridging",
            };
        }
        return {
            success: true,
            status: member.status,
            facility: member.facility,
            coverageLevel: member.coverageLevel,
            lastClaimDate: member.lastClaimDate,
        };
    }
    // ---------------------------------------------------------------------------
    // Klaim asuransi: siklus draft -> submitted -> verified -> approved -> paid
    // (atau -> rejected). Coverage tagihan mengikuti keputusan klaim.
    // ---------------------------------------------------------------------------
    static async listClaims() {
        return collectionService_1.CollectionService.list("insuranceClaims");
    }
    static async getClaim(id) {
        return collectionService_1.CollectionService.findById("insuranceClaims", id);
    }
    /** Membuat klaim untuk sebuah tagihan. claimedAmount default = insuranceCoverage
     *  tagihan (porsi yang ditanggung asuransi). */
    static async createClaim(data) {
        if (!data.billingRecordId) {
            throw (0, httpError_1.createHttpError)(400, "Tagihan (billingRecordId) wajib dipilih.");
        }
        const billing = await collectionService_1.CollectionService.findById("billingRecords", data.billingRecordId);
        if (!billing) {
            throw (0, httpError_1.createHttpError)(404, "Tagihan untuk klaim tidak ditemukan.");
        }
        const existingClaims = await this.listClaims();
        // Tagihan hanya boleh diklaim ulang jika klaim sebelumnya ditolak. Klaim yang
        // masih berjalan maupun yang sudah dicairkan ("paid") memblokir klaim baru
        // agar tidak terjadi pencairan ganda atas tagihan yang sama.
        const duplicate = existingClaims.find((claim) => claim.billingRecordId === billing.id && claim.status !== "rejected");
        if (duplicate) {
            throw (0, httpError_1.createHttpError)(409, duplicate.status === "paid"
                ? "Tagihan ini sudah memiliki klaim yang dicairkan."
                : "Sudah ada klaim aktif untuk tagihan ini.");
        }
        const profiles = await collectionService_1.CollectionService.list("insuranceProfiles");
        const profile = profiles.find((item) => item.patientId === billing.patientId);
        const coverage = Number(billing.insuranceCoverage ?? 0);
        if (!Number.isFinite(coverage) || coverage <= 0) {
            throw (0, httpError_1.createHttpError)(422, "Tagihan ini tidak memiliki porsi asuransi untuk diklaim.");
        }
        const claimedAmount = Number(data.claimedAmount ?? coverage);
        if (!Number.isFinite(claimedAmount) || claimedAmount <= 0) {
            throw (0, httpError_1.createHttpError)(422, "Nominal klaim harus lebih dari nol.");
        }
        // Nominal klaim tidak boleh melebihi porsi asuransi tagihan.
        if (claimedAmount > coverage) {
            throw (0, httpError_1.createHttpError)(422, "Nominal klaim tidak boleh melebihi porsi asuransi tagihan.");
        }
        const created = await collectionService_1.CollectionService.createItem("insuranceClaims", {
            billingRecordId: billing.id,
            medicalRecordId: billing.medicalRecordId,
            patientId: billing.patientId,
            patientName: billing.patientName ?? profile?.patientName ?? "",
            provider: data.provider ?? profile?.provider ?? "bpjs",
            policyNumber: data.policyNumber ?? profile?.policyNumber,
            claimedAmount,
            approvedAmount: 0,
            status: "draft",
            notes: data.notes,
            createdAt: (0, utils_1.now)(),
            updatedAt: (0, utils_1.now)(),
        });
        if (billing.medicalRecordId) {
            await billingService_1.BillingService.syncByRecordId(billing.medicalRecordId);
        }
        return created;
    }
    static async updateClaim(id, data) {
        const existing = await collectionService_1.CollectionService.findById("insuranceClaims", id);
        if (!existing) {
            throw (0, httpError_1.createHttpError)(404, "Klaim tidak ditemukan.");
        }
        if (TERMINAL_CLAIM_STATUSES.includes(existing.status)) {
            throw (0, httpError_1.createHttpError)(409, "Klaim yang sudah final tidak dapat diubah.");
        }
        // Hanya field administratif yang boleh diedit langsung; status lewat transisi.
        const updated = await collectionService_1.CollectionService.updateItem("insuranceClaims", id, {
            claimedAmount: data.claimedAmount !== undefined ? Number(data.claimedAmount) : existing.claimedAmount,
            policyNumber: data.policyNumber ?? existing.policyNumber,
            notes: data.notes ?? existing.notes,
            updatedAt: (0, utils_1.now)(),
        });
        return updated;
    }
    /** Menjalankan transisi status klaim beserta efek sampingnya. */
    static async transitionClaim(id, nextStatus, payload = {}) {
        const claim = await collectionService_1.CollectionService.findById("insuranceClaims", id);
        if (!claim) {
            throw (0, httpError_1.createHttpError)(404, "Klaim tidak ditemukan.");
        }
        const allowed = CLAIM_TRANSITIONS[claim.status] ?? [];
        if (!allowed.includes(nextStatus)) {
            throw (0, httpError_1.createHttpError)(409, `Transisi klaim dari "${claim.status}" ke "${nextStatus}" tidak diizinkan.`);
        }
        const patch = { status: nextStatus, updatedAt: (0, utils_1.now)() };
        if (nextStatus === "submitted") {
            patch.submittedAt = (0, utils_1.now)();
        }
        else if (nextStatus === "verified") {
            patch.verifiedAt = (0, utils_1.now)();
        }
        else if (nextStatus === "approved") {
            const approvedAmount = Number(payload.approvedAmount ?? claim.claimedAmount);
            if (!Number.isFinite(approvedAmount) || approvedAmount < 0) {
                throw (0, httpError_1.createHttpError)(400, "Nominal disetujui tidak valid.");
            }
            if (approvedAmount > Number(claim.claimedAmount)) {
                throw (0, httpError_1.createHttpError)(422, "Nominal disetujui tidak boleh melebihi nominal klaim.");
            }
            patch.approvedAmount = approvedAmount;
            patch.approvedAt = (0, utils_1.now)();
        }
        else if (nextStatus === "rejected") {
            patch.rejectionReason = payload.rejectionReason;
            patch.approvedAmount = 0;
        }
        let updated = await collectionService_1.CollectionService.updateItem("insuranceClaims", id, patch);
        if (nextStatus === "paid") {
            // Pencairan: catat dana masuk dari asuransi sebesar approvedAmount lalu
            // tautkan ke klaim. Billing otomatis tersinkron oleh disbursement.
            const approvedAmount = Number(updated?.approvedAmount ?? claim.approvedAmount ?? 0);
            if (approvedAmount <= 0) {
                throw (0, httpError_1.createHttpError)(422, "Klaim belum memiliki nominal disetujui untuk dicairkan.");
            }
            const disbursement = await billingService_1.BillingService.recordInsuranceDisbursement({
                medicalRecordId: claim.medicalRecordId,
                patientId: claim.patientId,
                amount: approvedAmount,
                method: insuranceMethodFor(claim.provider),
                insuranceClaimId: claim.id,
                notes: `Pencairan klaim asuransi ${claim.provider}`,
            });
            updated = await collectionService_1.CollectionService.updateItem("insuranceClaims", id, {
                paidAt: (0, utils_1.now)(),
                paymentId: disbursement.id,
                updatedAt: (0, utils_1.now)(),
            });
        }
        else if (claim.medicalRecordId) {
            // rejected / approved dsb: sinkronkan billing agar coverage & status ikut.
            await billingService_1.BillingService.syncByRecordId(claim.medicalRecordId);
        }
        return updated;
    }
    static async deleteClaim(id) {
        const existing = await collectionService_1.CollectionService.findById("insuranceClaims", id);
        if (!existing)
            return false;
        if (existing.status === "paid") {
            throw (0, httpError_1.createHttpError)(409, "Klaim yang sudah dicairkan tidak dapat dihapus.");
        }
        const deleted = await collectionService_1.CollectionService.deleteItem("insuranceClaims", id);
        if (deleted && existing.medicalRecordId) {
            await billingService_1.BillingService.syncByRecordId(existing.medicalRecordId);
        }
        return deleted;
    }
}
exports.InsuranceService = InsuranceService;
//# sourceMappingURL=insuranceService.js.map