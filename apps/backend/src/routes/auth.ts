import { Router } from "express";
import { body } from "express-validator";
import { AuthController } from "../controllers/authController";
import { requireAuth } from "../middlewares/auth";
import { validate } from "../middlewares/validate";

export const authRouter = Router()

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login pengguna
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login sukses }
 *       400: { description: Data tidak valid }
 *       401: { description: Kredensial tidak valid }
 */
authRouter.post(
  "/login",
  validate([body("username").isString().trim().notEmpty(), body("password").isString().notEmpty()]),
  AuthController.login
)

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Registrasi pengguna baru
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string }
 *               password: { type: string }
 *               name: { type: string }
 *               email: { type: string }
 *     responses:
 *       201: { description: Registrasi sukses }
 *       400: { description: Data tidak valid }
 *       409: { description: Username/email sudah terdaftar }
 */
authRouter.post(
  "/register",
  validate([
    body("username").isString().trim().notEmpty(),
    body("password").isString().isLength({ min: 6 }),
    body("name").isString().trim().notEmpty(),
    body("email").isEmail(),
  ]),
  AuthController.register
)

/**
 * @openapi
 * /auth/request-password-reset:
 *   post:
 *     tags: [Auth]
 *     summary: Minta token reset password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *     responses:
 *       201: { description: Token dibuat }
 *       400: { description: Data tidak valid }
 *       404: { description: Email tidak ditemukan }
 */
authRouter.post(
  "/request-password-reset",
  validate([body("email").isEmail()]),
  AuthController.requestPasswordReset
)

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password dengan token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Password berhasil direset }
 *       400: { description: Data atau token tidak valid }
 */
authRouter.post(
  "/reset-password",
  validate([body("token").isString().trim().notEmpty(), body("password").isString().isLength({ min: 6 })]),
  AuthController.resetPassword
)

authRouter.post(
  "/change-password",
  requireAuth,
  validate([body("currentPassword").isString().notEmpty(), body("newPassword").isString().isLength({ min: 6 })]),
  AuthController.changePassword
)

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Profil pengguna dari sesi aktif
 *     responses:
 *       200: { description: Profil pengguna }
 *       401: { description: Sesi tidak valid atau kedaluwarsa }
 */
authRouter.get("/me", requireAuth, AuthController.me)

authRouter.post("/logout", AuthController.logout)
