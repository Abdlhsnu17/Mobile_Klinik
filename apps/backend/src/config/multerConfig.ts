import type { Request } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";

// Pastikan direktori uploads/avatars ada
const uploadDir = path.resolve(__dirname, "..", "..", "uploads", "avatars");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req: Request, file, cb) => {
    const userId = req.user?.id || "unknown-user";
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(file.originalname);
    cb(null, `${userId}-${uniqueSuffix}${extension}`);
  }
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (["image/jpeg", "image/png"].includes(file.mimetype)) {
    return cb(null, true);
  }
  cb(new Error("Tipe file tidak diizinkan. Hanya PNG atau JPG yang boleh diunggah."));
};

export const uploadAvatar = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});
