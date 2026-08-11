"use client"

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataPagination, useDataPagination } from "@/components/data-pagination";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MedicalCodePicker, type SelectedMedicalCode } from "@/components/medical-code-picker";
import { Textarea } from "@/components/ui/textarea";
import { DataError, DataLoading, useClinicData } from "@/hooks/use-clinic-data";
import { useToast } from "@/hooks/use-toast";
import type {
    Appointment,
    ClinicalDecision,
    Doctor,
    EquipmentUsage,
    LabResult,
    MedicalCode,
    MedicalEquipment,
    MedicalRecord,
    Medicine,
    Patient,
    PaymentRecord,
    Prescription,
    ReferralFacility,
    Service,
    VitalSigns,
} from "@/lib/auth-types";
import { getCurrentUser } from "@/lib/auth-utils";
import {
    calculateAge,
    createAdmission,
    deleteMedicalRecord,
    finishVisitExamWorkflow,
    formatCurrency,
    formatDate,
    startVisitExamWorkflow,
    updateAppointment,
} from "@/lib/clinic-utils";
import {
    Activity,
    ClipboardPlus,
    FileText,
    Heart,
    Loader2,
    Pencil,
    Pill,
    Plus,
    Stethoscope,
    Thermometer,
    Trash,
    Wrench,
    X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const clinicalDecisionLabels: Record<ClinicalDecision, string> = {
  "prescription": "Pulang + Resep",
  "lab-required": "Perlu Laboratorium",
  "radiology-required": "Perlu Radiologi",
  "referral": "Rujukan",
  "observation": "Observasi",
  "inpatient-required": "Perlu Rawat Inap",
  "outpatient-discharge": "Pulang Tanpa Resep",
}

const clinicalDecisionDescriptions: Record<ClinicalDecision, string> = {
  "prescription": "Pasien pulang hari ini; resep di bawah akan diteruskan ke farmasi untuk diambil.",
  "lab-required": "Order laboratorium akan dibuat otomatis agar analis lab dapat memproses pemeriksaan penunjang.",
  "radiology-required": "Order radiologi akan dibuat agar unit radiologi dapat memproses pemeriksaan penunjang.",
  "referral": "Pasien dirujuk ke fasilitas atau poli lain yang dituliskan di bawah.",
  "observation": "Pasien tetap di klinik untuk dipantau sesuai catatan observasi di bawah, belum dinyatakan rawat inap.",
  "inpatient-required": "Pasien akan otomatis masuk ke daftar tunggu Rawat Inap setelah hasil pemeriksaan disimpan.",
  "outpatient-discharge": "Pasien pulang hari ini tanpa resep obat.",
}

type TriageForm = VitalSigns & {
  doctorId: string
  serviceId: string
  complaints: string
  notes: string
}

const createEmptyTriageForm = (): TriageForm => ({
  doctorId: "",
  serviceId: "",
  complaints: "",
  notes: "",
  bloodPressure: "",
  heartRate: "",
  temperature: "",
  bloodGlucose: "",
  oxygenSaturation: "",
  weight: "",
  height: "",
  respiratoryRate: "",
})

const getTriageVitalSigns = (appointment?: Appointment | null): VitalSigns => ({
  bloodPressure: appointment?.triage?.vitalSigns?.bloodPressure ?? "",
  heartRate: appointment?.triage?.vitalSigns?.heartRate ?? "",
  temperature: appointment?.triage?.vitalSigns?.temperature ?? "",
  bloodGlucose: appointment?.triage?.vitalSigns?.bloodGlucose ?? "",
  oxygenSaturation: appointment?.triage?.vitalSigns?.oxygenSaturation ?? "",
  weight: appointment?.triage?.vitalSigns?.weight ?? "",
  height: appointment?.triage?.vitalSigns?.height ?? "",
  respiratoryRate: appointment?.triage?.vitalSigns?.respiratoryRate ?? "",
})

export default function RekamMedisPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { data: records = [], loading: recordsLoading, error: recordsError, refetch: refetchRecords } = useClinicData<MedicalRecord>("medical-records");
  const { data: patients = [], loading: patientsLoading, error: patientsError, refetch: refetchPatients } = useClinicData<Patient>("patients");
  const { data: appointments = [], loading: appointmentsLoading, error: appointmentsError, refetch: refetchAppointments } = useClinicData<Appointment>("appointments");
  const { data: doctors = [], loading: doctorsLoading, error: doctorsError, refetch: refetchDoctors } = useClinicData<Doctor>("doctors");
  const { data: medicines = [], loading: medicinesLoading, error: medicinesError, refetch: refetchMedicines } = useClinicData<Medicine>("medicines");
  const { data: services = [], loading: servicesLoading, error: servicesError, refetch: refetchServices } = useClinicData<Service>("services");
  const { data: medicalCodes = [] } = useClinicData<MedicalCode>("medical-codes");
  const { data: payments = [], loading: paymentsLoading, error: paymentsError, refetch: refetchPayments } = useClinicData<PaymentRecord>("payments");
  const { data: equipments = [], loading: equipmentsLoading, error: equipmentsError, refetch: refetchEquipments } = useClinicData<MedicalEquipment>("medical-equipments");
  const { data: labResults = [], loading: labResultsLoading, error: labResultsError, refetch: refetchLabResults } = useClinicData<LabResult>("lab-results");
  const { data: referralFacilities = [] } = useClinicData<ReferralFacility>("referral-facilities");
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewingRecord, setViewingRecord] = useState<MedicalRecord | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingRecord, setDeletingRecord] = useState<MedicalRecord | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [triageAppointment, setTriageAppointment] = useState<Appointment | null>(null)
  const [triageForm, setTriageForm] = useState<TriageForm>(createEmptyTriageForm())
  const [isSavingTriage, setIsSavingTriage] = useState(false)
  const [isSavingExam, setIsSavingExam] = useState(false)
  const [examValidationMessage, setExamValidationMessage] = useState<string | null>(null)
  const [activeExamTab, setActiveExamTab] = useState("info")
  const [formData, setFormData] = useState({
    appointmentId: "",
    diagnosis: "",
    symptoms: "",
    treatment: "",
    notes: "",
  })
  const [vitalSigns, setVitalSigns] = useState<VitalSigns>({
    bloodPressure: "",
    heartRate: "",
    temperature: "",
    bloodGlucose: "",
    oxygenSaturation: "",
    weight: "",
    height: "",
    respiratoryRate: "",
  })
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [medicinePickerOpen, setMedicinePickerOpen] = useState(false)
  const [diagnosisCodes, setDiagnosisCodes] = useState<SelectedMedicalCode[]>([])
  const [procedureCodes, setProcedureCodes] = useState<SelectedMedicalCode[]>([])
  const [selectedEquipments, setSelectedEquipments] = useState<EquipmentUsage[]>([])
  const [equipmentPickerOpen, setEquipmentPickerOpen] = useState(false)
  const [clinicalDecision, setClinicalDecision] = useState<ClinicalDecision>("prescription")
  const [referralDestination, setReferralDestination] = useState("")
  const [observationNotes, setObservationNotes] = useState("")
  const [currentUser] = useState(() => getCurrentUser())
  const autoOpenedAppointmentRef = useRef<string | null>(null)

  const handleAppointmentSelect = useCallback(async (appointmentId: string, openDialog = false) => {
    let appt = appointments.find((appointment) => appointment.id === appointmentId)
    if (appt?.status === "Dipanggil") {
      try {
        const startedAppointment = await startVisitExamWorkflow(appointmentId)
        appt = {
          ...appt,
          ...startedAppointment,
          // Status kunjungan berubah, tetapi hasil triase harus tetap menjadi
          // nilai awal pemeriksaan dokter.
          triage: startedAppointment.triage ?? appt.triage,
        }
        await refetchAppointments()
      } catch (error) {
        console.error("Gagal memulai pemeriksaan dari Ruang Pemeriksaan:", error)
        toast({
          title: "Pemeriksaan Belum Dimulai",
          description: "Kunjungan tidak dapat dipindahkan ke pemeriksaan dokter. Muat ulang data lalu coba kembali.",
          variant: "destructive",
        })
        return
      }
    }
    setSelectedAppointment(appt || null)
    setFormData((currentFormData) => ({
      ...currentFormData,
      appointmentId,
      symptoms: appt?.triage?.complaints ?? "",
    }))
    setVitalSigns(getTriageVitalSigns(appt))
    if (openDialog) {
      setIsDialogOpen(true)
    }
  }, [appointments, refetchAppointments, toast])

  const loadData = useCallback(async () => {
    await Promise.all([
      refetchRecords(),
      refetchPatients(),
      refetchAppointments(),
      refetchDoctors(),
      refetchMedicines(),
      refetchServices(),
      refetchPayments(),
      refetchEquipments(),
      refetchLabResults(),
    ]);
  }, [refetchRecords, refetchPatients, refetchAppointments, refetchDoctors, refetchMedicines, refetchServices, refetchPayments, refetchEquipments, refetchLabResults]);

  useEffect(() => {
    if (!currentUser) {
      router.push("/login")
    }

    // Cek jika ada appointmentId dari URL untuk langsung membuka form
    const appointmentIdFromUrl = searchParams.get("appointmentId");
    if (
      appointmentIdFromUrl &&
      appointments.length > 0 &&
      autoOpenedAppointmentRef.current !== appointmentIdFromUrl
    ) {
      const appointment = appointments.find(a => a.id === appointmentIdFromUrl);
      // Pastikan belum ada record untuk appointment ini
      const recordExists = records.some(r => r.appointmentId === appointmentIdFromUrl);
      if (appointment && !recordExists) {
        // Tandai sebelum memperbarui state agar render berikutnya tidak membuka
        // dialog yang sama berulang kali.
        autoOpenedAppointmentRef.current = appointmentIdFromUrl
        void handleAppointmentSelect(appointmentIdFromUrl, true); // Buka dialog secara otomatis
        // Hapus query param agar tidak memicu lagi saat refresh
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }

  }, [router, currentUser, appointments, records, handleAppointmentSelect])

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refetchAppointments()
    }, 15000)

    return () => window.clearInterval(interval)
  }, [refetchAppointments])

  // Dokter dapat mengambil pasien yang triase-nya sudah selesai atau melanjutkan
  // kunjungan yang telah berada dalam pemeriksaan aktif.
  const unrecordedAppointments = appointments.filter((appointment) => {
    const normalizedStatus = appointment.status.trim()
    return (
      (normalizedStatus === "Diperiksa" ||
        (normalizedStatus === "Dipanggil" && Boolean(appointment.triage))) &&
      !records.some((record) => record.appointmentId === appointment.id)
    )
  })

  const activeVisitAppointments = appointments
    .filter(
      (appointment) =>
        ["Menunggu", "Dipanggil", "Diperiksa"].includes(appointment.status.trim()) &&
        !records.some((record) => record.appointmentId === appointment.id),
    )
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`) || a.queueNumber - b.queueNumber)
  const activeVisitPagination = useDataPagination(activeVisitAppointments)
  const waitingTriageAppointments = activeVisitAppointments.filter(
    (appointment) => appointment.status === "Menunggu" || !appointment.triage,
  )
  const readyForDoctorAppointments = activeVisitAppointments.filter(
    (appointment) => appointment.status === "Dipanggil" && Boolean(appointment.triage),
  )
  const inExaminationAppointments = activeVisitAppointments.filter((appointment) => appointment.status === "Diperiksa")
  const canPerformInitialExam =
    currentUser?.role === "admin" || currentUser?.role === "perawat" || currentUser?.role === "bidan"
  const canPerformDoctorExam =
    currentUser?.role === "admin" || currentUser?.role === "dokter" || currentUser?.role === "bidan"

  const selectedPatientLabResults = selectedAppointment
    ? labResults
        .filter((result) => result.patientId === selectedAppointment.patientId)
        .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())
    : []

  const getRecordPricing = (record: MedicalRecord) => {
    const appointment = appointments.find((a) => a.id === record.appointmentId)
    const appointmentServiceIds =
      appointment?.serviceIds?.length && appointment.serviceIds.length > 0
        ? appointment.serviceIds
        : appointment?.serviceId
          ? [appointment.serviceId]
          : []
    const resolvedServices = appointmentServiceIds
      .map((id) => services.find((service) => service.id === id))
      .filter((service): service is Service => Boolean(service))
    const serviceCost = resolvedServices.reduce((sum, service) => sum + service.price, 0)
    const serviceNames =
      resolvedServices.length > 0
        ? resolvedServices.map((s) => s.name)
        : appointment?.serviceName
          ? [appointment.serviceName]
          : ["Layanan Klinik"]
    const medicineCost = (record.prescription ?? []).reduce((sum, rx) => {
      const medicine = medicines.find((m) => m.id === rx.medicineId)
      return sum + (medicine?.price ?? 0) * rx.quantity
    }, 0)
    return {
      serviceCost,
      medicineCost,
      total: serviceCost + medicineCost,
      serviceNames,
    }
  }

  const isRecordPaid = (recordId: string) => payments.some((payment) => payment.medicalRecordId === recordId)

  const getAppointmentServiceLabel = (appointment?: Appointment | null) => {
    if (!appointment) return "-"
    if (appointment.serviceNames?.length) return appointment.serviceNames.join(", ")
    return appointment.serviceName || "-"
  }

  const viewingRecordPricing = viewingRecord ? getRecordPricing(viewingRecord) : null
  const viewingRecordPaid = viewingRecord ? isRecordPaid(viewingRecord.id) : false
  const viewingAppointment = viewingRecord
    ? appointments.find((appointment) => appointment.id === viewingRecord.appointmentId)
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setExamValidationMessage(null)
    const appointmentId = selectedAppointment?.id ?? editingRecord?.appointmentId
    const patientId = selectedAppointment?.patientId ?? editingRecord?.patientId
    const doctorId = selectedAppointment?.doctorId ?? editingRecord?.doctorId
    const doctorName = selectedAppointment?.doctorName ?? editingRecord?.doctorName
    if (!appointmentId || !patientId || !doctorId || !doctorName) {
      console.error("Kunjungan tidak lengkap untuk penyimpanan pemeriksaan:", {
        appointmentId,
        patientId,
        doctorId,
        doctorName,
      })
      toast({
        title: "Data Kunjungan Tidak Lengkap",
        description: "Pasien atau dokter belum terhubung ke kunjungan. Pilih kembali pasien dari daftar pemeriksaan.",
        variant: "destructive",
      })
      setExamValidationMessage("Data pasien atau dokter pada kunjungan belum lengkap.")
      return
    }

    const diagnosis = formData.diagnosis.trim() ||
      diagnosisCodes.map((item) => item.label).join(", ")
    const treatment = formData.treatment.trim() ||
      procedureCodes.map((item) => item.label).join(", ")
    const missingFields = [
      !formData.symptoms.trim() ? "Keluhan / Gejala" : null,
      !diagnosis ? "Diagnosis atau Kode Diagnosis" : null,
      !treatment ? "Tindakan / Penanganan atau Kode Tindakan" : null,
    ].filter((field): field is string => Boolean(field))

    if (missingFields.length > 0) {
      const diagnosisIncomplete = !formData.symptoms.trim() || !diagnosis
      setActiveExamTab(diagnosisIncomplete ? "info" : "codes")
      const message = `Lengkapi terlebih dahulu: ${missingFields.join(", ")}.`
      setExamValidationMessage(message)
      toast({
        title: "Data Pemeriksaan Belum Lengkap",
        description: message,
        variant: "destructive",
      })
      return
    }

    if (clinicalDecision === "referral" && !referralDestination.trim()) {
      setActiveExamTab("decision")
      setExamValidationMessage("Isi fasilitas atau tujuan rujukan sebelum menyimpan pemeriksaan.")
      toast({
        title: "Tujuan Rujukan Belum Diisi",
        description: "Isi fasilitas atau tujuan rujukan sebelum menyimpan pemeriksaan.",
        variant: "destructive",
      })
      return
    }

    setIsSavingExam(true)
    try {
      const recordPayload = {
        diagnosis,
        symptoms: formData.symptoms,
        treatment,
        doctorId,
        doctorName,
        diagnosisCodes: diagnosisCodes.map((item) => ({ ...item })),
        procedureCodes: procedureCodes.map((item) => ({ ...item })),
        prescription: prescriptions,
        equipmentsUsed: selectedEquipments,
        vitalSigns: vitalSigns,
        clinicalDecision,
        referralDestination: clinicalDecision === "referral" ? referralDestination : undefined,
        observationNotes: clinicalDecision === "observation" ? observationNotes : undefined,
        notes: formData.notes,
      }

      const workflowResult = await finishVisitExamWorkflow(appointmentId, recordPayload)
      const savedRecord: MedicalRecord = workflowResult.medicalRecord

      let shouldOpenInpatientAdmission = false

      // Jika dokter memutuskan rawat inap, buat entri di modul rawat inap
      if (clinicalDecision === "inpatient-required" && savedRecord) {
        await createAdmission({
          patientId: patientId,
          patientName: selectedAppointment?.patientName ?? getPatientById(patientId)?.name ?? 'N/A',
          medicalRecordId: savedRecord.id,
          attendingDoctorId: doctorId,
          attendingDoctorName: doctorName,
          admittedAt: new Date().toISOString(),
          status: 'pending',
        });
        toast({
          title: "Rekomendasi Rawat Inap Dibuat",
          description: `Pasien ${selectedAppointment?.patientName ?? getPatientById(patientId)?.name ?? 'N/A'} telah ditambahkan ke antrian rawat inap.`,
        });
        shouldOpenInpatientAdmission = true
      }

      resetForm()
      await loadData()
      toast({
        title: "Pemeriksaan Tersimpan",
        description: "Rekam medis pasien tersimpan dan status kunjungan berubah menjadi Selesai.",
      })
      if (shouldOpenInpatientAdmission) {
        router.push("/rawat-inap?tab=penerimaan")
      }
    } catch (error) {
      console.error("Gagal menyimpan hasil pemeriksaan", error)
      const message = error instanceof Error
        ? error.message
        : "Rekam medis atau status kunjungan gagal disimpan. Silakan coba kembali."
      setExamValidationMessage(message)
      toast({
        title: "Pemeriksaan Belum Tersimpan",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsSavingExam(false)
    }
  }

  const resetForm = () => {
    setFormData({
      appointmentId: "",
      diagnosis: "",
      symptoms: "",
      treatment: "",
      notes: "",
    })
    setVitalSigns({
      bloodPressure: "",
      heartRate: "",
      temperature: "",
      bloodGlucose: "",
      oxygenSaturation: "",
      weight: "",
      height: "",
      respiratoryRate: "",
    })
    setPrescriptions([])
    setMedicinePickerOpen(false)
    setDiagnosisCodes([])
    setProcedureCodes([])
    setSelectedEquipments([])
    setEquipmentPickerOpen(false)
    setSelectedAppointment(null)
    setExamValidationMessage(null)
    setActiveExamTab("info")
    setClinicalDecision("prescription")
    setReferralDestination("")
    setObservationNotes("")
    setIsDialogOpen(false)
    setIsEditMode(false)
    setEditingRecord(null)
  }

  const _handleView = (record: MedicalRecord) => {
    setViewingRecord(record)
    setIsViewDialogOpen(true)
  }

  const handleEdit = (record: MedicalRecord) => {
    const patient = patients.find((p) => p.id === record.patientId)
    const fallbackAppointment: Appointment = {
      id: record.appointmentId,
      patientId: record.patientId,
      patientName: patient?.name ?? "Pasien",
      doctorId: record.doctorId,
      doctorName: record.doctorName,
      serviceId: "",
      serviceName: "",
      serviceIds: [],
      serviceNames: [],
      date: record.date,
      time: "",
      status: "Selesai",
      queueNumber: 0,
      createdAt: record.createdAt,
    }
    const appointmentForRecord =
      appointments.find((a) => a.id === record.appointmentId) ?? fallbackAppointment
    setIsEditMode(true)
    setEditingRecord(record)
    setSelectedAppointment(appointmentForRecord)
    setFormData({
      appointmentId: record.appointmentId,
      diagnosis: record.diagnosis,
      symptoms: record.symptoms,
      treatment: record.treatment,
      notes: record.notes ?? "",
    })
    setVitalSigns({
      bloodPressure: record.vitalSigns?.bloodPressure ?? "",
      heartRate: record.vitalSigns?.heartRate ?? "",
      temperature: record.vitalSigns?.temperature ?? "",
      bloodGlucose: record.vitalSigns?.bloodGlucose ?? "",
      oxygenSaturation: record.vitalSigns?.oxygenSaturation ?? "",
      weight: record.vitalSigns?.weight ?? "",
      height: record.vitalSigns?.height ?? "",
      respiratoryRate: record.vitalSigns?.respiratoryRate ?? "",
    })
    setPrescriptions(record.prescription ? record.prescription.map((rx) => ({ ...rx })) : [])
    setDiagnosisCodes(record.diagnosisCodes?.map((item) => ({ code: item.code, label: item.label })) ?? [])
    setProcedureCodes(record.procedureCodes?.map((item) => ({ code: item.code, label: item.label })) ?? [])
    setSelectedEquipments(
      record.equipmentsUsed ? record.equipmentsUsed.map((eq) => ({ ...eq })) : []
    )
    setClinicalDecision(record.clinicalDecision ?? "prescription")
    setReferralDestination(record.referralDestination ?? "")
    setObservationNotes(record.observationNotes ?? "")
    setActiveExamTab("info")
    setIsDialogOpen(true)
  }

  const openDeleteDialog = (record: MedicalRecord) => {
    setDeletingRecord(record);
    setIsDeleteDialogOpen(true);
  }

  const handleDelete = async () => {
    if (!deletingRecord) return

    try {
      await deleteMedicalRecord(deletingRecord.id)
      if (viewingRecord?.id === deletingRecord.id) {
        setIsViewDialogOpen(false)
        setViewingRecord(null)
      }
      await loadData()
    } catch (error) {
      console.error("Gagal menghapus hasil pemeriksaan", error)
    } finally {
      setIsDeleteDialogOpen(false)
      setDeletingRecord(null)
    }
  }

  const addPrescription = (medicine: Medicine) => {
    if (prescriptions.some((p) => p.medicineId === medicine.id)) return
    setPrescriptions([
      ...prescriptions,
      {
        medicineId: medicine.id,
        medicineName: medicine.name,
        dosage: "",
        frequency: "",
        duration: "",
        quantity: 1,
        notes: "",
      },
    ])
  }

  const updatePrescription = (index: number, field: keyof Prescription, value: string | number) => {
    const updated = prescriptions.map((p, i) =>
      i === index ? { ...p, [field]: value } : p
    )
    setPrescriptions(updated)
  }

  const removePrescription = (index: number) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index))
  }

  const openTriageDialog = (appointment: Appointment) => {
    setTriageAppointment(appointment)
    setTriageForm({
      doctorId: appointment.doctorId ?? "",
      serviceId: appointment.serviceId || appointment.serviceIds?.[0] || "",
      complaints: appointment.triage?.complaints ?? "",
      notes: appointment.triage?.notes ?? "",
      bloodPressure: appointment.triage?.vitalSigns.bloodPressure ?? "",
      heartRate: appointment.triage?.vitalSigns.heartRate ?? "",
      temperature: appointment.triage?.vitalSigns.temperature ?? "",
      bloodGlucose: appointment.triage?.vitalSigns.bloodGlucose ?? "",
      oxygenSaturation: appointment.triage?.vitalSigns.oxygenSaturation ?? "",
      weight: appointment.triage?.vitalSigns.weight ?? "",
      height: appointment.triage?.vitalSigns.height ?? "",
      respiratoryRate: appointment.triage?.vitalSigns.respiratoryRate ?? "",
    })
  }

  const closeTriageDialog = () => {
    setTriageAppointment(null)
    setTriageForm(createEmptyTriageForm())
  }

  const handleTriageSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!triageAppointment) return

    const doctor = doctors.find((item) => item.id === triageForm.doctorId)
    const service = services.find((item) => item.id === triageForm.serviceId)
    if (!doctor || !service) {
      toast({
        title: "Dokter dan Layanan Belum Dipilih",
        description: "Tentukan dokter tujuan dan layanan sebelum menyimpan triase.",
        variant: "destructive",
      })
      return
    }

    setIsSavingTriage(true)
    try {
      await updateAppointment(triageAppointment.id, {
        doctorId: doctor.id,
        doctorName: doctor.name,
        serviceId: service.id,
        serviceName: service.name,
        serviceIds: [service.id],
        serviceNames: [service.name],
        status: "Dipanggil",
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
      await refetchAppointments()
      closeTriageDialog()
      toast({
        title: "Triase Selesai",
        description: `${triageAppointment.patientName} otomatis masuk ke antrean dokter ${doctor.name}.`,
      })
    } catch (error) {
      console.error("Gagal menyimpan triase dari Ruang Pemeriksaan:", error)
      toast({
        title: "Triase Belum Tersimpan",
        description: "Data pemeriksaan awal belum berhasil disimpan. Silakan coba kembali.",
        variant: "destructive",
      })
    } finally {
      setIsSavingTriage(false)
    }
  }

  const toggleEquipment = (equipment: MedicalEquipment) => {
    setSelectedEquipments((currentEquipments) => {
      const exists = currentEquipments.some((entry) => entry.equipmentId === equipment.id)
      if (exists) {
        return currentEquipments.filter((entry) => entry.equipmentId !== equipment.id)
      }
      return [
        ...currentEquipments,
        {
          equipmentId: equipment.id,
          equipmentName: equipment.name,
          usageNotes: "",
        },
      ]
    })
  }

  const updateEquipmentNotes = (equipmentId: string, notes: string) => {
    setSelectedEquipments(
      selectedEquipments.map((e) =>
        e.equipmentId === equipmentId ? { ...e, usageNotes: notes } : e
      )
    )
  }

  const getPatientById = (id: string) => patients.find((p) => p.id === id)

  const availableMedicines = medicines.filter((m) => m.stock > 0 && m.status !== "Habis")
  const availableEquipments = equipments.filter((e) => e.status === "Tersedia" && e.condition === "Baik")
  const selectableMedicines = availableMedicines.filter(
    (medicine) => !prescriptions.some((prescription) => prescription.medicineId === medicine.id),
  )
  const selectableEquipments = availableEquipments.filter(
    (equipment) => !selectedEquipments.some((usage) => usage.equipmentId === equipment.id),
  )
  const viewingRecordLabResults = viewingRecord
    ? labResults
        .filter((result) => result.patientId === viewingRecord.patientId)
        .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())
    : []

  const isLoading = recordsLoading || patientsLoading || appointmentsLoading || doctorsLoading || medicinesLoading || servicesLoading || paymentsLoading || equipmentsLoading || labResultsLoading;
  const combinedError = recordsError || patientsError || appointmentsError || doctorsError || medicinesError || servicesError || paymentsError || equipmentsError || labResultsError;

  const handleRetry = () => {
    if (recordsError) refetchRecords();
    if (patientsError) refetchPatients();
    if (appointmentsError) refetchAppointments();
    if (doctorsError) refetchDoctors();
    if (medicinesError) refetchMedicines();
    if (servicesError) refetchServices();
    if (paymentsError) refetchPayments();
    if (equipmentsError) refetchEquipments();
    if (labResultsError) refetchLabResults();
  };

  if (isLoading) return <DataLoading />;
  if (combinedError) return <DataError error={combinedError} onRetry={handleRetry} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ruang Pemeriksaan</h1>
          <p className="text-muted-foreground text-sm">
            Catat hasil pemeriksaan dan tentukan tindak lanjut pasien
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} disabled={unrecordedAppointments.length === 0}>
              <Plus className="w-4 h-4 mr-2" />
              Pemeriksaan Dokter
            </Button>
          </DialogTrigger>
        <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-6xl overflow-x-hidden overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Perbarui Hasil Pemeriksaan" : "Mulai Pemeriksaan Dokter"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Sesuaikan detail pemeriksaan yang sudah tersimpan"
                : "Pilih pasien yang sudah menjalani pemeriksaan awal untuk melanjutkan pemeriksaan dokter"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="w-full min-w-0 space-y-6" noValidate>
              {!isEditMode ? (
                <div className="space-y-2">
                  <Label>Kunjungan *</Label>
                  <Select
                    value={formData.appointmentId}
                    onValueChange={(value) => handleAppointmentSelect(value)}
                  >
                    <SelectTrigger className="w-full min-w-0 overflow-hidden">
                      <SelectValue className="truncate" placeholder="Pilih kunjungan" />
                    </SelectTrigger>
                    <SelectContent>
                      {unrecordedAppointments.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Belum ada pasien dengan triase selesai
                        </SelectItem>
                      ) : (
                        unrecordedAppointments.map((appt) => (
                          <SelectItem key={appt.id} value={appt.id}>
                            {appt.patientName} - {formatDate(appt.date)} · {appt.status} (
                            {appt.serviceNames?.length
                              ? appt.serviceNames.join(", ")
                              : appt.serviceName}
                            )
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                selectedAppointment && (() => {
                  const patient = getPatientById(selectedAppointment?.patientId ?? editingRecord?.patientId ?? "");
                  return (
                    <div className="rounded-2xl border border-border/60 bg-transparent p-4 space-y-1">
                      <p className="text-xs text-muted-foreground">Kunjungan</p>
                      <p className="font-medium">
                        {patient?.name ?? "-"}
                        {patient && <span className="text-sm text-muted-foreground ml-2">({calculateAge(patient.birthDate)} thn, {patient.gender})</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Dokter: {selectedAppointment?.doctorName ?? editingRecord?.doctorName ?? "-"} | {formatDate(selectedAppointment?.date ?? editingRecord?.date ?? new Date().toISOString())}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Layanan: {getAppointmentServiceLabel(selectedAppointment)}
                      </p>
                    </div>
                  );
                })()
              )}

              {(selectedAppointment || editingRecord) && (
                <Tabs value={activeExamTab} onValueChange={setActiveExamTab} className="w-full min-w-0">
                  <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                    <TabsTrigger value="info">Diagnosis</TabsTrigger>
                    <TabsTrigger value="vitals">Vital Signs</TabsTrigger>
                    <TabsTrigger value="codes">Kode &amp; Kondisi</TabsTrigger>
                    <TabsTrigger value="prescription">Resep Obat</TabsTrigger>
                    <TabsTrigger value="equipment">Alat Medis</TabsTrigger>
                    <TabsTrigger value="decision">Keputusan</TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="space-y-4 mt-4">
                    {selectedAppointment && (() => {
                      const patient = getPatientById(selectedAppointment?.patientId ?? "");
                      return (
                        <div className="rounded-lg border border-border/60 bg-transparent p-3">
                          <p className="text-sm font-medium">{patient?.name ?? selectedAppointment?.patientName} <span className="text-xs text-muted-foreground">({patient ? `${calculateAge(patient.birthDate)} thn, ${patient.gender}` : '...'})</span></p>
                          <p className="text-xs text-muted-foreground">Dokter: {selectedAppointment?.doctorName} | {formatDate(selectedAppointment?.date ?? "")}</p>
                        </div>
                      );
                    })()}
                    {selectedAppointment?.triage ? (
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <p className="font-medium text-emerald-700 dark:text-emerald-300">Triase Perawat Tersedia</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedAppointment.triage.nurseName ? `Oleh ${selectedAppointment.triage.nurseName} | ` : ""}
                            {formatDate(selectedAppointment.triage.recordedAt)}
                          </p>
                        </div>
                        {selectedAppointment?.triage.complaints && (
                          <p className="mt-2 text-muted-foreground">Keluhan awal: {selectedAppointment.triage.complaints}</p>
                        )}
                        {selectedAppointment?.triage.notes && (
                          <p className="mt-1 text-muted-foreground">Catatan perawat: {selectedAppointment.triage.notes}</p>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border/70 p-3 text-xs text-muted-foreground">
                        Belum ada triase perawat untuk kunjungan ini. Dokter tetap dapat mengisi keluhan dan tanda vital secara manual.
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="symptoms">Keluhan / Gejala *</Label>
                      <Textarea
                        id="symptoms"
                        value={formData.symptoms}
                        onChange={(e) =>
                          setFormData({ ...formData, symptoms: e.target.value })
                        }
                        placeholder="Tuliskan keluhan pasien"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="diagnosis">Diagnosis *</Label>
                      <Textarea
                        id="diagnosis"
                        value={formData.diagnosis}
                        onChange={(e) =>
                          setFormData({ ...formData, diagnosis: e.target.value })
                        }
                        placeholder="Tuliskan diagnosis"
                        required
                      />
                    </div>

                    {selectedPatientLabResults.length > 0 && (
                      <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground">
                            Hasil Laboratorium Terbaru
                          </p>
                          <Badge variant="secondary" className="text-xs uppercase tracking-[0.3em]">
                            {selectedPatientLabResults.length} riwayat
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {selectedPatientLabResults.slice(0, 3).map((result) => (
                            <div
                              key={result.id}
                              className="rounded-2xl border border-border bg-card p-3 space-y-1"
                            >
                              <p className="text-sm font-semibold">{result.testName}</p>
                              <p className="text-xs text-muted-foreground">{result.resultValue}</p>
                              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                                {formatDate(result.performedAt)}
                              </p>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Nilai laboratorium secara otomatis ditarik dari modul Laboratorium sehingga dokter dapat merujuk hasil sebelum menyimpan pemeriksaan.
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="codes" className="mt-4 space-y-4">
                    <div className="rounded-lg border border-border/60 bg-transparent p-4">
                      <div className="mb-4">
                        <h4 className="font-medium">Kode Diagnosis & Kondisi Klinis</h4>
                        <p className="text-sm text-muted-foreground">
                          Lengkapi kode diagnosis, tindakan, dan catatan kondisi pasien.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Kode Diagnosa (ICD-10)</Label>
                          <MedicalCodePicker
                            system="icd10"
                            codes={medicalCodes}
                            value={diagnosisCodes}
                            onChange={setDiagnosisCodes}
                            placeholder="Cari kode/nama diagnosa ICD-10..."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="treatment">Tindakan / Penanganan *</Label>
                          <Textarea
                            id="treatment"
                            value={formData.treatment}
                            onChange={(e) =>
                              setFormData({ ...formData, treatment: e.target.value })
                            }
                            placeholder="Tuliskan tindakan yang diberikan"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Kode Tindakan (ICD-9-CM)</Label>
                          <MedicalCodePicker
                            system="icd9cm"
                            codes={medicalCodes}
                            value={procedureCodes}
                            onChange={setProcedureCodes}
                            placeholder="Cari kode/nama tindakan ICD-9-CM..."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="notes">Catatan Kondisi</Label>
                          <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) =>
                              setFormData({ ...formData, notes: e.target.value })
                            }
                            placeholder="Catatan kondisi pasien atau informasi tambahan (opsional)"
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="vitals" className="space-y-4 mt-4">
                    <div className="rounded-lg border border-border/60 bg-transparent p-4">
                      <h4 className="font-medium mb-4 flex items-center gap-2">
                        <Heart className="w-4 h-4 text-destructive" />
                        Tanda-Tanda Vital
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Tekanan Darah</Label>
                          <Input
                            placeholder="120/80 mmHg"
                            value={vitalSigns.bloodPressure}
                            onChange={(e) =>
                              setVitalSigns({ ...vitalSigns, bloodPressure: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Detak Jantung</Label>
                          <Input
                            placeholder="72 bpm"
                            value={vitalSigns.heartRate}
                            onChange={(e) =>
                              setVitalSigns({ ...vitalSigns, heartRate: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Suhu Tubuh</Label>
                          <Input
                            placeholder="36.5°C"
                            value={vitalSigns.temperature}
                            onChange={(e) =>
                              setVitalSigns({ ...vitalSigns, temperature: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Gula Darah</Label>
                          <Input
                            placeholder="110 mg/dL"
                            value={vitalSigns.bloodGlucose}
                            onChange={(e) =>
                              setVitalSigns({ ...vitalSigns, bloodGlucose: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Saturasi Oksigen</Label>
                          <Input
                            placeholder="98%"
                            value={vitalSigns.oxygenSaturation}
                            onChange={(e) =>
                              setVitalSigns({ ...vitalSigns, oxygenSaturation: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Berat Badan</Label>
                          <Input
                            placeholder="70 kg"
                            value={vitalSigns.weight}
                            onChange={(e) =>
                              setVitalSigns({ ...vitalSigns, weight: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tinggi Badan</Label>
                          <Input
                            placeholder="170 cm"
                            value={vitalSigns.height}
                            onChange={(e) =>
                              setVitalSigns({ ...vitalSigns, height: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Laju Pernapasan</Label>
                          <Input
                            placeholder="16/menit"
                            value={vitalSigns.respiratoryRate}
                            onChange={(e) =>
                              setVitalSigns({ ...vitalSigns, respiratoryRate: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="prescription" className="space-y-4 mt-4">
                    <div className="space-y-4">
                      <div className="w-full min-w-0">
                        <Label className="mb-2 block">Pilih Obat dari Stok</Label>
                        {prescriptions.length === 0 && (
                          <p className="mb-2 text-sm text-muted-foreground">Belum ada obat dipilih.</p>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          className="box-border w-full min-w-0 justify-start"
                          aria-expanded={medicinePickerOpen}
                          onClick={() => setMedicinePickerOpen((open) => !open)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          {medicinePickerOpen ? "Tutup Pilihan Obat" : "Tambah Obat"}
                        </Button>
                        {medicinePickerOpen && (
                          <div className="mt-2 box-border w-full min-w-0 overflow-hidden rounded-lg border bg-popover shadow-sm">
                            <Command
                              className="w-full min-w-0"
                              filter={(itemValue, searchTerm) =>
                                itemValue.toLocaleLowerCase("id-ID").includes(
                                  searchTerm.toLocaleLowerCase("id-ID"),
                                )
                                  ? 1
                                  : 0
                              }
                            >
                              <CommandInput
                                className="w-full min-w-0"
                                placeholder="Cari nama, merek, kategori, atau bentuk obat..."
                              />
                              <CommandList className="max-h-64 w-full">
                                <CommandEmpty>Obat tidak ditemukan.</CommandEmpty>
                                <CommandGroup>
                                  {selectableMedicines.map((medicine) => (
                                    <CommandItem
                                      key={medicine.id}
                                      className="w-full"
                                      value={`${medicine.name} ${medicine.genericName ?? ""} ${medicine.brandName ?? ""} ${medicine.category} ${medicine.form}`}
                                      onSelect={() => {
                                        addPrescription(medicine)
                                        setMedicinePickerOpen(false)
                                      }}
                                    >
                                      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                                        <div className="min-w-0">
                                          <p className="truncate font-medium">{medicine.name}</p>
                                          <p className="truncate text-xs text-muted-foreground">
                                            {medicine.form} · Stok {medicine.stock} {medicine.unit}
                                          </p>
                                        </div>
                                        <Badge
                                          variant={medicine.status === "Stok Rendah" ? "destructive" : "secondary"}
                                          className="shrink-0 text-xs"
                                        >
                                          {medicine.status}
                                        </Badge>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </div>
                        )}
                      </div>

                      {prescriptions.length > 0 && (
                        <div className="space-y-3">
                          <Label>Resep Obat yang Dipilih</Label>
                          {prescriptions.map((rx, index) => {
                            const med = medicines.find((m) => m.id === rx.medicineId)
                            return (
                              <div key={index} className="rounded-lg border border-border/60 bg-transparent p-3 space-y-3">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <span className="font-medium">{rx.medicineName}</span>
                                    <span className="text-xs text-muted-foreground ml-2">
                                      (Stok: {med?.stock || 0})
                                    </span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removePrescription(index)}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                  <Input
                                    placeholder="Dosis (500mg)"
                                    value={rx.dosage}
                                    onChange={(e) =>
                                      updatePrescription(index, "dosage", e.target.value)
                                    }
                                  />
                                  <Input
                                    placeholder="Frekuensi (3x sehari)"
                                    value={rx.frequency}
                                    onChange={(e) =>
                                      updatePrescription(index, "frequency", e.target.value)
                                    }
                                  />
                                  <Input
                                    placeholder="Durasi (5 hari)"
                                    value={rx.duration}
                                    onChange={(e) =>
                                      updatePrescription(index, "duration", e.target.value)
                                    }
                                  />
                                  <Input
                                    type="number"
                                    placeholder="Jumlah"
                                    min={1}
                                    max={med?.stock || 1}
                                    value={rx.quantity}
                                    onChange={(e) =>
                                      updatePrescription(index, "quantity", parseInt(e.target.value) || 1)
                                    }
                                  />
                                  <Input
                                    placeholder="Catatan"
                                    value={rx.notes || ""}
                                    onChange={(e) =>
                                      updatePrescription(index, "notes", e.target.value)
                                    }
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="equipment" className="space-y-4 mt-4">
                    <div className="w-full min-w-0 space-y-2">
                      <Label className="mb-2 block">Alat Medis yang Digunakan</Label>
                      {selectedEquipments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Belum ada alat dipilih.</p>
                      ) : (
                        <div className="space-y-2">
                          {selectedEquipments.map((equipment) => (
                            <div
                              key={equipment.equipmentId}
                              className="flex w-full min-w-0 flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center"
                            >
                              <span className="min-w-0 flex-1 basis-0 truncate text-sm font-medium">
                                {equipment.equipmentName}
                              </span>
                              <Input
                                className="w-full min-w-0 sm:w-72 sm:max-w-[45%]"
                                placeholder="Catatan penggunaan (opsional)"
                                value={equipment.usageNotes ?? ""}
                                onChange={(event) =>
                                  updateEquipmentNotes(equipment.equipmentId, event.target.value)
                                }
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="shrink-0"
                                onClick={() =>
                                  setSelectedEquipments((current) =>
                                    current.filter(
                                      (entry) => entry.equipmentId !== equipment.equipmentId,
                                    ),
                                  )
                                }
                                aria-label={`Hapus ${equipment.equipmentName}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        className="box-border w-full min-w-0 justify-start"
                        aria-expanded={equipmentPickerOpen}
                        onClick={() => setEquipmentPickerOpen((open) => !open)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {equipmentPickerOpen ? "Tutup Pilihan Alat" : "Tambah Alat"}
                      </Button>
                      {equipmentPickerOpen && (
                        <div className="box-border w-full min-w-0 overflow-hidden rounded-lg border bg-popover shadow-sm">
                          <Command
                            className="w-full min-w-0"
                            filter={(itemValue, searchTerm) =>
                              itemValue.toLocaleLowerCase("id-ID").includes(
                                searchTerm.toLocaleLowerCase("id-ID"),
                              )
                                ? 1
                                : 0
                            }
                          >
                            <CommandInput
                              className="w-full min-w-0"
                              placeholder="Cari nama, kategori, merek, model, atau lokasi alat..."
                            />
                            <CommandList className="max-h-64 w-full">
                              <CommandEmpty>Alat medis tidak ditemukan.</CommandEmpty>
                              <CommandGroup>
                                {selectableEquipments.map((equipment) => (
                                  <CommandItem
                                    key={equipment.id}
                                    className="w-full"
                                    value={`${equipment.name} ${equipment.category} ${equipment.brand ?? ""} ${equipment.model ?? ""} ${equipment.location ?? ""}`}
                                    onSelect={() => {
                                      toggleEquipment(equipment)
                                      setEquipmentPickerOpen(false)
                                    }}
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate font-medium">{equipment.name}</p>
                                      <p className="truncate text-xs text-muted-foreground">
                                        {equipment.category} · {equipment.brand} {equipment.model}
                                      </p>
                                      <p className="truncate text-xs text-muted-foreground">
                                        Lokasi: {equipment.location}
                                      </p>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="decision" className="mt-4 space-y-4">
                    <div className="space-y-4 rounded-lg border border-primary/40 bg-primary/5 p-4">
                      <div>
                        <h4 className="font-medium text-primary">Keputusan Dokter</h4>
                        <p className="text-sm text-muted-foreground">
                          Tentukan tindak lanjut pasien setelah pemeriksaan selesai.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="clinical-decision">Keputusan</Label>
                        <Select
                          value={clinicalDecision}
                          onValueChange={(value) => setClinicalDecision(value as ClinicalDecision)}
                        >
                          <SelectTrigger id="clinical-decision" className="w-full">
                            <SelectValue placeholder="Pilih keputusan dokter" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="prescription">Pulang + Resep</SelectItem>
                            <SelectItem value="outpatient-discharge">Pulang Tanpa Resep</SelectItem>
                            <SelectItem value="lab-required">Perlu Laboratorium</SelectItem>
                            <SelectItem value="radiology-required">Perlu Radiologi</SelectItem>
                            <SelectItem value="observation">Observasi</SelectItem>
                            <SelectItem value="referral">Rujukan</SelectItem>
                            <SelectItem value="inpatient-required">Perlu Rawat Inap</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                          {clinicalDecisionDescriptions[clinicalDecision]}
                        </p>
                      </div>

                      {clinicalDecision === "referral" && (
                        <div className="space-y-2">
                          <Label htmlFor="referral-destination">Tujuan Rujukan</Label>
                          {referralFacilities.length > 0 ? (
                            <Select value={referralDestination} onValueChange={setReferralDestination}>
                              <SelectTrigger id="referral-destination" className="w-full">
                                <SelectValue placeholder="Pilih fasilitas rujukan" />
                              </SelectTrigger>
                              <SelectContent>
                                {referralFacilities.map((facility: ReferralFacility) => (
                                  <SelectItem key={facility.id} value={facility.name}>
                                    {facility.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              id="referral-destination"
                              value={referralDestination}
                              onChange={(event) => setReferralDestination(event.target.value)}
                              placeholder="Contoh: RS rujukan / poli spesialis"
                            />
                          )}
                          <p className="text-xs text-muted-foreground">
                            Draf rujukan akan otomatis dibuat setelah pemeriksaan diselesaikan.
                          </p>
                        </div>
                      )}

                      {clinicalDecision === "observation" && (
                        <div className="space-y-2">
                          <Label htmlFor="observation-notes">Catatan Observasi</Label>
                          <Textarea
                            id="observation-notes"
                            value={observationNotes}
                            onChange={(event) => setObservationNotes(event.target.value)}
                            placeholder="Rencana monitoring, durasi observasi, atau instruksi lanjutan"
                          />
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              )}

              {examValidationMessage && (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  {examValidationMessage}
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={!(selectedAppointment || editingRecord) || isSavingExam}
                >
                  {isSavingExam && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan Pemeriksaan
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pemeriksaan
            </CardTitle>
            <FileText className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{records.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Perlu Direkam
            </CardTitle>
            <Stethoscope className="w-4 h-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeVisitAppointments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dengan Resep
            </CardTitle>
            <Pill className="w-4 h-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {records.filter((r) => r.prescription && r.prescription.length > 0).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dengan Alat Medis
            </CardTitle>
            <Wrench className="w-4 h-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {records.filter((r) => r.equipmentsUsed && r.equipmentsUsed.length > 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Alur Pemeriksaan Pasien</CardTitle>
              <CardDescription>
                Data pendaftaran masuk otomatis. Triase perawat/bidan diteruskan langsung ke dokter tanpa pendaftaran ulang.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">Menunggu triase: {waitingTriageAppointments.length}</Badge>
              <Badge variant="secondary">Siap dokter: {readyForDoctorAppointments.length}</Badge>
              <Badge>Sedang diperiksa: {inExaminationAppointments.length}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">No.</TableHead>
                  <TableHead>Pasien</TableHead>
                  <TableHead>Status Alur</TableHead>
                  <TableHead>Dokter / Layanan</TableHead>
                  <TableHead>Hasil Triase</TableHead>
                  <TableHead className="text-right">Tindakan Berikutnya</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeVisitAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Belum ada pasien aktif dari pendaftaran.
                    </TableCell>
                  </TableRow>
                ) : (
                  activeVisitPagination.paginatedItems.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell className="font-semibold">{appointment.queueNumber}</TableCell>
                      <TableCell>
                        <p className="font-medium">{appointment.patientName}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(appointment.date)} · {appointment.time}</p>
                      </TableCell>
                      <TableCell>
                        {appointment.status === "Menunggu" || !appointment.triage ? (
                          <Badge variant="outline">Menunggu Triase</Badge>
                        ) : appointment.status === "Dipanggil" ? (
                          <Badge variant="secondary">Siap Dokter</Badge>
                        ) : (
                          <Badge>Sedang Diperiksa</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{appointment.doctorId ? appointment.doctorName : "Belum ditentukan"}</p>
                        <p className="text-xs text-muted-foreground">{getAppointmentServiceLabel(appointment)}</p>
                      </TableCell>
                      <TableCell>
                        {appointment.triage ? (
                          <div className="text-xs">
                            <p className="font-medium">Tercatat oleh {appointment.triage.nurseName || "petugas"}</p>
                            <p className="text-muted-foreground">
                              {appointment.triage.vitalSigns.bloodPressure || "Tensi -"} · {appointment.triage.vitalSigns.temperature || "Suhu -"}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Belum diperiksa</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-2">
                          {canPerformInitialExam && appointment.status !== "Diperiksa" && (
                            <Button size="sm" variant={appointment.triage ? "outline" : "secondary"} onClick={() => openTriageDialog(appointment)}>
                              <ClipboardPlus className="mr-1 h-4 w-4" />
                              {appointment.triage ? "Ubah Triase" : "Isi Triase"}
                            </Button>
                          )}
                          {canPerformDoctorExam && appointment.status === "Dipanggil" && appointment.triage && (
                            <Button size="sm" onClick={() => void handleAppointmentSelect(appointment.id, true)}>
                              <Stethoscope className="mr-1 h-4 w-4" />
                              Periksa Dokter
                            </Button>
                          )}
                          {canPerformDoctorExam && appointment.status === "Diperiksa" && (
                            <Button size="sm" onClick={() => void handleAppointmentSelect(appointment.id, true)}>
                              <Stethoscope className="mr-1 h-4 w-4" />
                              Lanjutkan
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DataPagination page={activeVisitPagination.page} totalItems={activeVisitPagination.totalItems} totalPages={activeVisitPagination.totalPages} onPageChange={activeVisitPagination.setPage} itemLabel="pasien" />
        </CardContent>
      </Card>

      <Dialog open={Boolean(triageAppointment)} onOpenChange={(open) => !open && closeTriageDialog()}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pemeriksaan Awal Pasien</DialogTitle>
            <DialogDescription>
              Data ini langsung diteruskan ke form pemeriksaan dokter untuk {triageAppointment?.patientName ?? "pasien"}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTriageSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Dokter Tujuan *</Label>
                <Select value={triageForm.doctorId} onValueChange={(doctorId) => setTriageForm((current) => ({ ...current, doctorId }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih dokter" /></SelectTrigger>
                  <SelectContent>
                    {doctors.filter((doctor) => doctor.status === "Aktif").map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>{doctor.name} · {doctor.specialization}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Layanan *</Label>
                <Select value={triageForm.serviceId} onValueChange={(serviceId) => setTriageForm((current) => ({ ...current, serviceId }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih layanan" /></SelectTrigger>
                  <SelectContent>
                    {services.filter((service) => service.status === "Aktif").map((service) => (
                      <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Keluhan Awal</Label>
              <Textarea value={triageForm.complaints} onChange={(event) => setTriageForm((current) => ({ ...current, complaints: event.target.value }))} placeholder="Keluhan yang disampaikan pasien" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
              {([
                ["bloodPressure", "Tekanan Darah", "120/80 mmHg"],
                ["heartRate", "Detak Jantung", "72 bpm"],
                ["temperature", "Suhu Tubuh", "36.5 °C"],
                ["bloodGlucose", "Gula Darah", "110 mg/dL"],
                ["oxygenSaturation", "Saturasi Oksigen", "98%"],
                ["weight", "Berat Badan", "70 kg"],
                ["height", "Tinggi Badan", "170 cm"],
                ["respiratoryRate", "Laju Pernapasan", "16/menit"],
              ] as const).map(([field, label, placeholder]) => (
                <div key={field} className="space-y-2">
                  <Label>{label}</Label>
                  <Input
                    value={triageForm[field] ?? ""}
                    onChange={(event) => setTriageForm((current) => ({ ...current, [field]: event.target.value }))}
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea value={triageForm.notes} onChange={(event) => setTriageForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Catatan risiko atau perhatian khusus untuk dokter" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeTriageDialog}>Batal</Button>
              <Button type="submit" disabled={isSavingTriage || !triageForm.doctorId || !triageForm.serviceId}>
                {isSavingTriage ? "Menyimpan..." : "Simpan & Teruskan ke Dokter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Hasil Pemeriksaan</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus hasil pemeriksaan untuk pasien{" "}
              <span className="font-semibold text-foreground">{getPatientById(deletingRecord?.patientId ?? "")?.name}</span> pada tanggal {formatDate(deletingRecord?.date ?? "")}? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Record Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Pemeriksaan</DialogTitle>
            <DialogDescription>Informasi lengkap hasil pemeriksaan pasien</DialogDescription>
          </DialogHeader>
          {viewingRecord && (
            <div className="space-y-6">
              {(() => {
                const patient = getPatientById(viewingRecord.patientId)
                return (
                  <>
                    <div className="rounded-lg border border-border/60 bg-transparent p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Pasien</p>
                          <p className="font-medium">{patient?.name}</p>
                          <p className="text-xs text-muted-foreground">{patient?.noRM}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Dokter</p>
                          <p className="font-medium">{viewingRecord.doctorName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Tanggal Pemeriksaan</p>
                          <p className="font-medium">{formatDate(viewingRecord.date)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Layanan</p>
                          <p className="font-medium">{getAppointmentServiceLabel(viewingAppointment)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Usia</p>
                          <p className="font-medium">
                            {patient ? calculateAge(patient.birthDate) : "-"} tahun
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
                      <p className="text-sm text-muted-foreground">Keputusan Dokter</p>
                      <p className="font-medium">
                        {viewingRecord.clinicalDecision
                          ? clinicalDecisionLabels[viewingRecord.clinicalDecision]
                          : "-"}
                      </p>
                      {viewingRecord.referralDestination && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Tujuan rujukan: {viewingRecord.referralDestination}
                        </p>
                      )}
                      {viewingRecord.observationNotes && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Observasi: {viewingRecord.observationNotes}
                        </p>
                      )}
                    </div>

                    {/* Vital Signs */}
                    {viewingRecord.vitalSigns && Object.values(viewingRecord.vitalSigns).some((v) => v) && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-destructive" />
                          Tanda Vital
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                          {viewingRecord.vitalSigns.bloodPressure && (
                            <div className="rounded border border-border/60 bg-transparent p-2">
                              <p className="text-xs text-muted-foreground">Tekanan Darah</p>
                              <p className="font-medium">{viewingRecord.vitalSigns.bloodPressure}</p>
                            </div>
                          )}
                          {viewingRecord.vitalSigns.heartRate && (
                            <div className="rounded border border-border/60 bg-transparent p-2">
                              <p className="text-xs text-muted-foreground">Detak Jantung</p>
                              <p className="font-medium">{viewingRecord.vitalSigns.heartRate}</p>
                            </div>
                          )}
                          {viewingRecord.vitalSigns.temperature && (
                            <div className="rounded border border-border/60 bg-transparent p-2">
                              <p className="text-xs text-muted-foreground">Suhu</p>
                              <p className="font-medium">{viewingRecord.vitalSigns.temperature}</p>
                            </div>
                          )}
                          {viewingRecord.vitalSigns.bloodGlucose && (
                            <div className="rounded border border-border/60 bg-transparent p-2">
                              <p className="text-xs text-muted-foreground">Gula Darah</p>
                              <p className="font-medium">{viewingRecord.vitalSigns.bloodGlucose}</p>
                            </div>
                          )}
                          {viewingRecord.vitalSigns.oxygenSaturation && (
                            <div className="rounded border border-border/60 bg-transparent p-2">
                              <p className="text-xs text-muted-foreground">Saturasi Oksigen</p>
                              <p className="font-medium">{viewingRecord.vitalSigns.oxygenSaturation}</p>
                            </div>
                          )}
                          {viewingRecord.vitalSigns.weight && (
                            <div className="rounded border border-border/60 bg-transparent p-2">
                              <p className="text-xs text-muted-foreground">Berat Badan</p>
                              <p className="font-medium">{viewingRecord.vitalSigns.weight}</p>
                            </div>
                          )}
                          {viewingRecord.vitalSigns.height && (
                            <div className="rounded border border-border/60 bg-transparent p-2">
                              <p className="text-xs text-muted-foreground">Tinggi Badan</p>
                              <p className="font-medium">{viewingRecord.vitalSigns.height}</p>
                            </div>
                          )}
                          {viewingRecord.vitalSigns.respiratoryRate && (
                            <div className="rounded border border-border/60 bg-transparent p-2">
                              <p className="text-xs text-muted-foreground">Laju Pernapasan</p>
                              <p className="font-medium">{viewingRecord.vitalSigns.respiratoryRate}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-1">Keluhan</h4>
                        <p className="rounded border border-border/60 bg-transparent p-3 text-sm text-muted-foreground">
                          {viewingRecord.symptoms}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Diagnosis</h4>
                        <p className="rounded border border-border/60 bg-transparent p-3 text-sm text-muted-foreground">
                          {viewingRecord.diagnosis}
                        </p>
                      </div>
                    </div>

                    {viewingRecord.diagnosisCodes && viewingRecord.diagnosisCodes.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-1">Kode Diagnosa (ICD-10)</h4>
                        <div className="flex flex-wrap gap-2">
                          {viewingRecord.diagnosisCodes.map((item) => (
                            <Badge key={item.code} variant="secondary" className="gap-1 font-normal">
                              <span className="font-mono font-medium">{item.code}</span>
                              <span>{item.label}</span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="font-medium mb-1">Tindakan</h4>
                      <p className="rounded border border-border/60 bg-transparent p-3 text-sm text-muted-foreground">
                        {viewingRecord.treatment}
                      </p>
                    </div>

                    {viewingRecord.procedureCodes && viewingRecord.procedureCodes.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-1">Kode Tindakan (ICD-9-CM)</h4>
                        <div className="flex flex-wrap gap-2">
                          {viewingRecord.procedureCodes.map((item) => (
                            <Badge key={item.code} variant="secondary" className="gap-1 font-normal">
                              <span className="font-mono font-medium">{item.code}</span>
                              <span>{item.label}</span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {viewingRecordLabResults.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Thermometer className="w-4 h-4 text-chart-5" />
                          Riwayat Laboratorium
                        </h4>
                        <div className="space-y-2">
                          {viewingRecordLabResults.slice(0, 3).map((result) => (
                            <div
                              key={result.id}
                              className="rounded-2xl border border-border bg-transparent p-3 space-y-1"
                            >
                              <p className="text-sm font-semibold">{result.testName}</p>
                              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                                <span>Hasil: {result.resultValue}</span>
                                <span>{formatDate(result.performedAt)}</span>
                              </div>
                              {result.notes && (
                                <p className="text-xs text-muted-foreground">{result.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {viewingRecord.prescription && viewingRecord.prescription.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Pill className="w-4 h-4 text-primary" />
                          Resep Obat
                        </h4>
                        <div className="space-y-2">
                          {viewingRecord.prescription.map((rx, i) => (
                            <div key={i} className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                              <p className="font-medium">{rx.medicineName}</p>
                              <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-4">
                                <span>Dosis: {rx.dosage}</span>
                                <span>Frekuensi: {rx.frequency}</span>
                                <span>Durasi: {rx.duration}</span>
                                <span>Jumlah: {rx.quantity}</span>
                              </div>
                              {rx.notes && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Catatan: {rx.notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {viewingRecord.equipmentsUsed && viewingRecord.equipmentsUsed.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-chart-3" />
                          Alat Medis yang Digunakan
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {viewingRecord.equipmentsUsed.map((eq, i) => (
                            <div key={i} className="rounded-lg border border-border/60 bg-transparent p-2">
                              <p className="font-medium text-sm">{eq.equipmentName}</p>
                              {eq.usageNotes && (
                                <p className="text-xs text-muted-foreground">{eq.usageNotes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {viewingRecord.notes && (
                      <div>
                        <h4 className="font-medium mb-1">Catatan Tambahan</h4>
                        <p className="rounded border border-border/60 bg-transparent p-3 text-sm text-muted-foreground">
                          {viewingRecord.notes}
                        </p>
                      </div>
                    )}
                    {viewingRecordPricing && (
                      <div className="rounded-2xl border border-border bg-transparent p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">Ringkasan Tagihan</p>
                            <p className="text-lg font-semibold text-foreground">
                              {formatCurrency(viewingRecordPricing.total)}
                            </p>
                          </div>
                          <Badge variant={viewingRecordPaid ? "secondary" : "outline"}>
                            {viewingRecordPaid ? "Sudah dibayar" : "Belum dibayar"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {viewingRecordPricing.serviceNames.join(", ")}
                        </p>
                        <div className="grid grid-cols-2 text-xs text-muted-foreground">
                          <span>Layanan: {formatCurrency(viewingRecordPricing.serviceCost)}</span>
                          <span className="text-right">Obat: {formatCurrency(viewingRecordPricing.medicineCost)}</span>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => router.push(`/pembayaran?medicalRecordId=${viewingRecord.id}`)}
                            disabled={viewingRecordPaid}
                          >
                            {viewingRecordPaid ? "Sudah Dibayar" : "Buka Modul Pembayaran"}
                          </Button>
                        </div>
                      </div>
                    )}
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsViewDialogOpen(false)
                          handleEdit(viewingRecord)
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setIsViewDialogOpen(false)
                          openDeleteDialog(viewingRecord)
                        }}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Hapus
                      </Button>
                    </DialogFooter>
                  </>
                )
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
