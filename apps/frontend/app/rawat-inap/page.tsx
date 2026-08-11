"use client"

import { DoctorSelect } from "@/components/doctor-select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataPagination, useDataPagination } from "@/components/data-pagination";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DataError, DataLoading, useClinicData } from "@/hooks/use-clinic-data";
import { useToast } from "@/hooks/use-toast";
import type {
    Bed,
    BillingRecord,
    Doctor,
    DoctorVisitNote,
    InpatientAdmission,
    LabOrder,
    Patient,
    RadiologyOrder
} from "@/lib/auth-types";
import {
    createBed,
    createLabOrder,
    createRadiologyOrder,
    createVisitNote,
    deleteAdmission,
    deleteBed,
    deleteVisitNote,
    dischargeAdmission,
    updateAdmission,
    updateVisitNote
} from "@/lib/clinic-utils";
import { AlertCircle, AlertTriangle, BedDouble, Trash2 } from "lucide-react";
import { useCallback, useMemo, useReducer, useState } from "react";

const rawatInapTabs = ["bed", "menunggu", "admisi", "perawatan", "pemulangan", "riwayat"] as const
type RawatInapTab = (typeof rawatInapTabs)[number]

const getInitialRawatInapTab = (): RawatInapTab => {
  if (typeof window === "undefined") return "bed"
  const tab = new URLSearchParams(window.location.search).get("tab")
  return rawatInapTabs.includes(tab as RawatInapTab) ? (tab as RawatInapTab) : "bed"
}

const admissionHasOutstandingBill = (admission: InpatientAdmission, outstandingBillings: BillingRecord[]) => {
  if (admission.medicalRecordId) {
    return outstandingBillings.some((billing) => billing.medicalRecordId === admission.medicalRecordId);
  }
  return outstandingBillings.some((billing) => billing.patientId === admission.patientId);
};

const statusLabels: Record<InpatientAdmission["status"], string> = {
  ongoing: "Ranap (sedang dirawat)",
  discharged: "Pulang dalam keadaan sehat",
  pending: "Menunggu keputusan dokter",
  referred: "Dirujuk",
  deceased: "Meninggal",
}

const terminalAdmissionStatuses: InpatientAdmission["status"][] = ["discharged", "referred", "deceased"]

type AdmissionFormState = Partial<InpatientAdmission> & { patientNoRM?: string }

const initialAdmissionForm: AdmissionFormState = {
  patientId: "",
  patientName: "",
  bedId: "",
  ward: "",
  attendingDoctorName: "",
  attendingDoctorId: "",
  notes: "",
  status: "pending",
  patientNoRM: "",
}

const initialAssessmentForm = {
  keluhanUtama: "",
  riwayatPenyakit: "",
  riwayatAlergi: "",
  pemeriksaanFisik: "",
}

type AdmissionFormReducerState = {
  form: AdmissionFormState;
  assessment: typeof initialAssessmentForm;
  isDirty: boolean;
  editingId: string | null;
};

type AdmissionFormAction =
  | { type: 'START_EDIT'; payload: { admission: InpatientAdmission; patientNoRM?: string } }
  | { type: 'UPDATE_FORM'; payload: Partial<AdmissionFormState> }
  | { type: 'UPDATE_ASSESSMENT'; payload: Partial<typeof initialAssessmentForm> }
  | { type: 'RESET' };

const initialAdmissionReducerState: AdmissionFormReducerState = {
  form: initialAdmissionForm,
  assessment: initialAssessmentForm,
  isDirty: false,
  editingId: null,
};

function admissionFormReducer(state: AdmissionFormReducerState, action: AdmissionFormAction): AdmissionFormReducerState {
  switch (action.type) {
    case 'START_EDIT':
      return {
        ...initialAdmissionReducerState,
        editingId: action.payload.admission.id,
        form: { ...action.payload.admission, status: 'ongoing', patientNoRM: action.payload.patientNoRM },
      };
    case 'UPDATE_FORM':
      return { ...state, form: { ...state.form, ...action.payload }, isDirty: true };
    case 'UPDATE_ASSESSMENT':
      return { ...state, assessment: { ...state.assessment, ...action.payload }, isDirty: true };
    case 'RESET':
      return initialAdmissionReducerState;
  }
}

type VisitFormState = {
  admissionId: string
  doctorId: string
  doctorName: string
}

const initialVisitForm: VisitFormState = {
  admissionId: "",
  doctorId: "",
  doctorName: "",
};

const initialBedForm = {
  bedNumber: "",
  ward: "",
};

type SoapData = { subjective: string; objective: string; assessment: string; plan: string };
type MonitoringData = {
  bloodPressure: string
  heartRate: string
  temperature: string
  respiratoryRate: string
  fluidBalance: string
  notes: string
}

const initialSoapForm: SoapData = {
  subjective: "",
  objective: "",
  assessment: "",
  plan: "",
};

const initialMonitoringForm: MonitoringData = {
  bloodPressure: "",
  heartRate: "",
  temperature: "",
  respiratoryRate: "",
  fluidBalance: "",
  notes: "",
}

const calculateAgeYears = (birthDate?: string) => {
  if (!birthDate) return null
  const parsed = new Date(birthDate)
  if (Number.isNaN(parsed.getTime())) return null
  const ageMs = Date.now() - parsed.getTime()
  if (ageMs < 0) return null
  return Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000))
}

const formatPatientAge = (birthDate?: string) => {
  const age = calculateAgeYears(birthDate)
  return age === null ? null : `${age} tahun`
}

export default function RawatInapPage() {
  const { data: beds = [], loading: bedsLoading, error: bedsError, refetch: refetchBeds } = useClinicData<Bed>("beds")
  const { data: admissions = [], loading: admissionsLoading, error: admissionsError, refetch: refetchAdmissions } = useClinicData<InpatientAdmission>("inpatient-admissions")
  const { data: notes = [], loading: notesLoading, error: notesError, refetch: refetchNotes } = useClinicData<DoctorVisitNote>("doctor-visit-notes")
  const { data: patients = [], loading: patientsLoading, error: patientsError, refetch: refetchPatients } = useClinicData<Patient>("patients")
  const { data: doctors = [] } = useClinicData<Doctor>("doctors");
  const { data: billingRecords = [], loading: billingsLoading, error: billingsError, refetch: refetchBillings } = useClinicData<BillingRecord>("billing-records");
  const { data: labOrders = [], refetch: refetchLabOrders } = useClinicData<LabOrder>("lab-orders");
  const { data: radiologyOrders = [], refetch: refetchRadiologyOrders } = useClinicData<RadiologyOrder>("radiology-orders");
  const { toast } = useToast();

  const [admissionState, dispatchAdmission] = useReducer(admissionFormReducer, initialAdmissionReducerState);
  const [dischargingAdmissionId, setDischargingAdmissionId] = useState<string | null>(null)
  const [visitForm, setVisitForm] = useState(initialVisitForm)
  const [soapForm, setSoapForm] = useState<SoapData>(initialSoapForm)
  const [monitoringForm, setMonitoringForm] = useState<MonitoringData>(initialMonitoringForm)
  const [transferringAdmission, setTransferringAdmission] = useState<InpatientAdmission | null>(null);
  const [selectedNewBedId, setSelectedNewBedId] = useState<string>("");
  const [editingVisitNoteId, setEditingVisitNoteId] = useState<string | null>(null)
  const [labTestsInput, setLabTestsInput] = useState("")
  const [radiologyStudyInput, setRadiologyStudyInput] = useState("")
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  const [activeTab, setActiveTab] = useState<RawatInapTab>(getInitialRawatInapTab)
  const [bedForm, setBedForm] = useState(initialBedForm)
  const [isSavingBed, setIsSavingBed] = useState(false)
  const [dialogAction, setDialogAction] = useState<{ type: 'delete-admission' | 'delete-note' | 'discharge' | 'cancel-admission' | 'delete-bed'; data: any; message: string; } | null>(null);


  const handleTabChange = (value: string) => {
    if (!rawatInapTabs.includes(value as RawatInapTab)) return
    const nextTab = value as RawatInapTab
    setActiveTab(nextTab)
    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.set("tab", nextTab)
    window.history.replaceState(null, "", `${nextUrl.pathname}${nextUrl.search}`)
  }

  const patientMap = useMemo(() => new Map(patients.map((patient) => [patient.id, patient])), [patients])
  const admissionMap = useMemo(
    () => new Map(admissions.map((admission) => [admission.id, admission])),
    [admissions]
  )
  
  const pendingAdmissions = useMemo(() => admissions.filter(a => a.status === 'pending'), [admissions]);
  const ongoingAdmissions = useMemo(() => admissions.filter(a => a.status === "ongoing"), [admissions]);
  const completedAdmissions = useMemo(
    () => admissions.filter(a => terminalAdmissionStatuses.includes(a.status)),
    [admissions]
  );
  const bedPagination = useDataPagination(beds);
  const pendingAdmissionPagination = useDataPagination(pendingAdmissions);
  const ongoingAdmissionPagination = useDataPagination(ongoingAdmissions);
  const completedAdmissionPagination = useDataPagination(completedAdmissions);
  const notePagination = useDataPagination(notes);
  const availableBedCount = useMemo(() => beds.filter((bed) => bed.status === "available").length, [beds])
  const occupiedBedCount = useMemo(() => beds.filter((bed) => bed.status === "occupied").length, [beds])

  const refresh = async () => {
    await Promise.all([
      refetchBeds(),
      refetchAdmissions(),
      refetchNotes(),
      refetchPatients(),
      refetchBillings(),
      refetchLabOrders(),
      refetchRadiologyOrders(),
    ])
  }
  
  const outstandingBillings = useMemo(() => {
    return billingRecords.filter((billing) => {
      const remaining = Math.max(0, billing.total - billing.paidAmount)
      return remaining > 0 && !["paid", "cancelled"].includes(billing.status)
    })
  }, [billingRecords]);

  const handleSelectPending = (admission: InpatientAdmission) => {
    dispatchAdmission({ type: 'START_EDIT', payload: { admission, patientNoRM: patientMap.get(admission.patientId)?.noRM } });
    // Pindah ke tab admisi lalu scroll ke form untuk UX yang lebih baik
    handleTabChange('admisi')
    setTimeout(() => {
      document.getElementById('admission-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
  }

  const handleCancelAdmission = () => {
    if (admissionState.isDirty) {
      setDialogAction({ type: 'cancel-admission', data: null, message: "Anda memiliki perubahan yang belum disimpan di form assessment. Yakin ingin membatalkan?" });
    } else {
      resetAdmissionForm();
    }
  };

  const resetAdmissionForm = () => {
    dispatchAdmission({ type: 'RESET' });
    // Melepaskan bed yang dipilih jika proses dibatalkan
    setSelectedNewBedId("")
  }

  const handleSaveAdmission = async () => {
    if (!admissionState.editingId) return;

    if (!admissionState.form.bedId) {
      toast({ title: "Bed Belum Dipilih", description: "Silakan pilih bed untuk pasien.", variant: "destructive" });
      return;
    }

    const assessmentText = `ASSESSMENT AWAL:
- Keluhan Utama: ${admissionState.assessment.keluhanUtama || '-'}
- Riwayat Penyakit: ${admissionState.assessment.riwayatPenyakit || '-'}
- Riwayat Alergi: ${admissionState.assessment.riwayatAlergi || '-'}
- Pemeriksaan Fisik: ${admissionState.assessment.pemeriksaanFisik || '-'}
`;

    const combinedNotes = `${assessmentText}\n\nCATATAN TAMBAHAN:\n${admissionState.form.notes || '-'}`;


    const bed = beds.find((item) => item.id === admissionState.form.bedId);

    // patientNoRM is a form-only field, exclude it from the payload
    const { patientNoRM: _, ...restForm } = admissionState.form
    const payload: Partial<InpatientAdmission> = {
      ...restForm,
      notes: combinedNotes,
      bedId: bed?.id ?? "",
      // bedNumber should be set by the backend based on bedId to ensure data consistency
    };
    try { //...
      await updateAdmission(admissionState.editingId, payload);
      toast({ title: "Admisi Berhasil", description: `Pasien ${admissionState.form.patientName} telah diterima.` });
      resetAdmissionForm();
      await refresh();
    } catch (error) {
      console.error("Gagal menyimpan admisi:", error);
      toast({
        title: "Gagal Menyimpan Admisi",
        description: "Admisi pasien belum dapat disimpan. Periksa pilihan bed dan data assessment lalu coba lagi.",
        variant: "destructive",
      });
      // Jika gagal, bed yang sudah dialokasikan di backend harus dilepaskan.
      // Untuk saat ini, kita refresh data untuk sinkronisasi.
      await refresh();
    }
  }

  const handleEditAdmission = (_admission: InpatientAdmission) => {
    // This function is now handled by the reducer, but we can keep it for other edit types if needed
    // For now, let's assume it's for a different kind of edit or can be removed.
  }

  const handleDeleteAdmission = async (admissionId: string) => {
    if (!admissionId) {
      console.warn("ID rawat inap tidak tersedia, batalkan permintaan.")
      return
    }

    setDialogAction({
      type: 'delete-admission',
      data: admissionId,
      message: "Apakah Anda yakin ingin menghapus data rawat inap ini? Tindakan ini akan menghapus semua data terkait dan tidak dapat dibatalkan."
    });
  }

  const executeDeleteAdmission = async (admissionId: string) => {
     try {
       await deleteAdmission(admissionId);
       toast({ title: "Data Dihapus", description: "Data rawat inap telah berhasil dihapus." }); //...
       if (admissionState.editingId === admissionId) {
         resetAdmissionForm();
       }
       await refresh();
     } catch (error) {
       console.error("Gagal menghapus data rawat inap:", error);
       toast({ title: "Gagal Menghapus", description: "Data rawat inap belum dapat dihapus. Muat ulang data lalu coba lagi.", variant: "destructive" });
     }
   };

  const handleCreateBed = async () => {
    const bedNumber = bedForm.bedNumber.trim()
    const ward = bedForm.ward.trim()
    if (!bedNumber || !ward) {
      toast({ title: "Data Belum Lengkap", description: "Nomor bed dan nama ruangan wajib diisi.", variant: "destructive" })
      return
    }

    setIsSavingBed(true)
    try {
      await createBed({ bedNumber, ward })
      toast({ title: "Bed Ditambahkan", description: `Bed ${bedNumber} di ruangan ${ward} berhasil dibuat.` })
      setBedForm(initialBedForm)
      await refetchBeds()
    } catch (error) {
      console.error("Gagal menambahkan bed:", error)
      toast({ title: "Gagal Menambahkan", description: "Bed belum dapat ditambahkan. Periksa data lalu coba lagi.", variant: "destructive" })
    } finally {
      setIsSavingBed(false)
    }
  }

  const handleDeleteBed = (bed: Bed) => {
    if (bed.status === "occupied" || bed.assignedPatientId) {
      toast({ title: "Tidak Dapat Dihapus", description: `Bed ${bed.bedNumber} sedang terisi pasien.`, variant: "destructive" })
      return
    }

    setDialogAction({
      type: 'delete-bed',
      data: bed.id,
      message: `Hapus bed ${bed.bedNumber} di ruangan ${bed.ward}? Tindakan ini tidak dapat dibatalkan.`,
    })
  }

  const executeDeleteBed = async (bedId: string) => {
    try {
      await deleteBed(bedId)
      toast({ title: "Bed Dihapus", description: "Bed berhasil dihapus." })
      await refetchBeds()
    } catch (error) {
      console.error("Gagal menghapus bed:", error)
      toast({ title: "Gagal Menghapus", description: "Bed belum dapat dihapus. Pastikan bed tidak sedang terisi.", variant: "destructive" })
    }
  }

  const resetVisitForm = () => {
    setVisitForm(initialVisitForm)
    setSoapForm(initialSoapForm)
    setEditingVisitNoteId(null)
  }

  const handleVisitNote = async () => {
    if (!visitForm.admissionId) return
    if (!visitForm.doctorName.trim()) {
      toast({
        title: "Dokter Belum Dipilih",
        description: "Pilih dokter yang membuat catatan CPPT terlebih dahulu.",
        variant: "destructive",
      })
      return
    }

    const soapNote = JSON.stringify(soapForm)

    const payload = {
      admissionId: visitForm.admissionId,
      doctorName: visitForm.doctorName,
      note: soapNote,
    }

    if (editingVisitNoteId) {
      await updateVisitNote(editingVisitNoteId, payload)
    } else {
      await createVisitNote({
        ...payload,
        date: new Date().toISOString().split("T")[0],
      })
    }
    resetVisitForm()
    await refresh()
  }

  const handleMonitoringNote = async () => {
    if (!visitForm.admissionId) return

    const hasMonitoringValue = Object.values(monitoringForm).some((value) => value.trim())
    if (!hasMonitoringValue) {
      toast({
        title: "Monitoring Belum Diisi",
        description: "Isi minimal satu tanda vital, balans cairan, atau catatan perawat.",
        variant: "destructive",
      })
      return
    }

    await createVisitNote({
      admissionId: visitForm.admissionId,
      doctorName: visitForm.doctorName?.trim() || "Perawat Jaga",
      date: new Date().toISOString().split("T")[0],
      note: JSON.stringify({
        type: "nursing-monitoring",
        ...monitoringForm,
      }),
    })
    setMonitoringForm(initialMonitoringForm)
    await refresh()
  }

  const selectedCppytAdmission = useMemo(
    () => (visitForm.admissionId ? admissionMap.get(visitForm.admissionId) ?? null : null),
    [visitForm.admissionId, admissionMap]
  )

  const orderMatchesAdmission = useCallback(
    (order: { admissionId?: string; medicalRecordId?: string }, admission: InpatientAdmission | null) => {
      if (!admission) return false
      if (order.admissionId) return order.admissionId === admission.id
      return Boolean(admission.medicalRecordId) && order.medicalRecordId === admission.medicalRecordId
    },
    []
  )

  const admissionLabOrders = useMemo(
    () => labOrders.filter((order) => orderMatchesAdmission(order, selectedCppytAdmission)),
    [labOrders, selectedCppytAdmission, orderMatchesAdmission]
  )
  const admissionRadiologyOrders = useMemo(
    () => radiologyOrders.filter((order) => orderMatchesAdmission(order, selectedCppytAdmission)),
    [radiologyOrders, selectedCppytAdmission, orderMatchesAdmission]
  )

  const handleCreateLabOrder = async () => {
    const admission = selectedCppytAdmission
    if (!admission) return
    const tests = labTestsInput.split(",").map((test) => test.trim()).filter(Boolean)
    if (tests.length === 0) {
      toast({
        title: "Pemeriksaan Belum Diisi",
        description: "Tuliskan minimal satu jenis pemeriksaan lab (pisahkan dengan koma).",
        variant: "destructive",
      })
      return
    }
    setIsSavingOrder(true)
    try {
      await createLabOrder({
        patientId: admission.patientId,
        patientName: admission.patientName,
        medicalRecordId: admission.medicalRecordId ?? "",
        admissionId: admission.id,
        doctorId: visitForm.doctorId || admission.attendingDoctorId || "",
        doctorName: visitForm.doctorName || admission.attendingDoctorName || "Dokter",
        tests,
        priority: "routine",
        status: "requested",
      })
      setLabTestsInput("")
      await refresh()
      toast({ title: "Order Lab Dibuat", description: `Order lab untuk ${admission.patientName} dikirim ke unit laboratorium.` })
    } catch (error) {
      toast({
        title: "Order Lab Gagal",
        description: error instanceof Error ? error.message : "Tidak dapat membuat order lab.",
        variant: "destructive",
      })
    } finally {
      setIsSavingOrder(false)
    }
  }

  const handleCreateRadiologyOrder = async () => {
    const admission = selectedCppytAdmission
    if (!admission) return
    const study = radiologyStudyInput.trim()
    if (!study) {
      toast({
        title: "Studi Belum Diisi",
        description: "Tuliskan jenis pemeriksaan radiologi terlebih dahulu.",
        variant: "destructive",
      })
      return
    }
    setIsSavingOrder(true)
    try {
      await createRadiologyOrder({
        patientId: admission.patientId,
        patientName: admission.patientName,
        medicalRecordId: admission.medicalRecordId ?? "",
        admissionId: admission.id,
        doctorId: visitForm.doctorId || admission.attendingDoctorId || "",
        doctorName: visitForm.doctorName || admission.attendingDoctorName || "Dokter",
        study,
        priority: "routine",
        status: "requested",
      })
      setRadiologyStudyInput("")
      await refresh()
      toast({ title: "Order Radiologi Dibuat", description: `Order radiologi untuk ${admission.patientName} dikirim ke unit radiologi.` })
    } catch (error) {
      toast({
        title: "Order Radiologi Gagal",
        description: error instanceof Error ? error.message : "Tidak dapat membuat order radiologi.",
        variant: "destructive",
      })
    } finally {
      setIsSavingOrder(false)
    }
  }

  const handleEditVisitNote = (note: DoctorVisitNote) => {
    setEditingVisitNoteId(note.id)
    try {
      const parsed = JSON.parse(note.note)
      if (typeof parsed === 'object' && parsed !== null) {
        setSoapForm({
          subjective: parsed.subjective ?? '',
          objective: parsed.objective ?? '',
          assessment: parsed.assessment ?? '',
          plan: parsed.plan ?? '',
        })
      }
    } catch {
      // Fallback for non-JSON notes
      setSoapForm({ ...initialSoapForm, subjective: note.note })
    }
    setVisitForm({
      admissionId: note.admissionId,
      doctorId: doctors.find((doctor) => doctor.name === note.doctorName)?.id ?? "",
      doctorName: note.doctorName,
    })
  }

  const handleDeleteVisitNote = async (noteId: string) => {
    if (!noteId) {
      console.warn("ID catatan visit dokter tidak tersedia.")
      toast({
        title: "Catatan Tidak Ditemukan",
        description: "Catatan CPPT tidak dapat dihapus karena ID data tidak tersedia.",
        variant: "destructive",
      })
      return
    }

    setDialogAction({
      type: 'delete-note',
      data: noteId,
      message: "Apakah Anda yakin ingin menghapus catatan CPPT ini? Tindakan ini tidak dapat dibatalkan."
    });
  }

  const executeDeleteVisitNote = async (noteId: string) => {
     try {
       await deleteVisitNote(noteId);
       toast({ title: "Catatan Dihapus", description: "Catatan CPPT telah berhasil dihapus." });
       if (editingVisitNoteId === noteId) {
         resetVisitForm();
       }
       await refresh();
     } catch (error) {
       console.error("Gagal menghapus catatan CPPT:", error);
       toast({ title: "Gagal Menghapus", description: "Catatan CPPT belum dapat dihapus. Muat ulang data lalu coba lagi.", variant: "destructive" });
     }
   };

  const handleDischarge = async (
    admissionId: string,
    disposition: "discharged" | "referred" | "deceased" = "discharged"
  ) => {

    setDialogAction({
      type: 'discharge',
      data: { admissionId, disposition },
      message: `Anda akan mengubah status pasien menjadi '${statusLabels[disposition]}'. Bed yang ditempati akan dikosongkan. Lanjutkan?`
    });
  }

  const executeDischarge = async (data: { admissionId: string, disposition: "discharged" | "referred" | "deceased" }) => {
     setDischargingAdmissionId(data.admissionId);
     try {
       await dischargeAdmission(data.admissionId, data.disposition);
       toast({ title: "Status Pasien Diperbarui", description: `Pasien telah ditandai sebagai ${statusLabels[data.disposition]}.` });
       await refresh();
     } catch (error) {
       console.error("Gagal memulangkan pasien:", error);
       toast({ title: "Gagal Memulangkan Pasien", description: "Status pasien belum dapat diperbarui. Pastikan data pasien masih tersedia lalu coba lagi.", variant: "destructive" });
     } finally {
       setDischargingAdmissionId(null);
     }
   };

  const openTransferDialog = (admission: InpatientAdmission) => {
    setTransferringAdmission(admission);
    setSelectedNewBedId("");
  };

  const closeTransferDialog = () => {
    setTransferringAdmission(null);
    setSelectedNewBedId("");
  };

  const handleConfirmTransfer = async () => {
    if (!transferringAdmission || !selectedNewBedId) return;

    // BUG FIX: Sertakan bedId lama untuk dilepaskan oleh backend.
    const payload = {
      bedId: selectedNewBedId,
      previousBedId: transferringAdmission.bedId, // Kirim ID bed lama
    };
    try {
      await updateAdmission(transferringAdmission.id, payload);
      toast({
        title: "Pasien Berhasil Dipindahkan",
        description: `${transferringAdmission.patientName} telah dipindahkan ke bed baru.`,
      });
      await refresh();
      closeTransferDialog();
    } catch (error) {
      console.error("Gagal memindahkan pasien:", error);
      toast({ title: "Gagal Memindahkan Pasien", variant: "destructive" });
    }
  };

  const handleDialogConfirm = () => {
    if (!dialogAction) return;

    if (dialogAction.type === 'delete-admission') {
      executeDeleteAdmission(dialogAction.data);
    } else if (dialogAction.type === 'delete-note') {
      executeDeleteVisitNote(dialogAction.data);
    } else if (dialogAction.type === 'discharge') {
      executeDischarge(dialogAction.data);
    } else if (dialogAction.type === 'cancel-admission') {
      resetAdmissionForm();
    } else if (dialogAction.type === 'delete-bed') {
      executeDeleteBed(dialogAction.data);
    }

    setDialogAction(null);
  };


  const SoapNoteDisplay = ({ note }: { note: string }) => {
    try {
      const parsed = JSON.parse(note)
      if (parsed?.type === "nursing-monitoring") {
        const monitoring = parsed as MonitoringData & { type: string }
        return (
          <div className="space-y-1 text-xs max-w-md">
            <p className="font-medium text-foreground">Monitoring Perawat</p>
            {monitoring.bloodPressure && <p><strong>TD:</strong> {monitoring.bloodPressure}</p>}
            {monitoring.heartRate && <p><strong>Nadi:</strong> {monitoring.heartRate}</p>}
            {monitoring.temperature && <p><strong>Suhu:</strong> {monitoring.temperature}</p>}
            {monitoring.respiratoryRate && <p><strong>RR:</strong> {monitoring.respiratoryRate}</p>}
            {monitoring.fluidBalance && <p><strong>Balans:</strong> {monitoring.fluidBalance}</p>}
            {monitoring.notes && <p><strong>Catatan:</strong> {monitoring.notes}</p>}
          </div>
        )
      }
      const soap: SoapData = parsed
      return (
        <div className="space-y-1 text-xs max-w-md">
          {soap.subjective && <p><strong>S:</strong> {soap.subjective}</p>}
          {soap.objective && <p><strong>O:</strong> {soap.objective}</p>}
          {soap.assessment && <p><strong>A:</strong> {soap.assessment}</p>}
          {soap.plan && <p><strong>P:</strong> {soap.plan}</p>}
        </div>
      )
    } catch {
      // Fallback for old, non-JSON notes
      return <p className="text-xs max-w-md">{note}</p>
    }
  }

  const isLoading = bedsLoading || admissionsLoading || notesLoading || patientsLoading || billingsLoading || !doctors;
  const combinedError = bedsError || admissionsError || notesError || patientsError || billingsError;

  const handleRetry = useCallback(() => {
    if (bedsError) refetchBeds()
    if (admissionsError) refetchAdmissions()
    if (notesError) refetchNotes()
    if (patientsError) refetchPatients()
    if (billingsError) refetchBillings();
  }, [bedsError, refetchBeds, admissionsError, refetchAdmissions, notesError, refetchNotes, patientsError, refetchPatients, billingsError, refetchBillings])

  if (isLoading) {
    return <DataLoading message="Memuat data rawat inap..." />
  }

  if (combinedError) return <DataError error={combinedError} onRetry={handleRetry} />

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Bed Tersedia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{availableBedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Bed Terisi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{occupiedBedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Menunggu Admisi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingAdmissions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Sedang Dirawat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{ongoingAdmissions.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6">
          <TabsTrigger value="bed">Manajemen Bed</TabsTrigger>
          <TabsTrigger value="menunggu">Menunggu Penerimaan</TabsTrigger>
          <TabsTrigger value="admisi">Admisi & Assessment</TabsTrigger>
          <TabsTrigger value="perawatan">Timeline Perawatan (CPPT)</TabsTrigger>
          <TabsTrigger value="pemulangan">Proses Pulang</TabsTrigger>
          <TabsTrigger value="riwayat">Riwayat Pasien</TabsTrigger>
        </TabsList>

        <TabsContent value="bed" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tambah Bed / Ruangan</CardTitle>
          <p className="text-sm text-muted-foreground">
            Buat bed baru dengan menentukan nomor bed dan nama ruangan (ward). Bed baru otomatis berstatus tersedia.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 md:items-end">
            <div className="space-y-1">
              <Label htmlFor="bed-number">Nomor Bed</Label>
              <Input
                id="bed-number"
                value={bedForm.bedNumber}
                onChange={(e) => setBedForm((prev) => ({ ...prev, bedNumber: e.target.value }))}
                placeholder="Contoh: Bed-01"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bed-ward">Ruangan (Ward)</Label>
              <Input
                id="bed-ward"
                value={bedForm.ward}
                onChange={(e) => setBedForm((prev) => ({ ...prev, ward: e.target.value }))}
                placeholder="Contoh: Anggrek"
              />
            </div>
            <Button onClick={handleCreateBed} disabled={isSavingBed}>
              {isSavingBed ? "Menyimpan..." : "Tambah Bed"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status Bed & Kamar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode Bed</TableHead>
                  <TableHead>Ward</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pasien</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {beds.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Belum ada bed. Tambahkan bed baru melalui form di atas.
                    </TableCell>
                  </TableRow>
                ) : (
                  bedPagination.paginatedItems.map((bed) => {
                  const assignedPatient = bed.assignedPatientId
                    ? patientMap.get(bed.assignedPatientId)
                    : undefined
                  const isOccupied = bed.status === "occupied" || !!bed.assignedPatientId
                  return (
                    <TableRow key={bed.id}>
                      <TableCell>{bed.bedNumber}</TableCell>
                      <TableCell>{bed.ward}</TableCell>
                      <TableCell>{bed.status}</TableCell>
                      <TableCell>
                        {bed.assignedPatientId ? (
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-foreground">{assignedPatient?.name ?? "-"}</span>
                            <span className="text-xs text-muted-foreground">No. RM {assignedPatient?.noRM ?? "-"}</span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteBed(bed)}
                                  disabled={isOccupied}
                                  aria-label={`Hapus bed ${bed.bedNumber}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {isOccupied ? "Bed terisi, tidak dapat dihapus" : "Hapus bed"}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  )
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <DataPagination
            page={bedPagination.page}
            pageSize={bedPagination.pageSize}
            totalItems={bedPagination.totalItems}
            totalPages={bedPagination.totalPages}
            onPageChange={bedPagination.setPage}
            itemLabel="bed"
          />
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="menunggu" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pasien Menunggu Penerimaan</CardTitle>
          <p className="text-sm text-muted-foreground">
            Pasien yang telah direkomendasikan untuk rawat inap oleh dokter dan menunggu penempatan bed.
          </p>
        </CardHeader>
        <CardContent>
          {pendingAdmissions.length > 0 ? (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pasien</TableHead>
                      <TableHead>Dokter Perekomendasi</TableHead>
                      <TableHead>Tanggal Rekomendasi</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingAdmissionPagination.paginatedItems.map((admission) => (
                      <TableRow key={admission.id}>
                        <TableCell>{admission.patientName}</TableCell>
                        <TableCell>{admission.attendingDoctorName ?? '-'}</TableCell>
                        <TableCell>{new Date(admission.admittedAt).toLocaleDateString('id-ID')}</TableCell>
                        <TableCell><Button size="sm" onClick={() => handleSelectPending(admission)}>Proses Penerimaan</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <DataPagination
                page={pendingAdmissionPagination.page}
                pageSize={pendingAdmissionPagination.pageSize}
                totalItems={pendingAdmissionPagination.totalItems}
                totalPages={pendingAdmissionPagination.totalPages}
                onPageChange={pendingAdmissionPagination.setPage}
                itemLabel="pasien"
              />
            </div>
          ) : <p className="text-sm text-muted-foreground">Belum ada pasien yang menunggu penerimaan.</p>}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="admisi" className="space-y-6">
      <Card id="admission-form">
        <CardHeader>
          <CardTitle>Form Admisi & Assessment Awal</CardTitle>
          <p className="text-sm text-muted-foreground">
            {admissionState.editingId
              ? `Proses admisi untuk pasien ${admissionState.form.patientName || ''}. Lengkapi assessment awal dan pilih bed.`
              : "Pilih pasien dari tab 'Menunggu Penerimaan' untuk memulai proses admisi."}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Nama Pasien</Label>
              <Input
                value={admissionState.form.patientName ?? ""}
                disabled
                placeholder="Pilih pasien dari daftar tunggu"
              />
            </div>
            <div className="space-y-1">
              <Label>No. Rekam Medis</Label>
              <Input
                value={admissionState.form.patientNoRM ?? ""}
                disabled
                placeholder="-"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Dokter Penanggung Jawab (DPJP)</Label>
              <DoctorSelect
                doctors={doctors}
                value={admissionState.form.attendingDoctorId ?? ""}
                onValueChange={(doctorId: string) => {
                  const doctor = doctors.find(d => d.id === doctorId);
                  dispatchAdmission({ type: 'UPDATE_FORM', payload: {
                    attendingDoctorId: doctorId,
                    attendingDoctorName: doctor?.name ?? ""
                  }});
                }}
                disabled={!admissionState.editingId}
              />
            </div>
            <div className="space-y-1">
              <Label>Pilih Bed</Label>
              <Select
                // Radix Select hanya menampilkan placeholder saat value bernilai
                // undefined; string kosong dianggap "sudah ada pilihan" sehingga
                // placeholder tidak pernah muncul jika bedId belum dipilih.
                value={admissionState.form.bedId || undefined}
                onValueChange={(value) => dispatchAdmission({ type: 'UPDATE_FORM', payload: { bedId: value } })}
                disabled={!admissionState.editingId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih bed yang tersedia" />
                </SelectTrigger>
                <SelectContent>
                  {beds
                    .filter((bed) => bed.status === "available")
                    .map((bed) => (
                      <SelectItem key={bed.id} value={bed.id}>
                        {bed.bedNumber} - {bed.ward}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="font-medium text-foreground">Assessment Awal Keperawatan/Medis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Keluhan Utama</Label>
                <Textarea
                  value={admissionState.assessment.keluhanUtama}
                  onChange={(e) => dispatchAdmission({ type: 'UPDATE_ASSESSMENT', payload: { keluhanUtama: e.target.value } })}
                  placeholder="Contoh: Nyeri dada sebelah kiri, sesak napas..."
                  disabled={!admissionState.editingId}
                  rows={3}
                />
              </div>
              <div className="space-y-1">
                <Label>Riwayat Penyakit</Label>
                <Textarea
                  value={admissionState.assessment.riwayatPenyakit}
                  onChange={(e) => dispatchAdmission({ type: 'UPDATE_ASSESSMENT', payload: { riwayatPenyakit: e.target.value } })}
                  placeholder="Riwayat penyakit sekarang dan dahulu"
                  disabled={!admissionState.editingId}
                  rows={3}
                />
              </div>
              <div className="space-y-1">
                <Label>Riwayat Alergi</Label>
                <Textarea
                  value={admissionState.assessment.riwayatAlergi}
                  onChange={(e) => dispatchAdmission({ type: 'UPDATE_ASSESSMENT', payload: { riwayatAlergi: e.target.value } })}
                  placeholder="Alergi obat, makanan, dll."
                  disabled={!admissionState.editingId}
                  rows={3}
                />
              </div>
              <div className="space-y-1">
                <Label>Pemeriksaan Fisik Awal</Label>
                <Textarea
                  value={admissionState.assessment.pemeriksaanFisik}
                  onChange={(e) => dispatchAdmission({ type: 'UPDATE_ASSESSMENT', payload: { pemeriksaanFisik: e.target.value } })}
                  placeholder="Temuan fisik yang signifikan saat masuk"
                  disabled={!admissionState.editingId}
                  rows={3}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleSaveAdmission} disabled={!admissionState.editingId}>
              Selesaikan Penerimaan & Simpan
            </Button>
            {admissionState.editingId && (
              <Button variant="outline" onClick={handleCancelAdmission}>
                Batal
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="perawatan" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pasien Sedang Dirawat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pasien</TableHead>
                  <TableHead>Bed</TableHead>
                  <TableHead>Dokter</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ongoingAdmissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Belum ada pasien yang sedang dirawat.
                    </TableCell>
                  </TableRow>
                ) : ongoingAdmissionPagination.paginatedItems.map((admission) => {
                  const relatedPatient = patientMap.get(admission.patientId)
                  const patientAgeLabel = formatPatientAge(relatedPatient?.birthDate)
                  return (
                    <TableRow key={admission.id}>
                      <TableCell>
                        <div className="flex flex-col gap-0">
                          <span>{admission.patientName}</span>
                          <span className="text-xs text-muted-foreground">
                            No. RM {relatedPatient?.noRM ?? "-"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Umur {patientAgeLabel ?? "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{admission.bedNumber || "-"}</TableCell>
                      <TableCell>{admission.attendingDoctorName ?? '-'}</TableCell>
                      <TableCell>{statusLabels[admission.status] ?? admission.status}</TableCell>
                      <TableCell className="max-w-xs truncate">{admission.notes ?? "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEditAdmission(admission)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteAdmission(admission.id)}>
                            Hapus
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <DataPagination
            page={ongoingAdmissionPagination.page}
            pageSize={ongoingAdmissionPagination.pageSize}
            totalItems={ongoingAdmissionPagination.totalItems}
            totalPages={ongoingAdmissionPagination.totalPages}
            onPageChange={ongoingAdmissionPagination.setPage}
            itemLabel="pasien"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline Perawatan (CPPT / SOAP)</CardTitle>
          <p className="text-sm text-muted-foreground">Catat perkembangan pasien terintegrasi menggunakan format SOAP (Subjective, Objective, Assessment, Plan).</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1 md:col-span-2">
              <Label>Pilih Pasien untuk Melihat/Menambah CPPT</Label>
              <Select
                value={visitForm.admissionId}
                onValueChange={(value) => {
                  const admission = ongoingAdmissions.find((item) => item.id === value)
                  setVisitForm({
                    admissionId: value,
                    doctorId: admission?.attendingDoctorId ?? "",
                    doctorName: admission?.attendingDoctorName ?? "",
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih pasien" />
                </SelectTrigger>
                <SelectContent>
                  {ongoingAdmissions.map((admission) => (
                    <SelectItem key={admission.id} value={admission.id}>
                      {admission.patientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {visitForm.admissionId && (
            <div className="space-y-4 rounded-lg border p-4">
              <h3 className="font-medium text-foreground">{editingVisitNoteId ? "Edit CPPT / SOAP" : "Tambah CPPT / SOAP Baru"}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Dokter *</Label>
                  <DoctorSelect
                    doctors={doctors}
                    value={visitForm.doctorId}
                    onValueChange={(doctorId) => {
                      const doctor = doctors.find((item) => item.id === doctorId)
                      setVisitForm({
                        ...visitForm,
                        doctorId,
                        doctorName: doctor?.name ?? "",
                      })
                    }}
                    placeholder={visitForm.doctorName || "Pilih dokter yang membuat catatan"}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>S (Subjective)</Label>
                  <Textarea value={soapForm.subjective} onChange={e => setSoapForm({...soapForm, subjective: e.target.value})} placeholder="Keluhan yang dirasakan pasien" />
                </div>
                <div className="space-y-1">
                  <Label>O (Objective)</Label>
                  <Textarea value={soapForm.objective} onChange={e => setSoapForm({...soapForm, objective: e.target.value})} placeholder="Hasil pemeriksaan fisik dan penunjang" />
                </div>
                <div className="space-y-1">
                  <Label>A (Assessment)</Label>
                  <Textarea value={soapForm.assessment} onChange={e => setSoapForm({...soapForm, assessment: e.target.value})} placeholder="Diagnosis kerja dan banding" />
                </div>
                <div className="space-y-1">
                  <Label>P (Plan)</Label>
                  <Textarea value={soapForm.plan} onChange={e => setSoapForm({...soapForm, plan: e.target.value})} placeholder="Rencana diagnostik, terapi, dan edukasi" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                  <Button onClick={handleVisitNote} disabled={!visitForm.doctorName.trim()}>
                    {editingVisitNoteId ? "Perbarui Catatan" : "Simpan CPPT"}
                  </Button>
                  {editingVisitNoteId && (
                    <Button variant="outline" onClick={() => {
                      resetVisitForm();
                    }}>
                      Batal
                    </Button>
                  )}
                </div>
            </div>
          )}

          {visitForm.admissionId && (
            <div className="space-y-4 rounded-lg border p-4">
              <div>
                <h3 className="font-medium text-foreground">Monitoring Perawat</h3>
                <p className="text-sm text-muted-foreground">
                  Catat tanda vital, balans cairan, dan observasi berkala pasien rawat inap.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label>Tekanan Darah</Label>
                  <Input
                    value={monitoringForm.bloodPressure}
                    onChange={(event) => setMonitoringForm({ ...monitoringForm, bloodPressure: event.target.value })}
                    placeholder="120/80 mmHg"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Nadi</Label>
                  <Input
                    value={monitoringForm.heartRate}
                    onChange={(event) => setMonitoringForm({ ...monitoringForm, heartRate: event.target.value })}
                    placeholder="72 bpm"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Suhu</Label>
                  <Input
                    value={monitoringForm.temperature}
                    onChange={(event) => setMonitoringForm({ ...monitoringForm, temperature: event.target.value })}
                    placeholder="36.5 C"
                  />
                </div>
                <div className="space-y-1">
                  <Label>RR</Label>
                  <Input
                    value={monitoringForm.respiratoryRate}
                    onChange={(event) => setMonitoringForm({ ...monitoringForm, respiratoryRate: event.target.value })}
                    placeholder="16/menit"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Balans Cairan</Label>
                  <Input
                    value={monitoringForm.fluidBalance}
                    onChange={(event) => setMonitoringForm({ ...monitoringForm, fluidBalance: event.target.value })}
                    placeholder="Intake 1200 ml / output 900 ml"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Catatan Perawat</Label>
                  <Textarea
                    value={monitoringForm.notes}
                    onChange={(event) => setMonitoringForm({ ...monitoringForm, notes: event.target.value })}
                    placeholder="Observasi nyeri, respon terapi, instruksi lanjut"
                  />
                </div>
              </div>
              <Button type="button" variant="secondary" onClick={handleMonitoringNote}>
                Simpan Monitoring
              </Button>
            </div>
          )}

          {visitForm.admissionId && (
            <div className="space-y-4 rounded-lg border p-4">
              <div>
                <h3 className="font-medium text-foreground">Pemeriksaan Penunjang (Lab &amp; Radiologi)</h3>
                <p className="text-sm text-muted-foreground">
                  Buat order lab/radiologi selama masa rawat inap. Order otomatis tertaut ke admisi pasien ini.
                </p>
              </div>
              {!selectedCppytAdmission?.medicalRecordId && (
                <p className="text-xs text-amber-600">
                  Admisi ini belum tertaut rekam medis; order tetap dibuat dan ditautkan lewat admisi.
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 rounded-md border p-3">
                  <Label>Order Laboratorium</Label>
                  <Input
                    value={labTestsInput}
                    onChange={(event) => setLabTestsInput(event.target.value)}
                    placeholder="Contoh: Darah Lengkap, Elektrolit (pisahkan dengan koma)"
                  />
                  <Button size="sm" onClick={handleCreateLabOrder} disabled={isSavingOrder}>
                    Kirim Order Lab
                  </Button>
                  <div className="space-y-1">
                    {admissionLabOrders.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Belum ada order lab untuk admisi ini.</p>
                    ) : (
                      admissionLabOrders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between text-xs">
                          <span className="truncate">{order.tests?.join(", ") || "Pemeriksaan Lab"}</span>
                          <Badge variant="outline">{order.status}</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="space-y-2 rounded-md border p-3">
                  <Label>Order Radiologi</Label>
                  <Input
                    value={radiologyStudyInput}
                    onChange={(event) => setRadiologyStudyInput(event.target.value)}
                    placeholder="Contoh: Rontgen Thorax AP"
                  />
                  <Button size="sm" onClick={handleCreateRadiologyOrder} disabled={isSavingOrder}>
                    Kirim Order Radiologi
                  </Button>
                  <div className="space-y-1">
                    {admissionRadiologyOrders.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Belum ada order radiologi untuk admisi ini.</p>
                    ) : (
                      admissionRadiologyOrders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between text-xs">
                          <span className="truncate">{order.study}</span>
                          <Badge variant="outline">{order.status}</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pasien</TableHead>
                  <TableHead>Dokter</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>CPPT (SOAP)</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notePagination.paginatedItems.map((note) => {
                  const relatedAdmission = admissionMap.get(note.admissionId)
                  const visitPatient = relatedAdmission ? patientMap.get(relatedAdmission.patientId) : undefined
                  const visitAgeLabel = formatPatientAge(visitPatient?.birthDate)
                  return (
                    <TableRow key={note.id}>
                      <TableCell>
                        <div className="flex flex-col gap-0">
                          <span>{relatedAdmission?.patientName ?? "-"}</span>
                          <span className="text-xs text-muted-foreground">
                            No. RM {visitPatient?.noRM ?? "-"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Umur {visitAgeLabel ?? "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0">
                          <span>{note.doctorName}</span>
                          <span className="text-xs text-muted-foreground">
                            Penanggung jawab: {relatedAdmission?.attendingDoctorName ?? "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{note.date}</TableCell>
                      <TableCell>
                        <SoapNoteDisplay note={note.note} />
                      </TableCell>
                      <TableCell className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEditVisitNote(note)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteVisitNote(note.id)}>
                          Hapus
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <DataPagination
            page={notePagination.page}
            pageSize={notePagination.pageSize}
            totalItems={notePagination.totalItems}
            totalPages={notePagination.totalPages}
            onPageChange={notePagination.setPage}
            itemLabel="catatan"
          />
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="pemulangan" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Proses Pemulangan Pasien (Pulang / Rujuk / Meninggal)</CardTitle>
              <p className="text-sm text-muted-foreground">
                Akhiri episode rawat inap. Bed pasien akan otomatis dilepas setelah status keluar disimpan.
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pasien</TableHead>
                      <TableHead>Bed</TableHead>
                      <TableHead>Dokter</TableHead>
                      <TableHead>Catatan</TableHead>
                      <TableHead>Aksi Keluar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ongoingAdmissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Belum ada pasien aktif yang perlu diselesaikan.
                        </TableCell>
                      </TableRow>
                    ) : ongoingAdmissionPagination.paginatedItems.map((admission) => (
                      <TableRow key={admission.id}>
                        <TableCell>{admission.patientName}</TableCell>
                        <TableCell>{admission.bedNumber || "-"}</TableCell>
                        <TableCell>{admission.attendingDoctorName ?? "-"}</TableCell>
                        <TableCell>{admission.notes ?? "-"}</TableCell>
                        <TableCell className="space-y-2">
                          {admissionHasOutstandingBill(admission, outstandingBillings) ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="text-xs text-destructive flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> Ada tagihan
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Pasien memiliki tagihan yang belum lunas. Selesaikan di modul Pembayaran.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : null}
                          <div className="flex flex-wrap gap-2 items-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDischarge(admission.id, "discharged")}
                              disabled={dischargingAdmissionId === admission.id || admissionHasOutstandingBill(admission, outstandingBillings)}
                            >
                              Pulangkan
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDischarge(admission.id, "referred")}
                              disabled={dischargingAdmissionId === admission.id || admissionHasOutstandingBill(admission, outstandingBillings)}
                            >
                              Rujuk
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDischarge(admission.id, "deceased")}
                              disabled={dischargingAdmissionId === admission.id || admissionHasOutstandingBill(admission, outstandingBillings)}
                            >
                              Meninggal
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openTransferDialog(admission)}
                            >
                              Pindah Bed
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <DataPagination
                page={ongoingAdmissionPagination.page}
                pageSize={ongoingAdmissionPagination.pageSize}
                totalItems={ongoingAdmissionPagination.totalItems}
                totalPages={ongoingAdmissionPagination.totalPages}
                onPageChange={ongoingAdmissionPagination.setPage}
                itemLabel="pasien"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="riwayat" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Pasien Pulang</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pasien</TableHead>
                      <TableHead>Bed</TableHead>
                      <TableHead>Dokter</TableHead>
                      <TableHead>Status Akhir</TableHead>
                      <TableHead>Tanggal Keluar</TableHead>
                      <TableHead>Catatan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedAdmissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Belum ada riwayat rawat inap selesai.
                        </TableCell>
                      </TableRow>
                    ) : completedAdmissionPagination.paginatedItems.map((admission) => (
                      <TableRow key={admission.id}>
                        <TableCell>{admission.patientName}</TableCell>
                        <TableCell>{admission.bedNumber || "-"}</TableCell>
                        <TableCell>{admission.attendingDoctorName ?? "-"}</TableCell>
                        <TableCell>{statusLabels[admission.status] ?? admission.status}</TableCell>
                        <TableCell>
                          {admission.dischargedAt
                            ? new Date(admission.dischargedAt).toLocaleDateString("id-ID")
                            : "-"}
                        </TableCell>
                        <TableCell>{admission.notes ?? "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <DataPagination
                page={completedAdmissionPagination.page}
                pageSize={completedAdmissionPagination.pageSize}
                totalItems={completedAdmissionPagination.totalItems}
                totalPages={completedAdmissionPagination.totalPages}
                onPageChange={completedAdmissionPagination.setPage}
                itemLabel="riwayat"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!transferringAdmission} onOpenChange={(open) => !open && closeTransferDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <BedDouble className="h-5 w-5" />
              Pindahkan Pasien ke Bed Lain
            </DialogTitle>
            <DialogDescription>
              Pindahkan pasien <span className="font-semibold">{transferringAdmission?.patientName}</span> dari bed <span className="font-semibold">{transferringAdmission?.bedNumber}</span> ke bed lain yang tersedia.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-bed">Pilih Bed Tujuan</Label>
            <Select value={selectedNewBedId} onValueChange={setSelectedNewBedId}>
              <SelectTrigger id="new-bed">
                <SelectValue placeholder="Pilih bed yang tersedia" />
              </SelectTrigger>
              <SelectContent>
                {beds
                  .filter((bed) => bed.status === "available")
                  .map((bed) => (
                    <SelectItem key={bed.id} value={bed.id}>
                      {bed.bedNumber} - {bed.ward}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Tindakan ini akan mengosongkan bed lama dan menempatkan pasien di bed baru. Riwayat perpindahan akan dicatat oleh sistem.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeTransferDialog}>Batal</Button>
            <Button onClick={handleConfirmTransfer} disabled={!selectedNewBedId}>Konfirmasi Pindah</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!dialogAction} onOpenChange={(open) => !open && setDialogAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Konfirmasi Tindakan
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogAction?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDialogConfirm}>Lanjutkan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
