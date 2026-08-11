import bcrypt from "bcryptjs"
import type { NextFunction, Request, Response } from "express"
import { NODE_ENV } from "../config/appConfig"
import { warn as logWarn } from "../config/logger"
import { clearAuthCookie, setAuthCookie, signAuthToken } from "../middlewares/auth"
import { AuthService } from "../services/authService"
import { NotificationService } from "../services/notificationService"
import type { User } from "../types"
import { generateId, now, sanitizeUser } from "../utils"
import { sendSuccess } from "../utils/apiResponse"
import { createHttpError } from "../utils/httpError"

function isBcryptHash(value: string) {
  return /^\$2[aby]\$\d{2}\$/.test(value)
}

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    const { username, password } = req.body as { username: string; password: string }
    const identifier = username.trim()

    try {
      const found = await AuthService.findUserByLogin(identifier)
      if (!found) {
        logWarn(`Login failed for username/email: '${identifier}'. User not found.`)
        throw createHttpError(401, "Username atau password salah.")
      }

      const passwordMatch = isBcryptHash(found.password)
        ? await bcrypt.compare(password, found.password)
        : password === found.password
      if (!passwordMatch) {
        logWarn(`Login failed for username/email: '${identifier}'. Incorrect password.`)
        throw createHttpError(401, "Username atau password salah.")
      }

      if (!isBcryptHash(found.password)) {
        const hashedPassword = await bcrypt.hash(password, 10)
        await AuthService.updateUserPassword(found.id, hashedPassword)
      }

      const token = signAuthToken(found)
      setAuthCookie(res, token)
      return sendSuccess(res, { user: sanitizeUser(found) })
    } catch (error) {
      next(error)
    }
  }

  static async register(req: Request, res: Response, next: NextFunction) {
    const { username, password, name, email } = req.body as Required<Pick<User, "username" | "password" | "name" | "email">>
    try {
      const exists = await AuthService.userExists(username, email)
      if (exists) {
        throw createHttpError(409, "Username atau email sudah terdaftar")
      }
      const id = generateId()
      const createdAt = now()
      const hashedPassword = await bcrypt.hash(password, 10)
      const newUser: User = { id, username, password: hashedPassword, name, email, role: "umum", createdAt }
      await AuthService.createUser(newUser)
      const token = signAuthToken(newUser)
      setAuthCookie(res, token)
      return sendSuccess(res, { user: sanitizeUser(newUser) }, 201)
    } catch (error) {
      next(error)
    }
  }

  static async requestPasswordReset(req: Request, res: Response, next: NextFunction) {
    const { email } = req.body as { email: string }
    try {
      const userRow = await AuthService.findUserByEmail(email)
      if (!userRow) {
        return sendSuccess(res, { message: "Jika email terdaftar, instruksi reset password akan dibuat." }, 201)
      }

      const payload = await AuthService.createPasswordResetRequest(userRow)
      try {
        await NotificationService.sendPasswordReset(userRow.email, payload.token)
      } catch {
        logWarn(`Password reset email could not be delivered to '${userRow.email}'.`)
        if (NODE_ENV === "production") {
          throw createHttpError(503, "Instruksi reset belum dapat dikirim. Silakan hubungi administrator klinik.")
        }
      }
      return sendSuccess(
        res,
        {
          message: "Instruksi reset password telah dibuat.",
          ...(NODE_ENV !== "production" ? { devToken: payload.token } : {}),
        },
        201,
      )
    } catch (error) {
      next(error)
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    const { token, password } = req.body as { token: string; password: string }
    try {
      const request = await AuthService.getValidPasswordResetRequest(token)
      if (!request) {
        throw createHttpError(400, "Token tidak valid atau sudah digunakan")
      }
      const hashedPassword = await bcrypt.hash(password, 10)
      await AuthService.updateUserPassword(request.userId, hashedPassword)
      await AuthService.markPasswordResetRequestUsed(request.id)
      return sendSuccess(res, { success: true })
    } catch (error) {
      next(error)
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string }

    try {
      if (!req.user) {
        throw createHttpError(401, "Token akses diperlukan")
      }

      const found = await AuthService.findUserById(req.user.id)
      if (!found) {
        throw createHttpError(404, "Pengguna tidak ditemukan")
      }

      const passwordMatch = isBcryptHash(found.password)
        ? await bcrypt.compare(currentPassword, found.password)
        : currentPassword === found.password

      if (!passwordMatch) {
        throw createHttpError(400, "Password saat ini tidak sesuai")
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10)
      await AuthService.updateUserPassword(found.id, hashedPassword)
      clearAuthCookie(res)
      return sendSuccess(res, { message: "Password berhasil diubah" })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Mengembalikan profil pengguna dari sesi aktif. Dipakai klien (terutama
   * aplikasi Flutter) untuk memulihkan sesi saat start-up: bila token yang
   * tersimpan sudah kedaluwarsa, requireAuth akan menolak dengan 401.
   */
  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw createHttpError(401, "Token akses diperlukan")
      }

      const found = await AuthService.findUserById(req.user.id)
      if (!found) {
        throw createHttpError(404, "Pengguna tidak ditemukan")
      }

      return sendSuccess(res, { user: sanitizeUser(found) })
    } catch (error) {
      next(error)
    }
  }

  static logout(req: Request, res: Response) {
    clearAuthCookie(res)
    return res.status(204).send()
  }
}
