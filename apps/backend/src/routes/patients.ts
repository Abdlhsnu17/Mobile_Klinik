import { Router } from "express";
import { collectionPermissions } from "../config/collectionPermissions";
import {
    createPatient,
    deletePatient,
    getPatientById,
    listPatients,
    updatePatient,
} from "../controllers/patientController";
import { requireRole } from "../middlewares/auth";
import { requireNonEmptyBody, validate } from "../middlewares/validate";
import { collectionCreateSchemas, collectionUpdateSchemas } from "../validators/collectionSchemas";

export const patientsRouter = Router()

const permissions = collectionPermissions.patients
const requirePatientRead = requireRole(...permissions.read)
const requirePatientWrite = requireRole(...permissions.write)

const createValidation = collectionCreateSchemas.patients
  ? validate(collectionCreateSchemas.patients)
  : requireNonEmptyBody

const updateValidation = collectionUpdateSchemas.patients
  ? validate(collectionUpdateSchemas.patients)
  : requireNonEmptyBody

patientsRouter.get("/", requirePatientRead, listPatients)
patientsRouter.get("/:id", requirePatientRead, getPatientById)
patientsRouter.post("/", requirePatientWrite, createValidation, createPatient)
patientsRouter.put("/:id", requirePatientWrite, updateValidation, updatePatient)
patientsRouter.delete("/:id", requirePatientWrite, deletePatient)
