import { apiClient } from "@/lib/api-client"
import type {
  Appointment,
  BillingRecord,
  InpatientAdmission,
  LabOrder,
  OperationalAlertsResponse,
  PatientNotification,
  PharmacyRequest,
  PurchaseOrder,
  RadiologyOrder,
  Referral,
  SafeUser,
} from "@/lib/auth-types"
import {
  getAdmissions,
  getBillingRecords,
  getLabOrders,
  getPatientNotifications,
  getPharmacyRequests,
  getPurchaseOrders,
  getRadiologyOrders,
  getReferrals,
  getTodayAppointments,
} from "@/lib/clinic-utils"
import { getAllowedModuleHrefs, loadRoleAccessSettings } from "@/lib/role-access"

export type ClinicNotification = {
  id: string
  title: string
  description: string
  severity: "info" | "warning"
  signature: string
  href: string
}

async function safelyLoad<T>(label: string, loader: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await loader()
  } catch (error) {
    console.error(`Gagal memuat notifikasi ${label}`, error)
    return fallback
  }
}

function processSignature(
  prefix: string,
  items: Array<{ id: string; status?: string }>,
) {
  return `${prefix}-${items
    .map((item) => `${item.id}:${item.status ?? "aktif"}`)
    .sort()
    .join("|")}`
}

function statusDescription(
  statuses: string[],
  labels: Record<string, string>,
) {
  const counts = statuses.reduce<Record<string, number>>((result, status) => {
    result[status] = (result[status] ?? 0) + 1
    return result
  }, {})

  return Object.entries(counts)
    .map(([status, count]) => `${labels[status] ?? status}: ${count}`)
    .join(" · ")
}

function appointmentTimestamp(appointment: Appointment) {
  const normalizedTime = /^\d{1,2}:\d{2}$/.test(appointment.time.trim())
    ? `${appointment.time.trim()}:00`
    : appointment.time.trim()
  return new Date(`${appointment.date}T${normalizedTime}`)
}

export async function getClinicNotifications(
  userRole: SafeUser["role"],
): Promise<ClinicNotification[]> {
  const allowedHrefs = getAllowedModuleHrefs(userRole, loadRoleAccessSettings())
  const canAccess = (href: string) => allowedHrefs.has(href)

  const [
    operationalAlerts,
    appointments,
    labOrders,
    radiologyOrders,
    pharmacyRequests,
    admissions,
    billingRecords,
    referrals,
    patientNotifications,
    purchaseOrders,
  ] = await Promise.all([
    canAccess("/peringatan")
      ? safelyLoad<OperationalAlertsResponse | null>(
          "peringatan operasional",
          () => apiClient.getOperationalAlerts(),
          null,
        )
      : Promise.resolve(null),
    canAccess("/antrian") || canAccess("/pemeriksaan")
      ? safelyLoad<Appointment[]>("antrean", getTodayAppointments, [])
      : Promise.resolve([] as Appointment[]),
    canAccess("/laboratorium")
      ? safelyLoad<LabOrder[]>("laboratorium", getLabOrders, [])
      : Promise.resolve([] as LabOrder[]),
    canAccess("/radiologi")
      ? safelyLoad<RadiologyOrder[]>("radiologi", getRadiologyOrders, [])
      : Promise.resolve([] as RadiologyOrder[]),
    canAccess("/farmasi")
      ? safelyLoad<PharmacyRequest[]>("farmasi", getPharmacyRequests, [])
      : Promise.resolve([] as PharmacyRequest[]),
    canAccess("/rawat-inap")
      ? safelyLoad<InpatientAdmission[]>("rawat inap", getAdmissions, [])
      : Promise.resolve([] as InpatientAdmission[]),
    canAccess("/pembayaran")
      ? safelyLoad<BillingRecord[]>("pembayaran", getBillingRecords, [])
      : Promise.resolve([] as BillingRecord[]),
    canAccess("/rujukan")
      ? safelyLoad<Referral[]>("rujukan", getReferrals, [])
      : Promise.resolve([] as Referral[]),
    canAccess("/komunikasi")
      ? safelyLoad<PatientNotification[]>("komunikasi pasien", getPatientNotifications, [])
      : Promise.resolve([] as PatientNotification[]),
    canAccess("/pengadaan")
      ? safelyLoad<PurchaseOrder[]>("pengadaan", getPurchaseOrders, [])
      : Promise.resolve([] as PurchaseOrder[]),
  ])

  const items: ClinicNotification[] = []

  if (operationalAlerts && operationalAlerts.summary.total > 0) {
    const { summary } = operationalAlerts
    const categories = [
      ["Stok menipis", summary.byCategory["stok-menipis"]],
      ["Obat kedaluwarsa", summary.byCategory["obat-kadaluarsa"]],
      ["Maintenance alat", summary.byCategory["maintenance-alat"]],
    ]
      .filter(([, count]) => Number(count) > 0)
      .map(([label, count]) => `${label}: ${count}`)
      .join(" · ")

    items.push({
      id: "operational-alerts",
      title: `${summary.total} peringatan operasional${summary.critical > 0 ? ` · ${summary.critical} kritis` : ""}`,
      description: categories,
      severity: summary.critical > 0 ? "warning" : "info",
      signature: `${summary.total}-${summary.critical}-${processSignature(
        "operational-alerts",
        operationalAlerts.alerts.map((alert) => ({ id: alert.id, status: alert.severity })),
      )}`,
      href: "/peringatan",
    })
  }

  const waitingAppointments = appointments.filter((item) => item.status === "Menunggu")
  if (waitingAppointments.length > 0 && canAccess("/antrian")) {
    const queueNumbers = waitingAppointments.map((item) => item.queueNumber)
    items.push({
      id: "queue-waiting",
      title: `${waitingAppointments.length} pasien masih menunggu`,
      description: `Antrean aktif ${Math.min(...queueNumbers)}–${Math.max(...queueNumbers)} perlu diproses`,
      severity: "warning",
      signature: processSignature("queue", waitingAppointments),
      href: "/antrian",
    })
  }

  const examinationAppointments = appointments.filter((item) =>
    ["Dipanggil", "Diperiksa"].includes(item.status),
  )
  if (examinationAppointments.length > 0 && canAccess("/pemeriksaan")) {
    items.push({
      id: "examinations-active",
      title: `${examinationAppointments.length} pemeriksaan belum selesai`,
      description: statusDescription(
        examinationAppointments.map((item) => item.status),
        { Dipanggil: "Sudah dipanggil", Diperiksa: "Sedang diperiksa" },
      ),
      severity: "info",
      signature: processSignature("examinations", examinationAppointments),
      href: "/pemeriksaan",
    })
  }

  const nextAppointment = [...appointments]
    .filter((appointment) => !["Selesai", "Batal"].includes(appointment.status))
    .map((appointment) => ({ appointment, timestamp: appointmentTimestamp(appointment) }))
    .filter(({ timestamp }) => !Number.isNaN(timestamp.getTime()) && timestamp >= new Date())
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())[0]?.appointment
  if (nextAppointment && canAccess("/antrian")) {
    items.push({
      id: "next-appointment",
      title: `Janji berikutnya: ${nextAppointment.patientName}`,
      description: `${nextAppointment.time} dengan ${nextAppointment.doctorName}`,
      severity: "info",
      signature: `${nextAppointment.id}-${nextAppointment.time}-${nextAppointment.status}`,
      href: "/antrian",
    })
  }

  const activeLabOrders = labOrders.filter(
    (item) => !["completed", "reviewed", "cancelled"].includes(item.status),
  )
  if (activeLabOrders.length > 0) {
    const urgentCount = activeLabOrders.filter((item) => item.priority === "urgent").length
    items.push({
      id: "lab-orders-active",
      title: `${activeLabOrders.length} order laboratorium belum selesai`,
      description: `${statusDescription(activeLabOrders.map((item) => item.status), {
        requested: "Diminta",
        sample_taken: "Sampel diambil",
        processing: "Diproses",
      })}${urgentCount > 0 ? ` · ${urgentCount} prioritas mendesak` : ""}`,
      severity: urgentCount > 0 ? "warning" : "info",
      signature: processSignature("lab", activeLabOrders),
      href: "/laboratorium",
    })
  }

  const activeRadiologyOrders = radiologyOrders.filter(
    (item) => !["reviewed", "cancelled"].includes(item.status),
  )
  if (activeRadiologyOrders.length > 0) {
    const urgentCount = activeRadiologyOrders.filter((item) => item.priority === "urgent").length
    items.push({
      id: "radiology-orders-active",
      title: `${activeRadiologyOrders.length} order radiologi belum selesai`,
      description: `${statusDescription(activeRadiologyOrders.map((item) => item.status), {
        requested: "Diminta",
        scheduled: "Dijadwalkan",
        performed: "Sudah dilakukan",
        reported: "Menunggu tinjauan",
      })}${urgentCount > 0 ? ` · ${urgentCount} prioritas mendesak` : ""}`,
      severity: urgentCount > 0 ? "warning" : "info",
      signature: processSignature("radiology", activeRadiologyOrders),
      href: "/radiologi",
    })
  }

  const activePharmacyRequests = pharmacyRequests.filter(
    (item) => !["fulfilled", "dispensed", "cancelled"].includes(item.status),
  )
  if (activePharmacyRequests.length > 0) {
    items.push({
      id: "pharmacy-requests-active",
      title: `${activePharmacyRequests.length} permintaan farmasi belum selesai`,
      description: statusDescription(activePharmacyRequests.map((item) => item.status), {
        requested: "Baru diminta",
        pending: "Menunggu",
        verified: "Terverifikasi",
        processing: "Diproses",
      }),
      severity: activePharmacyRequests.some((item) => ["requested", "pending"].includes(item.status))
        ? "warning"
        : "info",
      signature: processSignature("pharmacy", activePharmacyRequests),
      href: "/farmasi",
    })
  }

  const activeAdmissions = admissions.filter((item) => ["pending", "ongoing"].includes(item.status))
  if (activeAdmissions.length > 0) {
    items.push({
      id: "admissions-active",
      title: `${activeAdmissions.length} proses rawat inap belum selesai`,
      description: statusDescription(activeAdmissions.map((item) => item.status), {
        pending: "Menunggu admisi",
        ongoing: "Sedang dirawat",
      }),
      severity: activeAdmissions.some((item) => item.status === "pending") ? "warning" : "info",
      signature: processSignature("admissions", activeAdmissions),
      href: "/rawat-inap",
    })
  }

  const outstandingBillings = billingRecords.filter(
    (item) => item.total - item.paidAmount > 0 && !["paid", "cancelled"].includes(item.status),
  )
  if (outstandingBillings.length > 0) {
    const outstandingAmount = outstandingBillings.reduce(
      (total, item) => total + Math.max(0, item.total - item.paidAmount),
      0,
    )
    items.push({
      id: "billings-outstanding",
      title: `${outstandingBillings.length} tagihan belum lunas`,
      description: `Sisa pembayaran Rp ${outstandingAmount.toLocaleString("id-ID")}`,
      severity: "warning",
      signature: `${processSignature("billings", outstandingBillings)}-${outstandingAmount}`,
      href: "/pembayaran",
    })
  }

  const activeReferrals = referrals.filter(
    (item) => !["completed", "rejected"].includes(item.status),
  )
  if (activeReferrals.length > 0) {
    items.push({
      id: "referrals-active",
      title: `${activeReferrals.length} rujukan belum selesai`,
      description: statusDescription(activeReferrals.map((item) => item.status), {
        draft: "Draf",
        sent: "Terkirim",
        received: "Diterima",
        "followed-up": "Ditindaklanjuti",
      }),
      severity: activeReferrals.some((item) => item.status === "draft") ? "warning" : "info",
      signature: processSignature("referrals", activeReferrals),
      href: "/rujukan",
    })
  }

  const pendingPatientNotifications = patientNotifications.filter(
    (item) => item.status !== "sent",
  )
  if (pendingPatientNotifications.length > 0) {
    items.push({
      id: "patient-notifications-pending",
      title: `${pendingPatientNotifications.length} notifikasi pasien belum terkirim`,
      description: statusDescription(pendingPatientNotifications.map((item) => item.status), {
        pending: "Menunggu",
        processing: "Diproses",
        failed: "Gagal",
      }),
      severity: pendingPatientNotifications.some((item) => item.status === "failed")
        ? "warning"
        : "info",
      signature: processSignature("patient-notifications", pendingPatientNotifications),
      href: "/komunikasi",
    })
  }

  const activePurchaseOrders = purchaseOrders.filter(
    (item) => !["selesai", "batal"].includes(item.status),
  )
  if (activePurchaseOrders.length > 0) {
    items.push({
      id: "purchase-orders-active",
      title: `${activePurchaseOrders.length} pengadaan belum selesai`,
      description: statusDescription(activePurchaseOrders.map((item) => item.status), {
        draft: "Draf",
        dipesan: "Dipesan",
        "diterima-sebagian": "Diterima sebagian",
      }),
      severity: activePurchaseOrders.some((item) => item.status === "diterima-sebagian")
        ? "warning"
        : "info",
      signature: processSignature("purchase-orders", activePurchaseOrders),
      href: "/pengadaan",
    })
  }

  return items.sort((a, b) => Number(b.severity === "warning") - Number(a.severity === "warning"))
}
