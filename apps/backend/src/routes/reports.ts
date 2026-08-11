import type { Response } from "express"
import { Router } from "express"
import { ReportService } from "../services/reportService"
import { PdfReportService } from "../services/pdfReportService"
import { requireRole } from "../middlewares/auth"
import { sendSuccess } from "../utils/apiResponse"
import { buildCsv, type CsvColumn } from "../utils/csv"

export const reportsRouter = Router()
const requireReportsAccess = requireRole("admin")

function sendCsv<T>(res: Response, filename: string, rows: T[], columns: CsvColumn<T>[]) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8")
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`)
  res.send(buildCsv(rows, columns))
}

/**
 * @openapi
 * /reports/morbiditas:
 *   get:
 *     tags: [Reports]
 *     summary: Laporan morbiditas (10 diagnosis terbanyak)
 *     responses:
 *       200: { description: OK }
 */
reportsRouter.get("/morbiditas", requireReportsAccess, async (req, res, next) => {
  try {
    const data = await ReportService.getMorbidity(10)
    sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
})

/**
 * @openapi
 * /reports/morbiditas/pdf:
 *   get:
 *     tags: [Reports]
 *     summary: Unduh laporan morbiditas dalam format PDF
 *     responses:
 *       200:
 *         description: File PDF
 *         content:
 *           application/pdf: {}
 */
reportsRouter.get("/morbiditas/pdf", requireReportsAccess, async (req, res, next) => {
  try {
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", "attachment; filename=laporan-morbiditas.pdf")
    const doc = await PdfReportService.buildMorbidityPdf()
    doc.pipe(res)
  } catch (error) {
    next(error)
  }
})

/**
 * @openapi
 * /reports/kunjungan:
 *   get:
 *     tags: [Reports]
 *     summary: Laporan kunjungan pasien (harian/bulanan/tahunan)
 *     responses:
 *       200: { description: OK }
 */
reportsRouter.get("/kunjungan", requireReportsAccess, async (req, res, next) => {
  try {
    const data = await ReportService.getVisits()
    sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
})

/**
 * @openapi
 * /reports/kunjungan/pdf:
 *   get:
 *     tags: [Reports]
 *     summary: Unduh laporan kunjungan dalam format PDF
 *     responses:
 *       200:
 *         description: File PDF
 *         content:
 *           application/pdf: {}
 */
reportsRouter.get("/kunjungan/pdf", requireReportsAccess, async (req, res, next) => {
  try {
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", "attachment; filename=laporan-kunjungan.pdf")
    const doc = await PdfReportService.buildVisitsPdf()
    doc.pipe(res)
  } catch (error) {
    next(error)
  }
})

/**
 * @openapi
 * /reports/keuangan:
 *   get:
 *     tags: [Reports]
 *     summary: Laporan keuangan (pendapatan per dokter/layanan/metode)
 *     responses:
 *       200: { description: OK }
 */
reportsRouter.get("/keuangan", requireReportsAccess, async (req, res, next) => {
  try {
    const data = await ReportService.getFinancials()
    sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
})

/**
 * @openapi
 * /reports/keuangan/pdf:
 *   get:
 *     tags: [Reports]
 *     summary: Unduh laporan keuangan dalam format PDF
 *     responses:
 *       200:
 *         description: File PDF
 *         content:
 *           application/pdf: {}
 */
reportsRouter.get("/keuangan/pdf", requireReportsAccess, async (req, res, next) => {
  try {
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", "attachment; filename=laporan-keuangan.pdf")
    const doc = await PdfReportService.buildFinancialsPdf()
    doc.pipe(res)
  } catch (error) {
    next(error)
  }
})

/**
 * @openapi
 * /reports/rujukan:
 *   get:
 *     tags: [Reports]
 *     summary: Laporan jumlah dan jenis rujukan (filter periode & fasilitas)
 *     responses:
 *       200: { description: OK }
 */
reportsRouter.get("/rujukan", requireReportsAccess, async (req, res, next) => {
  try {
    const { from, to, facilityId } = req.query
    const data = await ReportService.getReferralStats({
      from: from as string | undefined,
      to: to as string | undefined,
      facilityId: facilityId as string | undefined,
    })
    sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
})

/**
 * @openapi
 * /reports/rujukan/pdf:
 *   get:
 *     tags: [Reports]
 *     summary: Unduh laporan rujukan dalam format PDF
 *     responses:
 *       200:
 *         description: File PDF
 *         content:
 *           application/pdf: {}
 */
reportsRouter.get("/rujukan/pdf", requireReportsAccess, async (req, res, next) => {
  try {
    const { from, to, facilityId } = req.query
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", "attachment; filename=laporan-rujukan.pdf")
    const doc = await PdfReportService.buildReferralReportPdf({
      from: from as string | undefined,
      to: to as string | undefined,
      facilityId: facilityId as string | undefined,
    })
    doc.pipe(res)
  } catch (error) {
    next(error)
  }
})

// ── Ekspor CSV (kompatibel Excel) ────────────────────────────────────────────

reportsRouter.get("/morbiditas/csv", requireReportsAccess, async (_req, res, next) => {
  try {
    const data = await ReportService.getMorbidity(50)
    sendCsv(res, "laporan-morbiditas.csv", data, [
      { header: "Diagnosis", value: (row) => row.diagnosis },
      { header: "Jumlah Kasus", value: (row) => row.occurrences },
    ])
  } catch (error) {
    next(error)
  }
})

reportsRouter.get("/kunjungan/csv", requireReportsAccess, async (_req, res, next) => {
  try {
    const data = await ReportService.getVisits()
    sendCsv(res, "laporan-kunjungan.csv", data.monthlyTrend, [
      { header: "Periode", value: (row) => row.label },
      { header: "Jumlah Kunjungan", value: (row) => row.count },
    ])
  } catch (error) {
    next(error)
  }
})

reportsRouter.get("/keuangan/csv", requireReportsAccess, async (_req, res, next) => {
  try {
    const data = await ReportService.getFinancials()
    sendCsv(res, "laporan-keuangan-layanan.csv", data.byService, [
      { header: "ID Layanan", value: (row) => row.serviceId },
      { header: "Layanan", value: (row) => row.serviceName },
      { header: "Pendapatan", value: (row) => row.revenue },
    ])
  } catch (error) {
    next(error)
  }
})

reportsRouter.get("/rujukan/csv", requireReportsAccess, async (req, res, next) => {
  try {
    const { from, to, facilityId } = req.query
    const data = await ReportService.getReferralStats({
      from: from as string | undefined,
      to: to as string | undefined,
      facilityId: facilityId as string | undefined,
    })
    sendCsv(res, "laporan-rujukan.csv", data.byFacility, [
      { header: "Fasilitas Tujuan", value: (row) => row.facilityName },
      { header: "Jumlah Rujukan", value: (row) => row.total },
    ])
  } catch (error) {
    next(error)
  }
})

/**
 * @openapi
 * /reports/laba-rugi:
 *   get:
 *     tags: [Reports]
 *     summary: Laporan laba-rugi (cash-basis) dengan filter rentang tanggal
 */
reportsRouter.get("/laba-rugi", requireReportsAccess, async (req, res, next) => {
  try {
    const { from, to } = req.query
    const data = await ReportService.getProfitLoss({
      from: from as string | undefined,
      to: to as string | undefined,
    })
    sendSuccess(res, data)
  } catch (error) {
    next(error)
  }
})

reportsRouter.get("/laba-rugi/csv", requireReportsAccess, async (req, res, next) => {
  try {
    const { from, to } = req.query
    const data = await ReportService.getProfitLoss({
      from: from as string | undefined,
      to: to as string | undefined,
    })
    const rows = [
      { label: "Total Pendapatan", amount: data.totalRevenue },
      ...data.expensesByCategory.map((entry) => ({ label: `Pengeluaran: ${entry.category}`, amount: -entry.total })),
      { label: "Total Pengeluaran", amount: -data.totalExpenses },
      { label: "Laba Bersih", amount: data.netProfit },
    ]
    sendCsv(res, "laporan-laba-rugi.csv", rows, [
      { header: "Komponen", value: (row) => row.label },
      { header: "Nominal", value: (row) => row.amount },
    ])
  } catch (error) {
    next(error)
  }
})
