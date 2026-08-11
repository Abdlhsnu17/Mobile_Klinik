-- Dump struktur (tanpa data) yang di-generate dari database yang dibootstrap otomatis
-- oleh apps/backend/src/models/store.ts (initDataStore -> CREATE TABLE IF NOT EXISTS).
-- Disediakan sebagai REFERENSI/DOKUMENTASI struktur tabel saat ini.
-- Sumber kebenaran (source of truth) skema tetap store.ts, bukan file ini — backend
-- membuat tabelnya sendiri saat start, jadi file ini TIDAK WAJIB di-import untuk
-- instalasi baru. Jaga agar tetap selaras dengan createTableStatements di store.ts.
--
-- Tabel dikelompokkan mengikuti alur bisnis klinik:
--   1. Master data (pengguna, dokter, layanan, obat, alat, tempat tidur, pemasok)
--   2. Pendaftaran & antrean pasien
--   3. Penanganan dokter / rekam medis
--   4. Farmasi & obat
--   5. Pemeriksaan penunjang: laboratorium
--   6. Pemeriksaan penunjang: radiologi (ronsen)
--   7. Rawat inap
--   8. Pembayaran, tagihan & asuransi
--   9. Rujukan
--  10. Lain-lain (notifikasi, dokumen, survei, audit, dsb.)
--
CREATE DATABASE IF NOT EXISTS `sistem_klinik` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `sistem_klinik`;


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- =====================================================================
-- 1. MASTER DATA
-- =====================================================================

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `doctors`;
CREATE TABLE IF NOT EXISTS `doctors` (
  id varchar(64) NOT NULL,
  name varchar(128) NOT NULL,
  specialization varchar(128) NOT NULL,
  phone varchar(32) NOT NULL,
  email varchar(128) NOT NULL,
  status varchar(32) NOT NULL,
  createdAt datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `doctor_schedules`;
CREATE TABLE IF NOT EXISTS `doctor_schedules` (
  id varchar(64) NOT NULL,
  doctorId varchar(64) NOT NULL,
  day varchar(16) NOT NULL,
  startTime time NOT NULL,
  endTime time NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `services`;
CREATE TABLE IF NOT EXISTS `services` (
  id varchar(64) NOT NULL,
  name varchar(128) NOT NULL,
  category varchar(64) NOT NULL,
  price decimal(14,2) NOT NULL DEFAULT 0.00,
  duration int NOT NULL DEFAULT 0,
  description text DEFAULT NULL,
  status varchar(32) NOT NULL,
  applicableSpecializations longtext DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `medicines`;
CREATE TABLE IF NOT EXISTS `medicines` (
  id varchar(64) NOT NULL,
  code varchar(32) NOT NULL,
  name varchar(128) NOT NULL,
  genericName varchar(128) DEFAULT NULL,
  brandName varchar(128) DEFAULT NULL,
  category varchar(128) NOT NULL,
  form varchar(64) NOT NULL DEFAULT 'Tablet',
  strength varchar(64) DEFAULT NULL,
  unit varchar(32) NOT NULL,
  `group` varchar(64) DEFAULT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `stock_movements`;
CREATE TABLE IF NOT EXISTS `stock_movements` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `medicine_batches`;
CREATE TABLE IF NOT EXISTS `medicine_batches` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `medical_equipments`;
CREATE TABLE IF NOT EXISTS `medical_equipments` (
  id varchar(64) NOT NULL,
  code varchar(32) NOT NULL,
  name varchar(128) NOT NULL,
  category varchar(64) NOT NULL,
  brand varchar(128) NOT NULL,
  model varchar(128) NOT NULL,
  quantity int NOT NULL DEFAULT 0,
  `condition` varchar(64) NOT NULL,
  location varchar(128) NOT NULL,
  purchaseDate date NOT NULL,
  lastMaintenanceDate date DEFAULT NULL,
  nextMaintenanceDate date DEFAULT NULL,
  notes text DEFAULT NULL,
  status varchar(64) NOT NULL,
  createdAt datetime NOT NULL DEFAULT current_timestamp(),
  updatedAt datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `beds`;
CREATE TABLE IF NOT EXISTS `beds` (
  id varchar(64) NOT NULL,
  bedNumber varchar(64) NOT NULL,
  ward varchar(128) NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'available',
  lastCleanedAt datetime NOT NULL DEFAULT current_timestamp(),
  assignedPatientId varchar(64) DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `suppliers`;
CREATE TABLE IF NOT EXISTS `suppliers` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =====================================================================
-- 2. PENDAFTARAN & ANTREAN PASIEN
-- =====================================================================

DROP TABLE IF EXISTS `patients`;
CREATE TABLE IF NOT EXISTS `patients` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `appointments`;
CREATE TABLE IF NOT EXISTS `appointments` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `appointment_services`;
CREATE TABLE IF NOT EXISTS `appointment_services` (
  appointmentId varchar(64) NOT NULL,
  serviceId varchar(64) NOT NULL,
  PRIMARY KEY (appointmentId, serviceId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `appointment_triage`;
CREATE TABLE IF NOT EXISTS `appointment_triage` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =====================================================================
-- 3. PENANGANAN DOKTER / REKAM MEDIS
-- =====================================================================

DROP TABLE IF EXISTS `medical_records`;
CREATE TABLE IF NOT EXISTS `medical_records` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `prescriptions`;
CREATE TABLE IF NOT EXISTS `prescriptions` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `medical_record_equipments`;
CREATE TABLE IF NOT EXISTS `medical_record_equipments` (
  id varchar(64) NOT NULL,
  medicalRecordId varchar(64) NOT NULL,
  equipmentId varchar(64) NOT NULL,
  equipmentName varchar(128) NOT NULL,
  usageNotes text DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `vital_signs`;
CREATE TABLE IF NOT EXISTS `vital_signs` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `medical_codes`;
CREATE TABLE IF NOT EXISTS `medical_codes` (
  id varchar(64) NOT NULL,
  `system` varchar(16) NOT NULL DEFAULT 'icd10',
  code varchar(32) NOT NULL,
  name varchar(255) NOT NULL,
  category varchar(128) DEFAULT NULL,
  isActive tinyint(1) NOT NULL DEFAULT 1,
  createdAt datetime NOT NULL DEFAULT current_timestamp(),
  updatedAt datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (id),
  UNIQUE KEY uq_medical_codes_system_code (`system`, code),
  KEY idx_medical_codes_system (`system`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `clinical_documents`;
CREATE TABLE IF NOT EXISTS `clinical_documents` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `informed_consents`;
CREATE TABLE IF NOT EXISTS `informed_consents` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =====================================================================
-- 4. FARMASI & OBAT
-- =====================================================================

DROP TABLE IF EXISTS `pharmacy_requests`;
CREATE TABLE IF NOT EXISTS `pharmacy_requests` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `pharmacy_request_items`;
CREATE TABLE IF NOT EXISTS `pharmacy_request_items` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `purchase_orders`;
CREATE TABLE IF NOT EXISTS `purchase_orders` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =====================================================================
-- 5. PEMERIKSAAN PENUNJANG: LABORATORIUM
-- =====================================================================

DROP TABLE IF EXISTS `lab_orders`;
CREATE TABLE IF NOT EXISTS `lab_orders` (
  id varchar(64) NOT NULL,
  patientId varchar(64) NOT NULL,
  patientName varchar(128) NOT NULL,
  medicalRecordId varchar(64) NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `lab_order_tests`;
CREATE TABLE IF NOT EXISTS `lab_order_tests` (
  id varchar(64) NOT NULL,
  labOrderId varchar(64) NOT NULL,
  testName varchar(128) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `lab_results`;
CREATE TABLE IF NOT EXISTS `lab_results` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =====================================================================
-- 6. PEMERIKSAAN PENUNJANG: RADIOLOGI (RONSEN)
-- =====================================================================

DROP TABLE IF EXISTS `radiology_orders`;
CREATE TABLE IF NOT EXISTS `radiology_orders` (
  id varchar(64) NOT NULL,
  patientId varchar(64) NOT NULL,
  patientName varchar(128) NOT NULL,
  medicalRecordId varchar(64) NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =====================================================================
-- 7. RAWAT INAP
-- =====================================================================

DROP TABLE IF EXISTS `inpatient_admissions`;
CREATE TABLE IF NOT EXISTS `inpatient_admissions` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `doctor_visit_notes`;
CREATE TABLE IF NOT EXISTS `doctor_visit_notes` (
  id varchar(64) NOT NULL,
  admissionId varchar(64) NOT NULL,
  doctorId varchar(64) NOT NULL,
  doctorName varchar(128) NOT NULL,
  date datetime NOT NULL,
  note text NOT NULL,
  updatedAt datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =====================================================================
-- 8. PEMBAYARAN, TAGIHAN & ASURANSI
-- =====================================================================

DROP TABLE IF EXISTS `payment_records`;
CREATE TABLE IF NOT EXISTS `payment_records` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `billing_records`;
CREATE TABLE IF NOT EXISTS `billing_records` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `insurance_profiles`;
CREATE TABLE IF NOT EXISTS `insurance_profiles` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `insurance_bridge_members`;
CREATE TABLE IF NOT EXISTS `insurance_bridge_members` (
  id varchar(64) NOT NULL,
  participantNumber varchar(128) NOT NULL,
  name varchar(128) NOT NULL,
  facility varchar(128) NOT NULL,
  status varchar(32) NOT NULL,
  coverageLevel varchar(32) NOT NULL,
  lastClaimDate date NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `insurance_claims`;
CREATE TABLE IF NOT EXISTS `insurance_claims` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `cashier_closings`;
CREATE TABLE IF NOT EXISTS `cashier_closings` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `expenses`;
CREATE TABLE IF NOT EXISTS `expenses` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =====================================================================
-- 9. RUJUKAN
-- =====================================================================

DROP TABLE IF EXISTS `referral_facilities`;
CREATE TABLE IF NOT EXISTS `referral_facilities` (
  id varchar(64) NOT NULL,
  name varchar(160) NOT NULL,
  type varchar(32) NOT NULL DEFAULT 'lainnya',
  address text DEFAULT NULL,
  phone varchar(32) DEFAULT NULL,
  notes text DEFAULT NULL,
  createdAt datetime NOT NULL DEFAULT current_timestamp(),
  updatedAt datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `referrals`;
CREATE TABLE IF NOT EXISTS `referrals` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =====================================================================
-- 10. LAIN-LAIN (notifikasi, dokumen, survei, audit, dsb.)
-- =====================================================================

DROP TABLE IF EXISTS `password_reset_requests`;
CREATE TABLE IF NOT EXISTS `password_reset_requests` (
  id varchar(64) NOT NULL,
  userId varchar(64) NOT NULL,
  email varchar(128) NOT NULL,
  token varchar(128) NOT NULL,
  expiresAt datetime NOT NULL,
  used tinyint(1) NOT NULL DEFAULT 0,
  createdAt datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `patient_notifications`;
CREATE TABLE IF NOT EXISTS `patient_notifications` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `satisfaction_surveys`;
CREATE TABLE IF NOT EXISTS `satisfaction_surveys` (
  id varchar(64) NOT NULL,
  patientId varchar(64) NOT NULL,
  patientName varchar(128) NOT NULL,
  rating tinyint NOT NULL,
  comments text DEFAULT NULL,
  submittedAt datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `documents`;
CREATE TABLE IF NOT EXISTS `documents` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `clinic_settings`;
CREATE TABLE IF NOT EXISTS `clinic_settings` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE IF NOT EXISTS `audit_logs` (
  id varchar(64) NOT NULL,
  `collection` varchar(100) NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
