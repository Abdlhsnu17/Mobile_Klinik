import type { Appointment, BillingRecord, MedicalRecord, Medicine, Patient, PaymentRecord, ProfitLossReport, Service } from "../types";
import { CollectionService } from "./collectionService";

type VisitCounts = {
  daily: number
  monthly: number
  yearly: number
  monthlyTrend: { label: string; count: number }[]
}

type ReferralStats = {
  total: number
  byStatus: { status: string; total: number }[]
  byDirection: { direction: string; total: number }[]
  byFacility: { facilityName: string; total: number }[]
}

type MorbidityEntry = {
  diagnosis: string
  occurrences: number
}

type FinancialSummary = {
  totalRevenue: number
  totalBilled?: number
  outstandingBalance?: number
  insuranceClaims?: number
  byBillingStatus?: { status: string; total: number }[]
  byDoctor: { doctorId: string; doctorName: string; revenue: number }[]
  byService: { serviceId: string; serviceName: string; revenue: number }[]
  byMethod: { method: string; revenue: number }[]
}

type PaymentSummary = {
  id: string
  patientId: string
  patientName: string
  serviceName: string
  category: string
  date: string
  treatment: string
  medicines: string[]
  serviceCost: number
  medicineCost: number
  total: number
}

export class ReportService {
  static async getMorbidity(top = 10): Promise<MorbidityEntry[]> {
    const records = await CollectionService.list("medicalRecords")
    const counter: Record<string, number> = {}
    records.forEach((record) => {
      const diagnosis = record.diagnosis || "Belum terdiagnosis"
      counter[diagnosis] = (counter[diagnosis] ?? 0) + 1
    })

    return Object.entries(counter)
      .sort((a, b) => b[1] - a[1])
      .slice(0, top)
      .map(([diagnosis, occurrences]) => ({ diagnosis, occurrences }))
  }

  static async getVisits(): Promise<VisitCounts> {
    const appointments = await CollectionService.list("appointments")
    const today = new Date()
    const dayString = today.toISOString().split("T")[0]
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const yearStart = new Date(today.getFullYear(), 0, 1)

    const daily = appointments.filter((appt) => appt.date === dayString).length
    const monthly = appointments.filter((appt) => new Date(appt.date) >= monthStart).length
    const yearly = appointments.filter((appt) => new Date(appt.date) >= yearStart).length

    const monthlyTrend = Array.from({ length: 6 }, (_, offset) => {
      const month = new Date(today.getFullYear(), today.getMonth() - offset, 1)
      const label = month.toLocaleString("id-ID", { month: "short", year: "numeric" })
      const count = appointments.filter((appt) => {
        const apptDate = new Date(appt.date)
        return (
          apptDate.getFullYear() === month.getFullYear() &&
          apptDate.getMonth() === month.getMonth()
        )
      }).length
      return { label, count }
    }).reverse()

    return {
      daily,
      monthly,
      yearly,
      monthlyTrend,
    }
  }

  static async getFinancials(): Promise<FinancialSummary> {
    const payments = await CollectionService.list("payments")
    const billingRecords = await CollectionService.list("billingRecords")
    const records = await CollectionService.list("medicalRecords")
    const appointments = await CollectionService.list("appointments")
    const doctors = await CollectionService.list("doctors")
    const services = await CollectionService.list("services")

    // Kolom DECIMAL MySQL (amount, total, paidAmount, price, dst.) dikembalikan
    // driver sebagai string agar presisi tidak hilang. Operator "+" pada string
    // melakukan penggabungan teks, bukan penjumlahan, jadi setiap nilai harga
    // harus dibungkus Number(...) sebelum dijumlahkan.
    const totalRevenue = payments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)
    const totalBilled = billingRecords.reduce((sum, billing) => sum + Number(billing.total ?? 0), 0)
    const outstandingBalance = billingRecords.reduce((sum, billing) => sum + Math.max(0, Number(billing.total ?? 0) - Number(billing.paidAmount ?? 0)), 0)
    const insuranceClaims = billingRecords.reduce(
      (sum, billing) => sum + (billing.status === "claimed_to_insurance" ? Math.max(0, Number(billing.total ?? 0) - Number(billing.paidAmount ?? 0)) : 0),
      0,
    )
    const byBillingStatus = Object.entries(
      billingRecords.reduce<Record<string, number>>((acc, billing) => {
        acc[billing.status] = (acc[billing.status] ?? 0) + Number(billing.total ?? 0)
        return acc
      }, {}),
    ).map(([status, total]) => ({ status, total }))

    const recordMap = new Map(records.map(r => [r.appointmentId, r]))
    const paymentTotalByRecord = new Map<string, number>()
    payments.forEach((payment) => {
      paymentTotalByRecord.set(
        payment.medicalRecordId,
        (paymentTotalByRecord.get(payment.medicalRecordId) ?? 0) + Number(payment.amount ?? 0),
      )
    })

    const billingMap = new Map((billingRecords as BillingRecord[]).map((billing) => [billing.medicalRecordId, billing]))

    const byDoctor = doctors.map((doctor) => {
      const doctorAppointments = appointments.filter((appt) => appt.doctorId === doctor.id)
      const revenue = doctorAppointments.reduce((sum, appt) => {
        const record = recordMap.get(appt.id)
        if (!record) return sum
        const billing = billingMap.get(record.id)
        if (billing) return sum + Number(billing.paidAmount ?? 0)
        return sum + (paymentTotalByRecord.get(record.id) ?? 0)
      }, 0)
      return { doctorId: doctor.id, doctorName: doctor.name, revenue }
    })

    const serviceRevenueMap: Record<string, number> = {}
    if (billingRecords.length > 0) {
      billingRecords.forEach((billing) => {
        const record = records.find((item) => item.id === billing.medicalRecordId)
        const appointment = record ? appointments.find((item) => item.id === record.appointmentId) : undefined
        const serviceIds = appointment?.serviceIds?.length
          ? appointment.serviceIds
          : appointment?.serviceId
            ? [appointment.serviceId]
            : []
        if (serviceIds.length > 0) {
          const totalServicePrice = serviceIds.reduce((sum, serviceId) => {
            const service = services.find((item) => item.id === serviceId)
            return sum + Number(service?.price ?? 0)
          }, 0)
          serviceIds.forEach((serviceId) => {
            const service = services.find((item) => item.id === serviceId)
            const paidAmount = Number(billing.paidAmount ?? 0)
            const share = totalServicePrice > 0
              ? paidAmount * (Number(service?.price ?? 0) / totalServicePrice)
              : paidAmount / serviceIds.length
            serviceRevenueMap[serviceId] = (serviceRevenueMap[serviceId] ?? 0) + share
          })
        }
      })
    } else {
      payments.forEach((payment) => {
        const record = records.find(r => r.id === payment.medicalRecordId)
        const appointment = record ? appointments.find(a => a.id === record.appointmentId) : undefined
        const serviceIds = appointment?.serviceIds?.length
          ? appointment.serviceIds
          : appointment?.serviceId
            ? [appointment.serviceId]
            : []
        if (serviceIds.length > 0) {
          const totalServicePrice = serviceIds.reduce((sum, serviceId) => {
            const service = services.find((item) => item.id === serviceId)
            return sum + Number(service?.price ?? 0)
          }, 0)
          serviceIds.forEach((serviceId) => {
            const service = services.find((item) => item.id === serviceId)
            const paymentAmount = Number(payment.amount ?? 0)
            const share = totalServicePrice > 0
              ? paymentAmount * (Number(service?.price ?? 0) / totalServicePrice)
              : paymentAmount / serviceIds.length
            serviceRevenueMap[serviceId] = (serviceRevenueMap[serviceId] ?? 0) + share
          })
        }
      })
    }

    const byService = services
      .map((service) => ({
        serviceId: service.id,
        serviceName: service.name,
        revenue: serviceRevenueMap[service.id] ?? 0,
      }))
      .filter(item => item.revenue > 0)

    const methodMap: Record<string, number> = {}
    payments.forEach((payment) => {
      methodMap[payment.method] = (methodMap[payment.method] ?? 0) + Number(payment.amount ?? 0)
    })

    const byMethod = Object.entries(methodMap).map(([method, revenue]) => ({ method, revenue }))

    return {
      totalRevenue,
      totalBilled,
      outstandingBalance,
      insuranceClaims,
      byBillingStatus,
      byDoctor,
      byService,
      byMethod,
    }
  }

  static async getPaymentSummaries(): Promise<PaymentSummary[]> {
    const records = await CollectionService.list("medicalRecords") as MedicalRecord[]
    const appointments = await CollectionService.list("appointments") as Appointment[]
    const services = await CollectionService.list("services") as Service[]
    const medicines = await CollectionService.list("medicines") as Medicine[]
    const patients = await CollectionService.list("patients") as Patient[]

    const appointmentMap = new Map(appointments.map(a => [a.id, a]))
    const serviceMap = new Map(services.map(s => [s.id, s]))
    const medicineMap = new Map(medicines.map(m => [m.id, m]))
    const patientMap = new Map(patients.map(p => [p.id, p]))

    const summaries: PaymentSummary[] = []

    for (const record of records) {
      const patient = patientMap.get(record.patientId)
      if (!patient) continue

      const appointment = appointmentMap.get(record.appointmentId)
      const serviceIds = appointment?.serviceIds?.length ? appointment.serviceIds : (appointment?.serviceId ? [appointment.serviceId] : [])
      
      const serviceCost = serviceIds.reduce((sum, id) => {
        const service = serviceMap.get(id)
        return sum + Number(service?.price ?? 0)
      }, 0)

      const medicineCost = (record.prescription ?? []).reduce((sum, rx) => {
        const medicine = medicineMap.get(rx.medicineId)
        return sum + (Number(medicine?.price ?? 0) * Number(rx.quantity ?? 0))
      }, 0)

      const primaryService = serviceMap.get(serviceIds[0])

      summaries.push({
        id: record.id,
        patientId: record.patientId,
        patientName: patient.name,
        serviceName: primaryService?.name ?? appointment?.serviceName ?? 'Layanan',
        category: primaryService?.category ?? 'Umum',
        date: record.date,
        treatment: record.treatment,
        medicines: (record.prescription ?? []).map(rx => rx.medicineName),
        serviceCost,
        medicineCost,
        total: serviceCost + medicineCost,
      })
    }

    return summaries
  }

  static async getReferralStats(filters?: { from?: string; to?: string; facilityId?: string }): Promise<ReferralStats> {
    let referrals = await CollectionService.list("referrals")

    if (filters?.from) referrals = referrals.filter((referral) => referral.createdAt >= filters.from!)
    if (filters?.to) referrals = referrals.filter((referral) => referral.createdAt <= filters.to!)
    if (filters?.facilityId) referrals = referrals.filter((referral) => referral.facilityId === filters.facilityId)

    const byStatus = Object.entries(
      referrals.reduce<Record<string, number>>((acc, referral) => {
        acc[referral.status] = (acc[referral.status] ?? 0) + 1
        return acc
      }, {}),
    ).map(([status, total]) => ({ status, total }))

    const byDirection = Object.entries(
      referrals.reduce<Record<string, number>>((acc, referral) => {
        acc[referral.direction] = (acc[referral.direction] ?? 0) + 1
        return acc
      }, {}),
    ).map(([direction, total]) => ({ direction, total }))

    const byFacility = Object.entries(
      referrals.reduce<Record<string, number>>((acc, referral) => {
        acc[referral.facilityName] = (acc[referral.facilityName] ?? 0) + 1
        return acc
      }, {}),
    ).map(([facilityName, total]) => ({ facilityName, total }))

    return {
      total: referrals.length,
      byStatus,
      byDirection,
      byFacility,
    }
  }

  /** Laba-rugi cash-basis: pendapatan (pembayaran) dikurangi pengeluaran operasional,
   *  keduanya opsional difilter rentang tanggal (inklusif, format YYYY-MM-DD). */
  static async getProfitLoss(filters?: { from?: string; to?: string }): Promise<ProfitLossReport> {
    const [payments, expenses] = await Promise.all([
      CollectionService.list("payments"),
      CollectionService.list("expenses"),
    ])

    const inRange = (value: string | undefined) => {
      const date = (value ?? "").slice(0, 10)
      if (!date) return false
      if (filters?.from && date < filters.from) return false
      if (filters?.to && date > filters.to) return false
      return true
    }

    const totalRevenue = payments
      .filter((payment) => inRange((payment as PaymentRecord & { paidAt?: string }).paidAt ?? payment.createdAt))
      .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)

    const rangeExpenses = expenses.filter((expense) => inRange(expense.date))
    const totalExpenses = rangeExpenses.reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0)

    const categoryTotals = rangeExpenses.reduce<Record<string, number>>((acc, expense) => {
      acc[expense.category] = (acc[expense.category] ?? 0) + Number(expense.amount ?? 0)
      return acc
    }, {})
    const expensesByCategory = Object.entries(categoryTotals).map(([category, total]) => ({
      category: category as ProfitLossReport["expensesByCategory"][number]["category"],
      total,
    }))

    return {
      from: filters?.from,
      to: filters?.to,
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      expensesByCategory,
    }
  }
}
