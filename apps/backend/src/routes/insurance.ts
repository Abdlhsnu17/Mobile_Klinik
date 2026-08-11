import { Router } from "express";
import { body } from "express-validator";
import { requireRole } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { InsuranceService } from "../services/insuranceService";
import { createHttpError } from "../utils/httpError";
import { sendSuccess } from "../utils/apiResponse";

export const insuranceRouter = Router()
const requireInsuranceAccess = requireRole("admin", "umum")

/**
 * @openapi
 * /insurance/profiles:
 *   get:
 *     tags: [Insurance]
 *     summary: List profil asuransi pasien
 *     responses:
 *       200: { description: OK }
 */
insuranceRouter.get("/profiles", requireInsuranceAccess, async (req, res, next) => {
  try {
    const data = await InsuranceService.listProfiles()
    sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
})

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
insuranceRouter.post(
  "/profiles",
  requireInsuranceAccess,
  validate([
    body("patientId").isString().trim().notEmpty(),
    body("provider").isIn(["bpjs", "asuransi-swasta"]),
    body("policyNumber").isString().trim().notEmpty(),
    body("planName").isString().trim().notEmpty(),
    body("validUntil").isISO8601().toDate(),
  ]),
  async (req, res, next) => {
    try {
      const record = await InsuranceService.createProfile(req.body)
      sendSuccess(res, record, 201)
    } catch (error) {
      next(error)
    }
  }
)

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
insuranceRouter.put(
  "/profiles/:id",
  requireInsuranceAccess,
  validate([body().notEmpty().withMessage("Body request tidak boleh kosong")]),
  async (req, res, next) => {
    try {
      const updated = await InsuranceService.updateProfile(req.params.id, req.body)
      if (!updated) {
        throw createHttpError(404, "Profil asuransi tidak ditemukan")
      }
      sendSuccess(res, updated)
    } catch (error) {
      next(error)
    }
  }
)

insuranceRouter.delete("/profiles/:id", requireInsuranceAccess, async (req, res, next) => {
  try {
    const deleted = await InsuranceService.deleteProfile(req.params.id)
    if (!deleted) {
      throw createHttpError(404, "Profil asuransi tidak ditemukan")
    }
    return res.status(204).end()
  } catch (error) {
    next(error)
  }
})

/**
 * @openapi
 * /insurance/bridge/members:
 *   get:
 *     tags: [Insurance]
 *     summary: List anggota bridging asuransi
 *     responses:
 *       200: { description: OK }
 */
insuranceRouter.get("/bridge/members", requireInsuranceAccess, async (req, res, next) => {
  try {
    const data = await InsuranceService.listBridgeMembers()
    sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
})

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
insuranceRouter.post(
  "/bridge/bpjs",
  requireInsuranceAccess,
  validate([body("participantNumber").isString().trim().notEmpty()]),
  async (req, res, next) => {
    try {
      const { participantNumber } = req.body
      const result = await InsuranceService.verifyBpjs(participantNumber)
      sendSuccess(res, result)
    } catch (error) {
      next(error)
    }
  }
)

/**
 * @openapi
 * /insurance/claims:
 *   get:
 *     tags: [Insurance]
 *     summary: List klaim asuransi
 *     responses:
 *       200: { description: OK }
 */
insuranceRouter.get("/claims", requireInsuranceAccess, async (req, res, next) => {
  try {
    const data = await InsuranceService.listClaims()
    sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
})

insuranceRouter.get("/claims/:id", requireInsuranceAccess, async (req, res, next) => {
  try {
    const claim = await InsuranceService.getClaim(req.params.id)
    if (!claim) {
      throw createHttpError(404, "Klaim tidak ditemukan")
    }
    sendSuccess(res, claim)
  } catch (error) {
    next(error)
  }
})

/**
 * @openapi
 * /insurance/claims:
 *   post:
 *     tags: [Insurance]
 *     summary: Buat klaim asuransi dari sebuah tagihan
 *     responses:
 *       201: { description: Created }
 */
insuranceRouter.post(
  "/claims",
  requireInsuranceAccess,
  validate([
    body("billingRecordId").isString().trim().notEmpty(),
    body("provider").optional().isIn(["bpjs", "asuransi-swasta"]),
    body("policyNumber").optional().isString(),
    body("claimedAmount").optional().isFloat({ gt: 0 }),
    body("notes").optional().isString(),
  ]),
  async (req, res, next) => {
    try {
      const created = await InsuranceService.createClaim(req.body)
      sendSuccess(res, created, 201)
    } catch (error) {
      next(error)
    }
  }
)

insuranceRouter.put(
  "/claims/:id",
  requireInsuranceAccess,
  validate([body().notEmpty().withMessage("Body request tidak boleh kosong")]),
  async (req, res, next) => {
    try {
      const updated = await InsuranceService.updateClaim(req.params.id, req.body)
      sendSuccess(res, updated)
    } catch (error) {
      next(error)
    }
  }
)

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
insuranceRouter.post(
  "/claims/:id/status",
  requireInsuranceAccess,
  validate([
    body("status").isIn(["submitted", "verified", "approved", "paid", "rejected"]),
    body("approvedAmount").optional().isFloat({ min: 0 }),
    body("rejectionReason").optional().isString(),
  ]),
  async (req, res, next) => {
    try {
      const { status, approvedAmount, rejectionReason } = req.body
      const updated = await InsuranceService.transitionClaim(req.params.id, status, {
        approvedAmount: approvedAmount !== undefined ? Number(approvedAmount) : undefined,
        rejectionReason,
      })
      sendSuccess(res, updated)
    } catch (error) {
      next(error)
    }
  }
)

insuranceRouter.delete("/claims/:id", requireInsuranceAccess, async (req, res, next) => {
  try {
    const deleted = await InsuranceService.deleteClaim(req.params.id)
    if (!deleted) {
      throw createHttpError(404, "Klaim tidak ditemukan")
    }
    return res.status(204).end()
  } catch (error) {
    next(error)
  }
})
