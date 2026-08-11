"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowRouter = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const workflowService_1 = require("../services/workflowService");
const apiResponse_1 = require("../utils/apiResponse");
exports.workflowRouter = (0, express_1.Router)();
const requireVisitWorkflowAccess = (0, auth_1.requireRole)("admin", "umum", "dokter", "bidan", "perawat");
const requireMedicalFinalizeAccess = (0, auth_1.requireRole)("admin", "dokter", "bidan");
const requireBillingAccess = (0, auth_1.requireRole)("admin", "umum");
const requirePharmacyAccess = (0, auth_1.requireRole)("admin", "teknis", "dokter", "bidan", "perawat");
/**
 * @openapi
 * /workflows/visits/register:
 *   post:
 *     tags: [Workflows]
 *     summary: Registrasi kunjungan pasien dan buat nomor antrian
 *     responses:
 *       201: { description: Created }
 *       400: { description: Data tidak valid }
 */
exports.workflowRouter.post("/visits/register", requireVisitWorkflowAccess, (0, validate_1.validate)([
    (0, express_validator_1.body)("patientId").isString().trim().notEmpty(),
    (0, express_validator_1.body)("doctorId").optional({ values: "falsy" }).isString().trim(),
    (0, express_validator_1.body)("date").isString().trim().notEmpty(),
    (0, express_validator_1.body)("time").isString().trim().notEmpty(),
    (0, express_validator_1.body)("serviceId").optional({ values: "falsy" }).isString().trim(),
    (0, express_validator_1.body)("serviceIds").optional().isArray(),
    (0, express_validator_1.body)("notes").optional({ values: "falsy" }).isString(),
]), async (req, res, next) => {
    try {
        const result = await workflowService_1.WorkflowService.registerVisit(req.body);
        (0, apiResponse_1.sendSuccess)(res, result, 201);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /workflows/visits/{appointmentId}/start-exam:
 *   post:
 *     tags: [Workflows]
 *     summary: Mulai pemeriksaan kunjungan
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Tidak ditemukan }
 */
exports.workflowRouter.post("/visits/:appointmentId/start-exam", requireVisitWorkflowAccess, async (req, res, next) => {
    try {
        const result = await workflowService_1.WorkflowService.startExam(req.params.appointmentId);
        (0, apiResponse_1.sendSuccess)(res, result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /workflows/visits/{appointmentId}/finish-exam:
 *   post:
 *     tags: [Workflows]
 *     summary: Selesaikan pemeriksaan dan simpan rekam medis
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       400: { description: Data tidak valid }
 */
exports.workflowRouter.post("/visits/:appointmentId/finish-exam", requireVisitWorkflowAccess, (0, validate_1.validate)([
    (0, express_validator_1.body)("diagnosis").isString().trim().notEmpty(),
    (0, express_validator_1.body)("symptoms").isString().trim().notEmpty(),
    (0, express_validator_1.body)("treatment").isString().trim().notEmpty(),
    (0, express_validator_1.body)("doctorId").optional({ values: "falsy" }).isString().trim(),
    (0, express_validator_1.body)("doctorName").optional({ values: "falsy" }).isString().trim(),
    (0, express_validator_1.body)("soap").optional().isObject(),
    (0, express_validator_1.body)("diagnosisCodes").optional().isArray(),
    (0, express_validator_1.body)("procedureCodes").optional().isArray(),
    (0, express_validator_1.body)("clinicalHistory").optional().isObject(),
    (0, express_validator_1.body)("prescription").optional().isArray(),
    (0, express_validator_1.body)("equipmentsUsed").optional().isArray(),
    (0, express_validator_1.body)("vitalSigns").optional().isObject(),
    (0, express_validator_1.body)("clinicalDecision")
        .optional({ values: "falsy" })
        .isIn(["outpatient-discharge", "prescription", "lab-required", "radiology-required", "referral", "observation", "inpatient-required"]),
    (0, express_validator_1.body)("referralDestination").optional({ values: "falsy" }).isString(),
    (0, express_validator_1.body)("observationNotes").optional({ values: "falsy" }).isString(),
    (0, express_validator_1.body)("notes").optional({ values: "falsy" }).isString(),
]), async (req, res, next) => {
    try {
        const result = await workflowService_1.WorkflowService.finishExam({
            appointmentId: req.params.appointmentId,
            ...req.body,
        });
        (0, apiResponse_1.sendSuccess)(res, result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /workflows/medical-records/{medicalRecordId}/finalize:
 *   post:
 *     tags: [Workflows]
 *     summary: Finalisasi dan kunci rekam medis
 *     parameters:
 *       - in: path
 *         name: medicalRecordId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Tidak ditemukan }
 */
exports.workflowRouter.post("/medical-records/:medicalRecordId/finalize", requireMedicalFinalizeAccess, (0, validate_1.validate)([(0, express_validator_1.body)("reason").optional({ values: "falsy" }).isString()]), async (req, res, next) => {
    try {
        const result = await workflowService_1.WorkflowService.finalizeMedicalRecord({
            medicalRecordId: req.params.medicalRecordId,
            user: req.user,
            reason: req.body.reason,
        });
        (0, apiResponse_1.sendSuccess)(res, result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /workflows/billing/sync/{medicalRecordId}:
 *   post:
 *     tags: [Workflows]
 *     summary: Sinkronisasi billing dari rekam medis
 *     parameters:
 *       - in: path
 *         name: medicalRecordId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Tidak ditemukan }
 */
exports.workflowRouter.post("/billing/sync/:medicalRecordId", requireBillingAccess, async (req, res, next) => {
    try {
        const result = await workflowService_1.WorkflowService.syncBilling(req.params.medicalRecordId);
        (0, apiResponse_1.sendSuccess)(res, result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /workflows/payments:
 *   post:
 *     tags: [Workflows]
 *     summary: Catat pembayaran billing
 *     responses:
 *       201: { description: Created }
 *       400: { description: Data tidak valid }
 */
exports.workflowRouter.post("/payments", requireBillingAccess, (0, validate_1.validate)([
    (0, express_validator_1.body)("medicalRecordId").isString().trim().notEmpty(),
    (0, express_validator_1.body)("patientId").optional({ values: "falsy" }).isString().trim(),
    (0, express_validator_1.body)("amount").isFloat({ gt: 0 }),
    (0, express_validator_1.body)("method").isIn(["tunai", "transfer-himbara", "qris", "asuransi-swasta", "asuransi-bumn", "asuransi-syariah", "bpjs"]),
    (0, express_validator_1.body)("notes").optional({ values: "falsy" }).isString(),
    (0, express_validator_1.body)("paidAt").optional({ values: "falsy" }).isString(),
]), async (req, res, next) => {
    try {
        const result = await workflowService_1.WorkflowService.createPayment(req.body);
        (0, apiResponse_1.sendSuccess)(res, result, 201);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /workflows/pharmacy/requests:
 *   post:
 *     tags: [Workflows]
 *     summary: Buat permintaan farmasi dari rekam medis
 *     responses:
 *       201: { description: Created }
 *       400: { description: Data tidak valid }
 */
exports.workflowRouter.post("/pharmacy/requests", requirePharmacyAccess, (0, validate_1.validate)([(0, express_validator_1.body)("medicalRecordId").isString().trim().notEmpty()]), async (req, res, next) => {
    try {
        const result = await workflowService_1.WorkflowService.createPharmacyRequestFromRecord(req.body.medicalRecordId);
        (0, apiResponse_1.sendSuccess)(res, result, 201);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /workflows/pharmacy/requests/{id}/verify:
 *   post:
 *     tags: [Workflows]
 *     summary: Verifikasi permintaan farmasi
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Tidak ditemukan }
 */
exports.workflowRouter.post("/pharmacy/requests/:id/verify", requirePharmacyAccess, (0, validate_1.validate)([(0, express_validator_1.body)("notes").optional({ values: "falsy" }).isString()]), async (req, res, next) => {
    try {
        const result = await workflowService_1.WorkflowService.verifyPharmacyRequest(req.params.id, req.body.notes);
        (0, apiResponse_1.sendSuccess)(res, result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /workflows/pharmacy/requests/{id}/process:
 *   post:
 *     tags: [Workflows]
 *     summary: Ubah status permintaan farmasi menjadi diproses
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Tidak ditemukan }
 */
exports.workflowRouter.post("/pharmacy/requests/:id/process", requirePharmacyAccess, (0, validate_1.validate)([(0, express_validator_1.body)("notes").optional({ values: "falsy" }).isString()]), async (req, res, next) => {
    try {
        const result = await workflowService_1.WorkflowService.processPharmacyRequest(req.params.id, req.body.notes);
        (0, apiResponse_1.sendSuccess)(res, result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /workflows/pharmacy/requests/{id}/dispense:
 *   post:
 *     tags: [Workflows]
 *     summary: Lakukan dispensing obat
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Tidak ditemukan }
 */
exports.workflowRouter.post("/pharmacy/requests/:id/dispense", requirePharmacyAccess, (0, validate_1.validate)([(0, express_validator_1.body)("notes").optional({ values: "falsy" }).isString()]), async (req, res, next) => {
    try {
        const result = await workflowService_1.WorkflowService.dispensePharmacyRequest(req.params.id, req.body.notes);
        (0, apiResponse_1.sendSuccess)(res, result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /workflows/pharmacy/requests/{id}/cancel:
 *   post:
 *     tags: [Workflows]
 *     summary: Batalkan permintaan farmasi
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Tidak ditemukan }
 */
exports.workflowRouter.post("/pharmacy/requests/:id/cancel", requirePharmacyAccess, (0, validate_1.validate)([(0, express_validator_1.body)("notes").optional({ values: "falsy" }).isString()]), async (req, res, next) => {
    try {
        const result = await workflowService_1.WorkflowService.cancelPharmacyRequest(req.params.id, req.body.notes);
        (0, apiResponse_1.sendSuccess)(res, result);
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=workflows.js.map