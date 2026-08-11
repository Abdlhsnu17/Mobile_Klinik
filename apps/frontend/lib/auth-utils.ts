import { buildApiBaseUrl } from "./api-base";
import type { SafeUser, User } from "./auth-types";
import { getApiPayloadMessage, getFriendlyApiErrorMessage, logClientError } from "./client-error";

const CURRENT_USER_KEY = "clinic_current_user"
const SESSION_UPDATED_AT_KEY = "clinic_session_updated_at"
export const AUTH_SESSION_CHANGED_EVENT = "clinic:auth-session-changed"
const API_BASE = buildApiBaseUrl(process.env.NEXT_PUBLIC_API_URL)

export function getAuthToken(): string | null {
  return null
}

type RequestBody = Record<string, unknown> | unknown[]
type RequestOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | RequestBody | null
}

function shouldSerializeBody(body: RequestOptions["body"]): body is RequestBody {
  if (body == null) return false
  if (typeof body === "string") return false
  if (body instanceof FormData) return false
  if (body instanceof URLSearchParams) return false
  if (body instanceof Blob) return false
  if (body instanceof ArrayBuffer) return false
  if (ArrayBuffer.isView(body)) return false
  return true
}

function sanitizeUser(user: User): SafeUser {
  const { password, ...rest } = user
  return rest
}

function isExpectedAuthRejection(path: string, status: number): boolean {
  return path.startsWith("/auth/") && [400, 401, 404, 409].includes(status)
}

type ApiEnvelope<T> = {
  data: T
  meta?: Record<string, unknown>
  requestId?: string
}

function isApiEnvelope<T>(payload: unknown): payload is ApiEnvelope<T> {
  if (!payload || typeof payload !== "object") return false
  return Object.prototype.hasOwnProperty.call(payload, "data")
}

async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
  const method = init.method ?? "GET"
  const requestStartedAt = Date.now()
  const headers = new Headers(init.headers);

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (init.body instanceof FormData) {
    headers.delete("Content-Type");
  }

  const body = shouldSerializeBody(init.body) ? JSON.stringify(init.body) : init.body;

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      body,
      credentials: "include",
    })
  } catch (error) {
    logClientError(error, { module: "auth", action: "network request", method, path })
    throw new Error("Tidak dapat terhubung ke server backend. Periksa koneksi Anda lalu coba lagi.")
  }

  const contentType = response.headers.get("content-type") ?? ""
  const isJson = contentType.includes("application/json")
  let payload: unknown = null

  if (isJson) {
    try {
      payload = await response.json()
    } catch (error) {
      logClientError(error, {
        module: "auth",
        action: "parse response",
        method,
        path,
        status: response.status,
      })
      throw new Error("Respons server tidak dapat dibaca. Coba lagi beberapa saat.")
    }
  }

  if (!response.ok) {
    if (response.status === 401) clearLocalSessionForRequest(requestStartedAt)
    const payloadMessage = getApiPayloadMessage(payload)

    const message = getFriendlyApiErrorMessage({
      method,
      path,
      status: response.status,
      payloadMessage,
      fallbackMessage: "Permintaan autentikasi ditolak server.",
    })

    if (isExpectedAuthRejection(path, response.status)) {
      throw new Error(message)
    }

    logClientError(new Error(message), {
      module: "auth",
      action: "backend response",
      method,
      path,
      status: response.status,
    })
    throw new Error(message)
  }

  if (isApiEnvelope<T>(payload)) {
    return payload.data
  }

  return payload as T
}

export type RegisterPayload = {
  username: string
  password: string
  name: string
  email: string
  role?: User["role"]
}

export type UpdateUserPayload = Partial<RegisterPayload>

export async function login(username: string, password: string): Promise<SafeUser> {
  const { user } = await request<{ user: User }>("/auth/login", {
    method: "POST",
    body: { username: username.trim(), password },
  })
  const safeUser = sanitizeUser(user)
  setLocalSession(safeUser)
  return safeUser
}

function emitSessionChanged(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT))
}

function getSessionUpdatedAt(): number {
  if (typeof window === "undefined") return 0
  const value = Number(localStorage.getItem(SESSION_UPDATED_AT_KEY))
  return Number.isFinite(value) ? value : 0
}

function setLocalSession(user: SafeUser): void {
  if (typeof window === "undefined") return
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
  localStorage.setItem(SESSION_UPDATED_AT_KEY, String(Date.now()))
  emitSessionChanged()
}

function clearLocalSession(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(CURRENT_USER_KEY)
  localStorage.setItem(SESSION_UPDATED_AT_KEY, String(Date.now()))
  emitSessionChanged()
}

export function clearLocalSessionForRequest(requestStartedAt: number): boolean {
  if (typeof window === "undefined") return false
  if (getSessionUpdatedAt() > requestStartedAt) return false
  clearLocalSession()
  return true
}

export function logout(): void {
  clearLocalSession()
  void fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    credentials: "include",
  }).catch(() => undefined)

  // Full redirect (bukan router.push) agar semua state client-side ikut dibersihkan.
  if (typeof window !== "undefined") {
    window.location.href = "/login"
  }
}

export function getCurrentUser(): SafeUser | null {
  if (typeof window === "undefined") return null
  const user = localStorage.getItem(CURRENT_USER_KEY)
  return user ? (JSON.parse(user) as SafeUser) : null
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null
}

export function hasRole(allowedRoles: SafeUser["role"][]): boolean {
  const user = getCurrentUser()
  if (!user) return false
  if (user.role === "admin") return true
  return allowedRoles.includes(user.role)
}

export function hasAdminAccess(user: Pick<SafeUser, "role"> | null | undefined): boolean {
  return user?.role === "admin"
}

export async function registerUser(payload: RegisterPayload): Promise<SafeUser> {
  const { user } = await request<{ user: User }>("/auth/register", {
    method: "POST",
    body: payload,
  })
  return sanitizeUser(user)
}

export async function requestPasswordReset(
  email: string
): Promise<{ devToken?: string; message?: string }> {
  return request("/auth/request-password-reset", {
    method: "POST",
    body: { email: email.trim() },
  })
}

export async function resetPassword(
  token: string,
  password: string
): Promise<{ success: true; message?: string }> {
  return request("/auth/reset-password", {
    method: "POST",
    body: { token: token.trim(), password },
  })
}

export async function fetchUsers(): Promise<SafeUser[]> {
  const users = await request<User[]>("/users")
  return users.map(sanitizeUser)
}

export async function createUser(payload: RegisterPayload): Promise<SafeUser> {
  const user = await request<User>("/users", {
    method: "POST",
    body: payload,
  })
  return sanitizeUser(user)
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<SafeUser> {
  const user = await request<User>(`/users/${id}`, {
    method: "PUT",
    body: payload,
  })
  const safeUser = sanitizeUser(user)

  if (getCurrentUser()?.id === id) {
    setLocalSession(safeUser)
  }

  return safeUser
}

export async function deleteUser(id: string): Promise<void> {
  await request(`/users/${id}`, {
    method: "DELETE",
  })
}

export async function changeUserPassword(payload: {
  currentPassword: string
  newPassword: string
}): Promise<{ message: string }> {
  return request("/auth/change-password", {
    method: "POST",
    body: payload,
  })
}

export async function updateUserAvatar(formData: FormData): Promise<SafeUser> {
  const { user } = await request<{ user: User }>("/users/avatar", {
    method: "POST",
    body: formData,
  })
  const safeUser = sanitizeUser(user)
  setLocalSession(safeUser)
  return safeUser
}
