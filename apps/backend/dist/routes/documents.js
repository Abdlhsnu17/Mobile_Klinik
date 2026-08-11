"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentsRouter = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const documentController_1 = require("../controllers/documentController");
const auth_1 = require("../middlewares/auth");
const httpError_1 = require("../utils/httpError");
const UPLOAD_DIR = path_1.default.resolve(__dirname, "..", "..", "uploads");
fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${Date.now()}-${(0, crypto_1.randomUUID)()}${ext}`);
    },
});
const allowedFileTypes = new Map([
    [".pdf", new Set(["application/pdf"])],
    [".png", new Set(["image/png"])],
    [".jpg", new Set(["image/jpeg"])],
    [".jpeg", new Set(["image/jpeg"])],
    [".doc", new Set(["application/msword"])],
    [".docx", new Set(["application/vnd.openxmlformats-officedocument.wordprocessingml.document"])],
    [".xls", new Set(["application/vnd.ms-excel"])],
    [".xlsx", new Set(["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"])],
]);
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 25 * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        const mimeTypes = allowedFileTypes.get(ext);
        if (mimeTypes?.has(file.mimetype))
            return cb(null, true);
        cb(new Error("Tipe file tidak diizinkan"));
    },
});
function uploadDocument(req, res, next) {
    upload.single("file")(req, res, (error) => {
        if (!error)
            return next();
        if (error instanceof multer_1.default.MulterError) {
            return next((0, httpError_1.createHttpError)(400, error.code === "LIMIT_FILE_SIZE" ? "Ukuran file maksimal 25MB" : error.message));
        }
        return next((0, httpError_1.createHttpError)(400, error instanceof Error ? error.message : "Upload file gagal"));
    });
}
exports.documentsRouter = (0, express_1.Router)();
const requireDocumentRead = (0, auth_1.requireRole)("admin", "umum");
const requireDocumentWrite = (0, auth_1.requireRole)("admin");
/**
 * @openapi
 * /documents:
 *   get:
 *     tags: [Documents]
 *     summary: List dokumen
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
exports.documentsRouter.get("/", requireDocumentRead, documentController_1.DocumentController.list);
/**
 * @openapi
 * /documents/{id}/view:
 *   get:
 *     tags: [Documents]
 *     summary: Lihat dokumen inline
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Tidak ditemukan }
 */
exports.documentsRouter.get("/:id/view", requireDocumentRead, documentController_1.DocumentController.view);
/**
 * @openapi
 * /documents/{id}/download:
 *   get:
 *     tags: [Documents]
 *     summary: Unduh dokumen
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Tidak ditemukan }
 */
exports.documentsRouter.get("/:id/download", requireDocumentRead, documentController_1.DocumentController.download);
/**
 * @openapi
 * /documents/{id}:
 *   get:
 *     tags: [Documents]
 *     summary: Ambil metadata dokumen
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Tidak ditemukan }
 */
exports.documentsRouter.get("/:id", requireDocumentRead, documentController_1.DocumentController.getOne);
/**
 * @openapi
 * /documents:
 *   post:
 *     tags: [Documents]
 *     summary: Unggah dokumen baru
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *               title: { type: string }
 *               category: { type: string }
 *               description: { type: string }
 *               uploader: { type: string }
 *     responses:
 *       201: { description: Created }
 *       400: { description: Data tidak valid }
 */
exports.documentsRouter.post("/", requireDocumentWrite, uploadDocument, documentController_1.DocumentController.upload);
/**
 * @openapi
 * /documents/{id}:
 *   delete:
 *     tags: [Documents]
 *     summary: Hapus dokumen
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Deleted }
 *       404: { description: Tidak ditemukan }
 */
exports.documentsRouter.delete("/:id", requireDocumentWrite, documentController_1.DocumentController.delete);
//# sourceMappingURL=documents.js.map