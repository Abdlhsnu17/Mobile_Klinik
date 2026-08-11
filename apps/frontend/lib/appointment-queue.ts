import type { Appointment } from "@/lib/auth-types"

const CARRY_OVER_STATUSES: Appointment["status"][] = [
  "Menunggu",
  "Dipanggil",
  "Diperiksa",
]

export const normalizeAppointmentDate = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}(?:$|\s)/.test(value)) return value.slice(0, 10)

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10)

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, "0")
  const day = String(parsed.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Antrean pada tanggal yang dipilih selalu ditampilkan. Antrean aktif dari
 * tanggal sebelumnya ikut ditampilkan supaya tidak hilang saat hari berganti.
 * Antrean selesai/batal tetap berada di riwayat tanggal asalnya.
 */
export const shouldShowAppointmentOnDate = (
  appointment: Pick<Appointment, "date" | "status">,
  selectedDate: string,
) => {
  const appointmentDate = normalizeAppointmentDate(appointment.date)

  return appointmentDate === selectedDate || (
    appointmentDate < selectedDate && CARRY_OVER_STATUSES.includes(appointment.status)
  )
}

export const isCarriedOverAppointment = (
  appointment: Pick<Appointment, "date" | "status">,
  selectedDate: string,
) => (
  normalizeAppointmentDate(appointment.date) < selectedDate &&
  CARRY_OVER_STATUSES.includes(appointment.status)
)
