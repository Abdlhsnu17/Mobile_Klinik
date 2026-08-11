"use client"

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataPagination, useDataPagination } from "@/components/data-pagination";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { DataError, DataLoading, useClinicData } from "@/hooks/use-clinic-data";
import { useToast } from "@/hooks/use-toast";
import { buildApiBaseUrl } from "@/lib/api-base";
import type { Doctor, InformedConsent, InformedConsentType, Patient } from "@/lib/auth-types";
import { deleteInformedConsent, saveInformedConsent } from "@/lib/clinic-utils";
import { downloadWithAuth } from "@/lib/download-with-auth";
import { DoctorSelect } from "@/components/doctor-select";
import { PatientCombobox } from "@/components/patient-combobox";
import { Download, Edit, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

const API_BASE = buildApiBaseUrl(process.env.NEXT_PUBLIC_API_URL)

const TYPE_LABEL: Record<InformedConsentType, string> = {
  "tindakan-medis": "Tindakan Medis",
  "tindakan-bedah": "Tindakan Bedah",
  anestesi: "Anestesi",
  "rawat-inap": "Rawat Inap",
  "transfusi-darah": "Transfusi Darah",
  "persetujuan-umum": "Persetujuan Umum",
}

const initialForm: Partial<InformedConsent> = {
  patientId: "",
  patientName: "",
  consentType: "tindakan-medis",
  procedureName: "",
  procedureCode: "",
  doctorId: "",
  doctorName: "",
  diagnosis: "",
  indication: "",
  risks: "",
  alternatives: "",
  prognosis: "",
  grantedBy: "pasien",
  guardianName: "",
  guardianRelation: "",
  guardianNik: "",
  witnessName: "",
  decision: "setuju",
  status: "draft",
  signedLocation: "",
  notes: "",
}

export default function PersetujuanTindakanPage() {
  const { data: consents = [], loading, error, refetch } = useClinicData<InformedConsent>("informed-consents")
  const { data: patients = [], loading: patientsLoading, error: patientsError, refetch: refetchPatients } = useClinicData<Patient>("patients")
  const { data: doctors = [], loading: doctorsLoading, error: doctorsError, refetch: refetchDoctors } = useClinicData<Doctor>("doctors")
  const { toast } = useToast()

  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<InformedConsent>>(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<InformedConsent | null>(null)

  const patientMap = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients])
  const doctorMap = useMemo(() => new Map(doctors.map((d) => [d.id, d])), [doctors])

  const filtered = useMemo(
    () => consents.filter((c) => typeFilter === "all" || c.consentType === typeFilter),
    [consents, typeFilter]
  )
  const pagination = useDataPagination(filtered)

  const isLoading = loading || patientsLoading || doctorsLoading
  const combinedError = error || patientsError || doctorsError
  const handleRetry = () => {
    if (error) refetch()
    if (patientsError) refetchPatients()
    if (doctorsError) refetchDoctors()
  }

  if (isLoading) return <DataLoading message="Memuat data persetujuan tindakan..." />
  if (combinedError) return <DataError error={combinedError} onRetry={handleRetry} />

  const openCreate = () => {
    setEditingId(null)
    setForm(initialForm)
    setIsDialogOpen(true)
  }

  const openEdit = (consent: InformedConsent) => {
    setEditingId(consent.id)
    setForm({ ...consent })
    setIsDialogOpen(true)
  }

  const setField = <K extends keyof InformedConsent>(key: K, value: InformedConsent[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    if (!form.patientId) {
      toast({ title: "Pasien belum dipilih", variant: "destructive" })
      return
    }
    if (!form.procedureName) {
      toast({ title: "Nama tindakan wajib diisi", variant: "destructive" })
      return
    }
    if (form.grantedBy === "wali" && !form.guardianName) {
      toast({ title: "Nama wali wajib diisi bila persetujuan diberikan oleh wali", variant: "destructive" })
      return
    }
    setIsSubmitting(true)
    try {
      const payload: Partial<InformedConsent> = {
        ...form,
        ...(editingId ? { id: editingId } : {}),
        patientName: patientMap.get(form.patientId!)?.name ?? form.patientName,
        doctorName: form.doctorId ? doctorMap.get(form.doctorId)?.name ?? form.doctorName : form.doctorName,
        signedAt: form.status === "signed" ? form.signedAt ?? new Date().toISOString() : undefined,
      }
      await saveInformedConsent(payload)
      toast({ title: "Persetujuan tindakan disimpan" })
      await refetch()
      setIsDialogOpen(false)
    } catch (err) {
      toast({ title: "Gagal menyimpan", description: err instanceof Error ? err.message : undefined, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteInformedConsent(deleting.id)
      toast({ title: "Persetujuan tindakan dihapus" })
      await refetch()
      setDeleting(null)
    } catch (err) {
      toast({ title: "Gagal menghapus", description: err instanceof Error ? err.message : undefined, variant: "destructive" })
    }
  }

  const handleDownloadPdf = (consent: InformedConsent) => {
    downloadWithAuth(`${API_BASE}/informed-consents/${consent.id}/pdf`, `persetujuan-tindakan-${consent.patientName}.pdf`).catch(
      (err) =>
        toast({ title: "Gagal mengunduh surat", description: err instanceof Error ? err.message : undefined, variant: "destructive" })
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Persetujuan Tindakan</p>
        <h1 className="text-3xl font-bold text-foreground">Persetujuan Tindakan Medis</h1>
        <p className="text-sm text-muted-foreground">
          Kelola informed consent pasien sesuai PMK 290/2008: penjelasan tindakan, persetujuan/penolakan, dan cetak surat.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Daftar Persetujuan</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value)
                  pagination.resetPage()
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jenis</SelectItem>
                  {Object.entries(TYPE_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Buat Persetujuan
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pasien</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Tindakan</TableHead>
                  <TableHead>Pemberi</TableHead>
                  <TableHead>Keputusan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Belum ada data persetujuan tindakan.
                    </TableCell>
                  </TableRow>
                ) : (
                  pagination.paginatedItems.map((consent) => (
                    <TableRow key={consent.id}>
                      <TableCell className="font-medium">{consent.patientName}</TableCell>
                      <TableCell>{TYPE_LABEL[consent.consentType]}</TableCell>
                      <TableCell>{consent.procedureName}</TableCell>
                      <TableCell>
                        {consent.grantedBy === "wali" ? `Wali: ${consent.guardianName || "-"}` : "Pasien"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={consent.decision === "setuju" ? "default" : "destructive"}>
                          {consent.decision === "setuju" ? "Setuju" : "Menolak"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={consent.status === "signed" ? "default" : "outline"}>
                          {consent.status === "signed" ? "Ditandatangani" : "Draf"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleDownloadPdf(consent)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(consent)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleting(consent)}>
                            <Trash2 className="h-4 w-4" />
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
            page={pagination.page}
            totalItems={pagination.totalItems}
            totalPages={pagination.totalPages}
            onPageChange={pagination.setPage}
            itemLabel="persetujuan"
          />
        </CardContent>
      </Card>

      {/* Dialog buat/edit */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Persetujuan Tindakan" : "Buat Persetujuan Tindakan"}</DialogTitle>
            <DialogDescription>
              Lengkapi penjelasan tindakan dan identitas pemberi persetujuan sesuai standar informed consent.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Pasien</Label>
                <PatientCombobox
                  patients={patients}
                  value={form.patientId ?? ""}
                  onValueChange={(value) => setField("patientId", value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Jenis Persetujuan</Label>
                <Select
                  value={form.consentType}
                  onValueChange={(value) => setField("consentType", value as InformedConsentType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABEL).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Nama Tindakan</Label>
                <Input
                  value={form.procedureName ?? ""}
                  onChange={(e) => setField("procedureName", e.target.value)}
                  placeholder="mis. Penjahitan luka (hecting)"
                />
              </div>
              <div className="space-y-1">
                <Label>Kode Tindakan (ICD-9-CM, opsional)</Label>
                <Input
                  value={form.procedureCode ?? ""}
                  onChange={(e) => setField("procedureCode", e.target.value)}
                  placeholder="mis. 86.59"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Dokter Penanggung Jawab</Label>
              <DoctorSelect
                doctors={doctors}
                value={form.doctorId ?? ""}
                onValueChange={(value) => setField("doctorId", value)}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Diagnosis</Label>
                <Textarea value={form.diagnosis ?? ""} onChange={(e) => setField("diagnosis", e.target.value)} rows={2} />
              </div>
              <div className="space-y-1">
                <Label>Indikasi Tindakan</Label>
                <Textarea value={form.indication ?? ""} onChange={(e) => setField("indication", e.target.value)} rows={2} />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Risiko & Komplikasi</Label>
                <Textarea value={form.risks ?? ""} onChange={(e) => setField("risks", e.target.value)} rows={2} />
              </div>
              <div className="space-y-1">
                <Label>Alternatif Tindakan</Label>
                <Textarea value={form.alternatives ?? ""} onChange={(e) => setField("alternatives", e.target.value)} rows={2} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Prognosis</Label>
              <Textarea value={form.prognosis ?? ""} onChange={(e) => setField("prognosis", e.target.value)} rows={2} />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Persetujuan Diberikan Oleh</Label>
                <Select
                  value={form.grantedBy}
                  onValueChange={(value) => setField("grantedBy", value as InformedConsent["grantedBy"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pasien">Pasien sendiri</SelectItem>
                    <SelectItem value="wali">Wali / keluarga</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Keputusan</Label>
                <Select
                  value={form.decision}
                  onValueChange={(value) => setField("decision", value as InformedConsent["decision"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="setuju">Menyetujui</SelectItem>
                    <SelectItem value="menolak">Menolak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.grantedBy === "wali" && (
              <div className="grid gap-2 sm:grid-cols-3 rounded-md border p-3">
                <div className="space-y-1">
                  <Label>Nama Wali</Label>
                  <Input value={form.guardianName ?? ""} onChange={(e) => setField("guardianName", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Hubungan</Label>
                  <Input
                    value={form.guardianRelation ?? ""}
                    onChange={(e) => setField("guardianRelation", e.target.value)}
                    placeholder="mis. Ayah"
                  />
                </div>
                <div className="space-y-1">
                  <Label>NIK Wali</Label>
                  <Input value={form.guardianNik ?? ""} onChange={(e) => setField("guardianNik", e.target.value)} />
                </div>
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>Nama Saksi</Label>
                <Input value={form.witnessName ?? ""} onChange={(e) => setField("witnessName", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Tempat Penandatanganan</Label>
                <Input value={form.signedLocation ?? ""} onChange={(e) => setField("signedLocation", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => setField("status", value as InformedConsent["status"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draf</SelectItem>
                    <SelectItem value="signed">Ditandatangani</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Catatan</Label>
              <Textarea value={form.notes ?? ""} onChange={(e) => setField("notes", e.target.value)} rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog hapus */}
      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Persetujuan Tindakan</DialogTitle>
            <DialogDescription>
              Yakin ingin menghapus persetujuan tindakan atas nama {deleting?.patientName}? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
