"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const collectionService_1 = require("./collectionService");
const utils_1 = require("../utils");
const UPLOADS_DIR = path_1.default.resolve(__dirname, "..", "..", "uploads");
fs_1.default.mkdirSync(UPLOADS_DIR, { recursive: true });
class DocumentService {
    static async list() {
        return collectionService_1.CollectionService.list(this.collection);
    }
    static async findById(id) {
        return collectionService_1.CollectionService.findById(this.collection, id);
    }
    static async create(payload) {
        const normalized = {
            ...payload,
            uploadedAt: payload.uploadedAt ?? (0, utils_1.now)(),
            updatedAt: (0, utils_1.now)(),
        };
        return collectionService_1.CollectionService.createItem(this.collection, normalized);
    }
    static async delete(id) {
        const document = await this.findById(id);
        if (!document)
            return false;
        const filePath = this.getFilePath(document.filename);
        try {
            await fs_1.default.promises.unlink(filePath);
        }
        catch (error) {
            if (error.code !== "ENOENT") {
                throw error;
            }
        }
        return collectionService_1.CollectionService.deleteItem(this.collection, id);
    }
    static getFilePath(filename) {
        return path_1.default.join(UPLOADS_DIR, filename);
    }
}
exports.DocumentService = DocumentService;
DocumentService.collection = "documents";
//# sourceMappingURL=documentService.js.map