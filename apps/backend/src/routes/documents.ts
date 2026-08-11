import fs from "fs"
import path from "path"
import { randomUUID } from "crypto"
import type { NextFunction, Request, Response } from "express"
import { Router } from "express"
import multer from "multer"
import { DocumentController } from "../controllers/documentController"
import { requireRole } from "../middlewares/auth"
import { createHttpError } from "../utils/httpError"

const UPLOAD_DIR = path.resolve(__dirname, "..", "..", "uploads")
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}-${randomUUID()}${ext}`)
  },
})

const allowedFileTypes = new Map([
  [".pdf", new Set(["application/pdf"])],
  [".png", new Set(["image/png"])],
  [".jpg", new Set(["image/jpeg"])],
  [".jpeg", new Set(["image/jpeg"])],
  [".doc", new Set(["application/msword"])],
  [".docx", new Set(["application/vnd.openxmlformats-officedocument.wordprocessingml.document"])],
  [".xls", new Set(["application/vnd.ms-excel"])],
  [".xlsx", new Set(["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"])],
])

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const mimeTypes = allowedFileTypes.get(ext)
    if (mimeTypes?.has(file.mimetype)) return cb(null, true)
    cb(new Error("Tipe file tidak diizinkan"))
  },
})

function uploadDocument(req: Request, res: Response, next: NextFunction) {
  upload.single("file")(req, res, (error) => {
    if (!error) return next()

    if (error instanceof multer.MulterError) {
      return next(createHttpError(400, error.code === "LIMIT_FILE_SIZE" ? "Ukuran file maksimal 25MB" : error.message))
    }

    return next(createHttpError(400, error instanceof Error ? error.message : "Upload file gagal"))
  })
}

export const documentsRouter = Router()
const requireDocumentRead = requireRole("admin", "umum")
const requireDocumentWrite = requireRole("admin")

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
documentsRouter.get("/", requireDocumentRead, DocumentController.list)

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
documentsRouter.get("/:id/view", requireDocumentRead, DocumentController.view)

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
documentsRouter.get("/:id/download", requireDocumentRead, DocumentController.download)

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
documentsRouter.get("/:id", requireDocumentRead, DocumentController.getOne)

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
documentsRouter.post("/", requireDocumentWrite, uploadDocument, DocumentController.upload)

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
documentsRouter.delete("/:id", requireDocumentWrite, DocumentController.delete)
