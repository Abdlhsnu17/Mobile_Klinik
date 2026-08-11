-- =====================================================================
-- Migrasi: batch obat + FEFO
--
-- `schema.sql` memakai DROP TABLE IF EXISTS sehingga hanya aman untuk
-- database baru. Jalankan file ini pada database yang sudah berisi data:
--
--   mysql -u <user> -p <nama_database> < 2026-07-21-medicine-batches.sql
--
-- Aman dijalankan ulang: setiap pernyataan memeriksa dulu apakah objeknya
-- sudah ada.
-- =====================================================================

CREATE TABLE IF NOT EXISTS `medicine_batches` (
  `id` varchar(64) COLLATE utf8mb4_general_ci NOT NULL,
  `medicineId` varchar(64) COLLATE utf8mb4_general_ci NOT NULL,
  `batchNumber` varchar(128) COLLATE utf8mb4_general_ci NOT NULL,
  `expiryDate` date NOT NULL,
  `quantity` int NOT NULL DEFAULT '0',
  `initialQuantity` int NOT NULL DEFAULT '0',
  `buyPrice` decimal(14,2) NOT NULL DEFAULT '0.00',
  `supplier` varchar(128) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_general_ci,
  `receivedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_medicine_batches_medicineId` (`medicineId`),
  KEY `idx_medicine_batches_fefo` (`medicineId`,`expiryDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Kolom batchId pada kartu stok (MySQL 8 tidak punya ADD COLUMN IF NOT EXISTS).
SET @hasBatchId := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_movements' AND COLUMN_NAME = 'batchId'
);
SET @sql := IF(
  @hasBatchId = 0,
  'ALTER TABLE `stock_movements` ADD COLUMN `batchId` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL AFTER `medicineId`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @hasBatchIdIndex := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_movements' AND INDEX_NAME = 'idx_stock_movements_batchId'
);
SET @sql := IF(
  @hasBatchIdIndex = 0,
  'ALTER TABLE `stock_movements` ADD KEY `idx_stock_movements_batchId` (`batchId`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Membentuk satu batch awal dari stok yang sudah tercatat, memakai nomor batch
-- dan tanggal kedaluwarsa yang selama ini disimpan di tabel `medicines`.
--
-- Obat tanpa batch tetap dilayani lewat jalur stok agregat, jadi langkah ini
-- opsional. Jalankan bila ingin seluruh obat langsung mengikuti FEFO.
INSERT INTO `medicine_batches`
  (`id`, `medicineId`, `batchNumber`, `expiryDate`, `quantity`, `initialQuantity`, `buyPrice`, `supplier`, `notes`)
SELECT
  CONCAT('BATCH-MIGRASI-', m.`id`),
  m.`id`,
  COALESCE(NULLIF(m.`batchNumber`, ''), 'TANPA-BATCH'),
  m.`expiryDate`,
  m.`stock`,
  m.`stock`,
  m.`buyPrice`,
  m.`supplier`,
  'Batch awal hasil migrasi dari stok agregat'
FROM `medicines` m
WHERE m.`stock` > 0
  AND NOT EXISTS (SELECT 1 FROM `medicine_batches` b WHERE b.`medicineId` = m.`id`);
