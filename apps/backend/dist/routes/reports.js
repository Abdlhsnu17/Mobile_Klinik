"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportsRouter = void 0;
const express_1 = require("express");
const reportService_1 = require("../services/reportService");
const pdfReportService_1 = require("../services/pdfReportService");
const auth_1 = require("../middlewares/auth");
const apiResponse_1 = require("../utils/apiResponse");
const csv_1 = require("../utils/csv");
exports.reportsRouter = (0, express_1.Router)();
const requireReportsAccess = (0, auth_1.requireRole)("admin");
function sendCsv(res, filename, rows, columns) {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.send((0, csv_1.buildCsv)(rows, columns));
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
exports.reportsRouter.get("/morbiditas", requireReportsAccess, async (req, res, next) => {
    try {
        const data = await reportService_1.ReportService.getMorbidity(10);
        (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (error) {
        next(error);
    }
});
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
exports.reportsRouter.get("/morbiditas/pdf", requireReportsAccess, async (req, res, next) => {
    try {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=laporan-morbiditas.pdf");
        const doc = await pdfReportService_1.PdfReportService.buildMorbidityPdf();
        doc.pipe(res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /reports/kunjungan:
 *   get:
 *     tags: [Reports]
 *     summary: Laporan kunjungan pasien (harian/bulanan/tahunan)
 *     responses:
 *       200: { description: OK }
 */
exports.reportsRouter.get("/kunjungan", requireReportsAccess, async (req, res, next) => {
    try {
        const data = await reportService_1.ReportService.getVisits();
        (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (error) {
        next(error);
    }
});
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
exports.reportsRouter.get("/kunjungan/pdf", requireReportsAccess, async (req, res, next) => {
    try {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=laporan-kunjungan.pdf");
        const doc = await pdfReportService_1.PdfReportService.buildVisitsPdf();
        doc.pipe(res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /reports/keuangan:
 *   get:
 *     tags: [Reports]
 *     summary: Laporan keuangan (pendapatan per dokter/layanan/metode)
 *     responses:
 *       200: { description: OK }
 */
exports.reportsRouter.get("/keuangan", requireReportsAccess, async (req, res, next) => {
    try {
        const data = await reportService_1.ReportService.getFinancials();
        (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (error) {
        next(error);
    }
});
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
exports.reportsRouter.get("/keuangan/pdf", requireReportsAccess, async (req, res, next) => {
    try {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=laporan-keuangan.pdf");
        const doc = await pdfReportService_1.PdfReportService.buildFinancialsPdf();
        doc.pipe(res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /reports/rujukan:
 *   get:
 *     tags: [Reports]
 *     summary: Laporan jumlah dan jenis rujukan (filter periode & fasilitas)
 *     responses:
 *       200: { description: OK }
 */
exports.reportsRouter.get("/rujukan", requireReportsAccess, async (req, res, next) => {
    try {
        const { from, to, facilityId } = req.query;
        const data = await reportService_1.ReportService.getReferralStats({
            from: from,
            to: to,
            facilityId: facilityId,
        });
        (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (error) {
        next(error);
    }
});
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
exports.reportsRouter.get("/rujukan/pdf", requireReportsAccess, async (req, res, next) => {
    try {
        const { from, to, facilityId } = req.query;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=laporan-rujukan.pdf");
        const doc = await pdfReportService_1.PdfReportService.buildReferralReportPdf({
            from: from,
            to: to,
            facilityId: facilityId,
        });
        doc.pipe(res);
    }
    catch (error) {
        next(error);
    }
});
// ── Ekspor CSV (kompatibel Excel) ────────────────────────────────────────────
exports.reportsRouter.get("/morbiditas/csv", requireReportsAccess, async (_req, res, next) => {
    try {
        const data = await reportService_1.ReportService.getMorbidity(50);
        sendCsv(res, "laporan-morbiditas.csv", data, [
            { header: "Diagnosis", value: (row) => row.diagnosis },
            { header: "Jumlah Kasus", value: (row) => row.occurrences },
        ]);
    }
    catch (error) {
        next(error);
    }
});
exports.reportsRouter.get("/kunjungan/csv", requireReportsAccess, async (_req, res, next) => {
    try {
        const data = await reportService_1.ReportService.getVisits();
        sendCsv(res, "laporan-kunjungan.csv", data.monthlyTrend, [
            { header: "Periode", value: (row) => row.label },
            { header: "Jumlah Kunjungan", value: (row) => row.count },
        ]);
    }
    catch (error) {
        next(error);
    }
});
exports.reportsRouter.get("/keuangan/csv", requireReportsAccess, async (_req, res, next) => {
    try {
        const data = await reportService_1.ReportService.getFinancials();
        sendCsv(res, "laporan-keuangan-layanan.csv", data.byService, [
            { header: "ID Layanan", value: (row) => row.serviceId },
            { header: "Layanan", value: (row) => row.serviceName },
            { header: "Pendapatan", value: (row) => row.revenue },
        ]);
    }
    catch (error) {
        next(error);
    }
});
exports.reportsRouter.get("/rujukan/csv", requireReportsAccess, async (req, res, next) => {
    try {
        const { from, to, facilityId } = req.query;
        const data = await reportService_1.ReportService.getReferralStats({
            from: from,
            to: to,
            facilityId: facilityId,
        });
        sendCsv(res, "laporan-rujukan.csv", data.byFacility, [
            { header: "Fasilitas Tujuan", value: (row) => row.facilityName },
            { header: "Jumlah Rujukan", value: (row) => row.total },
        ]);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @openapi
 * /reports/laba-rugi:
 *   get:
 *     tags: [Reports]
 *     summary: Laporan laba-rugi (cash-basis) dengan filter rentang tanggal
 */
exports.reportsRouter.get("/laba-rugi", requireReportsAccess, async (req, res, next) => {
    try {
        const { from, to } = req.query;
        const data = await reportService_1.ReportService.getProfitLoss({
            from: from,
            to: to,
        });
        (0, apiResponse_1.sendSuccess)(res, data);
    }
    catch (error) {
        next(error);
    }
});
exports.reportsRouter.get("/laba-rugi/csv", requireReportsAccess, async (req, res, next) => {
    try {
        const { from, to } = req.query;
        const data = await reportService_1.ReportService.getProfitLoss({
            from: from,
            to: to,
        });
        const rows = [
            { label: "Total Pendapatan", amount: data.totalRevenue },
            ...data.expensesByCategory.map((entry) => ({ label: `Pengeluaran: ${entry.category}`, amount: -entry.total })),
            { label: "Total Pengeluaran", amount: -data.totalExpenses },
            { label: "Laba Bersih", amount: data.netProfit },
        ];
        sendCsv(res, "laporan-laba-rugi.csv", rows, [
            { header: "Komponen", value: (row) => row.label },
            { header: "Nominal", value: (row) => row.amount },
        ]);
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=reports.js.map