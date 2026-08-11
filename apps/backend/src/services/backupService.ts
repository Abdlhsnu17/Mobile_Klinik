import { spawn } from "node:child_process"
import path from "node:path"
import { defaultData, type CollectionName } from "../models/defaultData"
import { readCollection, writeCollection } from "../models/store"
import { createHttpError } from "../utils/httpError"

const SNAPSHOT_VERSION = 1
const collectionNames = Object.keys(defaultData) as CollectionName[]

export interface BackupSnapshot {
  version: number
  exportedAt: string
  collections: Partial<Record<CollectionName, unknown[]>>
}

export class BackupService {
  /** Ekspor seluruh koleksi menjadi satu snapshot JSON yang portable. */
  static async exportSnapshot(): Promise<BackupSnapshot> {
    const collections: Partial<Record<CollectionName, unknown[]>> = {}
    for (const name of collectionNames) {
      collections[name] = (await readCollection(name)) as unknown[]
    }
    return {
      version: SNAPSHOT_VERSION,
      exportedAt: new Date().toISOString(),
      collections,
    }
  }

  /**
   * Pulihkan data dari snapshot JSON. Hanya koleksi yang dikenali yang diproses.
   * Mengembalikan ringkasan jumlah baris per koleksi yang dipulihkan.
   */
  static async importSnapshot(snapshot: unknown): Promise<{ restored: Partial<Record<CollectionName, number>> }> {
    if (!snapshot || typeof snapshot !== "object") {
      throw createHttpError(400, "Snapshot tidak valid.")
    }
    const { version, collections } = snapshot as Partial<BackupSnapshot>
    if (version !== SNAPSHOT_VERSION) {
      throw createHttpError(400, `Versi snapshot tidak didukung (diharapkan ${SNAPSHOT_VERSION}).`)
    }
    if (!collections || typeof collections !== "object") {
      throw createHttpError(400, "Snapshot tidak memuat data koleksi.")
    }

    const restored: Partial<Record<CollectionName, number>> = {}
    for (const name of collectionNames) {
      const rows = (collections as Record<string, unknown>)[name]
      if (rows === undefined) continue
      if (!Array.isArray(rows)) {
        throw createHttpError(400, `Data koleksi "${name}" harus berupa array.`)
      }
      await writeCollection(name, rows as never)
      restored[name] = rows.length
    }
    return { restored }
  }

  /**
   * Jalankan mysqldump native via scripts/backup-db.sh (host).
   * Mengembalikan path file dump yang dihasilkan.
   */
  static runNativeDump(): Promise<{ file: string; log: string }> {
    const scriptPath = path.resolve(__dirname, "..", "..", "..", "..", "scripts", "backup-db.sh")
    return new Promise((resolve, reject) => {
      const child = spawn("bash", [scriptPath], {
        env: process.env,
      })
      let stdout = ""
      let stderr = ""
      child.stdout.on("data", (chunk) => (stdout += chunk.toString()))
      child.stderr.on("data", (chunk) => (stderr += chunk.toString()))
      child.on("error", (err) => reject(createHttpError(500, `Gagal menjalankan backup: ${err.message}`)))
      child.on("close", (code) => {
        if (code !== 0) {
          reject(createHttpError(500, `Backup gagal (exit ${code}): ${stderr.slice(0, 500)}`))
          return
        }
        // Script mencetak path file dump pada baris terakhir stdout.
        const file = stdout.trim().split("\n").filter(Boolean).at(-1) ?? ""
        resolve({ file, log: stdout.trim() })
      })
    })
  }
}
