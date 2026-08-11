"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPatients = listPatients;
exports.getPatientById = getPatientById;
exports.createPatient = createPatient;
exports.updatePatient = updatePatient;
exports.deletePatient = deletePatient;
const auditService_1 = require("../services/auditService");
const patientService_1 = require("../services/patientService");
const apiResponse_1 = require("../utils/apiResponse");
async function listPatients(_req, res, next) {
    try {
        const patients = await patientService_1.PatientService.list();
        return (0, apiResponse_1.sendSuccess)(res, patients);
    }
    catch (error) {
        next(error);
    }
}
async function getPatientById(req, res, next) {
    try {
        const patient = await patientService_1.PatientService.findById(req.params.id);
        if (!patient) {
            return (0, apiResponse_1.sendError)(res, 404, { code: "PATIENT_NOT_FOUND", message: "Item tidak ditemukan" });
        }
        return (0, apiResponse_1.sendSuccess)(res, patient);
    }
    catch (error) {
        next(error);
    }
}
async function createPatient(req, res, next) {
    try {
        const patient = await patientService_1.PatientService.create(req.body);
        await auditService_1.AuditService.record({
            collection: "patients",
            itemId: patient.id,
            action: "create",
            user: req.user,
            after: patient,
        });
        return (0, apiResponse_1.sendSuccess)(res, patient, 201);
    }
    catch (error) {
        if (error instanceof Error && error.message.includes("terdaftar")) {
            return (0, apiResponse_1.sendError)(res, 409, { code: "PATIENT_CONFLICT", message: error.message });
        }
        next(error);
    }
}
async function updatePatient(req, res, next) {
    try {
        const before = await patientService_1.PatientService.findById(req.params.id);
        if (!before) {
            return (0, apiResponse_1.sendError)(res, 404, { code: "PATIENT_NOT_FOUND", message: "Item tidak ditemukan" });
        }
        const updated = await patientService_1.PatientService.update(req.params.id, req.body);
        if (!updated) {
            return (0, apiResponse_1.sendError)(res, 404, { code: "PATIENT_NOT_FOUND", message: "Item tidak ditemukan" });
        }
        await auditService_1.AuditService.record({
            collection: "patients",
            itemId: req.params.id,
            action: "update",
            user: req.user,
            before,
            after: updated,
            reason: req.body.auditReason,
        });
        return (0, apiResponse_1.sendSuccess)(res, updated);
    }
    catch (error) {
        next(error);
    }
}
async function deletePatient(req, res, next) {
    try {
        const before = await patientService_1.PatientService.findById(req.params.id);
        if (!before) {
            return (0, apiResponse_1.sendError)(res, 404, { code: "PATIENT_NOT_FOUND", message: "Item tidak ditemukan" });
        }
        const deleted = await patientService_1.PatientService.remove(req.params.id);
        if (!deleted) {
            return (0, apiResponse_1.sendError)(res, 404, { code: "PATIENT_NOT_FOUND", message: "Item tidak ditemukan" });
        }
        await auditService_1.AuditService.record({
            collection: "patients",
            itemId: req.params.id,
            action: "delete",
            user: req.user,
            before,
        });
        return res.status(204).end();
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=patientController.js.map