import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import {
    AUTH_COOKIE_MAX_AGE_MS,
    AUTH_COOKIE_NAME,
    JWT_EXPIRES_IN,
    JWT_SECRET,
    NODE_ENV,
} from "../config/appConfig";
import type { User } from "../types";
import { createHttpError } from "../utils/httpError";

export interface AuthTokenPayload {
  id: string
  username: string
  role: User["role"]
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload
    }
  }
}

export function signAuthToken(user: Pick<User, "id" | "username" | "role">): string {
  const payload: AuthTokenPayload = { id: user.id, username: user.username, role: user.role }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions)
}

export function parseCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined
  const match = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined
}

/**
 * Memverifikasi token JWT dan mengembalikan payload terautentikasi.
 * Melempar jwt.TokenExpiredError / jwt.JsonWebTokenError bila token tidak valid.
 */
export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AuthTokenPayload
}

const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: NODE_ENV === "production",
  path: "/",
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...authCookieOptions,
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  })
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, authCookieOptions)
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const bearerToken = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined
  const token = bearerToken || parseCookie(req.headers.cookie, AUTH_COOKIE_NAME)
  if (!token) {
    throw createHttpError(401, "Token akses diperlukan")
  }

  try {
    req.user = verifyAuthToken(token)
    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(createHttpError(401, "Sesi Anda telah berakhir, silakan login kembali."))
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(createHttpError(401, "Token akses tidak valid."))
    }
    // Menangani error tak terduga lainnya
    return next(createHttpError(401, "Otentikasi gagal karena error server."))
  }
}

export function requireRole(...roles: User["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || (req.user.role !== "admin" && !roles.includes(req.user.role))) {
      throw createHttpError(403, "Anda tidak memiliki akses untuk aksi ini")
    }
    next()
  }
}

export function requireOwnershipOrRole(...roles: User["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const idFromParams = req.params.id;

    if (!user) {
      // This should not happen if requireAuth is used before this middleware
      throw createHttpError(401, "Otentikasi diperlukan");
    }

    // Allow if user is updating their own profile
    if (user.id === idFromParams) {
      return next();
    }

    // Allow if user has one of the required roles (admin is implicitly allowed)
    if (user.role !== "admin" && !roles.includes(user.role)) {
      throw createHttpError(403, "Anda tidak memiliki akses untuk aksi ini");
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
export function sanitizeRequestParams(req: Request, res: Response, next: NextFunction) {
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
