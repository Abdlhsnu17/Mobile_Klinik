# Backup, Restore & Retensi Data — SIMKLAB

Modul backup menyediakan dua lapis perlindungan data: **snapshot JSON portable** (via API admin) dan **backup database native** (mysqldump). Semua operasi hanya dapat diakses oleh role `admin`.

## 1. Snapshot JSON (portable)

Snapshot memuat seluruh koleksi dalam satu file JSON. Cocok untuk restore cepat, migrasi antar lingkungan, dan cadangan yang tidak bergantung pada tooling MySQL.

### Lewat UI
Buka **Pengaturan → Sistem → Backup & Pemulihan Data**:
- **Ekspor Snapshot JSON** — mengunduh file `simklab-backup-<timestamp>.json`.
- **Pulihkan dari Snapshot JSON** — pilih file JSON; data yang ada akan **ditimpa** (ada konfirmasi).

### Lewat API
| Endpoint | Keterangan |
|---|---|
| `GET /api/backup/export` | Unduh snapshot seluruh koleksi. |
| `POST /api/backup/import` | Pulihkan dari body snapshot JSON (menimpa data). |
| `POST /api/backup/run` | Jalankan mysqldump native (lihat §2). |

Semua endpoint memerlukan header `Authorization: Bearer <jwt-admin>`. Operasi import & run dicatat di **audit log**.

### Snapshot terjadwal (cron)
`scripts/backup-json.mjs` memanggil endpoint export dan menyimpan file dengan rotasi:

```bash
BACKUP_API_URL=http://localhost:4004 \
BACKUP_API_TOKEN=<jwt-admin> \
BACKUP_DIR=/data/backups \
BACKUP_RETENTION_DAYS=7 \
node scripts/backup-json.mjs
```

Contoh cron harian 02:00:
```
0 2 * * *  cd /path/repo && BACKUP_API_URL=... BACKUP_API_TOKEN=... node scripts/backup-json.mjs
```

## 2. Backup database native (mysqldump)

`scripts/backup-db.sh` membuat dump MySQL lengkap (routines, triggers, events) yang dikompres gzip, dengan rotasi.

```bash
# Memakai kredensial dari .env (DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD)
bash scripts/backup-db.sh

# Override direktori & retensi
BACKUP_DIR=/data/backups BACKUP_RETENTION_DAYS=14 bash scripts/backup-db.sh
```

Output file: `simklab-<db>-<timestamp>.sql.gz`. Restore manual:
```bash
gunzip < simklab-sistem_klinik-20260724-020000.sql.gz | mysql -h 127.0.0.1 -u root sistem_klinik
```

Prasyarat: `mysqldump` & `gzip` tersedia di host/kontainer. Endpoint `POST /api/backup/run` memicu script ini dari server.

Contoh cron harian 03:00:
```
0 3 * * *  cd /path/repo && bash scripts/backup-db.sh >> /var/log/simklab-backup.log 2>&1
```

## 3. Kebijakan retensi (disarankan)

| Jenis | Frekuensi | Retensi | Lokasi |
|---|---|---|---|
| Snapshot JSON | Harian | 7 hari | `BACKUP_DIR` (disk lokal) |
| mysqldump | Harian | 14–30 hari | `BACKUP_DIR` + salinan off-site |
| Arsip bulanan | Bulanan | 12 bulan | Penyimpanan off-site/cloud |

- Rotasi otomatis diatur lewat `BACKUP_RETENTION_DAYS` pada masing-masing script.
- **Data rekam medis**: sesuai Permenkes, rekam medis wajib disimpan sekurang-kurangnya sesuai ketentuan yang berlaku — jangan menghapus data medis produksi hanya karena rotasi backup; rotasi hanya berlaku untuk **file cadangan**, bukan data primer.
- Simpan minimal satu salinan **off-site** (di luar server aplikasi) untuk mitigasi kegagalan disk/host.

## 4. Konfigurasi environment

Lihat `.env.example`:
```
BACKUP_DIR=
BACKUP_RETENTION_DAYS=7
BACKUP_API_URL=http://localhost:4004
BACKUP_API_TOKEN=
```
