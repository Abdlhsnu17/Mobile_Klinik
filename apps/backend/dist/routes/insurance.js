"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insuranceRouter = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const insuranceService_1 = require("../services/insuranceService");
const httpError_1 = require("../utils/httpError");
const apiResponse_1 = require("../utils/apiResponse");
exports.insuranceRouter = (0, express_1.Router)();
const requireInsuranceAccess = (0, auth_1.requireRole)("admin", "umum");
/**
 * @openapi
 * /insurance/profiles:
 *   get:
 *     tags: [Insurance]
 *     summary: List profil asuransi pasien
 *     responses:
 *       200: { description: OK }
 */
exports.insuranceRouter.get("/profiles", requireInsuranceAccess, async (req, res, next) => {
    try {
        const data = await insuranceService_1.InsuranceService.listProfiles();
        (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /insurance/profiles:
 *   post:
 *     tags: [Insurance]
 *     summary: Buat profil asuransi pasien
 *     responses:
 *       201: { description: Created }
 *       400: { description: Data tidak valid }
 */
exports.insuranceRouter.post("/profiles", requireInsuranceAccess, (0, validate_1.validate)([
    (0, express_validator_1.body)("patientId").isString().trim().notEmpty(),
    (0, express_validator_1.body)("provider").isIn(["bpjs", "asuransi-swasta"]),
    (0, express_validator_1.body)("policyNumber").isString().trim().notEmpty(),
    (0, express_validator_1.body)("planName").isString().trim().notEmpty(),
    (0, express_validator_1.body)("validUntil").isISO8601().toDate(),
]), async (req, res, next) => {
    try {
        const record = await insuranceService_1.InsuranceService.createProfile(req.body);
        (0, apiResponse_1.sendSuccess)(res, record, 201);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /insurance/profiles/{id}:
 *   put:
 *     tags: [Insurance]
 *     summary: Update profil asuransi pasien
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
exports.insuranceRouter.put("/profiles/:id", requireInsuranceAccess, (0, validate_1.validate)([(0, express_validator_1.body)().notEmpty().withMessage("Body request tidak boleh kosong")]), async (req, res, next) => {
    try {
        const updated = await insuranceService_1.InsuranceService.updateProfile(req.params.id, req.body);
        if (!updated) {
            throw (0, httpError_1.createHttpError)(404, "Profil asuransi tidak ditemukan");
        }
        (0, apiResponse_1.sendSuccess)(res, updated);
    }
    catch (error) {
        next(error);
    }
});
exports.insuranceRouter.delete("/profiles/:id", requireInsuranceAccess, async (req, res, next) => {
    try {
        const deleted = await insuranceService_1.InsuranceService.deleteProfile(req.params.id);
        if (!deleted) {
            throw (0, httpError_1.createHttpError)(404, "Profil asuransi tidak ditemukan");
        }
        return res.status(204).end();
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /insurance/bridge/members:
 *   get:
 *     tags: [Insurance]
 *     summary: List anggota bridging asuransi
 *     responses:
 *       200: { description: OK }
 */
exports.insuranceRouter.get("/bridge/members", requireInsuranceAccess, async (req, res, next) => {
    try {
        const data = await insuranceService_1.InsuranceService.listBridgeMembers();
        (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /insurance/bridge/bpjs:
 *   post:
 *     tags: [Insurance]
 *     summary: Verifikasi nomor peserta BPJS
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               participantNumber: { type: string }
 *     responses:
 *       200: { description: OK }
 *       400: { description: Data tidak valid }
 */
exports.insuranceRouter.post("/bridge/bpjs", requireInsuranceAccess, (0, validate_1.validate)([(0, express_validator_1.body)("participantNumber").isString().trim().notEmpty()]), async (req, res, next) => {
    try {
        const { participantNumber } = req.body;
        const result = await insuranceService_1.InsuranceService.verifyBpjs(participantNumber);
        (0, apiResponse_1.sendSuccess)(res, result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /insurance/claims:
 *   get:
 *     tags: [Insurance]
 *     summary: List klaim asuransi
 *     responses:
 *       200: { description: OK }
 */
exports.insuranceRouter.get("/claims", requireInsuranceAccess, async (req, res, next) => {
    try {
        const data = await insuranceService_1.InsuranceService.listClaims();
        (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (error) {
        next(error);
    }
});
exports.insuranceRouter.get("/claims/:id", requireInsuranceAccess, async (req, res, next) => {
    try {
        const claim = await insuranceService_1.InsuranceService.getClaim(req.params.id);
        if (!claim) {
            throw (0, httpError_1.createHttpError)(404, "Klaim tidak ditemukan");
        }
        (0, apiResponse_1.sendSuccess)(res, claim);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /insurance/claims:
 *   post:
 *     tags: [Insurance]
 *     summary: Buat klaim asuransi dari sebuah tagihan
 *     responses:
 *       201: { description: Created }
 */
exports.insuranceRouter.post("/claims", requireInsuranceAccess, (0, validate_1.validate)([
    (0, express_validator_1.body)("billingRecordId").isString().trim().notEmpty(),
    (0, express_validator_1.body)("provider").optional().isIn(["bpjs", "asuransi-swasta"]),
    (0, express_validator_1.body)("policyNumber").optional().isString(),
    (0, express_validator_1.body)("claimedAmount").optional().isFloat({ gt: 0 }),
    (0, express_validator_1.body)("notes").optional().isString(),
]), async (req, res, next) => {
    try {
        const created = await insuranceService_1.InsuranceService.createClaim(req.body);
        (0, apiResponse_1.sendSuccess)(res, created, 201);
    }
    catch (error) {
        next(error);
    }
});
exports.insuranceRouter.put("/claims/:id", requireInsuranceAccess, (0, validate_1.validate)([(0, express_validator_1.body)().notEmpty().withMessage("Body request tidak boleh kosong")]), async (req, res, next) => {
    try {
        const updated = await insuranceService_1.InsuranceService.updateClaim(req.params.id, req.body);
        (0, apiResponse_1.sendSuccess)(res, updated);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /insurance/claims/{id}/status:
 *   post:
 *     tags: [Insurance]
 *     summary: Ubah status klaim (submitted/verified/approved/paid/rejected)
 *     responses:
 *       200: { description: OK }
 *       409: { description: Transisi tidak diizinkan }
 */
exports.insuranceRouter.post("/claims/:id/status", requireInsuranceAccess, (0, validate_1.validate)([
    (0, express_validator_1.body)("status").isIn(["submitted", "verified", "approved", "paid", "rejected"]),
    (0, express_validator_1.body)("approvedAmount").optional().isFloat({ min: 0 }),
    (0, express_validator_1.body)("rejectionReason").optional().isString(),
]), async (req, res, next) => {
    try {
        const { status, approvedAmount, rejectionReason } = req.body;
        const updated = await insuranceService_1.InsuranceService.transitionClaim(req.params.id, status, {
            approvedAmount: approvedAmount !== undefined ? Number(approvedAmount) : undefined,
            rejectionReason,
        });
        (0, apiResponse_1.sendSuccess)(res, updated);
    }
    catch (error) {
        next(error);
    }
});
exports.insuranceRouter.delete("/claims/:id", requireInsuranceAccess, async (req, res, next) => {
    try {
        const deleted = await insuranceService_1.InsuranceService.deleteClaim(req.params.id);
        if (!deleted) {
            throw (0, httpError_1.createHttpError)(404, "Klaim tidak ditemukan");
        }
        return res.status(204).end();
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=insurance.js.map