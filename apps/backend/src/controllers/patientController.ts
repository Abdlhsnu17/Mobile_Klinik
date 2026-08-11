import type { NextFunction, Request, Response } from "express";
import { AuditService } from "../services/auditService";
import { PatientService } from "../services/patientService";
import type { Patient } from "../types";
import { sendError, sendSuccess } from "../utils/apiResponse";

export async function listPatients(_req: Request, res: Response, next: NextFunction) {
  try {
    const patients = await PatientService.list()
    return sendSuccess(res, patients)
  } catch (error) {
    next(error)
  }
}

export async function getPatientById(req: Request, res: Response, next: NextFunction) {
  try {
    const patient = await PatientService.findById(req.params.id)
    if (!patient) {
      return sendError(res, 404, { code: "PATIENT_NOT_FOUND", message: "Item tidak ditemukan" })
    }
    return sendSuccess(res, patient)
  } catch (error) {
    next(error)
  }
}

export async function createPatient(req: Request, res: Response, next: NextFunction) {
  try {
    const patient = await PatientService.create(req.body as Omit<Patient, "id" | "createdAt" | "updatedAt">)
    await AuditService.record({
      collection: "patients",
      itemId: patient.id,
      action: "create",
      user: req.user,
      after: patient,
    })
    return sendSuccess(res, patient, 201)
  } catch (error) {
    if (error instanceof Error && error.message.includes("terdaftar")) {
      return sendError(res, 409, { code: "PATIENT_CONFLICT", message: error.message })
    }
    next(error)
  }
}

export async function updatePatient(req: Request, res: Response, next: NextFunction) {
  try {
    const before = await PatientService.findById(req.params.id)
    if (!before) {
      return sendError(res, 404, { code: "PATIENT_NOT_FOUND", message: "Item tidak ditemukan" })
    }

    const updated = await PatientService.update(req.params.id, req.body as Partial<Patient>)
    if (!updated) {
      return sendError(res, 404, { code: "PATIENT_NOT_FOUND", message: "Item tidak ditemukan" })
    }

    await AuditService.record({
      collection: "patients",
      itemId: req.params.id,
      action: "update",
      user: req.user,
      before,
      after: updated,
      reason: (req.body as { auditReason?: string }).auditReason,
    })

    return sendSuccess(res, updated)
  } catch (error) {
    next(error)
  }
}

export async function deletePatient(req: Request, res: Response, next: NextFunction) {
  try {
    const before = await PatientService.findById(req.params.id)
    if (!before) {
      return sendError(res, 404, { code: "PATIENT_NOT_FOUND", message: "Item tidak ditemukan" })
    }

    const deleted = await PatientService.remove(req.params.id)
    if (!deleted) {
      return sendError(res, 404, { code: "PATIENT_NOT_FOUND", message: "Item tidak ditemukan" })
    }

    await AuditService.record({
      collection: "patients",
      itemId: req.params.id,
      action: "delete",
      user: req.user,
      before,
    })

    return res.status(204).end()
  } catch (error) {
    next(error)
  }
}
