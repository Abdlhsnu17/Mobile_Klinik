import { io, type Socket } from "socket.io-client"
import { buildApiBaseUrl } from "./api-base"
import { getAuthToken } from "./auth-utils"

type QueueChange = {
  action: "created" | "updated" | "deleted"
  appointmentId: string
  occurredAt: string
}

let socket: Socket | null = null

function realtimeOrigin() {
  const configured = process.env.NEXT_PUBLIC_REALTIME_URL
  if (configured) return configured.replace(/\/$/, "")
  const apiBase = buildApiBaseUrl(process.env.NEXT_PUBLIC_API_URL)
  if (/^https?:\/\//.test(apiBase)) return new URL(apiBase).origin
  return typeof window === "undefined" ? "" : window.location.origin
}

function queueSocket() {
  if (!socket) {
    socket = io(realtimeOrigin(), {
      path: "/socket.io",
      withCredentials: true,
      auth: { token: getAuthToken() },
      transports: ["websocket", "polling"],
    })
  }
  return socket
}

export function subscribeToQueueChanges(listener: (change: QueueChange) => void) {
  const currentSocket = queueSocket()
  currentSocket.on("queue:changed", listener)
  return () => {
    currentSocket.off("queue:changed", listener)
  }
}
