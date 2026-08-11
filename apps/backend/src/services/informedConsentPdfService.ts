import PDFDocument from "pdfkit"
import type { InformedConsent } from "../types"
import { createHttpError } from "../utils/httpError"
import { CollectionService } from "./collectionService"

const CONSENT_TYPE_LABEL: Record<InformedConsent["consentType"], string> = {
  "tindakan-medis": "Persetujuan Tindakan Medis",
  "tindakan-bedah": "Persetujuan Tindakan Bedah",
  anestesi: "Persetujuan Tindakan Anestesi",
  "rawat-inap": "Persetujuan Rawat Inap",
  "transfusi-darah": "Persetujuan Transfusi Darah",
  "persetujuan-umum": "Persetujuan Umum",
}

const DECISION_LABEL: Record<InformedConsent["decision"], string> = {
  setuju: "MENYETUJUI",
  menolak: "MENOLAK",
}

export class InformedConsentPdfService {
  static async buildConsentPdf(consentId: string) {
    const consent = await CollectionService.findById("informedConsents", consentId)
    if (!consent) {
      throw createHttpError(404, "Persetujuan tindakan tidak ditemukan.")
    }

    const clinicSettings = await CollectionService.list("clinicSettings")
    const clinic = clinicSettings[0]

    const doc = new PDFDocument({ margin: 50 })

    // Kop klinik
    if (clinic) {
      doc.fontSize(16).font("Helvetica-Bold").text(clinic.name, { align: "center" })
      doc.fontSize(10).font("Helvetica").text(clinic.address ?? "", { align: "center" })
      if (clinic.phone) doc.text(`Telp: ${clinic.phone}`, { align: "center" })
      doc.moveDown(0.5)
      doc.moveTo(doc.x, doc.y).lineTo(545, doc.y).stroke()
      doc.moveDown(1)
    }

    // Judul
    doc.fontSize(14).font("Helvetica-Bold").text(CONSENT_TYPE_LABEL[consent.consentType].toUpperCase(), {
      align: "center",
    })
    doc.fontSize(9).font("Helvetica").fillColor("gray").text(`No: ${consent.id}`, { align: "center" })
    doc.fillColor("black")
    doc.moveDown(1.2)

    const field = (label: string, value?: string) => {
      doc.font("Helvetica-Bold").fontSize(10).text(label, { continued: true, width: 170 })
      doc.font("Helvetica").text(`  ${value || "-"}`)
    }

    // Identitas
    doc.font("Helvetica-Bold").fontSize(11).text("Identitas Pasien")
    doc.moveDown(0.3)
    field("Nama Pasien", consent.patientName)
    field("Tindakan", consent.procedureName)
    if (consent.procedureCode) field("Kode Tindakan (ICD-9-CM)", consent.procedureCode)
    field("Dokter Penanggung Jawab", consent.doctorName)
    doc.moveDown(0.8)

    // Penjelasan (elemen PMK 290/2008)
    doc.font("Helvetica-Bold").fontSize(11).text("Penjelasan yang Diberikan")
    doc.moveDown(0.3)
    const paragraph = (label: string, value?: string) => {
      if (!value) return
      doc.font("Helvetica-Bold").fontSize(10).text(`${label}:`)
      doc.font("Helvetica").fontSize(10).text(value, { align: "justify" })
      doc.moveDown(0.4)
    }
    paragraph("Diagnosis", consent.diagnosis)
    paragraph("Indikasi Tindakan", consent.indication)
    paragraph("Risiko & Komplikasi", consent.risks)
    paragraph("Alternatif Tindakan", consent.alternatives)
    paragraph("Prognosis", consent.prognosis)
    doc.moveDown(0.4)

    // Pernyataan persetujuan
    const giver =
      consent.grantedBy === "wali"
        ? `${consent.guardianName || "Wali"}${consent.guardianRelation ? ` (${consent.guardianRelation} pasien)` : ""}`
        : consent.patientName
    doc.font("Helvetica-Bold").fontSize(11).text("Pernyataan")
    doc.moveDown(0.3)
    doc.font("Helvetica").fontSize(10).text(
      `Saya yang bertanda tangan di bawah ini, ${giver}, setelah mendapatkan penjelasan yang cukup mengenai tindakan di atas beserta tujuan, risiko, dan alternatifnya, dengan ini menyatakan `,
      { continued: true, align: "justify" }
    )
    doc.font("Helvetica-Bold").text(`${DECISION_LABEL[consent.decision]}`, { continued: true })
    doc.font("Helvetica").text(" dilakukannya tindakan tersebut.")
    doc.moveDown(2)

    // Tanda tangan
    const dateStr = consent.signedAt
      ? new Date(consent.signedAt).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
      : new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
    const place = consent.signedLocation || clinic?.name || ""
    doc.font("Helvetica").fontSize(10).text(`${place}, ${dateStr}`, { align: "right" })
    doc.moveDown(0.5)

    const signatureY = doc.y
    doc.fontSize(10).font("Helvetica").text("Yang menyatakan,", 60, signatureY)
    doc.text("Saksi,", 250, signatureY)
    doc.text("Dokter,", 430, signatureY)
    doc.moveDown(4)
    const nameY = doc.y
    doc.font("Helvetica-Bold").text(`( ${giver} )`, 50, nameY, { width: 160, align: "center" })
    doc.text(`( ${consent.witnessName || "................."} )`, 220, nameY, { width: 160, align: "center" })
    doc.text(`( ${consent.doctorName || "................."} )`, 400, nameY, { width: 150, align: "center" })

    doc.end()
    return doc
  }
}
