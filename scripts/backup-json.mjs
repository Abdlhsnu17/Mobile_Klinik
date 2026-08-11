#!/usr/bin/env node
//
// Snapshot JSON portable seluruh data SIMKLAB untuk keperluan cron.
// Memanggil endpoint admin GET /api/backup/export dengan token JWT admin.
//
// Pemakaian:
//   BACKUP_API_URL=http://localhost:4004 BACKUP_API_TOKEN=<jwt-admin> node scripts/backup-json.mjs
//   BACKUP_DIR=/data/backups ... node scripts/backup-json.mjs
//
// Contoh cron harian 02:00:
//   0 2 * * *  cd /path/repo && BACKUP_API_URL=... BACKUP_API_TOKEN=... node scripts/backup-json.mjs

import { mkdir, writeFile, readdir, stat, unlink } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, "..")

const API_URL = process.env.BACKUP_API_URL ?? "http://localhost:4004"
const TOKEN = process.env.BACKUP_API_TOKEN
const BACKUP_DIR = process.env.BACKUP_DIR ?? path.join(repoRoot, "backups")
const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS ?? 7)

if (!TOKEN) {
  console.error("BACKUP_API_TOKEN (JWT admin) wajib diisi.")
  process.exit(1)
}

async function main() {
  const res = await fetch(`${API_URL.replace(/\/$/, "")}/api/backup/export`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Export gagal (${res.status}): ${body.slice(0, 300)}`)
  }
  const snapshot = await res.text()

  await mkdir(BACKUP_DIR, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const outFile = path.join(BACKUP_DIR, `simklab-snapshot-${stamp}.json`)
  await writeFile(outFile, snapshot, "utf8")
  console.log(`Snapshot tersimpan: ${outFile}`)

  // Rotasi berdasarkan umur file.
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000
  for (const name of await readdir(BACKUP_DIR)) {
    if (!name.startsWith("simklab-snapshot-") || !name.endsWith(".json")) continue
    const filePath = path.join(BACKUP_DIR, name)
    const info = await stat(filePath)
    if (info.mtimeMs < cutoff) {
      await unlink(filePath)
      console.log(`Dihapus (kadaluarsa): ${name}`)
    }
  }
}

main().catch((err) => {
  console.error(err.message ?? err)
  process.exit(1)
})
