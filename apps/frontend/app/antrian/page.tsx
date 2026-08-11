"use client"

import React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataPagination, useDataPagination } from "@/components/data-pagination";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DataError, DataLoading, useClinicData } from "@/hooks/use-clinic-data";
import { useToast } from "@/hooks/use-toast";
import type { Appointment, Doctor, Patient, Service, VitalSigns } from "@/lib/auth-types";
import { getCurrentUser } from "@/lib/auth-utils";
import {
    isCarriedOverAppointment,
    shouldShowAppointmentOnDate,
} from "@/lib/appointment-queue";
import {
    createPatient,
    deleteAppointment,
    formatDate,
    generateNoRM,
    getNextQueueNumber,
    registerVisitWorkflow,
    startVisitExamWorkflow,
    updateAppointment,
} from "@/lib/clinic-utils";
import {
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    ClipboardPlus,
    Clock,
    Edit,
    Plus,
    Search,
    Stethoscope,
    Timer,
    Trash2,
    UserCheck,
    XCircle
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PatientCombobox } from "@/components/patient-combobox";

const statusColors: Record<string, string> = {
  Menunggu: "bg-chart-4 text-foreground",
  Dipanggil: "bg-chart-1 text-primary-foreground",
  Diperiksa: "bg-primary text-primary-foreground",
  Selesai: "bg-chart-2 text-foreground",
  Batal: "bg-destructive text-destructive-foreground",
}

type AppointmentForm = {
  patientId: string
  date: string
  time: string
  notes: string
}

type TriageForm = VitalSigns & {
  doctorId: string
  serviceIds: string[]
  complaints: string
  notes: string
}

type QuickPatientForm = {
  name: string
  nik: string
  birthDate: string
  gender: "Laki-laki" | "Perempuan"
  address: string
  phone: string
  email?: string
  bloodType?: "A" | "B" | "AB" | "O" | ""
  allergies?: string
  emergencyContact?: string
  emergencyPhone?: string
}

type PatientEntryMode = "existing" | "new"

const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const normalizeDateKey = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}(?:$|\s)/.test(value)) return value.slice(0, 10)

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value.slice(0, 10) : getLocalDateKey(parsed)
}

const createEmptyForm = (): AppointmentForm => ({
  patientId: "",
  date: getLocalDateKey(),
  time: "08:00",
  notes: "",
})

const createEmptyTriageForm = (): TriageForm => ({
  doctorId: "",
  serviceIds: [],
  bloodPressure: "",
  heartRate: "",
  temperature: "",
  bloodGlucose: "",
  oxygenSaturation: "",
  weight: "",
  height: "",
  respiratoryRate: "",
  complaints: "",
  notes: "",
})

const createEmptyQuickPatientForm = (): QuickPatientForm => ({
  name: "",
  nik: "",
  birthDate: "",
  gender: "Laki-laki",
  address: "",
  phone: "",
  email: "",
  bloodType: "",
  allergies: "",
  emergencyContact: "",
  emergencyPhone: "",
})

const normalizeText = (value: string) => value.trim().toLowerCase()
const normalizeDigits = (value: string) => value.replace(/\D/g, "")

const buildNumberOptions = (start: number, end: number, step: number, unit: string, decimals = 0) => {
  const options: string[] = []
  for (let value = start; value <= end + 1e-9; value += step) {
    options.push(`${value.toFixed(decimals)}${unit}`)
  }
  return options
}

const bloodPressureOptions = [
  "90/60 mmHg", "100/60 mmHg", "100/70 mmHg", "110/70 mmHg", "110/80 mmHg",
  "120/70 mmHg", "120/80 mmHg", "130/80 mmHg", "130/85 mmHg", "140/80 mmHg",
  "140/90 mmHg", "150/90 mmHg", "150/95 mmHg", "160/90 mmHg", "160/100 mmHg",
  "170/100 mmHg", "180/100 mmHg", "180/110 mmHg",
]
const heartRateOptions = buildNumberOptions(40, 180, 1, " bpm")
const temperatureOptions = buildNumberOptions(35, 42, 0.1, " C", 1)
const bloodGlucoseOptions = buildNumberOptions(60, 300, 5, " mg/dL")
const oxygenSaturationOptions = buildNumberOptions(80, 100, 1, "%")
const weightOptions = buildNumberOptions(3, 150, 1, " kg")
const heightOptions = buildNumberOptions(30, 210, 1, " cm")
const respiratoryRateOptions = buildNumberOptions(8, 40, 1, "/menit")

export default function AntrianPage() {
  const searchParams = useSearchParams();
  const router = useRouter()
  const { toast } = useToast()
  const { data: appointments = [], loading: appointmentsLoading, error: appointmentsError, refetch: refetchAppointments } = useClinicData<Appointment>("appointments")
  const { data: patients = [], loading: patientsLoading, error: patientsError, refetch: refetchPatients } = useClinicData<Patient>("patients")
  const { data: doctors = [], loading: doctorsLoading, error: doctorsError, refetch: refetchDoctors } = useClinicData<Doctor>("doctors")
  const { data: services = [], loading: servicesLoading, error: servicesError, refetch: refetchServices } = useClinicData<Service>("services")
  const [selectedDate, setSelectedDate] = useState(getLocalDateKey())
  const [queueSearchTerm, setQueueSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deletingAppointmentId, setDeletingAppointmentId] = useState<string | null>(null)
  const [patientEntryMode, setPatientEntryMode] = useState<PatientEntryMode>("existing")
  const [formData, setFormData] = useState<AppointmentForm>(createEmptyForm())
  const [newPatientForm, setNewPatientForm] = useState<QuickPatientForm>(createEmptyQuickPatientForm())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [triageAppointment, setTriageAppointment] = useState<Appointment | null>(null)
  const [triageForm, setTriageForm] = useState<TriageForm>(createEmptyTriageForm())
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof getCurrentUser>>(null)

  useEffect(() => {
    const user = getCurrentUser()
    setCurrentUser(user)
    if (!user) {
      router.push("/login")
    }

    // Handle action from other pages (e.g., from pasien/page.tsx)
    const action = searchParams.get('action');
    const patientId = searchParams.get('patientId');
    if (action === 'daftar' && patientId) {
      openCreateDialog(patientId);
      // Clean up URL params after use
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [router])

  const loadData = useCallback(async () => {
    await Promise.all([
      refetchPatients(),
      refetchDoctors(),
      refetchServices(),
      refetchAppointments(),
    ])
  }, [refetchPatients, refetchDoctors, refetchServices, refetchAppointments])

  const todayAppointments = appointments
    .filter((appointment) => shouldShowAppointmentOnDate(appointment, selectedDate))
    .sort((a, b) => {
      const dateComparison = normalizeDateKey(a.date).localeCompare(normalizeDateKey(b.date))
      return dateComparison || a.queueNumber - b.queueNumber
    })

  const carriedOverCount = todayAppointments.filter((appointment) =>
    isCarriedOverAppointment(appointment, selectedDate),
  ).length

  const normalizedQueueSearch = queueSearchTerm.trim().toLowerCase()

  const filteredAppointments = todayAppointments.filter((appointment) => {
    if (!normalizedQueueSearch) return true

    const queueText = appointment.queueNumber.toString()
    const searchable = [
      appointment.patientName,
      appointment.doctorName,
      appointment.serviceName,
      ...(appointment.serviceNames ?? []),
      queueText,
      appointment.status,
    ]
      .join(" ")
      .toLowerCase()

    return searchable.includes(normalizedQueueSearch)
  })

  const waitingAppointments = filteredAppointments.filter((a) => a.status === "Menunggu")
  const progressAppointments = filteredAppointments.filter(
    (a) => a.status === "Dipanggil" || a.status === "Diperiksa",
  )
  const completedAppointments = filteredAppointments.filter((a) => a.status === "Selesai")

  const waitingCount = todayAppointments.filter((a) => a.status === "Menunggu").length
  const inProgressCount = todayAppointments.filter(
    (a) => a.status === "Dipanggil" || a.status === "Diperiksa"
  ).length
  const completedCount = todayAppointments.filter((a) => a.status === "Selesai").length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      let patient = patients.find((item) => item.id === formData.patientId)

      if (!editingAppointment && patientEntryMode === "new") {
        const normalizedNik = normalizeDigits(newPatientForm.nik)
        const normalizedName = normalizeText(newPatientForm.name)
        const normalizedPhone = normalizeDigits(newPatientForm.phone)

        const duplicateByNik = patients.find(
          (item) => normalizeDigits(item.nik) !== "" && normalizeDigits(item.nik) === normalizedNik,
        )
        const duplicateByIdentity = patients.find(
          (item) =>
            normalizeText(item.name) === normalizedName &&
            item.birthDate === newPatientForm.birthDate &&
            normalizeDigits(item.phone) === normalizedPhone,
        )
        const existingPatient = duplicateByNik ?? duplicateByIdentity
        patient = existingPatient

        if (!patient) {
          const noRM = await generateNoRM()
          patient = await createPatient({
            noRM,
            name: newPatientForm.name.trim(),
            nik: newPatientForm.nik.trim(),
            birthDate: newPatientForm.birthDate,
            gender: newPatientForm.gender,
            address: newPatientForm.address.trim(),
            phone: newPatientForm.phone.trim(),
            email: newPatientForm.email?.trim() || undefined,
            bloodType: newPatientForm.bloodType || undefined,
            allergies: newPatientForm.allergies?.trim() || undefined,
            emergencyContact: newPatientForm.emergencyContact?.trim() || undefined,
            emergencyPhone: newPatientForm.emergencyPhone?.trim() || undefined,
          })
        }
        if (!existingPatient) await refetchPatients()
      }

      if (!patient) return

      if (editingAppointment) {
        const queueNumber =
          formData.date === normalizeDateKey(editingAppointment.date)
            ? editingAppointment.queueNumber
            : await getNextQueueNumber(formData.date)

        await updateAppointment(editingAppointment.id, {
          patientId: patient.id,
          patientName: patient.name,
          date: formData.date,
          time: formData.time,
          notes: formData.notes || undefined,
          queueNumber,
          status: editingAppointment.status,
        })
      } else {
        await registerVisitWorkflow({
          patientId: patient.id,
          date: formData.date,
          time: formData.time,
          notes: formData.notes || undefined,
        })
      }

      await loadData()
      resetForm()
      toast({
        title: editingAppointment ? "Pendaftaran Diperbarui" : "Pasien Masuk Antrean Awal",
        description: editingAppointment
          ? `Data antrean ${patient.name} berhasil diperbarui.`
          : `${patient.name} siap dilanjutkan ke pemeriksaan awal perawat atau bidan.`,
      })
    } catch (error) {
      console.error("Gagal menyimpan pendaftaran:", error)
      toast({
        title: "Gagal Menyelesaikan Pendaftaran",
        description: error instanceof Error
          ? error.message
          : "Data belum tersimpan. Periksa kembali isian lalu coba lagi.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData(createEmptyForm())
    setPatientEntryMode("existing")
    setNewPatientForm(createEmptyQuickPatientForm())
    setEditingAppointment(null)
    setIsDialogOpen(false)
  }

  const changePatientEntryMode = (mode: PatientEntryMode) => {
    if (mode === patientEntryMode) return
    setPatientEntryMode(mode)
    setFormData(createEmptyForm())
    setNewPatientForm(createEmptyQuickPatientForm())
  }

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setPatientEntryMode("existing")
      setEditingAppointment(null)
      setFormData(createEmptyForm())
      setNewPatientForm(createEmptyQuickPatientForm())
    }
  }

  const openCreateDialog = (preselectedPatientId?: string) => {
    setEditingAppointment(null)
    const newForm = createEmptyForm();
    if (preselectedPatientId) newForm.patientId = preselectedPatientId;
    setFormData(newForm);
    setPatientEntryMode("existing")
    setNewPatientForm(createEmptyQuickPatientForm())
    setIsDialogOpen(true)
  }

  const openEditDialog = (appointment: Appointment) => {
    setEditingAppointment(appointment)
    setPatientEntryMode("existing")
    setNewPatientForm(createEmptyQuickPatientForm())
    setFormData({
      patientId: appointment.patientId,
      date: normalizeDateKey(appointment.date),
      time: appointment.time,
      notes: appointment.notes ?? "",
    })
    setIsDialogOpen(true)
  }

  const updateStatus = async (id: string, status: Appointment["status"]) => {
    try {
      await updateAppointment(id, { status })
      await loadData()
    } catch (error) {
      console.error("Gagal memperbarui status kunjungan:", error)
      toast({
        title: "Status Kunjungan Belum Berubah",
        description: "Perubahan status gagal disimpan. Silakan coba kembali.",
        variant: "destructive",
      })
      throw error
    }
  }

  const handleStartExamination = async (appointmentId: string) => {
    try {
      await startVisitExamWorkflow(appointmentId)
      await loadData()
      router.push(`/pemeriksaan?appointmentId=${appointmentId}`)
    } catch {
      toast({
        title: "Gagal Memulai Pemeriksaan",
        description: "Status kunjungan tidak dapat dipindahkan ke pemeriksaan.",
        variant: "destructive",
      })
    }
  }

  const handleContinueExamination = (appointmentId: string) => {
    router.push(`/pemeriksaan?appointmentId=${appointmentId}`)
  }

  const openTriageDialog = (appointment: Appointment) => {
    setTriageAppointment(appointment)
    setTriageForm({
      doctorId: appointment.doctorId ?? "",
      serviceIds: appointment.serviceIds?.length
        ? appointment.serviceIds
        : appointment.serviceId
          ? [appointment.serviceId]
          : [],
      bloodPressure: appointment.triage?.vitalSigns.bloodPressure ?? "",
      heartRate: appointment.triage?.vitalSigns.heartRate ?? "",
      temperature: appointment.triage?.vitalSigns.temperature ?? "",
      bloodGlucose: appointment.triage?.vitalSigns.bloodGlucose ?? "",
      oxygenSaturation: appointment.triage?.vitalSigns.oxygenSaturation ?? "",
      weight: appointment.triage?.vitalSigns.weight ?? "",
      height: appointment.triage?.vitalSigns.height ?? "",
      respiratoryRate: appointment.triage?.vitalSigns.respiratoryRate ?? "",
      complaints: appointment.triage?.complaints ?? "",
      notes: appointment.triage?.notes ?? "",
    })
  }

  const closeTriageDialog = () => {
    setTriageAppointment(null)
    setTriageForm(createEmptyTriageForm())
  }

  const toggleTriageService = (serviceId: string, shouldSelect: boolean) => {
    setTriageForm((prev) => ({
      ...prev,
      serviceIds: shouldSelect
        ? Array.from(new Set([...prev.serviceIds, serviceId]))
        : prev.serviceIds.filter((id) => id !== serviceId),
    }))
  }

  const handleTriageDoctorSelect = (doctorId: string) => {
    const doctor = doctors.find((item) => item.id === doctorId)
    const matchingServiceIds = doctor
      ? services
          .filter((service) => service.status === "Aktif")
          .filter(
            (service) =>
              !service.applicableSpecializations ||
              service.applicableSpecializations.length === 0 ||
              service.applicableSpecializations.includes(doctor.specialization),
          )
          .map((service) => service.id)
      : []

    setTriageForm((prev) => ({
      ...prev,
      doctorId,
      serviceIds: matchingServiceIds,
    }))
  }

  const handleTriageSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!triageAppointment) return

    const doctor = doctors.find((item) => item.id === triageForm.doctorId)
    const selectedServices = services.filter((service) =>
      triageForm.serviceIds.includes(service.id),
    )
    if (!doctor || selectedServices.length === 0) {
      toast({
        title: "Dokter dan Layanan Belum Dipilih",
        description: "Tentukan dokter tujuan dan minimal satu layanan sebelum menyimpan pemeriksaan awal.",
        variant: "destructive",
      })
      return
    }

    const primaryService = selectedServices[0]

    try {
      const currentUser = getCurrentUser()
      await updateAppointment(triageAppointment.id, {
        doctorId: doctor.id,
        doctorName: doctor.name,
        serviceId: primaryService.id,
        serviceName: primaryService.name,
        serviceIds: selectedServices.map((service) => service.id),
        serviceNames: selectedServices.map((service) => service.name),
        // Pemeriksaan awal menandai pasien siap diteruskan ke dokter.
        status: triageAppointment.status === "Menunggu" ? "Dipanggil" : triageAppointment.status,
        triage: {
          vitalSigns: {
            bloodPressure: triageForm.bloodPressure || undefined,
            heartRate: triageForm.heartRate || undefined,
            temperature: triageForm.temperature || undefined,
            bloodGlucose: triageForm.bloodGlucose || undefined,
            oxygenSaturation: triageForm.oxygenSaturation || undefined,
            weight: triageForm.weight || undefined,
            height: triageForm.height || undefined,
            respiratoryRate: triageForm.respiratoryRate || undefined,
          },
          complaints: triageForm.complaints || undefined,
          notes: triageForm.notes || undefined,
          nurseName: currentUser?.name,
          recordedAt: new Date().toISOString(),
        },
      })
      await loadData()
      closeTriageDialog()
      toast({
        title: "Pemeriksaan Awal Tersimpan",
        description: `${triageAppointment.patientName} siap diteruskan ke ${doctor.name}.`,
      })
    } catch (error) {
      console.error("Gagal menyimpan asesmen awal:", error)
      toast({
        title: "Asesmen Belum Tersimpan",
        description: "Data pasien dan tanda vital belum berhasil disimpan. Silakan coba kembali.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteAppointment = (id: string) => {
    setDeletingAppointmentId(id)
  }

  const confirmDeleteAppointment = async () => {
    if (!deletingAppointmentId) return
    try {
      await deleteAppointment(deletingAppointmentId)
      await loadData()
      toast({
        title: "Berhasil Dihapus",
        description: "Antrian telah dihapus.",
      })
    } catch (error) {
      console.error("Gagal menghapus antrian:", error)
      toast({
        title: "Gagal Menghapus Antrian",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menghapus antrian.",
        variant: "destructive",
      })
    } finally {
      setDeletingAppointmentId(null)
    }
  }

  const isLoading = appointmentsLoading || patientsLoading || doctorsLoading || servicesLoading
  const combinedError = appointmentsError || patientsError || doctorsError || servicesError

  const handleRetry = useCallback(() => {
    if (appointmentsError) refetchAppointments()
    if (patientsError) refetchPatients()
    if (doctorsError) refetchDoctors()
    if (servicesError) refetchServices()
  }, [appointmentsError, refetchAppointments, patientsError, refetchPatients, doctorsError, refetchDoctors, servicesError, refetchServices])

  if (isLoading) return <DataLoading message="Memuat data antrian..." />

  if (combinedError) return <DataError error={combinedError} onRetry={handleRetry} />

  const isNewPatientIncomplete =
    !newPatientForm.name.trim() ||
    !newPatientForm.nik.trim() ||
    !newPatientForm.birthDate ||
    !newPatientForm.address.trim() ||
    !newPatientForm.phone.trim()

  const isSubmitDisabled =
    (patientEntryMode === "new" ? isNewPatientIncomplete : !formData.patientId) ||
    isSubmitting
  const canPerformInitialExam =
    currentUser?.role === "admin" || currentUser?.role === "perawat" || currentUser?.role === "bidan"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pendaftaran Pasien</h1>
          <p className="text-muted-foreground text-sm">
            Tambah pasien baru, pendaftaran kunjungan, dan pemantauan antrian
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button onClick={() => openCreateDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Mulai Pendaftaran
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[1.75rem] border border-border/70 bg-background/90 p-6 shadow-[0_30px_60px_rgba(15,23,42,0.25)] backdrop-blur">
            <DialogHeader>
              <DialogTitle>
                {editingAppointment ? "Edit Data Pendaftaran" : "Form Pendaftaran Pasien"}
              </DialogTitle>
              <DialogDescription>
                {editingAppointment
                  ? "Perbarui tanggal, jam, atau catatan antrean pasien."
                  : "Daftarkan pasien ke antrean pemeriksaan awal perawat atau bidan."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Label>Pasien *</Label>
                  {!editingAppointment ? (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={patientEntryMode === "existing" ? "default" : "outline"}
                        onClick={() => changePatientEntryMode("existing")}
                      >
                        Pasien Lama
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={patientEntryMode === "new" ? "default" : "outline"}
                        onClick={() => changePatientEntryMode("new")}
                      >
                        Pasien Baru
                      </Button>
                    </div>
                  ) : null}
                </div>

                {(editingAppointment || patientEntryMode === "existing") && (
                  <PatientCombobox
                    patients={patients}
                    value={formData.patientId}
                    onValueChange={(value) => setFormData({ ...formData, patientId: value })}
                    placeholder="Cari dan pilih pasien..."
                    disabled={!!editingAppointment}
                  />
                )}
                {!editingAppointment && patientEntryMode === "new" && (
                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-x-5 gap-y-3 rounded-3xl border border-border/60 bg-surface/40 p-5 items-start">
                    <div className="sm:col-span-2 space-y-1">
                      <Label htmlFor="new-patient-name">Nama Lengkap *</Label>
                      <Input
                        id="new-patient-name"
                        value={newPatientForm.name}
                        onChange={(event) =>
                          setNewPatientForm((prev) => ({ ...prev, name: event.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <Label htmlFor="new-patient-nik">NIK *</Label>
                      <Input
                        id="new-patient-nik"
                        value={newPatientForm.nik}
                        onChange={(event) =>
                          setNewPatientForm((prev) => ({ ...prev, nik: event.target.value }))
                        }
                        maxLength={16}
                        required
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <Label htmlFor="new-patient-birthDate">Tanggal Lahir *</Label>
                      <Input
                        id="new-patient-birthDate"
                        type="date"
                        value={newPatientForm.birthDate}
                        onChange={(event) =>
                          setNewPatientForm((prev) => ({ ...prev, birthDate: event.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <Label htmlFor="new-patient-gender">Jenis Kelamin *</Label>
                      <Select
                        value={newPatientForm.gender}
                        onValueChange={(value) =>
                          setNewPatientForm((prev) => ({
                            ...prev,
                            gender: value as "Laki-laki" | "Perempuan",
                          }))
                        }
                      >
                        <SelectTrigger id="new-patient-gender">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                          <SelectItem value="Perempuan">Perempuan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <Label htmlFor="new-patient-phone">No. Telepon *</Label>
                      <Input
                        id="new-patient-phone"
                        value={newPatientForm.phone}
                        onChange={(event) =>
                          setNewPatientForm((prev) => ({ ...prev, phone: event.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <Label htmlFor="new-patient-email">Email</Label>
                      <Input
                        id="new-patient-email"
                        type="email"
                        value={newPatientForm.email}
                        onChange={(event) =>
                          setNewPatientForm((prev) => ({ ...prev, email: event.target.value }))
                        }
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <Label htmlFor="new-patient-bloodType">Golongan Darah</Label>
                      <Select
                        value={newPatientForm.bloodType || ""}
                        onValueChange={(value) =>
                          setNewPatientForm((prev) => ({ ...prev, bloodType: value as QuickPatientForm['bloodType'] }))
                        }
                      >
                        <SelectTrigger id="new-patient-bloodType">
                          <SelectValue placeholder="Pilih..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                          <SelectItem value="AB">AB</SelectItem>
                          <SelectItem value="O">O</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-4 space-y-1">
                      <Label htmlFor="new-patient-allergies">Alergi</Label>
                      <Input
                        id="new-patient-allergies"
                        value={newPatientForm.allergies}
                        onChange={(event) =>
                          setNewPatientForm((prev) => ({ ...prev, allergies: event.target.value }))
                        }
                        placeholder="Contoh: Penisilin, Udang"
                      />
                    </div>
                    <div className="sm:col-span-3 space-y-1">
                      <Label htmlFor="new-patient-emergencyContact">Kontak Darurat</Label>
                      <Input
                        id="new-patient-emergencyContact"
                        value={newPatientForm.emergencyContact}
                        onChange={(event) => setNewPatientForm((prev) => ({
                            ...prev,
                            emergencyContact: event.target.value,
                          }))}
                      />
                    </div>
                    <div className="sm:col-span-3 space-y-1">
                      <Label htmlFor="new-patient-emergencyPhone">No. Telepon Darurat</Label>
                      <Input
                        id="new-patient-emergencyPhone"
                        value={newPatientForm.emergencyPhone}
                        onChange={(event) => setNewPatientForm((prev) => ({
                            ...prev,
                            emergencyPhone: event.target.value,
                          }))}
                      />
                    </div>
                    <div className="sm:col-span-6 space-y-1">
                      <Label htmlFor="new-patient-address">Alamat *</Label>
                      <Textarea
                        id="new-patient-address"
                        value={newPatientForm.address}
                        onChange={(event) =>
                          setNewPatientForm((prev) => ({ ...prev, address: event.target.value }))
                        }
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tanggal *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    min={getLocalDateKey()}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Jam *</Label>
                  <Input
                    type="time"
                    value={formData.time}
                    onChange={(e) =>
                      setFormData({ ...formData, time: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Catatan Pendaftaran</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Keluhan singkat atau catatan administrasi (opsional)"
                />
              </div>

              <DialogFooter className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitDisabled}
                >
                  {isSubmitting
                    ? "Menyimpan..."
                    : editingAppointment
                      ? "Simpan Perubahan"
                      : "Daftarkan ke Antrean Awal"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Date Selector and Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Pilih Tanggal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {formatDate(selectedDate)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Menunggu
            </CardTitle>
            <Timer className="w-4 h-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{waitingCount}</div>
            <p className="text-xs text-muted-foreground">pasien</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sedang Diperiksa
            </CardTitle>
            <Stethoscope className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressCount}</div>
            <p className="text-xs text-muted-foreground">pasien</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Selesai
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCount}</div>
            <p className="text-xs text-muted-foreground">pasien</p>
          </CardContent>
        </Card>
      </div>

      {/* Queue Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base">Daftar Antrian</CardTitle>
              <CardDescription>
                Antrian kunjungan untuk tanggal {formatDate(selectedDate)}
                {carriedOverCount > 0 && `, termasuk ${carriedOverCount} antrean aktif dari hari sebelumnya`}
              </CardDescription>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={queueSearchTerm}
                onChange={(event) => setQueueSearchTerm(event.target.value)}
                placeholder="Cari pasien, dokter, layanan, no. antrian"
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="all">
                Semua ({filteredAppointments.length})
              </TabsTrigger>
              <TabsTrigger value="waiting">
                Menunggu ({waitingAppointments.length})
              </TabsTrigger>
              <TabsTrigger value="progress">
                Proses ({progressAppointments.length})
              </TabsTrigger>
              <TabsTrigger value="done">
                Selesai ({completedAppointments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <QueueTable
                appointments={filteredAppointments}
                selectedDate={selectedDate}
                onUpdateStatus={updateStatus}
                canPerformInitialExam={canPerformInitialExam}
                onOpenTriage={openTriageDialog}
                onEdit={openEditDialog}
                onStartExamination={handleStartExamination}
                onContinueExamination={handleContinueExamination}
                onDelete={handleDeleteAppointment}
              />
            </TabsContent>
            <TabsContent value="waiting">
              <QueueTable
                appointments={waitingAppointments}
                selectedDate={selectedDate}
                onUpdateStatus={updateStatus}
                canPerformInitialExam={canPerformInitialExam}
                onOpenTriage={openTriageDialog}
                onEdit={openEditDialog}
                onStartExamination={handleStartExamination}
                onContinueExamination={handleContinueExamination}
                onDelete={handleDeleteAppointment}
              />
            </TabsContent>
            <TabsContent value="progress">
              <QueueTable
                appointments={progressAppointments}
                selectedDate={selectedDate}
                onUpdateStatus={updateStatus}
                canPerformInitialExam={canPerformInitialExam}
                onOpenTriage={openTriageDialog}
                onEdit={openEditDialog}
                onStartExamination={handleStartExamination}
                onContinueExamination={handleContinueExamination}
                onDelete={handleDeleteAppointment}
              />
            </TabsContent>
            <TabsContent value="done">
              <QueueTable
                appointments={completedAppointments}
                selectedDate={selectedDate}
                onUpdateStatus={updateStatus}
                canPerformInitialExam={canPerformInitialExam}
                onOpenTriage={openTriageDialog}
                onEdit={openEditDialog}
                onStartExamination={handleStartExamination}
                onContinueExamination={handleContinueExamination}
                onDelete={handleDeleteAppointment}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={Boolean(triageAppointment)} onOpenChange={(open) => {
        if (!open) closeTriageDialog()
      }}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl gap-3 overflow-x-hidden overflow-y-auto p-5 sm:p-6">
          <DialogHeader className="pr-8">
            <DialogTitle>Pemeriksaan Awal</DialogTitle>
            <DialogDescription>
              Catat kondisi awal, lalu tentukan dokter dan layanan tujuan pasien.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTriageSubmit} className="space-y-4">
            {triageAppointment && (
              <div className="rounded-lg border border-border/60 p-3 text-sm">
                <p className="font-medium">{triageAppointment.patientName}</p>
                <p className="text-muted-foreground">No. antrean {triageAppointment.queueNumber}</p>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Dokter Tujuan *</Label>
                <Select
                  value={triageForm.doctorId}
                  onValueChange={handleTriageDoctorSelect}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Pilih dokter" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors
                      .filter((doctor) => doctor.status === "Aktif")
                      .map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          {doctor.name} - {doctor.specialization}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Layanan *</Label>
                <Popover modal>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex h-10 w-full items-center justify-between gap-3 rounded-md border border-input bg-transparent px-3 text-left text-sm font-medium text-foreground shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      <span className="truncate">
                        {triageForm.serviceIds.length > 0
                          ? services
                              .filter((service) => triageForm.serviceIds.includes(service.id))
                              .map((service) => service.name)
                              .join(", ")
                          : "Pilih layanan"}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-full max-w-md p-4">
                    <div className="flex max-h-72 flex-col gap-3 overflow-y-auto">
                      {services.filter((service) => service.status === "Aktif").length === 0 ? (
                        <p className="text-xs text-muted-foreground">Belum ada layanan aktif saat ini.</p>
                      ) : (
                        services
                          .filter((service) => service.status === "Aktif")
                          .map((service) => (
                            <label
                              key={service.id}
                              className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/40 p-3"
                            >
                              <Checkbox
                                checked={triageForm.serviceIds.includes(service.id)}
                                onCheckedChange={(checked) =>
                                  toggleTriageService(service.id, checked === true)
                                }
                              />
                              <span className="text-sm">
                                {service.name} · Rp {service.price.toLocaleString("id-ID")}
                              </span>
                            </label>
                          ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Keluhan Awal</Label>
              <Textarea
                className="min-h-20 resize-y"
                value={triageForm.complaints}
                onChange={(event) => setTriageForm({ ...triageForm, complaints: event.target.value })}
                placeholder="Keluhan yang disampaikan pasien sebelum pemeriksaan"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div className="min-w-0 space-y-2">
                <Label>Tekanan Darah</Label>
                <Select value={triageForm.bloodPressure} onValueChange={(value) => setTriageForm({ ...triageForm, bloodPressure: value })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih tekanan darah" /></SelectTrigger>
                  <SelectContent>
                    {bloodPressureOptions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-2">
                <Label>Detak Jantung</Label>
                <Select value={triageForm.heartRate} onValueChange={(value) => setTriageForm({ ...triageForm, heartRate: value })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih detak jantung" /></SelectTrigger>
                  <SelectContent>
                    {heartRateOptions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-2">
                <Label>Suhu Tubuh</Label>
                <Select value={triageForm.temperature} onValueChange={(value) => setTriageForm({ ...triageForm, temperature: value })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih suhu tubuh" /></SelectTrigger>
                  <SelectContent>
                    {temperatureOptions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-2">
                <Label>Gula Darah</Label>
                <Select value={triageForm.bloodGlucose} onValueChange={(value) => setTriageForm({ ...triageForm, bloodGlucose: value })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih gula darah" /></SelectTrigger>
                  <SelectContent>
                    {bloodGlucoseOptions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-2">
                <Label>Saturasi Oksigen</Label>
                <Select value={triageForm.oxygenSaturation} onValueChange={(value) => setTriageForm({ ...triageForm, oxygenSaturation: value })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih saturasi oksigen" /></SelectTrigger>
                  <SelectContent>
                    {oxygenSaturationOptions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-2">
                <Label>Berat Badan</Label>
                <Select value={triageForm.weight} onValueChange={(value) => setTriageForm({ ...triageForm, weight: value })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih berat badan" /></SelectTrigger>
                  <SelectContent>
                    {weightOptions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-2">
                <Label>Tinggi Badan</Label>
                <Select value={triageForm.height} onValueChange={(value) => setTriageForm({ ...triageForm, height: value })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih tinggi badan" /></SelectTrigger>
                  <SelectContent>
                    {heightOptions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-2">
                <Label>Laju Pernapasan</Label>
                <Select value={triageForm.respiratoryRate} onValueChange={(value) => setTriageForm({ ...triageForm, respiratoryRate: value })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih laju pernapasan" /></SelectTrigger>
                  <SelectContent>
                    {respiratoryRateOptions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea
                className="min-h-20 resize-y"
                value={triageForm.notes}
                onChange={(event) => setTriageForm({ ...triageForm, notes: event.target.value })}
                placeholder="Catatan observasi awal, alergi yang disampaikan, atau instruksi prioritas"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeTriageDialog}>Batal</Button>
              <Button
                type="submit"
                disabled={!triageForm.doctorId || triageForm.serviceIds.length === 0}
              >
                Simpan Pemeriksaan Awal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingAppointmentId)} onOpenChange={(open) => !open && setDeletingAppointmentId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Antrian</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus antrian ini? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingAppointmentId(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmDeleteAppointment}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

function QueueTable({
  appointments,
  selectedDate,
  onUpdateStatus,
  canPerformInitialExam,
  onOpenTriage,
  onEdit,
  onStartExamination,
  onContinueExamination,
  onDelete,
}: {
  appointments: Appointment[]
  selectedDate: string
  onUpdateStatus: (id: string, status: Appointment["status"]) => void
  canPerformInitialExam: boolean
  onOpenTriage: (appointment: Appointment) => void
  onEdit: (appointment: Appointment) => void
  onStartExamination: (appointmentId: string) => void
  onContinueExamination: (appointmentId: string) => void
  onDelete: (id: string) => void
}) {
  const queuePagination = useDataPagination(appointments)

  return (
    <div className="space-y-3">
      <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">No.</TableHead>
            <TableHead>Pasien</TableHead>
            <TableHead className="hidden md:table-cell">Dokter</TableHead>
            <TableHead className="hidden lg:table-cell">Layanan</TableHead>
            <TableHead className="hidden md:table-cell">Jam</TableHead>
            <TableHead>Triase</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                Belum ada data antrian.
              </TableCell>
            </TableRow>
          ) : (
            queuePagination.paginatedItems.map((appt) => (
              <TableRow key={appt.id}>
                <TableCell>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {appt.queueNumber}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{appt.patientName}</p>
                    {isCarriedOverAppointment(appt, selectedDate) && (
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                        Antrean lama · {formatDate(normalizeDateKey(appt.date))}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground md:hidden">
                      {appt.doctorId ? appt.doctorName : "Menunggu pemeriksaan awal"}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {appt.doctorId ? appt.doctorName : "Belum ditentukan"}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {appt.serviceNames?.length
                    ? appt.serviceNames.join(", ")
                    : appt.serviceName || "Belum ditentukan"}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {appt.time}
                  </div>
                </TableCell>
                <TableCell>
                  {canPerformInitialExam ? (
                    <Button
                      size="sm"
                      variant={appt.triage ? "secondary" : "outline"}
                      onClick={() => onOpenTriage(appt)}
                    >
                      <ClipboardPlus className="w-3 h-3 mr-1" />
                      {appt.triage ? "Tercatat" : "Pemeriksaan Awal"}
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {appt.triage ? "Tercatat" : "Menunggu"}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[appt.status]}>{appt.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    {appt.status === "Dipanggil" && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => onStartExamination(appt.id)}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <UserCheck className="w-3 h-3 mr-1" />
                        Mulai Periksa
                      </Button>
                    )}

                    {appt.status === "Diperiksa" && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => onContinueExamination(appt.id)}
                      >
                        <Stethoscope className="w-3 h-3 mr-1" />
                        Lanjut Periksa
                      </Button>
                    )}

                    {appt.status === "Menunggu" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onUpdateStatus(appt.id, "Batal")}
                      >
                        <XCircle className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit(appt)}
                      className="gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      <span className="text-xs">Edit</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDelete(appt.id)}
                      className="gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span className="text-xs">Hapus</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      </div>
      <DataPagination page={queuePagination.page} totalItems={queuePagination.totalItems} totalPages={queuePagination.totalPages} onPageChange={queuePagination.setPage} itemLabel="antrean" />
    </div>
  )
}
