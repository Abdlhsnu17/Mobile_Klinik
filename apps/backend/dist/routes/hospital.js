"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hospitalRouter = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const hospitalService_1 = require("../services/hospitalService");
const httpError_1 = require("../utils/httpError");
const apiResponse_1 = require("../utils/apiResponse");
exports.hospitalRouter = (0, express_1.Router)();
const requireHospitalAccess = (0, auth_1.requireRole)("admin", "perawat", "dokter", "bidan");
const requireBedManagement = (0, auth_1.requireRole)("admin", "perawat");
/**
 * @openapi
 * /hospital/beds:
 *   get:
 *     tags: [Hospital]
 *     summary: List tempat tidur
 *     responses:
 *       200: { description: OK }
 */
exports.hospitalRouter.get("/beds", requireHospitalAccess, async (req, res, next) => {
    try {
        const data = await hospitalService_1.HospitalService.listBeds();
        (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /hospital/beds:
 *   post:
 *     tags: [Hospital]
 *     summary: Tambah tempat tidur / ruangan baru
 *     responses:
 *       201: { description: Created }
 *       400: { description: Data tidak valid }
 */
exports.hospitalRouter.post("/beds", requireBedManagement, (0, validate_1.validate)([
    (0, express_validator_1.body)("bedNumber").isString().trim().notEmpty().withMessage("Nomor bed wajib diisi"),
    (0, express_validator_1.body)("ward").isString().trim().notEmpty().withMessage("Ruangan (ward) wajib diisi"),
    (0, express_validator_1.body)("status").optional().isIn(["available", "occupied", "cleaning", "maintenance"]),
]), async (req, res, next) => {
    try {
        const bed = await hospitalService_1.HospitalService.createBed(req.body);
        (0, apiResponse_1.sendSuccess)(res, bed, 201);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /hospital/beds/{id}:
 *   put:
 *     tags: [Hospital]
 *     summary: Update status tempat tidur
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Updated }
 *       400: { description: Data tidak valid }
 *       404: { description: Tidak ditemukan }
 */
exports.hospitalRouter.put("/beds/:id", requireHospitalAccess, validate_1.requireNonEmptyBody, async (req, res, next) => {
    try {
        const updated = await hospitalService_1.HospitalService.updateBed(req.params.id, req.body);
        if (!updated) {
            throw (0, httpError_1.createHttpError)(404, "Tempat tidur tidak ditemukan");
        }
        (0, apiResponse_1.sendSuccess)(res, updated);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /hospital/beds/{id}:
 *   delete:
 *     tags: [Hospital]
 *     summary: Hapus tempat tidur / ruangan
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Deleted }
 *       404: { description: Tidak ditemukan }
 *       409: { description: Bed sedang terisi }
 */
exports.hospitalRouter.delete("/beds/:id", requireBedManagement, async (req, res, next) => {
    try {
        const success = await hospitalService_1.HospitalService.deleteBed(req.params.id);
        if (!success) {
            throw (0, httpError_1.createHttpError)(404, "Tempat tidur tidak ditemukan");
        }
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /hospital/admissions:
 *   get:
 *     tags: [Hospital]
 *     summary: List rawat inap
 *     responses:
 *       200: { description: OK }
 */
exports.hospitalRouter.get("/admissions", requireHospitalAccess, async (req, res, next) => {
    try {
        const data = await hospitalService_1.HospitalService.listAdmissions();
        (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /hospital/admissions:
 *   post:
 *     tags: [Hospital]
 *     summary: Buat admisi rawat inap baru
 *     responses:
 *       201: { description: Created }
 *       400: { description: Data tidak valid }
 */
exports.hospitalRouter.post("/admissions", requireHospitalAccess, (0, validate_1.validate)([
    (0, express_validator_1.body)("patientId").isString().trim().notEmpty(),
    (0, express_validator_1.body)("bedId")
        .optional({ values: "falsy" })
        .isString()
        .trim(),
]), async (req, res, next) => {
    try {
        const admission = await hospitalService_1.HospitalService.createAdmission(req.body);
        (0, apiResponse_1.sendSuccess)(res, admission, 201);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /hospital/admissions/{id}:
 *   put:
 *     tags: [Hospital]
 *     summary: Update admisi rawat inap
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Updated }
 *       400: { description: Data tidak valid }
 *       404: { description: Tidak ditemukan }
 */
exports.hospitalRouter.put("/admissions/:id", requireHospitalAccess, validate_1.requireNonEmptyBody, async (req, res, next) => {
    try {
        const result = await hospitalService_1.HospitalService.updateAdmission(req.params.id, req.body);
        if (!result) {
            throw (0, httpError_1.createHttpError)(404, "Data rawat inap tidak ditemukan");
        }
        (0, apiResponse_1.sendSuccess)(res, result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /hospital/admissions/{id}/discharge:
 *   put:
 *     tags: [Hospital]
 *     summary: Discharge pasien rawat inap
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Tidak ditemukan }
 */
exports.hospitalRouter.put("/admissions/:id/discharge", requireHospitalAccess, async (req, res, next) => {
    try {
        const disposition = ["discharged", "referred", "deceased"].includes(req.body?.disposition)
            ? req.body.disposition
            : "discharged";
        const result = await hospitalService_1.HospitalService.dischargeAdmission(req.params.id, disposition);
        if (!result) {
            throw (0, httpError_1.createHttpError)(404, "Data rawat inap tidak ditemukan");
        }
        (0, apiResponse_1.sendSuccess)(res, result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /hospital/admissions/{id}:
 *   delete:
 *     tags: [Hospital]
 *     summary: Hapus data rawat inap
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Deleted }
 *       400: { description: ID tidak diberikan }
 *       404: { description: Tidak ditemukan }
 */
exports.hospitalRouter.delete("/admissions/:id", requireHospitalAccess, async (req, res, next) => {
    try {
        const success = await hospitalService_1.HospitalService.deleteAdmission(req.params.id);
        if (!success) {
            throw (0, httpError_1.createHttpError)(404, "Data rawat inap tidak ditemukan");
        }
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /hospital/visits:
 *   get:
 *     tags: [Hospital]
 *     summary: List catatan visit dokter
 *     responses:
 *       200: { description: OK }
 */
exports.hospitalRouter.get("/visits", requireHospitalAccess, async (req, res, next) => {
    try {
        const data = await hospitalService_1.HospitalService.listVisitNotes();
        (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /hospital/visits:
 *   post:
 *     tags: [Hospital]
 *     summary: Buat catatan visit dokter
 *     responses:
 *       201: { description: Created }
 *       400: { description: Data tidak valid }
 */
exports.hospitalRouter.post("/visits", requireHospitalAccess, (0, validate_1.validate)([
    (0, express_validator_1.body)("admissionId").isString().trim().notEmpty(),
    (0, express_validator_1.body)("doctorName").isString().trim().notEmpty(),
    (0, express_validator_1.body)("note").isString().trim().notEmpty(),
]), async (req, res, next) => {
    try {
        const note = await hospitalService_1.HospitalService.addVisitNote(req.body);
        (0, apiResponse_1.sendSuccess)(res, note, 201);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /hospital/visits/{id}:
 *   put:
 *     tags: [Hospital]
 *     summary: Update catatan visit dokter
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Updated }
 *       400: { description: Data tidak valid }
 *       404: { description: Tidak ditemukan }
 */
exports.hospitalRouter.put("/visits/:id", requireHospitalAccess, validate_1.requireNonEmptyBody, async (req, res, next) => {
    try {
        const updated = await hospitalService_1.HospitalService.updateVisitNote(req.params.id, req.body);
        if (!updated) {
            throw (0, httpError_1.createHttpError)(404, "Catatan visit dokter tidak ditemukan");
        }
        (0, apiResponse_1.sendSuccess)(res, updated);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /hospital/visits/{id}:
 *   delete:
 *     tags: [Hospital]
 *     summary: Hapus catatan visit dokter
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Deleted }
 *       404: { description: Tidak ditemukan }
 */
exports.hospitalRouter.delete("/visits/:id", requireHospitalAccess, async (req, res, next) => {
    try {
        const success = await hospitalService_1.HospitalService.deleteVisitNote(req.params.id);
        if (!success) {
            throw (0, httpError_1.createHttpError)(404, "Catatan visit dokter tidak ditemukan");
        }
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=hospital.js.map