import PDFDocument from "pdfkit"
import { ReportService } from "./reportService"

export function buildBaseDoc(title: string) {
  const doc = new PDFDocument({ margin: 50 })
  doc.fontSize(18).text(title, { align: "center" })
  doc
    .fontSize(10)
    .fillColor("gray")
    .text(`Dibuat pada ${new Date().toLocaleString("id-ID")}`, { align: "center" })
  doc.fillColor("black")
  doc.moveDown(1.5)
  return doc
}

export function drawRow(doc: PDFKit.PDFDocument, columns: string[], widths: number[], bold = false) {
  const startX = doc.x
  const startY = doc.y
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(11)
  let x = startX
  columns.forEach((text, index) => {
    doc.text(text, x, startY, { width: widths[index] })
    x += widths[index]
  })
  doc.moveDown(0.5)
}

export class PdfReportService {
  static async buildMorbidityPdf() {
    const data = await ReportService.getMorbidity(10)
    const doc = buildBaseDoc("Laporan Morbiditas")

    drawRow(doc, ["Diagnosis", "Jumlah Kasus"], [350, 150], true)
    doc.moveDown(0.3)
    data.forEach((entry) => {
      drawRow(doc, [entry.diagnosis, String(entry.occurrences)], [350, 150])
    })
    if (data.length === 0) {
      doc.text("Data belum tersedia")
    }

    doc.end()
    return doc
  }

  static async buildVisitsPdf() {
    const data = await ReportService.getVisits()
    const doc = buildBaseDoc("Laporan Kunjungan Pasien")

    drawRow(doc, ["Periode", "Jumlah"], [350, 150], true)
    doc.moveDown(0.3)
    drawRow(doc, ["Hari ini", String(data.daily)], [350, 150])
    drawRow(doc, ["Bulan ini", String(data.monthly)], [350, 150])
    drawRow(doc, ["Tahun ini", String(data.yearly)], [350, 150])

    doc.moveDown(1)
    doc.font("Helvetica-Bold").fontSize(13).text("Tren 6 Bulan Terakhir")
    doc.moveDown(0.5)
    drawRow(doc, ["Bulan", "Jumlah Kunjungan"], [350, 150], true)
    data.monthlyTrend.forEach((entry) => {
      drawRow(doc, [entry.label, String(entry.count)], [350, 150])
    })

    doc.end()
    return doc
  }

  static async buildFinancialsPdf() {
    const data = await ReportService.getFinancials()
    const doc = buildBaseDoc("Laporan Keuangan")

    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .text(`Total Pendapatan: Rp ${data.totalRevenue.toLocaleString("id-ID")}`)
    doc.moveDown(1)

    doc.fontSize(13).text("Pendapatan per Dokter")
    doc.moveDown(0.5)
    drawRow(doc, ["Dokter", "Pendapatan"], [350, 150], true)
    data.byDoctor.forEach((entry) => {
      drawRow(doc, [entry.doctorName, `Rp ${entry.revenue.toLocaleString("id-ID")}`], [350, 150])
    })

    doc.moveDown(1)
    doc.fontSize(13).text("Pendapatan per Layanan")
    doc.moveDown(0.5)
    drawRow(doc, ["Layanan", "Pendapatan"], [350, 150], true)
    data.byService.forEach((entry) => {
      drawRow(doc, [entry.serviceName, `Rp ${entry.revenue.toLocaleString("id-ID")}`], [350, 150])
    })

    doc.moveDown(1)
    doc.fontSize(13).text("Pendapatan per Metode Pembayaran")
    doc.moveDown(0.5)
    drawRow(doc, ["Metode", "Pendapatan"], [350, 150], true)
    data.byMethod.forEach((entry) => {
      drawRow(doc, [entry.method, `Rp ${entry.revenue.toLocaleString("id-ID")}`], [350, 150])
    })

    doc.end()
    return doc
  }

  static async buildReferralReportPdf(filters?: { from?: string; to?: string; facilityId?: string }) {
    const data = await ReportService.getReferralStats(filters)
    const doc = buildBaseDoc("Laporan Rujukan")

    doc.font("Helvetica-Bold").fontSize(13).text(`Total Rujukan: ${data.total}`)
    doc.moveDown(1)

    doc.fontSize(13).text("Berdasarkan Status")
    doc.moveDown(0.5)
    drawRow(doc, ["Status", "Jumlah"], [350, 150], true)
    data.byStatus.forEach((entry) => {
      drawRow(doc, [entry.status, String(entry.total)], [350, 150])
    })

    doc.moveDown(1)
    doc.fontSize(13).text("Berdasarkan Arah")
    doc.moveDown(0.5)
    drawRow(doc, ["Arah", "Jumlah"], [350, 150], true)
    data.byDirection.forEach((entry) => {
      drawRow(doc, [entry.direction === "outgoing" ? "Keluar" : "Masuk", String(entry.total)], [350, 150])
    })

    doc.moveDown(1)
    doc.fontSize(13).text("Berdasarkan Fasilitas")
    doc.moveDown(0.5)
    drawRow(doc, ["Fasilitas", "Jumlah"], [350, 150], true)
    data.byFacility.forEach((entry) => {
      drawRow(doc, [entry.facilityName, String(entry.total)], [350, 150])
    })
    if (data.byFacility.length === 0) {
      doc.text("Data belum tersedia")
    }

    doc.end()
    return doc
  }
}
