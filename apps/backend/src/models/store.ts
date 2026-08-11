import db from "../config/mysqlClient";
import type { CollectionName, DefaultData } from "./defaultData";
import { DEFAULT_ADMIN_USER, DEFAULT_SUPER_ADMIN_USER, defaultData } from "./defaultData";

type Row = Record<string, any>

// Baik pool maupun koneksi transaksi mengekspos `.query`, sehingga fungsi
// penulisan bisa berbagi implementasi tanpa peduli sedang di dalam transaksi.
type Queryable = Pick<typeof db, "query">

// Menjalankan `fn` dalam satu koneksi + transaksi khusus. Perubahan multi-tabel
// menjadi atomik (commit/rollback) dan pengaturan sesi seperti FOREIGN_KEY_CHECKS
// terisolasi ke koneksi ini, tidak bocor ke request lain di pool.
async function withTransaction<T>(fn: (conn: Queryable) => Promise<T>): Promise<T> {
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    const result = await fn(conn)
    await conn.commit()
    return result
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

const REQUIRED_DEFAULT_USERS = [DEFAULT_SUPER_ADMIN_USER, DEFAULT_ADMIN_USER]

const tableMap: Record<CollectionName, string> = {
  users: "users",
  patients: "patients",
  doctors: "doctors",
  services: "services",
  medicalCodes: "medical_codes",
  appointments: "appointments",
  medicalRecords: "medical_records",
  medicines: "medicines",
  medicalEquipments: "medical_equipments",
  labOrders: "lab_orders",
  labResults: "lab_results",
  payments: "payment_records",
  billingRecords: "billing_records",
  passwordResetRequests: "password_reset_requests",
  pharmacyRequests: "pharmacy_requests",
  insuranceProfiles: "insurance_profiles",
  insuranceBridgeMembers: "insurance_bridge_members",
  insuranceClaims: "insurance_claims",
  beds: "beds",
  inpatientAdmissions: "inpatient_admissions",
  doctorVisitNotes: "doctor_visit_notes",
  patientNotifications: "patient_notifications",
  satisfactionSurveys: "satisfaction_surveys",
  documents: "documents",
  clinicSettings: "clinic_settings",
  auditLogs: "audit_logs",
  radiologyOrders: "radiology_orders",
  clinicalDocuments: "clinical_documents",
  informedConsents: "informed_consents",
  referralFacilities: "referral_facilities",
  referrals: "referrals",
  suppliers: "suppliers",
  purchaseOrders: "purchase_orders",
  expenses: "expenses",
  cashierClosings: "cashier_closings",
}

const tableColumns: Record<CollectionName, string[]> = {
  users: ["id", "username", "name", "email", "role", "password", "avatarUrl", "createdAt"],
  patients: ["id", "noRM", "nik", "name", "birthDate", "gender", "address", "phone", "email", "bloodType", "allergies", "emergencyContact", "emergencyPhone", "createdAt", "updatedAt"],
  doctors: ["id", "name", "specialization", "phone", "email", "status", "createdAt"],
  services: ["id", "name", "category", "price", "duration", "description", "status", "applicableSpecializations"],
  medicalCodes: ["id", "system", "code", "name", "category", "isActive", "createdAt", "updatedAt"],
  appointments: ["id", "patientId", "patientName", "doctorId", "doctorName", "serviceId", "serviceName", "date", "time", "status", "queueNumber", "notes", "createdAt"],
  medicalRecords: ["id", "patientId", "appointmentId", "doctorId", "doctorName", "date", "diagnosis", "symptoms", "treatment", "soap", "diagnosisCodes", "procedureCodes", "clinicalHistory", "clinicalDecision", "referralDestination", "observationNotes", "status", "lockedAt", "lockedBy", "notes", "createdAt", "updatedAt"],
  medicines: ["id", "code", "name", "genericName", "brandName", "category", "form", "strength", "unit", "group", "stock", "minStock", "maxStock", "price", "buyPrice", "sellPrice", "manufacturer", "supplier", "batchNumber", "expiryDate", "location", "barcode", "description", "status", "isActive", "requiresPrescription", "lastStockOpname", "stockOpnameNotes", "createdAt", "updatedAt"],
  medicalEquipments: ["id", "code", "name", "category", "brand", "model", "quantity", "condition", "location", "purchaseDate", "lastMaintenanceDate", "nextMaintenanceDate", "notes", "status", "createdAt", "updatedAt"],
  labOrders: ["id", "patientId", "patientName", "medicalRecordId", "admissionId", "doctorId", "doctorName", "priority", "status", "notes", "reviewedAt", "reviewedByDoctorId", "reviewedByDoctorName", "requestedAt", "updatedAt"],
  labResults: ["id", "patientId", "labOrderId", "testName", "resultValue", "unit", "notes", "reviewedAt", "reviewedByDoctorId", "reviewedByDoctorName", "performedAt", "createdAt"],
  payments: ["id", "medicalRecordId", "patientId", "amount", "method", "paymentSource", "insuranceClaimId", "notes", "createdAt", "paidAt"],
  billingRecords: ["id", "medicalRecordId", "patientId", "patientName", "serviceCost", "medicineCost", "labCost", "inpatientCost", "equipmentCost", "adminCost", "discount", "insuranceCoverage", "total", "paidAmount", "insurancePaidAmount", "status", "notes", "createdAt", "updatedAt"],
  passwordResetRequests: ["id", "userId", "email", "token", "expiresAt", "used", "createdAt"],
  pharmacyRequests: ["id", "patientId", "patientName", "medicalRecordId", "requestedBy", "doctorId", "doctorName", "status", "verificationNotes", "dispensingNotes", "requestedAt", "fulfilledAt", "notes", "updatedAt"],
  insuranceProfiles: ["id", "patientId", "patientName", "provider", "policyNumber", "planName", "validUntil", "rateMultiplier", "coverageNotes", "lastVerifiedAt", "createdAt", "updatedAt"],
  insuranceBridgeMembers: ["id", "participantNumber", "name", "facility", "status", "coverageLevel", "lastClaimDate"],
  insuranceClaims: ["id", "billingRecordId", "medicalRecordId", "patientId", "patientName", "provider", "policyNumber", "claimedAmount", "approvedAmount", "status", "paymentId", "submittedAt", "verifiedAt", "approvedAt", "paidAt", "rejectionReason", "notes", "createdAt", "updatedAt"],
  beds: ["id", "bedNumber", "ward", "status", "lastCleanedAt", "assignedPatientId"],
  inpatientAdmissions: ["id", "patientId", "patientName", "bedId", "bedNumber", "ward", "admittedAt", "expectedDischarge", "status", "attendingDoctorId", "attendingDoctorName", "notes", "dischargedAt", "dischargeDisposition", "medicalRecordId", "updatedAt"],
  doctorVisitNotes: ["id", "admissionId", "doctorId", "doctorName", "date", "note", "updatedAt"],
  patientNotifications: ["id", "patientId", "patientName", "channel", "message", "targetAt", "status", "attempts", "sentAt", "lastError", "providerMessageId", "sourceType", "sourceId", "createdAt", "updatedAt"],
  satisfactionSurveys: ["id", "patientId", "patientName", "rating", "comments", "submittedAt"],
  documents: ["id", "title", "category", "description", "filename", "originalName", "mimeType", "size", "uploadedAt", "uploader", "createdAt", "updatedAt"],
  clinicSettings: ["id", "name", "address", "phone", "email", "operationalHours", "description", "createdAt", "updatedAt"],
  auditLogs: ["id", "collection", "itemId", "action", "userId", "username", "role", "beforeSnapshot", "afterSnapshot", "reason", "createdAt"],
  radiologyOrders: ["id", "patientId", "patientName", "medicalRecordId", "admissionId", "doctorId", "doctorName", "study", "priority", "status", "indication", "findings", "impression", "reviewedAt", "reviewedByDoctorId", "reviewedByDoctorName", "requestedAt", "updatedAt"],
  clinicalDocuments: ["id", "patientId", "patientName", "medicalRecordId", "type", "title", "content", "status", "signedBy", "signedAt", "createdAt", "updatedAt"],
  informedConsents: ["id", "patientId", "patientName", "medicalRecordId", "admissionId", "consentType", "procedureName", "procedureCode", "doctorId", "doctorName", "diagnosis", "indication", "risks", "alternatives", "prognosis", "grantedBy", "guardianName", "guardianRelation", "guardianNik", "witnessName", "decision", "status", "signedAt", "signedLocation", "notes", "createdAt", "updatedAt"],
  referralFacilities: ["id", "name", "type", "address", "phone", "notes", "createdAt", "updatedAt"],
  referrals: ["id", "direction", "patientId", "patientName", "medicalRecordId", "doctorId", "doctorName", "facilityId", "facilityName", "diagnosis", "reason", "status", "supportingDocumentUrl", "notes", "sentAt", "receivedAt", "followedUpAt", "rejectedAt", "completedAt", "createdAt", "updatedAt"],
  suppliers: ["id", "code", "name", "contactPerson", "phone", "email", "address", "status", "notes", "createdAt", "updatedAt"],
  purchaseOrders: ["id", "poNumber", "supplierId", "supplierName", "status", "orderDate", "expectedDate", "items", "totalAmount", "notes", "createdAt", "updatedAt"],
  expenses: ["id", "date", "category", "description", "amount", "paymentMethod", "notes", "recordedBy", "createdAt", "updatedAt"],
  cashierClosings: ["id", "closingDate", "cashierName", "openingBalance", "systemCashTotal", "cashExpenseTotal", "expectedCashTotal", "countedCashTotal", "difference", "notes", "createdAt"],
}

const detailTables: Partial<Record<CollectionName, string[]>> = {
  doctors: ["doctor_schedules"],
  appointments: ["appointment_services", "appointment_triage"],
  medicalRecords: ["prescriptions", "medical_record_equipments", "vital_signs"],
  labOrders: ["lab_order_tests"],
  pharmacyRequests: ["pharmacy_request_items"],
}

const createTableStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id varchar(64) NOT NULL,
    username varchar(64) NOT NULL,
    name varchar(128) NOT NULL,
    email varchar(128) NOT NULL,
    role enum('admin','dokter','bidan','perawat','teknis','umum') NOT NULL,
    password varchar(255) NOT NULL,
    avatarUrl varchar(255) DEFAULT NULL,
    createdAt datetime NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_username (username),
    UNIQUE KEY uq_users_email (email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS patients (
    id varchar(64) NOT NULL,
    noRM varchar(32) NOT NULL,
    nik varchar(32) NOT NULL,
    name varchar(128) NOT NULL,
    birthDate date NOT NULL,
    gender varchar(32) NOT NULL,
    address text NOT NULL,
    phone varchar(32) NOT NULL,
    email varchar(128) DEFAULT NULL,
    bloodType varchar(8) DEFAULT NULL,
    allergies text DEFAULT NULL,
    emergencyContact varchar(128) DEFAULT NULL,
    emergencyPhone varchar(32) DEFAULT NULL,
    createdAt datetime NOT NULL DEFAULT current_timestamp(),
    updatedAt datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS doctors (
    id varchar(64) NOT NULL,
    name varchar(128) NOT NULL,
    specialization varchar(128) NOT NULL,
    phone varchar(32) NOT NULL,
    email varchar(128) NOT NULL,
    status varchar(32) NOT NULL,
    createdAt datetime NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS doctor_schedules (
    id varchar(64) NOT NULL,
    doctorId varchar(64) NOT NULL,
    day varchar(16) NOT NULL,
    startTime time NOT NULL,
    endTime time NOT NULL,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS services (
    id varchar(64) NOT NULL,
    name varchar(128) NOT NULL,
    category varchar(64) NOT NULL,
    price decimal(14,2) NOT NULL DEFAULT 0.00,
    duration int NOT NULL DEFAULT 0,
    description text DEFAULT NULL,
    status varchar(32) NOT NULL,
    applicableSpecializations longtext DEFAULT NULL,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS appointments (
    id varchar(64) NOT NULL,
    patientId varchar(64) NOT NULL,
    patientName varchar(128) NOT NULL,
    doctorId varchar(64) NOT NULL,
    doctorName varchar(128) NOT NULL,
    serviceId varchar(64) DEFAULT NULL,
    serviceName varchar(128) DEFAULT NULL,
    date date NOT NULL,
    time time NOT NULL,
    status varchar(32) NOT NULL,
    queueNumber int NOT NULL,
    notes text DEFAULT NULL,
    createdAt datetime NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS appointment_services (
    appointmentId varchar(64) NOT NULL,
    serviceId varchar(64) NOT NULL,
    PRIMARY KEY (appointmentId, serviceId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS appointment_triage (
    appointmentId varchar(64) NOT NULL,
    bloodPressure varchar(32) DEFAULT NULL,
    heartRate varchar(32) DEFAULT NULL,
    temperature varchar(32) DEFAULT NULL,
    bloodGlucose varchar(32) DEFAULT NULL,
    oxygenSaturation varchar(32) DEFAULT NULL,
    weight varchar(32) DEFAULT NULL,
    height varchar(32) DEFAULT NULL,
    respiratoryRate varchar(32) DEFAULT NULL,
    complaints text DEFAULT NULL,
    notes text DEFAULT NULL,
    nurseName varchar(128) DEFAULT NULL,
    recordedAt datetime DEFAULT NULL,
    PRIMARY KEY (appointmentId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS medical_records (
    id varchar(64) NOT NULL,
    patientId varchar(64) NOT NULL,
    appointmentId varchar(64) DEFAULT NULL,
    doctorId varchar(64) NOT NULL,
    doctorName varchar(128) NOT NULL,
    date date NOT NULL,
    diagnosis text NOT NULL,
    symptoms text NOT NULL,
    treatment text NOT NULL,
    soap longtext DEFAULT NULL,
    diagnosisCodes longtext DEFAULT NULL,
    procedureCodes longtext DEFAULT NULL,
    clinicalHistory longtext DEFAULT NULL,
    clinicalDecision varchar(64) DEFAULT NULL,
    referralDestination varchar(256) DEFAULT NULL,
    observationNotes text DEFAULT NULL,
    status varchar(32) DEFAULT NULL,
    lockedAt datetime DEFAULT NULL,
    lockedBy varchar(64) DEFAULT NULL,
    notes text DEFAULT NULL,
    createdAt datetime NOT NULL DEFAULT current_timestamp(),
    updatedAt datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS prescriptions (
    id varchar(64) NOT NULL,
    medicalRecordId varchar(64) NOT NULL,
    medicineId varchar(64) NOT NULL,
    medicineName varchar(128) NOT NULL,
    dosage varchar(128) NOT NULL,
    frequency varchar(128) NOT NULL,
    duration varchar(128) NOT NULL,
    quantity int NOT NULL,
    notes text DEFAULT NULL,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS medical_record_equipments (
    id varchar(64) NOT NULL,
    medicalRecordId varchar(64) NOT NULL,
    equipmentId varchar(64) NOT NULL,
    equipmentName varchar(128) NOT NULL,
    usageNotes text DEFAULT NULL,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS vital_signs (
    medicalRecordId varchar(64) NOT NULL,
    bloodPressure varchar(32) DEFAULT NULL,
    heartRate varchar(32) DEFAULT NULL,
    temperature varchar(32) DEFAULT NULL,
    bloodGlucose varchar(32) DEFAULT NULL,
    oxygenSaturation varchar(32) DEFAULT NULL,
    weight varchar(32) DEFAULT NULL,
    height varchar(32) DEFAULT NULL,
    respiratoryRate varchar(32) DEFAULT NULL,
    PRIMARY KEY (medicalRecordId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS medicines (
    id varchar(64) NOT NULL,
    code varchar(32) NOT NULL,
    name varchar(128) NOT NULL,
    genericName varchar(128) DEFAULT NULL,
    brandName varchar(128) DEFAULT NULL,
    category varchar(128) NOT NULL,
    form varchar(64) NOT NULL DEFAULT 'Tablet',
    strength varchar(64) DEFAULT NULL,
    unit varchar(32) NOT NULL,
    \`group\` varchar(64) DEFAULT NULL,
    stock int NOT NULL DEFAULT 0,
    minStock int NOT NULL DEFAULT 0,
    maxStock int DEFAULT NULL,
    price decimal(14,2) NOT NULL DEFAULT 0.00,
    buyPrice decimal(14,2) NOT NULL DEFAULT 0.00,
    sellPrice decimal(14,2) NOT NULL DEFAULT 0.00,
    manufacturer varchar(128) DEFAULT NULL,
    supplier varchar(128) DEFAULT NULL,
    batchNumber varchar(128) DEFAULT NULL,
    expiryDate date NOT NULL,
    location varchar(128) DEFAULT NULL,
    barcode varchar(128) DEFAULT NULL,
    description text DEFAULT NULL,
    status varchar(32) NOT NULL DEFAULT 'Tersedia',
    isActive tinyint(1) NOT NULL DEFAULT 1,
    requiresPrescription tinyint(1) NOT NULL DEFAULT 0,
    lastStockOpname varchar(64) DEFAULT NULL,
    stockOpnameNotes text DEFAULT NULL,
    createdAt datetime NOT NULL DEFAULT current_timestamp(),
    updatedAt datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS stock_movements (
    id bigint NOT NULL AUTO_INCREMENT,
    medicineId varchar(64) NOT NULL,
    batchId varchar(64) DEFAULT NULL,
    quantityChange int NOT NULL,
    reason varchar(32) NOT NULL,
    referenceId varchar(64) DEFAULT NULL,
    notes text DEFAULT NULL,
    createdAt datetime NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (id),
    KEY idx_stock_movements_medicineId (medicineId),
    KEY idx_stock_movements_createdAt (createdAt)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS medicine_batches (
    id varchar(64) NOT NULL,
    medicineId varchar(64) NOT NULL,
    batchNumber varchar(128) NOT NULL,
    expiryDate date NOT NULL,
    quantity int NOT NULL DEFAULT 0,
    initialQuantity int NOT NULL DEFAULT 0,
    buyPrice decimal(14,2) NOT NULL DEFAULT 0.00,
    supplier varchar(128) DEFAULT NULL,
    notes text DEFAULT NULL,
    receivedAt datetime NOT NULL DEFAULT current_timestamp(),
    createdAt datetime NOT NULL DEFAULT current_timestamp(),
    updatedAt datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    KEY idx_medicine_batches_medicineId (medicineId),
    KEY idx_medicine_batches_expiryDate (expiryDate)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS medical_equipments (
    id varchar(64) NOT NULL,
    code varchar(32) NOT NULL,
    name varchar(128) NOT NULL,
    category varchar(64) NOT NULL,
    brand varchar(128) NOT NULL,
    model varchar(128) NOT NULL,
    quantity int NOT NULL DEFAULT 0,
    \`condition\` varchar(64) NOT NULL,
    location varchar(128) NOT NULL,
    purchaseDate date NOT NULL,
    lastMaintenanceDate date DEFAULT NULL,
    nextMaintenanceDate date DEFAULT NULL,
    notes text DEFAULT NULL,
    status varchar(64) NOT NULL,
    createdAt datetime NOT NULL DEFAULT current_timestamp(),
    updatedAt datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS lab_orders (
    id varchar(64) NOT NULL,
    patientId varchar(64) NOT NULL,
    patientName varchar(128) NOT NULL,
    medicalRecordId varchar(64) NOT NULL,
    admissionId varchar(64) DEFAULT NULL,
    doctorId varchar(64) NOT NULL,
    doctorName varchar(128) NOT NULL,
    priority varchar(32) NOT NULL DEFAULT 'routine',
    status varchar(32) NOT NULL DEFAULT 'requested',
    notes text DEFAULT NULL,
    reviewedAt datetime DEFAULT NULL,
    reviewedByDoctorId varchar(64) DEFAULT NULL,
    reviewedByDoctorName varchar(128) DEFAULT NULL,
    requestedAt datetime NOT NULL DEFAULT current_timestamp(),
    updatedAt datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS lab_order_tests (
    id varchar(64) NOT NULL,
    labOrderId varchar(64) NOT NULL,
    testName varchar(128) NOT NULL,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS lab_results (
    id varchar(64) NOT NULL,
    patientId varchar(64) NOT NULL,
    labOrderId varchar(64) DEFAULT NULL,
    testName varchar(128) NOT NULL,
    resultValue varchar(128) NOT NULL,
    unit varchar(32) DEFAULT NULL,
    notes text DEFAULT NULL,
    reviewedAt datetime DEFAULT NULL,
    reviewedByDoctorId varchar(64) DEFAULT NULL,
    reviewedByDoctorName varchar(128) DEFAULT NULL,
    performedAt datetime NOT NULL,
    createdAt datetime NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS payment_records (
    id varchar(64) NOT NULL,
    medicalRecordId varchar(64) NOT NULL,
    patientId varchar(64) NOT NULL,
    amount decimal(14,2) NOT NULL DEFAULT 0.00,
    method varchar(64) NOT NULL,
    paymentSource varchar(16) NOT NULL DEFAULT 'patient',
    insuranceClaimId varchar(64) DEFAULT NULL,
    notes text DEFAULT NULL,
    createdAt datetime NOT NULL DEFAULT current_timestamp(),
    paidAt datetime NOT NULL,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS billing_records (
    id varchar(64) NOT NULL,
    medicalRecordId varchar(64) DEFAULT NULL,
    patientId varchar(64) NOT NULL,
    patientName varchar(128) DEFAULT NULL,
    serviceCost decimal(14,2) NOT NULL DEFAULT 0.00,
    medicineCost decimal(14,2) NOT NULL DEFAULT 0.00,
    labCost decimal(14,2) NOT NULL DEFAULT 0.00,
    inpatientCost decimal(14,2) NOT NULL DEFAULT 0.00,
    equipmentCost decimal(14,2) NOT NULL DEFAULT 0.00,
    adminCost decimal(14,2) NOT NULL DEFAULT 0.00,
    discount decimal(14,2) NOT NULL DEFAULT 0.00,
    insuranceCoverage decimal(14,2) NOT NULL DEFAULT 0.00,
    total decimal(14,2) NOT NULL DEFAULT 0.00,
    paidAmount decimal(14,2) NOT NULL DEFAULT 0.00,
    insurancePaidAmount decimal(14,2) NOT NULL DEFAULT 0.00,
    status varchar(32) NOT NULL DEFAULT 'draft',
    notes text DEFAULT NULL,
    createdAt datetime NOT NULL DEFAULT current_timestamp(),
    updatedAt datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS password_reset_requests (
    id varchar(64) NOT NULL,
    userId varchar(64) NOT NULL,
    email varchar(128) NOT NULL,
    token varchar(128) NOT NULL,
    expiresAt datetime NOT NULL,
    used tinyint(1) NOT NULL DEFAULT 0,
    createdAt datetime NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS pharmacy_requests (
    id varchar(64) NOT NULL,
    patientId varchar(64) DEFAULT NULL,
    patientName varchar(128) DEFAULT NULL,
    medicalRecordId varchar(64) DEFAULT NULL,
    requestedBy varchar(64) DEFAULT NULL,
    doctorId varchar(64) DEFAULT NULL,
    doctorName varchar(128) DEFAULT NULL,
    status varchar(32) NOT NULL DEFAULT 'requested',
    verificationNotes text DEFAULT NULL,
    dispensingNotes text DEFAULT NULL,
    requestedAt datetime NOT NULL DEFAULT current_timestamp(),
    fulfilledAt datetime DEFAULT NULL,
    notes text DEFAULT NULL,
    updatedAt datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS pharmacy_request_items (
    id varchar(64) NOT NULL,
    pharmacyRequestId varchar(64) NOT NULL,
    medicineId varchar(64) NOT NULL,
    medicineName varchar(128) NOT NULL,
    dosage varchar(128) NOT NULL,
    frequency varchar(128) NOT NULL,
    duration varchar(128) NOT NULL,
    quantity int NOT NULL,
    notes text DEFAULT NULL,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS insurance_profiles (
    id varchar(64) NOT NULL,
    patientId varchar(64) NOT NULL,
    patientName varchar(128) NOT NULL,
    provider varchar(64) NOT NULL,
    policyNumber varchar(128) NOT NULL,
    planName varchar(128) NOT NULL,
    validUntil date NOT NULL,
    rateMultiplier decimal(8,4) NOT NULL DEFAULT 1.0000,
    coverageNotes text DEFAULT NULL,
    lastVerifiedAt datetime DEFAULT NULL,
    createdAt datetime NOT NULL DEFAULT current_timestamp(),
    updatedAt datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS insurance_bridge_members (
    id varchar(64) NOT NULL,
    participantNumber varchar(128) NOT NULL,
    name varchar(128) NOT NULL,
    facility varchar(128) NOT NULL,
    status varchar(32) NOT NULL,
    coverageLevel varchar(32) NOT NULL,
    lastClaimDate date NOT NULL,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS insurance_claims (
    id varchar(64) NOT NULL,
    billingRecordId varchar(64) NOT NULL,
    medicalRecordId varchar(64) NOT NULL,
    patientId varchar(64) NOT NULL,
    patientName varchar(128) NOT NULL DEFAULT '',
    provider varchar(32) NOT NULL DEFAULT 'bpjs',
    policyNumber varchar(128) DEFAULT NULL,
    claimedAmount decimal(14,2) NOT NULL DEFAULT 0.00,
    approvedAmount decimal(14,2) NOT NULL DEFAULT 0.00,
    status varchar(24) NOT NULL DEFAULT 'draft',
    paymentId varchar(64) DEFAULT NULL,
    submittedAt datetime DEFAULT NULL,
    verifiedAt datetime DEFAULT NULL,
    approvedAt datetime DEFAULT NULL,
    paidAt datetime DEFAULT NULL,
    rejectionReason text DEFAULT NULL,
    notes text DEFAULT NULL,
    createdAt datetime NOT NULL DEFAULT current_timestamp(),
    updatedAt datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    KEY idx_insurance_claims_billing (billingRecordId),
    KEY idx_insurance_claims_record (medicalRecordId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS beds (
    id varchar(64) NOT NULL,
    bedNumber varchar(64) NOT NULL,
    ward varchar(128) NOT NULL,
    status varchar(32) NOT NULL DEFAULT 'available',
    lastCleanedAt datetime NOT NULL DEFAULT current_timestamp(),
    assignedPatientId varchar(64) DEFAULT NULL,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS inpatient_admissions (
    id varchar(64) NOT NULL,
    patientId varchar(64) NOT NULL,
    patientName varchar(128) NOT NULL,
    bedId varchar(64) NOT NULL,
    bedNumber varchar(64) NOT NULL,
    ward varchar(128) NOT NULL,
    admittedAt datetime NOT NULL,
    expectedDischarge datetime DEFAULT NULL,
    status varchar(32) NOT NULL DEFAULT 'ongoing',
    attendingDoctorId varchar(64) DEFAULT NULL,
    attendingDoctorName varchar(128) DEFAULT NULL,
    notes text DEFAULT NULL,
    dischargedAt datetime DEFAULT NULL,
    dischargeDisposition varchar(32) DEFAULT NULL,
    medicalRecordId varchar(64) DEFAULT NULL,
    updatedAt datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS doctor_visit_notes (
    id varchar(64) NOT NULL,
    admissionId varchar(64) NOT NULL,
    doctorId varchar(64) NOT NULL,
    doctorName varchar(128) NOT NULL,
    date datetime NOT NULL,
    note text NOT NULL,
    updatedAt datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS patient_notifications (
    id varchar(64) NOT NULL,
    patientId varchar(64) NOT NULL,
    patientName varchar(128) NOT NULL,
    channel varchar(32) NOT NULL,
    message text NOT NULL,
    targetAt datetime NOT NULL,
    status varchar(32) NOT NULL DEFAULT 'pending',
    attempts int NOT NULL DEFAULT 0,
    sentAt datetime DEFAULT NULL,
    lastError text DEFAULT NULL,
    providerMessageId varchar(255) DEFAULT NULL,
    sourceType varchar(32) DEFAULT 'manual',
    sourceId varchar(64) DEFAULT NULL,
    createdAt datetime NOT NULL DEFAULT current_timestamp(),
    updatedAt datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS satisfaction_surveys (
    id varchar(64) NOT NULL,
    patientId varchar(64) NOT NULL,
    patientName varchar(128) NOT NULL,
    rating tinyint NOT NULL,
    comments text DEFAULT NULL,
    submittedAt datetime NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS documents (
    id varchar(64) NOT NULL,
    title varchar(256) NOT NULL,
    category varchar(64) NOT NULL,
    description text DEFAULT NULL,
    filename varchar(255) NOT NULL,
    originalName varchar(255) NOT NULL,
    mimeType varchar(128) NOT NULL,
    size bigint NOT NULL,
    patientId varchar(64) DEFAULT NULL,
    medicalRecordId varchar(64) DEFAULT NULL,
    labOrderId varchar(64) DEFAULT NULL,
    insuranceClaimId varchar(64) DEFAULT NULL,
    uploadedAt datetime NOT NULL DEFAULT current_timestamp(),
    uploader varchar(128) DEFAULT NULL,
    createdAt datetime NOT NULL DEFAULT current_timestamp(),
    updatedAt datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS clinic_settings (
    id varchar(64) NOT NULL,
    name varchar(128) NOT NULL,
    address text NOT NULL,
    phone varchar(32) NOT NULL,
    email varchar(128) NOT NULL,
    operationalHours varchar(128) NOT NULL,
    description text DEFAULT NULL,
    createdAt datetime NOT NULL DEFAULT current_timestamp(),
    updatedAt datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id varchar(64) NOT NULL,
    \`collection\` varchar(100) NOT NULL,
    itemId varchar(64) NOT NULL,
    action varchar(32) NOT NULL,
    userId varchar(64) DEFAULT NULL,
    username varchar(64) DEFAULT NULL,
    role varchar(64) DEFAULT NULL,
    beforeSnapshot longtext DEFAULT NULL,
    afterSnapshot longtext DEFAULT NULL,
    reason text DEFAULT NULL,
    createdAt datetime NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS radiology_orders (
    id varchar(64) NOT NULL,
    patientId varchar(64) NOT NULL,
    patientName varchar(128) NOT NULL,
    medicalRecordId varchar(64) NOT NULL,
    admissionId varchar(64) DEFAULT NULL,
    doctorId varchar(64) NOT NULL,
    doctorName varchar(128) DEFAULT NULL,
    study varchar(128) NOT NULL,
    priority varchar(32) NOT NULL DEFAULT 'routine',
    status varchar(32) NOT NULL DEFAULT 'requested',
    indication text DEFAULT NULL,
    findings text DEFAULT NULL,
    impression text DEFAULT NULL,
    reviewedAt datetime DEFAULT NULL,
    reviewedByDoctorId varchar(64) DEFAULT NULL,
    reviewedByDoctorName varchar(128) DEFAULT NULL,
    requestedAt datetime NOT NULL DEFAULT current_timestamp(),
    updatedAt datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS clinical_documents (
    id varchar(64) NOT NULL,
    patientId varchar(64) NOT NULL,
    patientName varchar(128) NOT NULL,
    medicalRecordId varchar(64) DEFAULT NULL,
    type varchar(64) NOT NULL,
    title varchar(160) NOT NULL,
    content longtext NOT NULL,
    status varchar(32) NOT NULL DEFAULT 'draft',
    signedBy varchar(128) DEFAULT NULL,
    signedAt datetime DEFAULT NULL,
    createdAt datetime NOT NULL DEFAULT current_timestamp(),
    updatedAt datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS informed_consents (
    id varchar(64) NOT NULL,
    patientId varchar(64) NOT NULL,
    patientName varchar(128) NOT NULL,
    medicalRecordId varchar(64) DEFAULT NULL,
    admissionId varchar(64) DEFAULT NULL,
    consentType varchar(32) NOT NULL DEFAULT 'tindakan-medis',
    procedureName varchar(255) NOT NULL,
    procedureCode varchar(32) DEFAULT NULL,
    doctorId varchar(64) DEFAULT NULL,
    doctorName varchar(128) DEFAULT NULL,
    diagnosis text DEFAULT NULL,
    indication text DEFAULT NULL,
    risks text DEFAULT NULL,
    alternatives text DEFAULT NULL,
    prognosis text DEFAULT NULL,
    grantedBy varchar(16) NOT NULL DEFAULT 'pasien',
    guardianName varchar(128) DEFAULT NULL,
    guardianRelation varchar(64) DEFAULT NULL,
    guardianNik varchar(32) DEFAULT NULL,
    witnessName varchar(128) DEFAULT NULL,
    decision varchar(16) NOT NULL DEFAULT 'setuju',
    status varchar(16) NOT NULL DEFAULT 'draft',
    signedAt datetime DEFAULT NULL,
    signedLocation varchar(160) DEFAULT NULL,
    notes text DEFAULT NULL,
    createdAt datetime NOT NULL DEFAULT current_timestamp(),
    updatedAt datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    KEY idx_informed_consents_patient (patientId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS referral_facilities (
    id varchar(64) NOT NULL,
    name varchar(160) NOT NULL,
    type varchar(32) NOT NULL DEFAULT 'lainnya',
    address text DEFAULT NULL,
    phone varchar(32) DEFAULT NULL,
    notes text DEFAULT NULL,
    createdAt datetime NOT NULL DEFAULT current_timestamp(),
    updatedAt datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS referrals (
    id varchar(64) NOT NULL,
    direction varchar(16) NOT NULL,
    patientId varchar(64) NOT NULL,
    patientName varchar(128) NOT NULL,
    medicalRecordId varchar(64) DEFAULT NULL,
    doctorId varchar(64) DEFAULT NULL,
    doctorName varchar(128) DEFAULT NULL,
    facilityId varchar(64) DEFAULT NULL,
    facilityName varchar(160) NOT NULL,
    diagnosis text DEFAULT NULL,
    reason text NOT NULL,
    status varchar(32) NOT NULL DEFAULT 'draft',
    supportingDocumentUrl varchar(512) DEFAULT NULL,
    notes text DEFAULT NULL,
    sentAt datetime DEFAULT NULL,
    receivedAt datetime DEFAULT NULL,
    followedUpAt datetime DEFAULT NULL,
    rejectedAt datetime DEFAULT NULL,
    completedAt datetime DEFAULT NULL,
    createdAt datetime NOT NULL DEFAULT current_timestamp(),
    updatedAt datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS medical_codes (
    id varchar(64) NOT NULL,
    \`system\` varchar(16) NOT NULL DEFAULT 'icd10',
    code varchar(32) NOT NULL,
    name varchar(255) NOT NULL,
    category varchar(128) DEFAULT NULL,
    isActive tinyint(1) NOT NULL DEFAULT 1,
    createdAt datetime NOT NULL DEFAULT current_timestamp(),
    updatedAt datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY uq_medical_codes_system_code (\`system\`, code),
    KEY idx_medical_codes_system (\`system\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS suppliers (
    id varchar(64) NOT NULL,
    code varchar(64) NOT NULL,
    name varchar(160) NOT NULL,
    contactPerson varchar(128) DEFAULT NULL,
    phone varchar(32) DEFAULT NULL,
    email varchar(128) DEFAULT NULL,
    address text DEFAULT NULL,
    status varchar(16) NOT NULL DEFAULT 'aktif',
    notes text DEFAULT NULL,
    createdAt datetime NOT NULL DEFAULT current_timestamp(),
    updatedAt datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY uq_suppliers_code (code)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS purchase_orders (
    id varchar(64) NOT NULL,
    poNumber varchar(64) NOT NULL,
    supplierId varchar(64) NOT NULL,
    supplierName varchar(160) NOT NULL,
    status varchar(24) NOT NULL DEFAULT 'draft',
    orderDate date NOT NULL,
    expectedDate date DEFAULT NULL,
    items longtext DEFAULT NULL,
    totalAmount decimal(14,2) NOT NULL DEFAULT 0.00,
    notes text DEFAULT NULL,
    createdAt datetime NOT NULL DEFAULT current_timestamp(),
    updatedAt datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    UNIQUE KEY uq_purchase_orders_number (poNumber),
    KEY idx_purchase_orders_supplier (supplierId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS expenses (
    id varchar(64) NOT NULL,
    date date NOT NULL,
    category varchar(32) NOT NULL DEFAULT 'lainnya',
    description varchar(255) NOT NULL,
    amount decimal(14,2) NOT NULL DEFAULT 0.00,
    paymentMethod varchar(16) NOT NULL DEFAULT 'tunai',
    notes text DEFAULT NULL,
    recordedBy varchar(128) DEFAULT NULL,
    createdAt datetime NOT NULL DEFAULT current_timestamp(),
    updatedAt datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
    PRIMARY KEY (id),
    KEY idx_expenses_date (date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS cashier_closings (
    id varchar(64) NOT NULL,
    closingDate date NOT NULL,
    cashierName varchar(128) NOT NULL,
    openingBalance decimal(14,2) NOT NULL DEFAULT 0.00,
    systemCashTotal decimal(14,2) NOT NULL DEFAULT 0.00,
    cashExpenseTotal decimal(14,2) NOT NULL DEFAULT 0.00,
    expectedCashTotal decimal(14,2) NOT NULL DEFAULT 0.00,
    countedCashTotal decimal(14,2) NOT NULL DEFAULT 0.00,
    difference decimal(14,2) NOT NULL DEFAULT 0.00,
    notes text DEFAULT NULL,
    createdAt datetime NOT NULL DEFAULT current_timestamp(),
    PRIMARY KEY (id),
    KEY idx_cashier_closings_date (closingDate)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
]

const requiredColumns: Record<string, Record<string, string>> = {
  stock_movements: {
    batchId: "varchar(64) DEFAULT NULL",
  },
  services: {
    applicableSpecializations: "longtext DEFAULT NULL",
  },
  appointments: {
    serviceId: "varchar(64) DEFAULT NULL",
    serviceName: "varchar(128) DEFAULT NULL",
  },
  appointment_triage: {
    bloodGlucose: "varchar(32) DEFAULT NULL",
    oxygenSaturation: "varchar(32) DEFAULT NULL",
  },
  vital_signs: {
    bloodGlucose: "varchar(32) DEFAULT NULL",
    oxygenSaturation: "varchar(32) DEFAULT NULL",
  },
  medical_records: {
    soap: "longtext DEFAULT NULL",
    diagnosisCodes: "longtext DEFAULT NULL",
    procedureCodes: "longtext DEFAULT NULL",
    clinicalHistory: "longtext DEFAULT NULL",
    status: "varchar(32) DEFAULT NULL",
    lockedAt: "datetime DEFAULT NULL",
    lockedBy: "varchar(64) DEFAULT NULL",
    updatedAt: "datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()",
  },
  payment_records: {
    paymentSource: "varchar(16) NOT NULL DEFAULT 'patient'",
    insuranceClaimId: "varchar(64) DEFAULT NULL",
  },
  billing_records: {
    patientName: "varchar(128) DEFAULT NULL",
    insurancePaidAmount: "decimal(14,2) NOT NULL DEFAULT 0.00",
    serviceCost: "decimal(14,2) NOT NULL DEFAULT 0.00",
    medicineCost: "decimal(14,2) NOT NULL DEFAULT 0.00",
    labCost: "decimal(14,2) NOT NULL DEFAULT 0.00",
    inpatientCost: "decimal(14,2) NOT NULL DEFAULT 0.00",
    equipmentCost: "decimal(14,2) NOT NULL DEFAULT 0.00",
    adminCost: "decimal(14,2) NOT NULL DEFAULT 0.00",
    discount: "decimal(14,2) NOT NULL DEFAULT 0.00",
    insuranceCoverage: "decimal(14,2) NOT NULL DEFAULT 0.00",
    total: "decimal(14,2) NOT NULL DEFAULT 0.00",
  },
  insurance_profiles: {
    patientName: "varchar(128) NOT NULL DEFAULT ''",
    provider: "varchar(64) NOT NULL DEFAULT 'bpjs'",
    policyNumber: "varchar(128) NOT NULL DEFAULT ''",
    planName: "varchar(128) NOT NULL DEFAULT ''",
    validUntil: "date NOT NULL DEFAULT '2099-12-31'",
    rateMultiplier: "decimal(8,4) NOT NULL DEFAULT 1.0000",
    coverageNotes: "text DEFAULT NULL",
    lastVerifiedAt: "datetime DEFAULT NULL",
  },
  insurance_bridge_members: {
    participantNumber: "varchar(128) NOT NULL DEFAULT ''",
    name: "varchar(128) NOT NULL DEFAULT ''",
    facility: "varchar(128) NOT NULL DEFAULT ''",
    status: "varchar(32) NOT NULL DEFAULT 'aktif'",
    coverageLevel: "varchar(32) NOT NULL DEFAULT 'primer'",
    lastClaimDate: "date NOT NULL DEFAULT '1970-01-01'",
  },
  beds: {
    bedNumber: "varchar(64) DEFAULT NULL",
    lastCleanedAt: "datetime NOT NULL DEFAULT current_timestamp()",
    assignedPatientId: "varchar(64) DEFAULT NULL",
  },
  inpatient_admissions: {
    patientName: "varchar(128) DEFAULT NULL",
    bedNumber: "varchar(64) DEFAULT NULL",
    expectedDischarge: "datetime DEFAULT NULL",
    status: "varchar(32) NOT NULL DEFAULT 'ongoing'",
    attendingDoctorName: "varchar(128) DEFAULT NULL",
    dischargeDisposition: "varchar(32) DEFAULT NULL",
    medicalRecordId: "varchar(64) DEFAULT NULL",
  },
  doctor_visit_notes: {
    doctorName: "varchar(128) DEFAULT NULL",
    date: "datetime DEFAULT NULL",
    note: "text DEFAULT NULL",
    updatedAt: "datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()",
  },
  patient_notifications: {
    patientName: "varchar(128) NOT NULL DEFAULT ''",
    channel: "varchar(32) NOT NULL DEFAULT 'whatsapp'",
    targetAt: "datetime NOT NULL DEFAULT current_timestamp()",
    status: "varchar(32) NOT NULL DEFAULT 'pending'",
    attempts: "int NOT NULL DEFAULT 0",
    sentAt: "datetime DEFAULT NULL",
    lastError: "text DEFAULT NULL",
    providerMessageId: "varchar(255) DEFAULT NULL",
    sourceType: "varchar(32) DEFAULT 'manual'",
    sourceId: "varchar(64) DEFAULT NULL",
    updatedAt: "datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()",
  },
  satisfaction_surveys: {
    patientName: "varchar(128) NOT NULL DEFAULT ''",
    submittedAt: "datetime NOT NULL DEFAULT current_timestamp()",
  },
  radiology_orders: {
    patientName: "varchar(128) NOT NULL DEFAULT ''",
    doctorName: "varchar(128) DEFAULT NULL",
    priority: "varchar(32) NOT NULL DEFAULT 'routine'",
    status: "varchar(32) NOT NULL DEFAULT 'requested'",
    reviewedAt: "datetime DEFAULT NULL",
    reviewedByDoctorId: "varchar(64) DEFAULT NULL",
    reviewedByDoctorName: "varchar(128) DEFAULT NULL",
  },
  clinical_documents: {
    medicalRecordId: "varchar(64) DEFAULT NULL",
    status: "varchar(32) NOT NULL DEFAULT 'draft'",
    signedBy: "varchar(128) DEFAULT NULL",
    signedAt: "datetime DEFAULT NULL",
  },
}

function toMysqlDatetime(value?: unknown) {
  if (!value) return value
  if (value instanceof Date) return value.toISOString().slice(0, 19).replace("T", " ")
  if (typeof value === "string") return value.slice(0, 19).replace("T", " ")
  return value
}

async function columnExists(table: string, column: string) {
  const [rows] = await db.query(
    "SELECT COUNT(*) as total FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [table, column],
  )
  return ((rows as Row[])[0]?.total ?? 0) > 0
}

async function ensureDatabaseSchema() {
  for (const statement of createTableStatements) {
    await db.query(statement)
  }

  for (const [table, columns] of Object.entries(requiredColumns)) {
    for (const [column, definition] of Object.entries(columns)) {
      if (!(await columnExists(table, column))) {
        await db.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`)
      }
    }
  }
}

function normalizeValue(value: unknown) {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "bigint") return Number(value)
  return value
}

const JSON_COLUMNS = new Set(["soap", "diagnosisCodes", "procedureCodes", "clinicalHistory", "applicableSpecializations", "items"])

function parseJsonColumn(value: unknown) {
  if (typeof value !== "string" || value.length === 0) return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function normalizeRow(row: Row) {
  const normalized: Row = {}
  for (const [key, value] of Object.entries(row)) {
    const normalizedValue = normalizeValue(value)
    normalized[key] = JSON_COLUMNS.has(key) ? parseJsonColumn(normalizedValue) : normalizedValue
  }
  return normalized
}

function pickColumns(collection: CollectionName, item: Row) {
  const picked: Row = {}
  for (const column of tableColumns[collection]) {
    if (column === "beforeSnapshot") {
      picked[column] = item.before === undefined ? null : JSON.stringify(item.before)
      continue
    }
    if (column === "afterSnapshot") {
      picked[column] = item.after === undefined ? null : JSON.stringify(item.after)
      continue
    }
    if (item[column] === undefined) continue
    const value = item[column]
    if (JSON_COLUMNS.has(column)) {
      picked[column] = value === null ? null : JSON.stringify(value)
      continue
    }
    picked[column] = column.endsWith("At") || column.endsWith("Date") || column === "date" || column === "paidAt" || column === "performedAt" || column === "validUntil"
      ? toMysqlDatetime(value)
      : value
  }
  return picked
}

async function insertRow(executor: Queryable, collection: CollectionName, item: Row) {
  const table = tableMap[collection]
  const data = pickColumns(collection, item)
  await executor.query(`INSERT INTO \`${table}\` SET ?`, [data])
}

async function insertDetails(executor: Queryable, collection: CollectionName, item: Row) {
  if (collection === "doctors") {
    for (const schedule of item.schedules ?? []) {
      await executor.query("INSERT INTO doctor_schedules (id, doctorId, day, startTime, endTime) VALUES (UUID(), ?, ?, ?, ?)", [
        item.id,
        schedule.day,
        schedule.startTime,
        schedule.endTime,
      ])
    }
  }

  if (collection === "appointments") {
    const serviceIds = item.serviceIds?.length ? item.serviceIds : item.serviceId ? [item.serviceId] : []
    for (const serviceId of serviceIds) {
      await executor.query("INSERT IGNORE INTO appointment_services (appointmentId, serviceId) VALUES (?, ?)", [item.id, serviceId])
    }
    if (item.triage) {
      await executor.query(
        `INSERT INTO appointment_triage (
          appointmentId, bloodPressure, heartRate, temperature, bloodGlucose,
          oxygenSaturation, weight, height, respiratoryRate, complaints, notes,
          nurseName, recordedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.triage.vitalSigns?.bloodPressure ?? null,
          item.triage.vitalSigns?.heartRate ?? null,
          item.triage.vitalSigns?.temperature ?? null,
          item.triage.vitalSigns?.bloodGlucose ?? null,
          item.triage.vitalSigns?.oxygenSaturation ?? null,
          item.triage.vitalSigns?.weight ?? null,
          item.triage.vitalSigns?.height ?? null,
          item.triage.vitalSigns?.respiratoryRate ?? null,
          item.triage.complaints ?? null,
          item.triage.notes ?? null,
          item.triage.nurseName ?? null,
          toMysqlDatetime(item.triage.recordedAt),
        ],
      )
    }
  }

  if (collection === "medicalRecords") {
    for (const prescription of item.prescription ?? []) {
      await executor.query(
        "INSERT INTO prescriptions (id, medicalRecordId, medicineId, medicineName, dosage, frequency, duration, quantity, notes) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)",
        [item.id, prescription.medicineId, prescription.medicineName, prescription.dosage, prescription.frequency, prescription.duration, prescription.quantity, prescription.notes ?? null],
      )
    }
    for (const equipment of item.equipmentsUsed ?? []) {
      await executor.query(
        "INSERT INTO medical_record_equipments (id, medicalRecordId, equipmentId, equipmentName, usageNotes) VALUES (UUID(), ?, ?, ?, ?)",
        [item.id, equipment.equipmentId, equipment.equipmentName, equipment.usageNotes ?? null],
      )
    }
    if (item.vitalSigns) {
      await executor.query(
        "INSERT INTO vital_signs (medicalRecordId, bloodPressure, heartRate, temperature, bloodGlucose, oxygenSaturation, weight, height, respiratoryRate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [item.id, item.vitalSigns.bloodPressure ?? null, item.vitalSigns.heartRate ?? null, item.vitalSigns.temperature ?? null, item.vitalSigns.bloodGlucose ?? null, item.vitalSigns.oxygenSaturation ?? null, item.vitalSigns.weight ?? null, item.vitalSigns.height ?? null, item.vitalSigns.respiratoryRate ?? null],
      )
    }
  }

  if (collection === "labOrders") {
    for (const testName of item.tests ?? []) {
      await executor.query("INSERT INTO lab_order_tests (id, labOrderId, testName) VALUES (UUID(), ?, ?)", [item.id, testName])
    }
  }

  if (collection === "pharmacyRequests") {
    for (const prescription of item.items ?? item.prescription ?? []) {
      await executor.query(
        "INSERT INTO pharmacy_request_items (id, pharmacyRequestId, medicineId, medicineName, dosage, frequency, duration, quantity, notes) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)",
        [item.id, prescription.medicineId, prescription.medicineName, prescription.dosage, prescription.frequency, prescription.duration, prescription.quantity, prescription.notes ?? null],
      )
    }
  }
}

async function deleteDetails(executor: Queryable, collection: CollectionName, id?: string) {
  const detailNames = detailTables[collection] ?? []
  for (const table of detailNames) {
    const fk =
      table === "doctor_schedules" ? "doctorId" :
      table === "appointment_services" ? "appointmentId" :
      table === "appointment_triage" ? "appointmentId" :
      table === "lab_order_tests" ? "labOrderId" :
      table === "pharmacy_request_items" ? "pharmacyRequestId" :
      "medicalRecordId"
    await executor.query(id ? `DELETE FROM \`${table}\` WHERE \`${fk}\` = ?` : `DELETE FROM \`${table}\``, id ? [id] : [])
  }
}

async function hydrateDetails(collection: CollectionName, rows: Row[]) {
  if (rows.length === 0) return rows

  if (collection === "doctors") {
    const [details] = await db.query("SELECT doctorId, day, startTime, endTime FROM doctor_schedules")
    return rows.map((row) => ({ ...row, schedules: (details as Row[]).filter((item) => item.doctorId === row.id).map(({ doctorId, ...schedule }) => schedule) }))
  }

  if (collection === "appointments") {
    const [details] = await db.query("SELECT appointmentId, serviceId FROM appointment_services")
    const [triages] = await db.query("SELECT * FROM appointment_triage")
    return rows.map((row) => {
      const serviceIds = (details as Row[]).filter((item) => item.appointmentId === row.id).map((item) => item.serviceId)
      const triage = (triages as Row[]).find((item) => item.appointmentId === row.id)
      return {
        ...row,
        serviceIds: serviceIds.length ? serviceIds : row.serviceId ? [row.serviceId] : [],
        serviceNames: row.serviceName ? [row.serviceName] : [],
        triage: triage
          ? {
              vitalSigns: {
                bloodPressure: triage.bloodPressure ?? undefined,
                heartRate: triage.heartRate ?? undefined,
                temperature: triage.temperature ?? undefined,
                bloodGlucose: triage.bloodGlucose ?? undefined,
                oxygenSaturation: triage.oxygenSaturation ?? undefined,
                weight: triage.weight ?? undefined,
                height: triage.height ?? undefined,
                respiratoryRate: triage.respiratoryRate ?? undefined,
              },
              complaints: triage.complaints ?? undefined,
              notes: triage.notes ?? undefined,
              nurseName: triage.nurseName ?? undefined,
              recordedAt: normalizeValue(triage.recordedAt),
            }
          : undefined,
      }
    })
  }

  if (collection === "medicalRecords") {
    const [prescriptions] = await db.query("SELECT medicalRecordId, medicineId, medicineName, dosage, frequency, duration, quantity, notes FROM prescriptions")
    const [equipments] = await db.query("SELECT medicalRecordId, equipmentId, equipmentName, usageNotes FROM medical_record_equipments")
    const [vitals] = await db.query("SELECT * FROM vital_signs")
    return rows.map((row) => ({
      ...row,
      prescription: (prescriptions as Row[]).filter((item) => item.medicalRecordId === row.id).map(({ medicalRecordId, ...item }) => normalizeRow(item)),
      equipmentsUsed: (equipments as Row[]).filter((item) => item.medicalRecordId === row.id).map(({ medicalRecordId, ...item }) => normalizeRow(item)),
      vitalSigns: normalizeRow((vitals as Row[]).find((item) => item.medicalRecordId === row.id) ?? {}),
    }))
  }

  if (collection === "labOrders") {
    const [tests] = await db.query("SELECT labOrderId, testName FROM lab_order_tests")
    return rows.map((row) => ({ ...row, tests: (tests as Row[]).filter((item) => item.labOrderId === row.id).map((item) => item.testName) }))
  }

  if (collection === "pharmacyRequests") {
    const [items] = await db.query("SELECT pharmacyRequestId, medicineId, medicineName, dosage, frequency, duration, quantity, notes FROM pharmacy_request_items")
    return rows.map((row) => {
      const prescriptions = (items as Row[]).filter((item) => item.pharmacyRequestId === row.id).map(({ pharmacyRequestId, ...item }) => normalizeRow(item))
      return { ...row, items: prescriptions, prescription: prescriptions }
    })
  }

  if (collection === "auditLogs") {
    return rows.map((row) => {
      const normalized = { ...row }
      if (normalized.beforeSnapshot) normalized.before = JSON.parse(normalized.beforeSnapshot)
      if (normalized.afterSnapshot) normalized.after = JSON.parse(normalized.afterSnapshot)
      delete normalized.beforeSnapshot
      delete normalized.afterSnapshot
      return normalized
    })
  }

  return rows
}

export async function initDataStore() {
  await ensureDatabaseSchema()

  for (const user of REQUIRED_DEFAULT_USERS) {
    await db.query(
      `INSERT INTO users (id, username, name, email, role, password, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         username = VALUES(username),
         name = VALUES(name),
         email = VALUES(email),
         role = VALUES(role)`,
      [user.id, user.username, user.name, user.email, user.role, user.password, toMysqlDatetime(user.createdAt)],
    )
  }

  for (const collection of Object.keys(defaultData) as CollectionName[]) {
    if (collection === "users") continue
    const [rows] = await db.query(`SELECT COUNT(*) as total FROM \`${tableMap[collection]}\``)
    if (((rows as Row[])[0]?.total ?? 0) === 0 && defaultData[collection].length > 0) {
      await writeCollection(collection, defaultData[collection])
    }
  }
}

export async function readCollection<K extends CollectionName>(collection: K): Promise<DefaultData[K]> {
  const [rows] = await db.query(`SELECT * FROM \`${tableMap[collection]}\``)
  const normalized = (rows as Row[]).map(normalizeRow)
  const hydrated = await hydrateDetails(collection, normalized)
  return hydrated as DefaultData[K]
}

// Ganti seluruh isi koleksi sekaligus. Dipakai hanya untuk seeding dan
// restore backup — BUKAN untuk mutasi satu record (lihat insertOne/updateOne/
// deleteOne). Dijalankan dalam satu transaksi agar tidak meninggalkan tabel
// dalam keadaan setengah terisi bila terjadi kegagalan di tengah proses.
export async function writeCollection<K extends CollectionName>(collection: K, data: DefaultData[K]): Promise<void> {
  const table = tableMap[collection]
  await withTransaction(async (conn) => {
    await conn.query("SET FOREIGN_KEY_CHECKS = 0")
    try {
      await deleteDetails(conn, collection)
      await conn.query(`DELETE FROM \`${table}\``)
      for (const item of data as Row[]) {
        await insertRow(conn, collection, item)
        await insertDetails(conn, collection, item)
      }
    } finally {
      await conn.query("SET FOREIGN_KEY_CHECKS = 1")
    }
  })
}

// Mutasi satu record — menggantikan pola lama "baca semua, tulis ulang semua".
// Setiap operasi atomik dan hanya menyentuh baris yang bersangkutan sehingga
// biayanya O(1), bukan O(n), dan aman terhadap request yang berjalan bersamaan.
export async function insertOne<K extends CollectionName>(collection: K, item: DefaultData[K][number]): Promise<void> {
  await withTransaction(async (conn) => {
    await insertRow(conn, collection, item as Row)
    await insertDetails(conn, collection, item as Row)
  })
}

export async function updateOne<K extends CollectionName>(collection: K, id: string, item: DefaultData[K][number]): Promise<void> {
  await withTransaction(async (conn) => {
    const data = pickColumns(collection, item as Row)
    delete data.id
    if (Object.keys(data).length > 0) {
      await conn.query(`UPDATE \`${tableMap[collection]}\` SET ? WHERE id = ?`, [data, id])
    }
    // Tabel detail tidak punya identitas mandiri, jadi disinkronkan dengan cara
    // menghapus lalu menulis ulang milik record ini saja.
    if ((detailTables[collection] ?? []).length > 0) {
      await deleteDetails(conn, collection, id)
      await insertDetails(conn, collection, item as Row)
    }
  })
}

export async function deleteOne<K extends CollectionName>(collection: K, id: string): Promise<boolean> {
  return withTransaction(async (conn) => {
    await deleteDetails(conn, collection, id)
    const [result] = await conn.query(`DELETE FROM \`${tableMap[collection]}\` WHERE id = ?`, [id])
    return (result as { affectedRows?: number }).affectedRows ? true : false
  })
}
