import { Router } from "express";
import { uploadAvatar } from "../config/multerConfig";
import * as userController from "../controllers/userController";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.post(
  "/avatar",
  requireAuth,
  uploadAvatar.single('avatar'),
  userController.updateAvatar
);

export default router;