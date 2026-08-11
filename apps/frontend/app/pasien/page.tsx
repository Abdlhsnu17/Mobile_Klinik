"use client"

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataPagination, useDataPagination } from "@/components/data-pagination";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataError, DataLoading, useClinicData } from "@/hooks/use-clinic-data";
import type { Appointment, InpatientAdmission, LabResult, MedicalRecord, Patient, PaymentRecord, Referral } from "@/lib/auth-types";
import { getCurrentUser } from "@/lib/auth-utils";
import {
    calculateAge,
    formatCurrency,
    formatDate,
    getPatientAppointments,
    getPatientMedicalRecords,
    getReferralsByPatient
} from "@/lib/clinic-utils";
import { CalendarClock, Eye, FileText, History, Hospital, Plus, Search, Stethoscope, Thermometer, UserPlus, Users, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function PasienPage() {
  const router = useRouter()
  const { data: patients = [], loading, error, refetch } = useClinicData<Patient>("patients")
  const { data: appointments = [], loading: appointmentsLoading, error: appointmentsError, refetch: refetchAppointments } = useClinicData<Appointment>("appointments")
  const { data: records = [], loading: recordsLoading, error: recordsError, refetch: refetchRecords } = useClinicData<MedicalRecord>("medical-records")
  const { data: labResults = [], loading: labResultsLoading, error: labResultsError, refetch: refetchLabResults } = useClinicData<LabResult>("lab-results")
  const { data: payments = [], loading: paymentsLoading, error: paymentsError, refetch: refetchPayments } = useClinicData<PaymentRecord>("payments")
  const { data: admissions = [], loading: admissionsLoading, error: admissionsError, refetch: refetchAdmissions } = useClinicData<InpatientAdmission>("inpatient-admissions")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPatientId, setSelectedPatientId] = useState("")
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null)
  const [patientRecords, setPatientRecords] = useState<MedicalRecord[]>([])
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([])
  const [patientReferrals, setPatientReferrals] = useState<Referral[]>([])

  useEffect(() => {
    const user = getCurrentUser()
    if (!user) {
      router.push("/login")
    }
  }, [router])

  const handleView = async (patient: Patient) => {
    setViewingPatient(patient)
    const [records, appointments, referrals] = await Promise.all([
      getPatientMedicalRecords(patient.id),
      getPatientAppointments(patient.id),
      getReferralsByPatient(patient.id),
    ])
    setPatientRecords(records)
    setPatientAppointments(appointments)
    setPatientReferrals(referrals)
    setIsViewDialogOpen(true)
  }

  const handleRegisterToQueue = (patientId: string) => {
    router.push(`/antrian?action=daftar&patientId=${patientId}`);
  }

  const isLoading = loading || appointmentsLoading || recordsLoading || labResultsLoading || paymentsLoading || admissionsLoading
  const combinedError = error || appointmentsError || recordsError || labResultsError || paymentsError || admissionsError
  const refetchAll = async () => {
    await Promise.all([refetch(), refetchAppointments(), refetchRecords(), refetchLabResults(), refetchPayments(), refetchAdmissions()])
  }

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.noRM.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nik.includes(searchTerm) ||
      p.phone.includes(searchTerm)
  )
  const patientPagination = useDataPagination(filteredPatients)

  if (isLoading) return <DataLoading />
  if (combinedError) return <DataError error={combinedError} onRetry={refetchAll} />

  const getAppointmentServiceLabel = (appointment: Appointment) =>
    appointment.serviceNames?.length ? appointment.serviceNames.join(", ") : appointment.serviceName || "Layanan klinik"

  const timelineEvents = selectedPatientId
    ? [
        ...appointments.filter((item) => item.patientId === selectedPatientId).map((item) => ({ type: "Kunjungan", date: item.date, data: item, icon: Stethoscope })),
        ...records.filter((item) => item.patientId === selectedPatientId).map((item) => ({ type: "Pemeriksaan", date: item.date, data: item, icon: FileText })),
        ...labResults.filter((item) => item.patientId === selectedPatientId).map((item) => ({ type: "Laboratorium", date: item.performedAt, data: item, icon: Thermometer })),
        ...payments.filter((item) => item.patientId === selectedPatientId).map((item) => ({ type: "Pembayaran", date: item.paidAt, data: item, icon: Wallet })),
        ...admissions.filter((item) => item.patientId === selectedPatientId).map((item) => ({ type: "Rawat Inap", date: item.admittedAt, data: item, icon: Hospital })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : []

  const renderTimelineEvent = (event: (typeof timelineEvents)[number]) => {
    if (event.type === "Kunjungan") {
      const appointment = event.data as Appointment
      return `Kunjungan ke ${appointment.doctorName || "dokter belum ditentukan"} untuk ${getAppointmentServiceLabel(appointment)}. Status: ${appointment.status}.`
    }
    if (event.type === "Pemeriksaan") {
      const record = event.data as MedicalRecord
      return `Diagnosis: ${record.diagnosis}. Tindakan: ${record.treatment}.`
    }
    if (event.type === "Laboratorium") {
      const result = event.data as LabResult
      return `Hasil ${result.testName}: ${result.resultValue}.`
    }
    if (event.type === "Pembayaran") {
      const payment = event.data as PaymentRecord
      return `Pembayaran ${formatCurrency(payment.amount)} melalui ${payment.method}.`
    }
    const admission = event.data as InpatientAdmission
    return `Rawat inap di ${admission.ward || "ruang perawatan"}. Status: ${admission.status}.`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Pasien</h1>
          <p className="text-muted-foreground text-sm">
            Kelola data pasien klinik
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pasien
            </CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patients.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pasien Laki-laki
            </CardTitle>
            <UserPlus className="w-4 h-4 text-chart-1" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {patients.filter((p) => p.gender === "Laki-laki").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pasien Perempuan
            </CardTitle>
            <UserPlus className="w-4 h-4 text-chart-5" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {patients.filter((p) => p.gender === "Perempuan").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="patients">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="patients">
            <Users className="mr-2 h-4 w-4" />
            Daftar Pasien
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <History className="mr-2 h-4 w-4" />
            Riwayat Pasien
          </TabsTrigger>
        </TabsList>

        {/* Search and Table */}
        <TabsContent value="patients">
          <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <CardTitle className="text-base">Daftar Pasien</CardTitle>
              <CardDescription>
                Cari berdasarkan nama, No. RM, NIK, atau telepon
              </CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari pasien..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  patientPagination.resetPage()
                }}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. RM</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead className="hidden md:table-cell">Jenis Kelamin</TableHead>
                  <TableHead className="hidden md:table-cell">Usia</TableHead>
                  <TableHead className="hidden lg:table-cell">Telepon</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm
                        ? "Tidak ada pasien yang sesuai dengan pencarian"
                        : "Belum ada data pasien"}
                    </TableCell>
                  </TableRow>
                ) : (
                  patientPagination.paginatedItems.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-mono text-sm">
                        {patient.noRM}
                      </TableCell>
                      <TableCell className="font-medium">{patient.name}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={patient.gender === "Laki-laki" ? "default" : "secondary"}>
                          {patient.gender}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {calculateAge(patient.birthDate)} tahun
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{patient.phone}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleView(patient)}
                            title="Lihat detail"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRegisterToQueue(patient.id)}
                            title="Daftarkan ke antrian"
                          >
                            <CalendarClock className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DataPagination
            page={patientPagination.page}
            totalItems={patientPagination.totalItems}
            totalPages={patientPagination.totalPages}
            onPageChange={patientPagination.setPage}
            itemLabel="pasien"
          />
        </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
        <CardHeader>
          <CardTitle className="text-base">Linimasa Rekam Medis Pasien</CardTitle>
          <CardDescription>
            Pilih pasien untuk melihat riwayat lengkap aktivitas medis mereka secara kronologis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="max-w-sm space-y-2">
              <Label>Pilih Pasien</Label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Cari nama atau No. RM pasien..." />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name} ({patient.noRM})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPatientId ? (
              timelineEvents.length > 0 ? (
                <div className="space-y-4">
                  {timelineEvents.map((event, index) => {
                    const Icon = event.icon
                    return (
                      <div key={`${event.type}-${event.date}-${index}`} className="flex items-stretch gap-4">
                        <div className="flex flex-col items-center">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          {index < timelineEvents.length - 1 && <div className="mt-1 w-px grow bg-border" />}
                        </div>
                        <div className="min-w-0 flex-1 pb-5 pt-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-semibold">{event.type}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(event.date)}</p>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{renderTimelineEvent(event)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-10 text-center text-muted-foreground">
                  Belum ada aktivitas medis yang tercatat untuk pasien ini.
                </div>
              )
            ) : (
              <div className="py-10 text-center text-muted-foreground">
                Silakan pilih pasien untuk menampilkan linimasa rekam medis.
              </div>
            )}
          </div>
        </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Patient Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Pasien</DialogTitle>
            <DialogDescription>Informasi lengkap pasien</DialogDescription>
          </DialogHeader>
          {viewingPatient && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">No. Rekam Medis</p>
                  <p className="font-mono font-medium">{viewingPatient.noRM}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">NIK</p>
                  <p className="font-medium">{viewingPatient.nik}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nama Lengkap</p>
                  <p className="font-medium">{viewingPatient.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Jenis Kelamin</p>
                  <p className="font-medium">{viewingPatient.gender}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Lahir</p>
                  <p className="font-medium">
                    {formatDate(viewingPatient.birthDate)} ({calculateAge(viewingPatient.birthDate)} tahun)
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Golongan Darah</p>
                  <p className="font-medium">{viewingPatient.bloodType || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telepon</p>
                  <p className="font-medium">{viewingPatient.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{viewingPatient.email || "-"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Alamat</p>
                  <p className="font-medium">{viewingPatient.address}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Alergi</p>
                  <p className="font-medium">{viewingPatient.allergies || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kontak Darurat</p>
                  <p className="font-medium">{viewingPatient.emergencyContact || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telepon Darurat</p>
                  <p className="font-medium">{viewingPatient.emergencyPhone || "-"}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Tindakan Cepat
                </h4>
                <Button onClick={() => handleRegisterToQueue(viewingPatient.id)}>
                  Daftarkan ke Antrian
                </Button>
              </div>
              {patientRecords.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Riwayat Kunjungan ({patientRecords.length})
                  </h4>
                  <div className="space-y-2">
                    {patientRecords.slice(0, 5).map((record) => (
                      <div
                        key={record.id}
                        className="rounded-lg border border-border/60 bg-transparent p-3"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">{record.diagnosis}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(record.date)} - {record.doctorName}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <CalendarClock className="w-4 h-4" />
                    Riwayat Pendaftaran & Antrian ({patientAppointments.length})
                  </h4>
                </div>
                {patientAppointments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Belum ada jadwal atau antrian untuk pasien ini.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {patientAppointments.slice(0, 5).map((appointment) => (
                      <div
                        key={appointment.id}
                        className="rounded-lg border border-border/60 bg-transparent p-3"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium text-sm">
                              {appointment.serviceNames?.length
                                ? appointment.serviceNames.join(", ")
                                : appointment.serviceName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(appointment.date)} {appointment.time} - {appointment.doctorName}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">No. {appointment.queueNumber}</Badge>
                            <Badge>{appointment.status}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Riwayat Rujukan ({patientReferrals.length})
                </h4>
                {patientReferrals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Belum ada rujukan untuk pasien ini.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {patientReferrals.slice(0, 5).map((referral) => (
                      <div
                        key={referral.id}
                        className="rounded-lg border border-border/60 bg-transparent p-3"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium text-sm">{referral.facilityName}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(referral.createdAt)} - {referral.direction === "outgoing" ? "Rujukan Keluar" : "Rujukan Masuk"}
                            </p>
                          </div>
                          <Badge variant="outline">{referral.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
