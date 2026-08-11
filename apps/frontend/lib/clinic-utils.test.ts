import { describe, expect, it } from "vitest"
import { calculateAge, formatBytes, formatCurrency, updateMedicineStatus } from "./clinic-utils"

describe("formatCurrency", () => {
  it("memformat angka sebagai Rupiah tanpa desimal", () => {
    expect(formatCurrency(150000).replace(/\s/g, "")).toBe("Rp150.000")
  })
})

describe("formatBytes", () => {
  it("memformat byte kecil tanpa konversi", () => {
    expect(formatBytes(500)).toBe("500 B")
  })

  it("mengonversi ke KB/MB sesuai ukuran", () => {
    expect(formatBytes(1024)).toBe("1.0 KB")
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB")
  })
})

describe("calculateAge", () => {
  it("menghitung umur dengan benar untuk ulang tahun yang sudah lewat tahun ini", () => {
    const tenYearsAgo = new Date()
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10)
    tenYearsAgo.setDate(tenYearsAgo.getDate() - 1)
    expect(calculateAge(tenYearsAgo.toISOString())).toBe(10)
  })

  it("mengurangi umur jika ulang tahun belum lewat tahun ini", () => {
    const almostTenYearsAgo = new Date()
    almostTenYearsAgo.setFullYear(almostTenYearsAgo.getFullYear() - 10)
    almostTenYearsAgo.setDate(almostTenYearsAgo.getDate() + 1)
    expect(calculateAge(almostTenYearsAgo.toISOString())).toBe(9)
  })
})

describe("updateMedicineStatus", () => {
  it("mengembalikan Habis jika stok 0", () => {
    expect(updateMedicineStatus({ stock: 0, minStock: 5 })).toBe("Habis")
  })

  it("mengembalikan Stok Rendah jika stok <= minStock", () => {
    expect(updateMedicineStatus({ stock: 5, minStock: 5 })).toBe("Stok Rendah")
  })

  it("mengembalikan Tersedia jika stok cukup", () => {
    expect(updateMedicineStatus({ stock: 20, minStock: 5 })).toBe("Tersedia")
  })
})
