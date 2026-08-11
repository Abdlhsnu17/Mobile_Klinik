#!/usr/bin/env bash
#
# Backup database SIMKLAB menggunakan mysqldump native + gzip, dengan rotasi.
# Membaca kredensial dari environment (kompatibel dengan .env: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD).
# Baris terakhir stdout adalah path file dump (dibaca oleh BackupService.runNativeDump).
#
# Pemakaian:
#   bash scripts/backup-db.sh
#   BACKUP_DIR=/data/backups BACKUP_RETENTION_DAYS=14 bash scripts/backup-db.sh
#
set -euo pipefail

DB_HOST="${DB_HOST:-${MYSQL_HOST:-127.0.0.1}}"
DB_PORT="${DB_PORT:-${MYSQL_PORT:-3306}}"
DB_NAME="${DB_NAME:-${MYSQL_DATABASE:-sistem_klinik}}"
DB_USER="${DB_USER:-${MYSQL_USER:-root}}"
DB_PASSWORD="${DB_PASSWORD:-${MYSQL_PASSWORD:-}}"

# Direktori tujuan (default: <repo>/backups). Dibuat jika belum ada.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-${REPO_ROOT}/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

mkdir -p "${BACKUP_DIR}"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUTFILE="${BACKUP_DIR}/simklab-${DB_NAME}-${STAMP}.sql.gz"

# Susun argumen mysqldump; sertakan password hanya bila diisi (hindari argumen kosong).
DUMP_ARGS=(--host="${DB_HOST}" --port="${DB_PORT}" --user="${DB_USER}"
  --single-transaction --quick --routines --triggers --events --default-character-set=utf8mb4)
if [[ -n "${DB_PASSWORD}" ]]; then
  DUMP_ARGS+=(--password="${DB_PASSWORD}")
fi

# Kirim log ke stderr agar stdout hanya berisi path file.
echo "Menjalankan mysqldump untuk database '${DB_NAME}' -> ${OUTFILE}" >&2
mysqldump "${DUMP_ARGS[@]}" "${DB_NAME}" | gzip > "${OUTFILE}"

# Rotasi: hapus dump lebih tua dari RETENTION_DAYS.
find "${BACKUP_DIR}" -name "simklab-${DB_NAME}-*.sql.gz" -type f -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true

echo "Backup selesai." >&2
# Baris terakhir stdout = path file (dipakai oleh service).
echo "${OUTFILE}"
