"use strict";
// Pembuat CSV tanpa dependency. Menghasilkan CSV yang aman dibuka di Excel:
// BOM UTF-8 (agar karakter Indonesia tampil benar) + escaping RFC-4180.
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCsv = buildCsv;
function escapeCell(value) {
    if (value === null || value === undefined)
        return "";
    const text = String(value);
    if (/[",\n\r]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}
function buildCsv(rows, columns) {
    const header = columns.map((column) => escapeCell(column.header)).join(",");
    const body = rows.map((row) => columns.map((column) => escapeCell(column.value(row))).join(","));
    const lines = [header, ...body].join("\r\n");
    // BOM agar Excel mendeteksi UTF-8.
    return `﻿${lines}`;
}
//# sourceMappingURL=csv.js.map