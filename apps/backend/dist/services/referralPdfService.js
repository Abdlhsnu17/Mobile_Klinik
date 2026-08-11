"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralPdfService = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const httpError_1 = require("../utils/httpError");
const collectionService_1 = require("./collectionService");
const referralService_1 = require("./referralService");
const STATUS_LABEL = {
    draft: "Draf",
    sent: "Terkirim",
    received: "Diterima",
    "followed-up": "Ditindaklanjuti",
    rejected: "Ditolak",
    completed: "Selesai",
};
class ReferralPdfService {
    static async buildReferralLetterPdf(referralId) {
        const referral = await referralService_1.ReferralService.getById(referralId);
        const clinicSettings = await collectionService_1.CollectionService.list("clinicSettings");
        const clinic = clinicSettings[0];
        if (referral.direction !== "outgoing") {
            throw (0, httpError_1.createHttpError)(400, "Surat rujukan hanya tersedia untuk rujukan keluar.");
        }
        const doc = new pdfkit_1.default({ margin: 50 });
        if (clinic) {
            doc.fontSize(16).font("Helvetica-Bold").text(clinic.name, { align: "center" });
            doc.fontSize(10).font("Helvetica").text(clinic.address ?? "", { align: "center" });
            if (clinic.phone)
                doc.text(`Telp: ${clinic.phone}`, { align: "center" });
            doc.moveDown(0.5);
            doc.moveTo(doc.x, doc.y).lineTo(545, doc.y).stroke();
            doc.moveDown(1);
        }
        doc.fontSize(14).font("Helvetica-Bold").text("SURAT RUJUKAN", { align: "center" });
        doc.fontSize(10).font("Helvetica").fillColor("gray").text(`No: ${referral.id}`, { align: "center" });
        doc.fillColor("black");
        doc.moveDown(1.5);
        const field = (label, value) => {
            doc.font("Helvetica-Bold").fontSize(11).text(label, { continued: true, width: 160 });
            doc.font("Helvetica").text(value || "-");
        };
        field("Nama Pasien", referral.patientName);
        field("Diagnosis", referral.diagnosis);
        field("Alasan Rujukan", referral.reason);
        field("Fasilitas Tujuan", referral.facilityName);
        field("Dokter Perujuk", referral.doctorName);
        field("Status", STATUS_LABEL[referral.status] ?? referral.status);
        field("Tanggal Dibuat", new Date(referral.createdAt).toLocaleDateString("id-ID"));
        if (referral.sentAt)
            field("Tanggal Dikirim", new Date(referral.sentAt).toLocaleDateString("id-ID"));
        doc.moveDown(2);
        doc.font("Helvetica").fontSize(11).text("Bersama surat ini kami mohon kesediaan Bapak/Ibu untuk menerima dan menindaklanjuti penanganan pasien tersebut di atas. Atas kerja sama yang baik, kami ucapkan terima kasih.", { align: "justify" });
        doc.moveDown(3);
        doc.text(`Dibuat pada ${new Date().toLocaleString("id-ID")}`, { align: "right" });
        doc.moveDown(2);
        doc.text(referral.doctorName ?? "Dokter Perujuk", { align: "right" });
        doc.end();
        return doc;
    }
}
exports.ReferralPdfService = ReferralPdfService;
//# sourceMappingURL=referralPdfService.js.map