"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectionPaths = void 0;
exports.registerCollectionRoutes = registerCollectionRoutes;
const express_1 = require("express");
const collectionPermissions_1 = require("../config/collectionPermissions");
const collectionController_1 = require("../controllers/collectionController");
const notificationController_1 = require("../controllers/notificationController");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const collectionSchemas_1 = require("../validators/collectionSchemas");
const pathMap = {
    users: "users",
    doctors: "doctors",
    services: "services",
    medicalCodes: "medical-codes",
    appointments: "appointments",
    medicalRecords: "medical-records",
    medicines: "medicines",
    medicalEquipments: "medical-equipments",
    labOrders: "lab-orders",
    labResults: "lab-results",
    payments: "payments",
    billingRecords: "billing-records",
    passwordResetRequests: "password-resets",
    pharmacyRequests: "pharmacy-requests",
    insuranceProfiles: "insurance-profiles",
    insuranceBridgeMembers: "insurance-bridge-members",
    beds: "beds",
    inpatientAdmissions: "inpatient-admissions",
    doctorVisitNotes: "doctor-visit-notes",
    patientNotifications: "patient-notifications",
    satisfactionSurveys: "satisfaction-surveys",
    clinicSettings: "clinic-settings",
    auditLogs: "audit-logs",
    radiologyOrders: "radiology-orders",
    clinicalDocuments: "clinical-documents",
    informedConsents: "informed-consents",
    referralFacilities: "referral-facilities",
    suppliers: "suppliers",
    purchaseOrders: "purchase-orders",
    expenses: "expenses",
    cashierClosings: "cashier-closings",
};
function createCollectionRouter(collection) {
    const router = (0, express_1.Router)();
    const createValidation = collectionSchemas_1.collectionCreateSchemas[collection]
        ? (0, validate_1.validate)(collectionSchemas_1.collectionCreateSchemas[collection])
        : validate_1.requireNonEmptyBody;
    const updateValidation = collectionSchemas_1.collectionUpdateSchemas[collection]
        ? (0, validate_1.validate)(collectionSchemas_1.collectionUpdateSchemas[collection])
        : validate_1.requireNonEmptyBody;
    const { read, write } = collectionPermissions_1.collectionPermissions[collection];
    const requireRead = (0, auth_1.requireRole)(...read);
    const requireWrite = (0, auth_1.requireRole)(...write);
    router.get("/", requireRead, (req, res, next) => collectionController_1.CollectionController.list(req, res, collection, next));
    router.get("/:id", requireRead, (req, res, next) => collectionController_1.CollectionController.getOne(req, res, collection, next));
    router.post("/", requireWrite, createValidation, (req, res, next) => collectionController_1.CollectionController.create(req, res, collection, next));
    if (collection === "patientNotifications") {
        router.post("/:id/send", requireWrite, (req, res, next) => notificationController_1.NotificationController.sendNow(req, res, next));
    }
    if (collection === "users") {
        const requireUserUpdate = (0, auth_1.requireOwnershipOrRole)(...write);
        router.put("/:id", requireUserUpdate, updateValidation, (req, res, next) => collectionController_1.CollectionController.update(req, res, collection, next));
    }
    else {
        router.put("/:id", requireWrite, updateValidation, (req, res, next) => collectionController_1.CollectionController.update(req, res, collection, next));
    }
    router.delete("/:id", requireWrite, (req, res, next) => collectionController_1.CollectionController.remove(req, res, collection, next));
    return router;
}
function registerCollectionRoutes(router) {
    for (const [collection, path] of Object.entries(pathMap)) {
        router.use(`/${path}`, createCollectionRouter(collection));
    }
}
exports.collectionPaths = pathMap;
//# sourceMappingURL=collections.js.map