"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const auditService_1 = require("../services/auditService");
const backupService_1 = require("../services/backupService");
const apiResponse_1 = require("../utils/apiResponse");
// Semua operasi backup/restore hanya untuk admin.
exports.backupRouter = (0, express_1.Router)();
const requireAdmin = (0, auth_1.requireRole)("admin");
/**
 * @openapi
 * /backup/export:
 *   get:
 *     tags: [Backup]
 *     summary: Unduh snapshot JSON seluruh data (admin)
 */
exports.backupRouter.get("/export", requireAdmin, async (_req, res, next) => {
    try {
        const snapshot = await backupService_1.BackupService.exportSnapshot();
        const stamp = snapshot.exportedAt.replace(/[:.]/g, "-");
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename=simklab-backup-${stamp}.json`);
        res.send(JSON.stringify(snapshot, null, 2));
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /backup/import:
 *   post:
 *     tags: [Backup]
 *     summary: Pulihkan data dari snapshot JSON (admin, menimpa data yang ada)
 */
exports.backupRouter.post("/import", requireAdmin, async (req, res, next) => {
    try {
        const result = await backupService_1.BackupService.importSnapshot(req.body);
        await auditService_1.AuditService.record({
            collection: "backup",
            itemId: "restore",
            action: "update",
            user: req.user,
            reason: "Pemulihan data dari snapshot JSON",
            after: result.restored,
        });
        return (0, apiResponse_1.sendSuccess)(res, result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /backup/run:
 *   post:
 *     tags: [Backup]
 *     summary: Jalankan mysqldump native di host (admin)
 */
exports.backupRouter.post("/run", requireAdmin, async (req, res, next) => {
    try {
        const result = await backupService_1.BackupService.runNativeDump();
        await auditService_1.AuditService.record({
            collection: "backup",
            itemId: "dump",
            action: "create",
            user: req.user,
            reason: "Backup database (mysqldump)",
            after: { file: result.file },
        });
        return (0, apiResponse_1.sendSuccess)(res, result);
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=backup.js.map