"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patientsRouter = void 0;
const express_1 = require("express");
const collectionPermissions_1 = require("../config/collectionPermissions");
const patientController_1 = require("../controllers/patientController");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const collectionSchemas_1 = require("../validators/collectionSchemas");
exports.patientsRouter = (0, express_1.Router)();
const permissions = collectionPermissions_1.collectionPermissions.patients;
const requirePatientRead = (0, auth_1.requireRole)(...permissions.read);
const requirePatientWrite = (0, auth_1.requireRole)(...permissions.write);
const createValidation = collectionSchemas_1.collectionCreateSchemas.patients
    ? (0, validate_1.validate)(collectionSchemas_1.collectionCreateSchemas.patients)
    : validate_1.requireNonEmptyBody;
const updateValidation = collectionSchemas_1.collectionUpdateSchemas.patients
    ? (0, validate_1.validate)(collectionSchemas_1.collectionUpdateSchemas.patients)
    : validate_1.requireNonEmptyBody;
exports.patientsRouter.get("/", requirePatientRead, patientController_1.listPatients);
exports.patientsRouter.get("/:id", requirePatientRead, patientController_1.getPatientById);
exports.patientsRouter.post("/", requirePatientWrite, createValidation, patientController_1.createPatient);
exports.patientsRouter.put("/:id", requirePatientWrite, updateValidation, patientController_1.updatePatient);
exports.patientsRouter.delete("/:id", requirePatientWrite, patientController_1.deletePatient);
//# sourceMappingURL=patients.js.map