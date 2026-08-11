import { Router } from "express";
import { body } from "express-validator";
import { requireRole } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { ReferralPdfService } from "../services/referralPdfService";
import { ReferralService } from "../services/referralService";
import { createHttpError } from "../utils/httpError";
import { sendSuccess } from "../utils/apiResponse";

export const referralsRouter = Router()
const requireReferralAccess = requireRole("admin", "dokter", "bidan", "perawat", "umum")
const requireReferralWrite = requireRole("admin", "dokter", "umum")
const requireReferralReceive = requireRole("admin", "umum")

/**
 * @openapi
 * /referrals:
 *   get:
 *     tags: [Referrals]
 *     summary: List rujukan pasien dengan filter opsional
 *     responses:
 *       200: { description: OK }
 */
referralsRouter.get("/", requireReferralAccess, async (req, res, next) => {
  try {
    const { patientId, status, direction, facilityId, from, to } = req.query
    const data = await ReferralService.list({
      patientId: patientId as string | undefined,
      status: status as string | undefined,
      direction: direction as string | undefined,
      facilityId: facilityId as string | undefined,
      from: from as string | undefined,
      to: to as string | undefined,
    })
    sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
})

referralsRouter.get("/:id", requireReferralAccess, async (req, res, next) => {
  try {
    const data = await ReferralService.getById(req.params.id)
    sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
})

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
referralsRouter.post(
  "/",
  requireReferralWrite,
  validate([
    body("direction").isIn(["outgoing", "incoming"]),
    body("patientId").isString().trim().notEmpty(),
    body("patientName").isString().trim().notEmpty(),
    body("facilityName").isString().trim().notEmpty(),
    body("reason").isString().trim().notEmpty(),
  ]),
  async (req, res, next) => {
    try {
      const created =
        req.body.direction === "incoming"
          ? await ReferralService.createIncoming(req.body, req.user)
          : await ReferralService.createOutgoing(req.body, req.user)
      sendSuccess(res, created, 201)
    } catch (error) {
      next(error)
    }
  }
)

referralsRouter.put(
  "/:id",
  requireReferralWrite,
  validate([body().notEmpty().withMessage("Body request tidak boleh kosong")]),
  async (req, res, next) => {
    try {
      const updated = await ReferralService.update(req.params.id, req.body)
      sendSuccess(res, updated)
    } catch (error) {
      next(error)
    }
  }
)

referralsRouter.post("/:id/send", requireReferralWrite, async (req, res, next) => {
  try {
    const updated = await ReferralService.updateStatus(req.params.id, "sent", req.body?.notes, req.user)
    sendSuccess(res, updated)
  } catch (error) {
    next(error)
  }
})

referralsRouter.post("/:id/receive", requireReferralReceive, async (req, res, next) => {
  try {
    const updated = await ReferralService.updateStatus(req.params.id, "received", req.body?.notes, req.user)
    sendSuccess(res, updated)
  } catch (error) {
    next(error)
  }
})

referralsRouter.post("/:id/follow-up", requireReferralWrite, async (req, res, next) => {
  try {
    const updated = await ReferralService.updateStatus(req.params.id, "followed-up", req.body?.notes, req.user)
    sendSuccess(res, updated)
  } catch (error) {
    next(error)
  }
})

referralsRouter.post("/:id/reject", requireReferralWrite, async (req, res, next) => {
  try {
    const updated = await ReferralService.updateStatus(req.params.id, "rejected", req.body?.notes, req.user)
    sendSuccess(res, updated)
  } catch (error) {
    next(error)
  }
})

referralsRouter.post("/:id/complete", requireReferralWrite, async (req, res, next) => {
  try {
    const updated = await ReferralService.updateStatus(req.params.id, "completed", req.body?.notes, req.user)
    sendSuccess(res, updated)
  } catch (error) {
    next(error)
  }
})

referralsRouter.delete("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    const deleted = await ReferralService.remove(req.params.id)
    if (!deleted) {
      throw createHttpError(404, "Rujukan tidak ditemukan")
    }
    return res.status(204).end()
  } catch (error) {
    next(error)
  }
})

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
referralsRouter.get("/:id/pdf", requireReferralAccess, async (req, res, next) => {
  try {
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename=surat-rujukan-${req.params.id}.pdf`)
    const doc = await ReferralPdfService.buildReferralLetterPdf(req.params.id)
    doc.pipe(res)
  } catch (error) {
    next(error)
  }
})
