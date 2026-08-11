"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentController = void 0;
const promises_1 = require("fs/promises");
const logger_1 = require("../config/logger");
const documentService_1 = require("../services/documentService");
const apiResponse_1 = require("../utils/apiResponse");
const httpError_1 = require("../utils/httpError");
const DOCUMENT_CATEGORIES = [
    "laporan-barang-masuk",
    "berita-surat-masuk",
    "komunikasi-antar-unit",
    "lainnya",
];
function isValidCategory(value) {
    return typeof value === "string" && DOCUMENT_CATEGORIES.includes(value);
}
async function cleanupUploadedFile(file) {
    if (!file)
        return;
    try {
        await (0, promises_1.unlink)(file.path);
    }
    catch (error) {
        if (error.code !== "ENOENT") {
            (0, logger_1.warn)("Gagal membersihkan file upload yang ditolak", {
                file: file.filename,
                error: error?.message ?? error,
            });
        }
    }
}
class DocumentController {
    static async list(req, res, next) {
        try {
            let documents = await documentService_1.DocumentService.list();
            const { category } = req.query;
            if (typeof category === "string" && isValidCategory(category)) {
                documents = documents.filter((doc) => doc.category === category);
            }
            (0, apiResponse_1.sendSuccess)(res, documents);
        }
        catch (error) {
            next(error);
        }
    }
    static async getOne(req, res, next) {
        try {
            const document = await documentService_1.DocumentService.findById(req.params.id);
            if (!document)
                throw (0, httpError_1.createHttpError)(404, "Dokumen tidak ditemukan");
            (0, apiResponse_1.sendSuccess)(res, document);
        }
        catch (error) {
            next(error);
        }
    }
    static async view(req, res, next) {
        try {
            const document = await documentService_1.DocumentService.findById(req.params.id);
            if (!document)
                throw (0, httpError_1.createHttpError)(404, "Dokumen tidak ditemukan");
            const filePath = documentService_1.DocumentService.getFilePath(document.filename);
            await (0, promises_1.access)(filePath);
            res.sendFile(filePath, {
                headers: {
                    "Content-Disposition": `inline; filename="${document.originalName}"`,
                },
            });
        }
        catch (error) {
            if (error.code === "ENOENT") {
                return next((0, httpError_1.createHttpError)(404, "File tidak ditemukan"));
            }
            next(error);
        }
    }
    static async upload(req, res, next) {
        try {
            const file = req.file;
            if (!file) {
                throw (0, httpError_1.createHttpError)(400, "File diperlukan");
            }
            const { title, category, description, uploader, patientId, medicalRecordId, labOrderId, insuranceClaimId } = req.body;
            if (!title || typeof title !== "string" || !title.trim()) {
                await cleanupUploadedFile(file);
                throw (0, httpError_1.createHttpError)(400, "Judul dokumen diperlukan");
            }
            if (!isValidCategory(category)) {
                await cleanupUploadedFile(file);
                throw (0, httpError_1.createHttpError)(400, "Kategori dokumen tidak valid");
            }
            const document = await documentService_1.DocumentService.create({
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
            });
            (0, apiResponse_1.sendSuccess)(res, document, 201);
        }
        catch (error) {
            next(error);
        }
    }
    static async download(req, res, next) {
        try {
            const document = await documentService_1.DocumentService.findById(req.params.id);
            if (!document)
                throw (0, httpError_1.createHttpError)(404, "Dokumen tidak ditemukan");
            const filePath = documentService_1.DocumentService.getFilePath(document.filename);
            await (0, promises_1.access)(filePath);
            res.download(filePath, document.originalName);
        }
        catch (error) {
            if (error.code === "ENOENT") {
                return next((0, httpError_1.createHttpError)(404, "File tidak ditemukan"));
            }
            next(error);
        }
    }
    static async delete(req, res, next) {
        try {
            const deleted = await documentService_1.DocumentService.delete(req.params.id);
            if (!deleted)
                throw (0, httpError_1.createHttpError)(404, "Dokumen tidak ditemukan");
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    }
}
exports.DocumentController = DocumentController;
//# sourceMappingURL=documentController.js.map