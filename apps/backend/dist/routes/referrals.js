"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.referralsRouter = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const referralPdfService_1 = require("../services/referralPdfService");
const referralService_1 = require("../services/referralService");
const httpError_1 = require("../utils/httpError");
const apiResponse_1 = require("../utils/apiResponse");
exports.referralsRouter = (0, express_1.Router)();
const requireReferralAccess = (0, auth_1.requireRole)("admin", "dokter", "bidan", "perawat", "umum");
const requireReferralWrite = (0, auth_1.requireRole)("admin", "dokter", "umum");
const requireReferralReceive = (0, auth_1.requireRole)("admin", "umum");
/**
 * @openapi
 * /referrals:
 *   get:
 *     tags: [Referrals]
 *     summary: List rujukan pasien dengan filter opsional
 *     responses:
 *       200: { description: OK }
 */
exports.referralsRouter.get("/", requireReferralAccess, async (req, res, next) => {
    try {
        const { patientId, status, direction, facilityId, from, to } = req.query;
        const data = await referralService_1.ReferralService.list({
            patientId: patientId,
            status: status,
            direction: direction,
            facilityId: facilityId,
            from: from,
            to: to,
        });
        (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (error) {
        next(error);
    }
});
exports.referralsRouter.get("/:id", requireReferralAccess, async (req, res, next) => {
    try {
        const data = await referralService_1.ReferralService.getById(req.params.id);
        (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /referrals:
 *   post:
 *     tags: [Referrals]
 *     summary: Buat rujukan baru (keluar atau masuk)
 *     responses:
 *       201: { description: Created }
 *       400: { description: Data tidak valid }
 */
exports.referralsRouter.post("/", requireReferralWrite, (0, validate_1.validate)([
    (0, express_validator_1.body)("direction").isIn(["outgoing", "incoming"]),
    (0, express_validator_1.body)("patientId").isString().trim().notEmpty(),
    (0, express_validator_1.body)("patientName").isString().trim().notEmpty(),
    (0, express_validator_1.body)("facilityName").isString().trim().notEmpty(),
    (0, express_validator_1.body)("reason").isString().trim().notEmpty(),
]), async (req, res, next) => {
    try {
        const created = req.body.direction === "incoming"
            ? await referralService_1.ReferralService.createIncoming(req.body, req.user)
            : await referralService_1.ReferralService.createOutgoing(req.body, req.user);
        (0, apiResponse_1.sendSuccess)(res, created, 201);
    }
    catch (error) {
        next(error);
    }
});
exports.referralsRouter.put("/:id", requireReferralWrite, (0, validate_1.validate)([(0, express_validator_1.body)().notEmpty().withMessage("Body request tidak boleh kosong")]), async (req, res, next) => {
    try {
        const updated = await referralService_1.ReferralService.update(req.params.id, req.body);
        (0, apiResponse_1.sendSuccess)(res, updated);
    }
    catch (error) {
        next(error);
    }
});
exports.referralsRouter.post("/:id/send", requireReferralWrite, async (req, res, next) => {
    try {
        const updated = await referralService_1.ReferralService.updateStatus(req.params.id, "sent", req.body?.notes, req.user);
        (0, apiResponse_1.sendSuccess)(res, updated);
    }
    catch (error) {
        next(error);
    }
});
exports.referralsRouter.post("/:id/receive", requireReferralReceive, async (req, res, next) => {
    try {
        const updated = await referralService_1.ReferralService.updateStatus(req.params.id, "received", req.body?.notes, req.user);
        (0, apiResponse_1.sendSuccess)(res, updated);
    }
    catch (error) {
        next(error);
    }
});
exports.referralsRouter.post("/:id/follow-up", requireReferralWrite, async (req, res, next) => {
    try {
        const updated = await referralService_1.ReferralService.updateStatus(req.params.id, "followed-up", req.body?.notes, req.user);
        (0, apiResponse_1.sendSuccess)(res, updated);
    }
    catch (error) {
        next(error);
    }
});
exports.referralsRouter.post("/:id/reject", requireReferralWrite, async (req, res, next) => {
    try {
        const updated = await referralService_1.ReferralService.updateStatus(req.params.id, "rejected", req.body?.notes, req.user);
        (0, apiResponse_1.sendSuccess)(res, updated);
    }
    catch (error) {
        next(error);
    }
});
exports.referralsRouter.post("/:id/complete", requireReferralWrite, async (req, res, next) => {
    try {
        const updated = await referralService_1.ReferralService.updateStatus(req.params.id, "completed", req.body?.notes, req.user);
        (0, apiResponse_1.sendSuccess)(res, updated);
    }
    catch (error) {
        next(error);
    }
});
exports.referralsRouter.delete("/:id", (0, auth_1.requireRole)("admin"), async (req, res, next) => {
    try {
        const deleted = await referralService_1.ReferralService.remove(req.params.id);
        if (!deleted) {
            throw (0, httpError_1.createHttpError)(404, "Rujukan tidak ditemukan");
        }
        return res.status(204).end();
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /referrals/{id}/pdf:
 *   get:
 *     tags: [Referrals]
 *     summary: Unduh surat rujukan dalam format PDF
 *     responses:
 *       200:
 *         description: File PDF
 *         content:
 *           application/pdf: {}
 */
exports.referralsRouter.get("/:id/pdf", requireReferralAccess, async (req, res, next) => {
    try {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=surat-rujukan-${req.params.id}.pdf`);
        const doc = await referralPdfService_1.ReferralPdfService.buildReferralLetterPdf(req.params.id);
        doc.pipe(res);
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=referrals.js.map