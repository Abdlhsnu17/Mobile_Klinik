import type { Server as HttpServer } from "http"
import { Server as SocketServer } from "socket.io"
import { AUTH_COOKIE_NAME, FRONTEND_ORIGINS } from "../config/appConfig"
import { parseCookie, verifyAuthToken, type AuthTokenPayload } from "../middlewares/auth"

export type QueueChange = {
  action: "created" | "updated" | "deleted"
  appointmentId: string
  occurredAt: string
}

type HandshakeLike = {
  auth?: { token?: unknown }
  headers: { cookie?: string }
}

let io: SocketServer | null = null

/**
 * Memvalidasi handshake Socket.IO menggunakan JWT dari bearer token maupun
 * cookie auth. Fungsi murni (tanpa efek samping) agar mudah diuji.
 * Melempar Error dengan pesan yang aman untuk dikirim ke klien saat gagal.
 */
export function authenticateHandshake(handshake: HandshakeLike): AuthTokenPayload {
  const bearer = typeof handshake.auth?.token === "string" ? handshake.auth.token : undefined
  const token = bearer || parseCookie(handshake.headers.cookie, AUTH_COOKIE_NAME)
  if (!token) throw new Error("Otentikasi realtime diperlukan.")

  try {
    return verifyAuthToken(token)
  } catch {
    throw new Error("Sesi realtime tidak valid atau kedaluwarsa.")
  }
}

export function setupRealtimeServer(server: HttpServer) {
  io = new SocketServer(server, {
    path: "/socket.io",
    cors: { origin: FRONTEND_ORIGINS, credentials: true },
  })

  io.use((socket, next) => {
    try {
      socket.data.user = authenticateHandshake(socket.handshake)
      next()
    } catch (error) {
      next(error as Error)
    }
  })

  io.on("connection", (socket) => {
    socket.join("queue")
  })
}

export function publishQueueChange(change: QueueChange) {
  io?.to("queue").emit("queue:changed", change)
}
