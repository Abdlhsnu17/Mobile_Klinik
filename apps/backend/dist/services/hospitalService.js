"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HospitalService = void 0;
const utils_1 = require("../utils");
const httpError_1 = require("../utils/httpError");
const billingService_1 = require("./billingService");
const collectionService_1 = require("./collectionService");
class HospitalService {
    static async listBeds() {
        return collectionService_1.CollectionService.list("beds");
    }
    static async createBed(data) {
        if (!data.bedNumber || !data.ward) {
            throw (0, httpError_1.createHttpError)(400, "Nomor bed dan ruangan (ward) wajib diisi.");
        }
        return collectionService_1.CollectionService.createItem("beds", {
            ...data,
            status: data.status ?? "available",
            lastCleanedAt: data.lastCleanedAt ?? (0, utils_1.now)(),
            assignedPatientId: data.assignedPatientId ?? null,
        });
    }
    static async updateBed(id, payload) {
        return collectionService_1.CollectionService.updateItem("beds", id, { ...payload, lastCleanedAt: payload.lastCleanedAt ?? (0, utils_1.now)() });
    }
    static async deleteBed(id) {
        const bed = await collectionService_1.CollectionService.findById("beds", id);
        if (!bed)
            return false;
        if (bed.status === "occupied" || bed.assignedPatientId) {
            throw (0, httpError_1.createHttpError)(409, `Bed ${bed.bedNumber} sedang terisi dan tidak dapat dihapus.`);
        }
        return collectionService_1.CollectionService.deleteItem("beds", id);
    }
    static async listAdmissions() {
        return collectionService_1.CollectionService.list("inpatientAdmissions");
    }
    static async createAdmission(data) {
        if (!data.patientId) {
            throw (0, httpError_1.createHttpError)(400, "Informasi pasien wajib diisi untuk admisi.");
        }
        const admissionStatus = data.status ?? "pending";
        // 1. Validasi bed jika pasien langsung masuk rawat inap
        if (admissionStatus === "ongoing") {
            if (!data.bedId) {
                throw (0, httpError_1.createHttpError)(400, "Bed wajib dipilih jika pasien masuk rawat inap.");
            }
            const bed = await collectionService_1.CollectionService.findById("beds", data.bedId);
            if (!bed) {
                throw (0, httpError_1.createHttpError)(404, `Bed dengan ID ${data.bedId} tidak ditemukan.`);
            }
            if (bed.status !== "available") {
                throw (0, httpError_1.createHttpError)(409, `Bed ${bed.bedNumber} tidak tersedia (status: ${bed.status}).`);
            }
        }
        // 2. Buat data admisi
        const newAdmission = await collectionService_1.CollectionService.createItem("inpatientAdmissions", {
            ...data,
            status: admissionStatus,
            admittedAt: data.admittedAt ?? (0, utils_1.now)(),
            updatedAt: (0, utils_1.now)(),
        });
        // 3. Update status bed setelah admisi berhasil dibuat
        if (newAdmission.bedId && newAdmission.status === "ongoing") {
            await collectionService_1.CollectionService.updateItem("beds", newAdmission.bedId, { status: "occupied", assignedPatientId: newAdmission.patientId });
        }
        await this.syncBillingForAdmission(newAdmission);
        return newAdmission;
    }
    static async updateAdmission(admissionId, payload) {
        const admission = await collectionService_1.CollectionService.findById("inpatientAdmissions", admissionId);
        if (!admission)
            return null;
        const desiredBedId = payload.bedId ?? admission.bedId ?? "";
        if (desiredBedId && desiredBedId !== admission.bedId) {
            const targetBed = await collectionService_1.CollectionService.findById("beds", desiredBedId);
            if (!targetBed) {
                throw (0, httpError_1.createHttpError)(404, "Tempat tidur tidak ditemukan");
            }
            if (targetBed.status !== "available") {
                throw (0, httpError_1.createHttpError)(409, "Tempat tidur tidak tersedia");
            }
        }
        if (admission.bedId && admission.bedId !== desiredBedId) {
            await collectionService_1.CollectionService.updateItem("beds", admission.bedId, {
                status: "available",
                assignedPatientId: null,
            });
        }
        let updatedBed = null;
        if (desiredBedId && desiredBedId !== admission.bedId) {
            updatedBed = await collectionService_1.CollectionService.updateItem("beds", desiredBedId, {
                status: "occupied",
                assignedPatientId: admission.patientId,
            });
        }
        const updatedAdmission = await collectionService_1.CollectionService.updateItem("inpatientAdmissions", admissionId, {
            ...payload,
            bedId: desiredBedId,
        });
        await this.syncBillingForAdmission(updatedAdmission);
        return { admission: updatedAdmission, bed: updatedBed };
    }
    static async dischargeAdmission(admissionId, disposition = "discharged") {
        const admission = await collectionService_1.CollectionService.findById("inpatientAdmissions", admissionId);
        if (!admission)
            return null;
        const updatedAdmission = await collectionService_1.CollectionService.updateItem("inpatientAdmissions", admissionId, {
            status: disposition,
            dischargeDisposition: disposition,
            dischargedAt: (0, utils_1.now)(),
        });
        let updatedBed = null;
        if (admission.bedId) {
            updatedBed = await collectionService_1.CollectionService.updateItem("beds", admission.bedId, {
                status: "available",
                assignedPatientId: null,
            });
        }
        await this.syncBillingForAdmission(updatedAdmission);
        return { admission: updatedAdmission, bed: updatedBed };
    }
    static async deleteAdmission(admissionId) {
        const admission = await collectionService_1.CollectionService.findById("inpatientAdmissions", admissionId);
        if (!admission)
            return false;
        if (admission.bedId) {
            await collectionService_1.CollectionService.updateItem("beds", admission.bedId, {
                status: "available",
                assignedPatientId: null,
            });
        }
        await this.syncBillingForAdmission(admission);
        return collectionService_1.CollectionService.deleteItem("inpatientAdmissions", admissionId);
    }
    static async addVisitNote(payload) {
        return collectionService_1.CollectionService.createItem("doctorVisitNotes", {
            ...payload,
            date: payload.date ?? new Date().toISOString().split("T")[0],
            updatedAt: (0, utils_1.now)(),
        });
    }
    static async updateVisitNote(noteId, payload) {
        const note = await collectionService_1.CollectionService.findById("doctorVisitNotes", noteId);
        if (!note)
            return null;
        return collectionService_1.CollectionService.updateItem("doctorVisitNotes", noteId, {
            ...payload,
        });
    }
    static async deleteVisitNote(noteId) {
        const note = await collectionService_1.CollectionService.findById("doctorVisitNotes", noteId);
        if (!note)
            return false;
        return collectionService_1.CollectionService.deleteItem("doctorVisitNotes", noteId);
    }
    static async listVisitNotes(admissionId) {
        const notes = await collectionService_1.CollectionService.list("doctorVisitNotes");
        return admissionId ? notes.filter((note) => note.admissionId === admissionId) : notes;
    }
    static async syncBillingForAdmission(admission) {
        if (!admission)
            return;
        if (admission.medicalRecordId) {
            await billingService_1.BillingService.syncByRecordId(admission.medicalRecordId);
            return;
        }
        await billingService_1.BillingService.syncByPatientId(admission.patientId);
    }
}
exports.HospitalService = HospitalService;
//# sourceMappingURL=hospitalService.js.map