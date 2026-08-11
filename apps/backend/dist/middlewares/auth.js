"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAuthToken = signAuthToken;
exports.parseCookie = parseCookie;
exports.verifyAuthToken = verifyAuthToken;
exports.setAuthCookie = setAuthCookie;
exports.clearAuthCookie = clearAuthCookie;
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
exports.requireOwnershipOrRole = requireOwnershipOrRole;
exports.sanitizeRequestParams = sanitizeRequestParams;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const appConfig_1 = require("../config/appConfig");
const httpError_1 = require("../utils/httpError");
function signAuthToken(user) {
    const payload = { id: user.id, username: user.username, role: user.role };
    return jsonwebtoken_1.default.sign(payload, appConfig_1.JWT_SECRET, { expiresIn: appConfig_1.JWT_EXPIRES_IN });
}
function parseCookie(header, name) {
    if (!header)
        return undefined;
    const match = header
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}
/**
 * Memverifikasi token JWT dan mengembalikan payload terautentikasi.
 * Melempar jwt.TokenExpiredError / jwt.JsonWebTokenError bila token tidak valid.
 */
function verifyAuthToken(token) {
    return jsonwebtoken_1.default.verify(token, appConfig_1.JWT_SECRET);
}
const authCookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: appConfig_1.NODE_ENV === "production",
    path: "/",
};
function setAuthCookie(res, token) {
    res.cookie(appConfig_1.AUTH_COOKIE_NAME, token, {
        ...authCookieOptions,
        maxAge: appConfig_1.AUTH_COOKIE_MAX_AGE_MS,
    });
}
function clearAuthCookie(res) {
    res.clearCookie(appConfig_1.AUTH_COOKIE_NAME, authCookieOptions);
}
function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    const bearerToken = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
    const token = bearerToken || parseCookie(req.headers.cookie, appConfig_1.AUTH_COOKIE_NAME);
    if (!token) {
        throw (0, httpError_1.createHttpError)(401, "Token akses diperlukan");
    }
    try {
        req.user = verifyAuthToken(token);
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return next((0, httpError_1.createHttpError)(401, "Sesi Anda telah berakhir, silakan login kembali."));
        }
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return next((0, httpError_1.createHttpError)(401, "Token akses tidak valid."));
        }
        // Menangani error tak terduga lainnya
        return next((0, httpError_1.createHttpError)(401, "Otentikasi gagal karena error server."));
    }
}
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || (req.user.role !== "admin" && !roles.includes(req.user.role))) {
            throw (0, httpError_1.createHttpError)(403, "Anda tidak memiliki akses untuk aksi ini");
        }
        next();
    };
}
function requireOwnershipOrRole(...roles) {
    return (req, res, next) => {
        const user = req.user;
        const idFromParams = req.params.id;
        if (!user) {
            // This should not happen if requireAuth is used before this middleware
            throw (0, httpError_1.createHttpError)(401, "Otentikasi diperlukan");
        }
        // Allow if user is updating their own profile
        if (user.id === idFromParams) {
            return next();
        }
        // Allow if user has one of the required roles (admin is implicitly allowed)
        if (user.role !== "admin" && !roles.includes(user.role)) {
            throw (0, httpError_1.createHttpError)(403, "Anda tidak memiliki akses untuk aksi ini");
        }
        next();
    };
}
/**
 * Middleware untuk membersihkan parameter request.
 * Ini adalah langkah pertahanan untuk membersihkan parameter route yang mungkin
 * secara tidak sengaja digabungkan dengan query string oleh kesalahan di sisi klien.
 *
 * Contoh: Jika route didefinisikan sebagai `/api/data/:collection` dan klien
 * mengirim request ke `/api/data/services?category=lab`, middleware ini memastikan
 * `req.params.collection` akan menjadi "services", bukan "services?category=lab".
 */
function sanitizeRequestParams(req, res, next) {
    if (req.params) {
        for (const key in req.params) {
            const value = req.params[key];
            if (typeof value === 'string' && value.includes('?')) {
                req.params[key] = value.split('?')[0];
            }
        }
    }
    next();
}
//# sourceMappingURL=auth.js.map