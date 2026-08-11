import type { NextFunction, Request, Response } from "express";
import { access, unlink } from "fs/promises";
import { warn as logWarn } from "../config/logger";
import { DocumentService } from "../services/documentService";
import type { DocumentCategory } from "../types";
import { sendSuccess } from "../utils/apiResponse";
import { createHttpError } from "../utils/httpError";

const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  "laporan-barang-masuk",
  "berita-surat-masuk",
  "komunikasi-antar-unit",
  "lainnya",
]

function isValidCategory(value: unknown): value is DocumentCategory {
  return typeof value === "string" && DOCUMENT_CATEGORIES.includes(value as DocumentCategory)
}

async function cleanupUploadedFile(file?: Express.Multer.File) {
  if (!file) return
  try {
    await unlink(file.path)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      logWarn("Gagal membersihkan file upload yang ditolak", {
        file: file.filename,
        error: (error as Error)?.message ?? error,
      })
    }
  }
}

export class DocumentController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      let documents = await DocumentService.list()
      const { category } = req.query
      if (typeof category === "string" && isValidCategory(category)) {
        documents = documents.filter((doc) => doc.category === category)
      }
      sendSuccess(res, documents)
    } catch (error) {
      next(error)
    }
  }

  static async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const document = await DocumentService.findById(req.params.id)
      if (!document) throw createHttpError(404, "Dokumen tidak ditemukan")
      sendSuccess(res, document)
    } catch (error) {
      next(error)
    }
  }

  static async view(req: Request, res: Response, next: NextFunction) {
    try {
      const document = await DocumentService.findById(req.params.id)
      if (!document) throw createHttpError(404, "Dokumen tidak ditemukan")

      const filePath = DocumentService.getFilePath(document.filename)
      await access(filePath)
      res.sendFile(filePath, {
        headers: {
          "Content-Disposition": `inline; filename="${document.originalName}"`,
        },
      })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return next(createHttpError(404, "File tidak ditemukan"))
      }
      next(error)
    }
  }

  static async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file
      if (!file) {
        throw createHttpError(400, "File diperlukan")
      }

      const { title, category, description, uploader, patientId, medicalRecordId, labOrderId, insuranceClaimId } = req.body
      if (!title || typeof title !== "string" || !title.trim()) {
        await cleanupUploadedFile(file)
        throw createHttpError(400, "Judul dokumen diperlukan")
      }

      if (!isValidCategory(category)) {
        await cleanupUploadedFile(file)
        throw createHttpError(400, "Kategori dokumen tidak valid")
      }

      const document = await DocumentService.create({
        title: title.trim(),
        category,
        description: typeof description === "string" ? description.trim() : undefined,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploader: typeof uploader === "string" ? uploader.trim() : undefined,
        patientId: typeof patientId === "string" ? patientId.trim() : undefined,
        medicalRecordId: typeof medicalRecordId === "string" ? medicalRecordId.trim() : undefined,
        labOrderId: typeof labOrderId === "string" ? labOrderId.trim() : undefined,
        insuranceClaimId: typeof insuranceClaimId === "string" ? insuranceClaimId.trim() : undefined,
      })

      sendSuccess(res, document, 201)
    } catch (error) {
      next(error)
    }
  }

  static async download(req: Request, res: Response, next: NextFunction) {
    try {
      const document = await DocumentService.findById(req.params.id)
      if (!document) throw createHttpError(404, "Dokumen tidak ditemukan")

      const filePath = DocumentService.getFilePath(document.filename)
      await access(filePath)
      res.download(filePath, document.originalName)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return next(createHttpError(404, "File tidak ditemukan"))
      }
      next(error)
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const deleted = await DocumentService.delete(req.params.id)
      if (!deleted) throw createHttpError(404, "Dokumen tidak ditemukan")
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }
}
