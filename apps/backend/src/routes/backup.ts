import { Router } from "express"
import { requireRole } from "../middlewares/auth"
import { AuditService } from "../services/auditService"
import { BackupService } from "../services/backupService"
import { sendSuccess } from "../utils/apiResponse"

// Semua operasi backup/restore hanya untuk admin.
export const backupRouter = Router()
const requireAdmin = requireRole("admin")

/**
 * @openapi
 * /backup/export:
 *   get:
 *     tags: [Backup]
 *     summary: Unduh snapshot JSON seluruh data (admin)
 */
backupRouter.get("/export", requireAdmin, async (_req, res, next) => {
  try {
    const snapshot = await BackupService.exportSnapshot()
    const stamp = snapshot.exportedAt.replace(/[:.]/g, "-")
    res.setHeader("Content-Type", "application/json")
    res.setHeader("Content-Disposition", `attachment; filename=simklab-backup-${stamp}.json`)
    res.send(JSON.stringify(snapshot, null, 2))
  } catch (error) {
    next(error)
  }
})

/**
 * @openapi
 * /backup/import:
 *   post:
 *     tags: [Backup]
 *     summary: Pulihkan data dari snapshot JSON (admin, menimpa data yang ada)
 */
backupRouter.post("/import", requireAdmin, async (req, res, next) => {
  try {
    const result = await BackupService.importSnapshot(req.body)
    await AuditService.record({
      collection: "backup",
      itemId: "restore",
      action: "update",
      user: req.user,
      reason: "Pemulihan data dari snapshot JSON",
      after: result.restored,
    })
    return sendSuccess(res, result)
  } catch (error) {
    next(error)
  }
})

/**
 * @openapi
 * /backup/run:
 *   post:
 *     tags: [Backup]
 *     summary: Jalankan mysqldump native di host (admin)
 */
backupRouter.post("/run", requireAdmin, async (req, res, next) => {
  try {
    const result = await BackupService.runNativeDump()
    await AuditService.record({
      collection: "backup",
      itemId: "dump",
      action: "create",
      user: req.user,
      reason: "Backup database (mysqldump)",
      after: { file: result.file },
    })
    return sendSuccess(res, result)
  } catch (error) {
    next(error)
  }
})
