import { Router } from "express";
import { body } from "express-validator";
import { requireRole } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { WorkflowService } from "../services/workflowService";
import { sendSuccess } from "../utils/apiResponse";

export const workflowRouter = Router()

const requireVisitWorkflowAccess = requireRole("admin", "umum", "dokter", "bidan", "perawat")
const requireMedicalFinalizeAccess = requireRole("admin", "dokter", "bidan")
const requireBillingAccess = requireRole("admin", "umum")
const requirePharmacyAccess = requireRole("admin", "teknis", "dokter", "bidan", "perawat")

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
workflowRouter.post(
  "/visits/register",
  requireVisitWorkflowAccess,
  validate([
    body("patientId").isString().trim().notEmpty(),
    body("doctorId").optional({ values: "falsy" }).isString().trim(),
    body("date").isString().trim().notEmpty(),
    body("time").isString().trim().notEmpty(),
    body("serviceId").optional({ values: "falsy" }).isString().trim(),
    body("serviceIds").optional().isArray(),
    body("notes").optional({ values: "falsy" }).isString(),
  ]),
  async (req, res, next) => {
    try {
      const result = await WorkflowService.registerVisit(req.body)
      sendSuccess(res, result, 201)
    } catch (error) {
      next(error)
    }
  },
)

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
workflowRouter.post("/visits/:appointmentId/start-exam", requireVisitWorkflowAccess, async (req, res, next) => {
  try {
    const result = await WorkflowService.startExam(req.params.appointmentId)
    sendSuccess(res, result)
  } catch (error) {
    next(error)
  }
})

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
workflowRouter.post(
  "/visits/:appointmentId/finish-exam",
  requireVisitWorkflowAccess,
  validate([
    body("diagnosis").isString().trim().notEmpty(),
    body("symptoms").isString().trim().notEmpty(),
    body("treatment").isString().trim().notEmpty(),
    body("doctorId").optional({ values: "falsy" }).isString().trim(),
    body("doctorName").optional({ values: "falsy" }).isString().trim(),
    body("soap").optional().isObject(),
    body("diagnosisCodes").optional().isArray(),
    body("procedureCodes").optional().isArray(),
    body("clinicalHistory").optional().isObject(),
    body("prescription").optional().isArray(),
    body("equipmentsUsed").optional().isArray(),
    body("vitalSigns").optional().isObject(),
    body("clinicalDecision")
      .optional({ values: "falsy" })
      .isIn(["outpatient-discharge", "prescription", "lab-required", "radiology-required", "referral", "observation", "inpatient-required"]),
    body("referralDestination").optional({ values: "falsy" }).isString(),
    body("observationNotes").optional({ values: "falsy" }).isString(),
    body("notes").optional({ values: "falsy" }).isString(),
  ]),
  async (req, res, next) => {
    try {
      const result = await WorkflowService.finishExam({
        appointmentId: req.params.appointmentId,
        ...req.body,
      })
      sendSuccess(res, result)
    } catch (error) {
      next(error)
    }
  },
)

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
workflowRouter.post(
  "/medical-records/:medicalRecordId/finalize",
  requireMedicalFinalizeAccess,
  validate([body("reason").optional({ values: "falsy" }).isString()]),
  async (req, res, next) => {
    try {
      const result = await WorkflowService.finalizeMedicalRecord({
        medicalRecordId: req.params.medicalRecordId,
        user: req.user,
        reason: req.body.reason,
      })
      sendSuccess(res, result)
    } catch (error) {
      next(error)
    }
  },
)

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
workflowRouter.post("/billing/sync/:medicalRecordId", requireBillingAccess, async (req, res, next) => {
  try {
    const result = await WorkflowService.syncBilling(req.params.medicalRecordId)
    sendSuccess(res, result)
  } catch (error) {
    next(error)
  }
})

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
workflowRouter.post(
  "/payments",
  requireBillingAccess,
  validate([
    body("medicalRecordId").isString().trim().notEmpty(),
    body("patientId").optional({ values: "falsy" }).isString().trim(),
    body("amount").isFloat({ gt: 0 }),
    body("method").isIn(["tunai", "transfer-himbara", "qris", "asuransi-swasta", "asuransi-bumn", "asuransi-syariah", "bpjs"]),
    body("notes").optional({ values: "falsy" }).isString(),
    body("paidAt").optional({ values: "falsy" }).isString(),
  ]),
  async (req, res, next) => {
    try {
      const result = await WorkflowService.createPayment(req.body)
      sendSuccess(res, result, 201)
    } catch (error) {
      next(error)
    }
  },
)

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
workflowRouter.post(
  "/pharmacy/requests",
  requirePharmacyAccess,
  validate([body("medicalRecordId").isString().trim().notEmpty()]),
  async (req, res, next) => {
    try {
      const result = await WorkflowService.createPharmacyRequestFromRecord(req.body.medicalRecordId)
      sendSuccess(res, result, 201)
    } catch (error) {
      next(error)
    }
  },
)

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
workflowRouter.post(
  "/pharmacy/requests/:id/verify",
  requirePharmacyAccess,
  validate([body("notes").optional({ values: "falsy" }).isString()]),
  async (req, res, next) => {
    try {
      const result = await WorkflowService.verifyPharmacyRequest(req.params.id, req.body.notes)
      sendSuccess(res, result)
    } catch (error) {
      next(error)
    }
  },
)

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
workflowRouter.post(
  "/pharmacy/requests/:id/process",
  requirePharmacyAccess,
  validate([body("notes").optional({ values: "falsy" }).isString()]),
  async (req, res, next) => {
    try {
      const result = await WorkflowService.processPharmacyRequest(req.params.id, req.body.notes)
      sendSuccess(res, result)
    } catch (error) {
      next(error)
    }
  },
)

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
workflowRouter.post(
  "/pharmacy/requests/:id/dispense",
  requirePharmacyAccess,
  validate([body("notes").optional({ values: "falsy" }).isString()]),
  async (req, res, next) => {
    try {
      const result = await WorkflowService.dispensePharmacyRequest(req.params.id, req.body.notes)
      sendSuccess(res, result)
    } catch (error) {
      next(error)
    }
  },
)

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
workflowRouter.post(
  "/pharmacy/requests/:id/cancel",
  requirePharmacyAccess,
  validate([body("notes").optional({ values: "falsy" }).isString()]),
  async (req, res, next) => {
    try {
      const result = await WorkflowService.cancelPharmacyRequest(req.params.id, req.body.notes)
      sendSuccess(res, result)
    } catch (error) {
      next(error)
    }
  },
)
