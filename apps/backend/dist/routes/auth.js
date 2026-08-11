"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
exports.authRouter = (0, express_1.Router)();
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
exports.authRouter.post("/login", (0, validate_1.validate)([(0, express_validator_1.body)("username").isString().trim().notEmpty(), (0, express_validator_1.body)("password").isString().notEmpty()]), authController_1.AuthController.login);
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
exports.authRouter.post("/register", (0, validate_1.validate)([
    (0, express_validator_1.body)("username").isString().trim().notEmpty(),
    (0, express_validator_1.body)("password").isString().isLength({ min: 6 }),
    (0, express_validator_1.body)("name").isString().trim().notEmpty(),
    (0, express_validator_1.body)("email").isEmail(),
]), authController_1.AuthController.register);
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
exports.authRouter.post("/request-password-reset", (0, validate_1.validate)([(0, express_validator_1.body)("email").isEmail()]), authController_1.AuthController.requestPasswordReset);
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
exports.authRouter.post("/reset-password", (0, validate_1.validate)([(0, express_validator_1.body)("token").isString().trim().notEmpty(), (0, express_validator_1.body)("password").isString().isLength({ min: 6 })]), authController_1.AuthController.resetPassword);
exports.authRouter.post("/change-password", auth_1.requireAuth, (0, validate_1.validate)([(0, express_validator_1.body)("currentPassword").isString().notEmpty(), (0, express_validator_1.body)("newPassword").isString().isLength({ min: 6 })]), authController_1.AuthController.changePassword);
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
exports.authRouter.get("/me", auth_1.requireAuth, authController_1.AuthController.me);
exports.authRouter.post("/logout", authController_1.AuthController.logout);
//# sourceMappingURL=auth.js.map