"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupService = void 0;
const node_child_process_1 = require("node:child_process");
const node_path_1 = __importDefault(require("node:path"));
const defaultData_1 = require("../models/defaultData");
const store_1 = require("../models/store");
const httpError_1 = require("../utils/httpError");
const SNAPSHOT_VERSION = 1;
const collectionNames = Object.keys(defaultData_1.defaultData);
class BackupService {
    /** Ekspor seluruh koleksi menjadi satu snapshot JSON yang portable. */
    static async exportSnapshot() {
        const collections = {};
        for (const name of collectionNames) {
            collections[name] = (await (0, store_1.readCollection)(name));
        }
        return {
            version: SNAPSHOT_VERSION,
            exportedAt: new Date().toISOString(),
            collections,
        };
    }
    /**
     * Pulihkan data dari snapshot JSON. Hanya koleksi yang dikenali yang diproses.
     * Mengembalikan ringkasan jumlah baris per koleksi yang dipulihkan.
     */
    static async importSnapshot(snapshot) {
        if (!snapshot || typeof snapshot !== "object") {
            throw (0, httpError_1.createHttpError)(400, "Snapshot tidak valid.");
        }
        const { version, collections } = snapshot;
        if (version !== SNAPSHOT_VERSION) {
            throw (0, httpError_1.createHttpError)(400, `Versi snapshot tidak didukung (diharapkan ${SNAPSHOT_VERSION}).`);
        }
        if (!collections || typeof collections !== "object") {
            throw (0, httpError_1.createHttpError)(400, "Snapshot tidak memuat data koleksi.");
        }
        const restored = {};
        for (const name of collectionNames) {
            const rows = collections[name];
            if (rows === undefined)
                continue;
            if (!Array.isArray(rows)) {
                throw (0, httpError_1.createHttpError)(400, `Data koleksi "${name}" harus berupa array.`);
            }
            await (0, store_1.writeCollection)(name, rows);
            restored[name] = rows.length;
        }
        return { restored };
    }
    /**
     * Jalankan mysqldump native via scripts/backup-db.sh (host).
     * Mengembalikan path file dump yang dihasilkan.
     */
    static runNativeDump() {
        const scriptPath = node_path_1.default.resolve(__dirname, "..", "..", "..", "..", "scripts", "backup-db.sh");
        return new Promise((resolve, reject) => {
            const child = (0, node_child_process_1.spawn)("bash", [scriptPath], {
                env: process.env,
            });
            let stdout = "";
            let stderr = "";
            child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
            child.stderr.on("data", (chunk) => (stderr += chunk.toString()));
            child.on("error", (err) => reject((0, httpError_1.createHttpError)(500, `Gagal menjalankan backup: ${err.message}`)));
            child.on("close", (code) => {
                if (code !== 0) {
                    reject((0, httpError_1.createHttpError)(500, `Backup gagal (exit ${code}): ${stderr.slice(0, 500)}`));
                    return;
                }
                // Script mencetak path file dump pada baris terakhir stdout.
                const file = stdout.trim().split("\n").filter(Boolean).at(-1) ?? "";
                resolve({ file, log: stdout.trim() });
            });
        });
    }
}
exports.BackupService = BackupService;
//# sourceMappingURL=backupService.js.map