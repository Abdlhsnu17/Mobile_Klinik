import { randomUUID } from "crypto"
import type { Appointment, User } from "../types"

export const now = () => new Date().toISOString()
export const generateId = () => randomUUID()

export function sanitizeUser(user: User) {
  const { password, ...safe } = user
  return safe
}

export function getNextQueueNumber(date: string, appointments: Appointment[]) {
  const filtered = appointments.filter((appt) => appt.date === date)
  if (filtered.length === 0) return 1
  const highest = Math.max(...filtered.map((appt) => appt.queueNumber || 0))
  return highest + 1
}
