import { Router } from "express";
import { body } from "express-validator";
import { requireRole } from "../middlewares/auth";
import { requireNonEmptyBody, validate } from "../middlewares/validate";
import { HospitalService } from "../services/hospitalService";
import { createHttpError } from "../utils/httpError";
import { sendSuccess } from "../utils/apiResponse";

export const hospitalRouter = Router()
const requireHospitalAccess = requireRole("admin", "perawat", "dokter", "bidan")
const requireBedManagement = requireRole("admin", "perawat")

/**
 * @openapi
 * /hospital/beds:
 *   get:
 *     tags: [Hospital]
 *     summary: List tempat tidur
 *     responses:
 *       200: { description: OK }
 */
hospitalRouter.get("/beds", requireHospitalAccess, async (req, res, next) => {
  try {
    const data = await HospitalService.listBeds()
    sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
})

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
hospitalRouter.post(
  "/beds",
  requireBedManagement,
  validate([
    body("bedNumber").isString().trim().notEmpty().withMessage("Nomor bed wajib diisi"),
    body("ward").isString().trim().notEmpty().withMessage("Ruangan (ward) wajib diisi"),
    body("status").optional().isIn(["available", "occupied", "cleaning", "maintenance"]),
  ]),
  async (req, res, next) => {
    try {
      const bed = await HospitalService.createBed(req.body)
      sendSuccess(res, bed, 201)
    } catch (error) {
      next(error)
    }
  }
)

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
hospitalRouter.put("/beds/:id", requireHospitalAccess, requireNonEmptyBody, async (req, res, next) => {
  try {
    const updated = await HospitalService.updateBed(req.params.id, req.body)
    if (!updated) {
      throw createHttpError(404, "Tempat tidur tidak ditemukan")
    }
    sendSuccess(res, updated)
  } catch (error) {
    next(error)
  }
})

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
hospitalRouter.delete("/beds/:id", requireBedManagement, async (req, res, next) => {
  try {
    const success = await HospitalService.deleteBed(req.params.id)
    if (!success) {
      throw createHttpError(404, "Tempat tidur tidak ditemukan")
    }
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

/**
 * @openapi
 * /hospital/admissions:
 *   get:
 *     tags: [Hospital]
 *     summary: List rawat inap
 *     responses:
 *       200: { description: OK }
 */
hospitalRouter.get("/admissions", requireHospitalAccess, async (req, res, next) => {
  try {
    const data = await HospitalService.listAdmissions()
    sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
})

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
hospitalRouter.post(
  "/admissions",
  requireHospitalAccess,
  validate([
    body("patientId").isString().trim().notEmpty(),
    body("bedId")
      .optional({ values: "falsy" })
      .isString()
      .trim(),
  ]),
  async (req, res, next) => {
    try {
      const admission = await HospitalService.createAdmission(req.body)
      sendSuccess(res, admission, 201)
    } catch (error) {
      next(error)
    }
  }
)

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
hospitalRouter.put("/admissions/:id", requireHospitalAccess, requireNonEmptyBody, async (req, res, next) => {
  try {
    const result = await HospitalService.updateAdmission(req.params.id, req.body)
    if (!result) {
      throw createHttpError(404, "Data rawat inap tidak ditemukan")
    }
    sendSuccess(res, result)
  } catch (error) {
    next(error)
  }
})

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
hospitalRouter.put("/admissions/:id/discharge", requireHospitalAccess, async (req, res, next) => {
  try {
    const disposition = ["discharged", "referred", "deceased"].includes(req.body?.disposition)
      ? req.body.disposition
      : "discharged"
    const result = await HospitalService.dischargeAdmission(req.params.id, disposition)
    if (!result) {
      throw createHttpError(404, "Data rawat inap tidak ditemukan")
    }
    sendSuccess(res, result)
  } catch (error) {
    next(error)
  }
})

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
hospitalRouter.delete("/admissions/:id", requireHospitalAccess, async (req, res, next) => {
  try {
    const success = await HospitalService.deleteAdmission(req.params.id)
    if (!success) {
      throw createHttpError(404, "Data rawat inap tidak ditemukan")
    }

    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

/**
 * @openapi
 * /hospital/visits:
 *   get:
 *     tags: [Hospital]
 *     summary: List catatan visit dokter
 *     responses:
 *       200: { description: OK }
 */
hospitalRouter.get("/visits", requireHospitalAccess, async (req, res, next) => {
  try {
    const data = await HospitalService.listVisitNotes()
    sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
})

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
hospitalRouter.post(
  "/visits",
  requireHospitalAccess,
  validate([
    body("admissionId").isString().trim().notEmpty(),
    body("doctorName").isString().trim().notEmpty(),
    body("note").isString().trim().notEmpty(),
  ]),
  async (req, res, next) => {
    try {
      const note = await HospitalService.addVisitNote(req.body)
      sendSuccess(res, note, 201)
    } catch (error) {
      next(error)
    }
  }
)

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
hospitalRouter.put("/visits/:id", requireHospitalAccess, requireNonEmptyBody, async (req, res, next) => {
  try {
    const updated = await HospitalService.updateVisitNote(req.params.id, req.body)
    if (!updated) {
      throw createHttpError(404, "Catatan visit dokter tidak ditemukan")
    }
    sendSuccess(res, updated)
  } catch (error) {
    next(error)
  }
})

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
hospitalRouter.delete("/visits/:id", requireHospitalAccess, async (req, res, next) => {
  try {
    const success = await HospitalService.deleteVisitNote(req.params.id)
    if (!success) {
      throw createHttpError(404, "Catatan visit dokter tidak ditemukan")
    }
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})
