"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.informedConsentsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const informedConsentPdfService_1 = require("../services/informedConsentPdfService");
// Router khusus untuk cetak PDF surat persetujuan tindakan.
// CRUD-nya ditangani oleh generic collection route (registerCollectionRoutes) pada path yang sama;
// router ini hanya menambahkan endpoint /:id/pdf dan didaftarkan sebelum collection route.
exports.informedConsentsRouter = (0, express_1.Router)();
const requireConsentAccess = (0, auth_1.requireRole)("admin", "dokter", "bidan", "perawat", "umum");
/**
 * @openapi
 * /informed-consents/{id}/pdf:
 *   get:
 *     tags: [InformedConsents]
 *     summary: Unduh surat persetujuan tindakan dalam format PDF
 *     responses:
 *       200:
 *         description: File PDF
 *         content:
 *           application/pdf: {}
 */
exports.informedConsentsRouter.get("/:id/pdf", requireConsentAccess, async (req, res, next) => {
    try {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=persetujuan-tindakan-${req.params.id}.pdf`);
        const doc = await informedConsentPdfService_1.InformedConsentPdfService.buildConsentPdf(req.params.id);
        doc.pipe(res);
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=informedConsents.js.map