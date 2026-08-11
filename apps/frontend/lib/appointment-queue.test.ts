import { describe, expect, it } from "vitest"
import { isCarriedOverAppointment, shouldShowAppointmentOnDate } from "./appointment-queue"

describe("shouldShowAppointmentOnDate", () => {
  const selectedDate = "2026-07-20"

  it("menampilkan seluruh antrean pada tanggal yang dipilih", () => {
    expect(shouldShowAppointmentOnDate({ date: selectedDate, status: "Selesai" }, selectedDate)).toBe(true)
    expect(shouldShowAppointmentOnDate({ date: selectedDate, status: "Batal" }, selectedDate)).toBe(true)
  })

  it.each(["Menunggu", "Dipanggil", "Diperiksa"] as const)(
    "membawa antrean lama berstatus %s ke tanggal baru",
    (status) => {
      const appointment = { date: "2026-07-19", status }

      expect(shouldShowAppointmentOnDate(appointment, selectedDate)).toBe(true)
      expect(isCarriedOverAppointment(appointment, selectedDate)).toBe(true)
    },
  )

  it("tidak membawa antrean lama yang sudah selesai atau batal", () => {
    expect(shouldShowAppointmentOnDate({ date: "2026-07-19", status: "Selesai" }, selectedDate)).toBe(false)
    expect(shouldShowAppointmentOnDate({ date: "2026-07-19", status: "Batal" }, selectedDate)).toBe(false)
  })

  it("tidak menampilkan antrean dari tanggal yang akan datang", () => {
    expect(shouldShowAppointmentOnDate({ date: "2026-07-21", status: "Menunggu" }, selectedDate)).toBe(false)
  })

  it("mendukung tanggal dengan komponen waktu", () => {
    expect(
      shouldShowAppointmentOnDate({ date: "2026-07-19T23:00:00.000Z", status: "Menunggu" }, selectedDate),
    ).toBe(true)
  })
})
