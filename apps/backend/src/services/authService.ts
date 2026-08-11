import db from "../config/mysqlClient";
import type { PasswordResetRequest, User } from "../types";
import { generateId, now } from "../utils";
import { createHttpError } from "../utils/httpError";

type CreateUserPayload = Pick<User, "username" | "password" | "name" | "email" | "role">
type UserProfileUpdatePayload = Partial<Pick<User, "name" | "email" | "role" | "password" | "avatarUrl">>

function toMysqlDatetime(value?: string) {
  return value
    ? new Date(value).toISOString().slice(0, 19).replace("T", " ")
    : new Date().toISOString().slice(0, 19).replace("T", " ")
}

export class AuthService {
  static async listUsers(): Promise<User[]> {
    const [rows] = await db.query("SELECT * FROM users ORDER BY createdAt DESC")
    return rows as User[]
  }

  static async findUserById(id: string): Promise<User | null> {
    const [rows] = await db.query("SELECT * FROM users WHERE id = ? LIMIT 1", [id])
    return ((rows as User[])[0] as User) || null
  }

  static async findUserByUsername(username: string): Promise<User | null> {
    const [rows] = await db.query("SELECT * FROM users WHERE username = ? LIMIT 1", [username])
    return ((rows as User[])[0] as User) || null
  }

  static async findUserByLogin(identifier: string): Promise<User | null> {
    const normalizedIdentifier = identifier.trim()
    const [rows] = await db.query("SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1", [
      normalizedIdentifier,
      normalizedIdentifier,
    ])
    return ((rows as User[])[0] as User) || null
  }

  static async findUserByEmail(email: string): Promise<User | null> {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email])
    return ((rows as User[])[0] as User) || null
  }

  static async userExists(username: string, email: string): Promise<boolean> {
    const [rows] = await db.query("SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1", [username, email])
    return (rows as any[]).length > 0
  }

  static async createUser(user: User): Promise<void> {
    await db.query(
      "INSERT INTO users (id, username, name, email, role, password, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [user.id, user.username, user.name, user.email, user.role, user.password, toMysqlDatetime(user.createdAt)]
    )
  }

  static async createUserWithPassword(payload: CreateUserPayload, hashedPassword: string): Promise<User> {
    const exists = await this.userExists(payload.username, payload.email)
    if (exists) {
      throw createHttpError(409, "Username atau email sudah terdaftar")
    }

    const user: User = {
      id: generateId(),
      username: payload.username,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      password: hashedPassword,
      createdAt: now(),
    }
    await this.createUser(user)
    return user
  }

  static async updateUser(userId: string, payload: UserProfileUpdatePayload): Promise<User | null> {
    const user = await this.findUserById(userId)
    if (!user) return null

    const validPayload: UserProfileUpdatePayload = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined)
    )

    const fieldsToUpdate = Object.keys(validPayload)

    if (fieldsToUpdate.length === 0) {
      return user
    }

    const setClauses = fieldsToUpdate.map((field) => `\`${field}\` = ?`).join(", ")
    const values = fieldsToUpdate.map((field) => validPayload[field as keyof UserProfileUpdatePayload])

    await db.query(`UPDATE users SET ${setClauses} WHERE id = ?`, [...values, userId])

    return { ...user, ...validPayload }
  }

  static async deleteUser(userId: string): Promise<boolean> {
    const existing = await this.findUserById(userId)
    if (!existing) return false
    await db.query("DELETE FROM users WHERE id = ?", [userId])
    return true
  }

  static async updateUserPassword(userId: string, password: string): Promise<void> {
    await db.query("UPDATE users SET password = ? WHERE id = ?", [password, userId])
  }

  static async createPasswordResetRequest(user: User): Promise<PasswordResetRequest> {
    const payload: PasswordResetRequest = {
      id: generateId(),
      userId: user.id,
      email: user.email,
      token: generateId().slice(0, 12),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      used: false,
      createdAt: now(),
    }
    await db.query(
      "INSERT INTO password_reset_requests (id, userId, email, token, expiresAt, used, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [payload.id, payload.userId, payload.email, payload.token, toMysqlDatetime(payload.expiresAt), payload.used, toMysqlDatetime(payload.createdAt)]
    )
    return payload
  }

  static async getValidPasswordResetRequest(token: string): Promise<PasswordResetRequest | null> {
    const [rows] = await db.query(
      "SELECT * FROM password_reset_requests WHERE token = ? AND used = 0 AND expiresAt > NOW() LIMIT 1",
      [token]
    )
    return ((rows as PasswordResetRequest[])[0] as PasswordResetRequest) || null
  }

  static async markPasswordResetRequestUsed(requestId: string): Promise<void> {
    await db.query("UPDATE password_reset_requests SET used = 1 WHERE id = ?", [requestId])
  }
}
