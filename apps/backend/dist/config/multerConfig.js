"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAvatar = void 0;
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
// Pastikan direktori uploads/avatars ada
const uploadDir = path_1.default.resolve(__dirname, "..", "..", "uploads", "avatars");
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const userId = req.user?.id || "unknown-user";
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const extension = path_1.default.extname(file.originalname);
        cb(null, `${userId}-${uniqueSuffix}${extension}`);
    }
});
const fileFilter = (_req, file, cb) => {
    if (["image/jpeg", "image/png"].includes(file.mimetype)) {
        return cb(null, true);
    }
    cb(new Error("Tipe file tidak diizinkan. Hanya PNG atau JPG yang boleh diunggah."));
};
exports.uploadAvatar = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter,
});
//# sourceMappingURL=multerConfig.js.map