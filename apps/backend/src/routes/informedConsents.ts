import { Router } from "express"
import { requireRole } from "../middlewares/auth"
import { InformedConsentPdfService } from "../services/informedConsentPdfService"

// Router khusus untuk cetak PDF surat persetujuan tindakan.
// CRUD-nya ditangani oleh generic collection route (registerCollectionRoutes) pada path yang sama;
// router ini hanya menambahkan endpoint /:id/pdf dan didaftarkan sebelum collection route.
export const informedConsentsRouter = Router()

const requireConsentAccess = requireRole("admin", "dokter", "bidan", "perawat", "umum")

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
informedConsentsRouter.get("/:id/pdf", requireConsentAccess, async (req, res, next) => {
  try {
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename=persetujuan-tindakan-${req.params.id}.pdf`)
    const doc = await InformedConsentPdfService.buildConsentPdf(req.params.id)
    doc.pipe(res)
  } catch (error) {
    next(error)
  }
})
