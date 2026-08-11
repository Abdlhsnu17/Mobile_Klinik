// Pembuat CSV tanpa dependency. Menghasilkan CSV yang aman dibuka di Excel:
// BOM UTF-8 (agar karakter Indonesia tampil benar) + escaping RFC-4180.

export interface CsvColumn<T> {
  header: string
  value: (row: T) => string | number | null | undefined
}

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  const text = String(value)
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function buildCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((column) => escapeCell(column.header)).join(",")
  const body = rows.map((row) => columns.map((column) => escapeCell(column.value(row))).join(","))
  const lines = [header, ...body].join("\r\n")
  // BOM agar Excel mendeteksi UTF-8.
  return `﻿${lines}`
}
