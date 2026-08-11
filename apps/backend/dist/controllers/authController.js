"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const appConfig_1 = require("../config/appConfig");
const logger_1 = require("../config/logger");
const auth_1 = require("../middlewares/auth");
const authService_1 = require("../services/authService");
const notificationService_1 = require("../services/notificationService");
const utils_1 = require("../utils");
const apiResponse_1 = require("../utils/apiResponse");
const httpError_1 = require("../utils/httpError");
function isBcryptHash(value) {
    return /^\$2[aby]\$\d{2}\$/.test(value);
}
class AuthController {
    static async login(req, res, next) {
        const { username, password } = req.body;
        const identifier = username.trim();
        try {
            const found = await authService_1.AuthService.findUserByLogin(identifier);
            if (!found) {
                (0, logger_1.warn)(`Login failed for username/email: '${identifier}'. User not found.`);
                throw (0, httpError_1.createHttpError)(401, "Username atau password salah.");
            }
            const passwordMatch = isBcryptHash(found.password)
                ? await bcryptjs_1.default.compare(password, found.password)
                : password === found.password;
            if (!passwordMatch) {
                (0, logger_1.warn)(`Login failed for username/email: '${identifier}'. Incorrect password.`);
                throw (0, httpError_1.createHttpError)(401, "Username atau password salah.");
            }
            if (!isBcryptHash(found.password)) {
                const hashedPassword = await bcryptjs_1.default.hash(password, 10);
                await authService_1.AuthService.updateUserPassword(found.id, hashedPassword);
            }
            const token = (0, auth_1.signAuthToken)(found);
            (0, auth_1.setAuthCookie)(res, token);
            return (0, apiResponse_1.sendSuccess)(res, { user: (0, utils_1.sanitizeUser)(found) });
        }
        catch (error) {
            next(error);
        }
    }
    static async register(req, res, next) {
        const { username, password, name, email } = req.body;
        try {
            const exists = await authService_1.AuthService.userExists(username, email);
            if (exists) {
                throw (0, httpError_1.createHttpError)(409, "Username atau email sudah terdaftar");
            }
            const id = (0, utils_1.generateId)();
            const createdAt = (0, utils_1.now)();
            const hashedPassword = await bcryptjs_1.default.hash(password, 10);
            const newUser = { id, username, password: hashedPassword, name, email, role: "umum", createdAt };
            await authService_1.AuthService.createUser(newUser);
            const token = (0, auth_1.signAuthToken)(newUser);
            (0, auth_1.setAuthCookie)(res, token);
            return (0, apiResponse_1.sendSuccess)(res, { user: (0, utils_1.sanitizeUser)(newUser) }, 201);
        }
        catch (error) {
            next(error);
        }
    }
    static async requestPasswordReset(req, res, next) {
        const { email } = req.body;
        try {
            const userRow = await authService_1.AuthService.findUserByEmail(email);
            if (!userRow) {
                return (0, apiResponse_1.sendSuccess)(res, { message: "Jika email terdaftar, instruksi reset password akan dibuat." }, 201);
            }
            const payload = await authService_1.AuthService.createPasswordResetRequest(userRow);
            try {
                await notificationService_1.NotificationService.sendPasswordReset(userRow.email, payload.token);
            }
            catch {
                (0, logger_1.warn)(`Password reset email could not be delivered to '${userRow.email}'.`);
                if (appConfig_1.NODE_ENV === "production") {
                    throw (0, httpError_1.createHttpError)(503, "Instruksi reset belum dapat dikirim. Silakan hubungi administrator klinik.");
                }
            }
            return (0, apiResponse_1.sendSuccess)(res, {
                message: "Instruksi reset password telah dibuat.",
                ...(appConfig_1.NODE_ENV !== "production" ? { devToken: payload.token } : {}),
            }, 201);
        }
        catch (error) {
            next(error);
        }
    }
    static async resetPassword(req, res, next) {
        const { token, password } = req.body;
        try {
            const request = await authService_1.AuthService.getValidPasswordResetRequest(token);
            if (!request) {
                throw (0, httpError_1.createHttpError)(400, "Token tidak valid atau sudah digunakan");
            }
            const hashedPassword = await bcryptjs_1.default.hash(password, 10);
            await authService_1.AuthService.updateUserPassword(request.userId, hashedPassword);
            await authService_1.AuthService.markPasswordResetRequestUsed(request.id);
            return (0, apiResponse_1.sendSuccess)(res, { success: true });
        }
        catch (error) {
            next(error);
        }
    }
    static async changePassword(req, res, next) {
        const { currentPassword, newPassword } = req.body;
        try {
            if (!req.user) {
                throw (0, httpError_1.createHttpError)(401, "Token akses diperlukan");
            }
            const found = await authService_1.AuthService.findUserById(req.user.id);
            if (!found) {
                throw (0, httpError_1.createHttpError)(404, "Pengguna tidak ditemukan");
            }
            const passwordMatch = isBcryptHash(found.password)
                ? await bcryptjs_1.default.compare(currentPassword, found.password)
                : currentPassword === found.password;
            if (!passwordMatch) {
                throw (0, httpError_1.createHttpError)(400, "Password saat ini tidak sesuai");
            }
            const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
            await authService_1.AuthService.updateUserPassword(found.id, hashedPassword);
            (0, auth_1.clearAuthCookie)(res);
            return (0, apiResponse_1.sendSuccess)(res, { message: "Password berhasil diubah" });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Mengembalikan profil pengguna dari sesi aktif. Dipakai klien (terutama
     * aplikasi Flutter) untuk memulihkan sesi saat start-up: bila token yang
     * tersimpan sudah kedaluwarsa, requireAuth akan menolak dengan 401.
     */
    static async me(req, res, next) {
        try {
            if (!req.user) {
                throw (0, httpError_1.createHttpError)(401, "Token akses diperlukan");
            }
            const found = await authService_1.AuthService.findUserById(req.user.id);
            if (!found) {
                throw (0, httpError_1.createHttpError)(404, "Pengguna tidak ditemukan");
            }
            return (0, apiResponse_1.sendSuccess)(res, { user: (0, utils_1.sanitizeUser)(found) });
        }
        catch (error) {
            next(error);
        }
    }
    static logout(req, res) {
        (0, auth_1.clearAuthCookie)(res);
        return res.status(204).send();
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=authController.js.map