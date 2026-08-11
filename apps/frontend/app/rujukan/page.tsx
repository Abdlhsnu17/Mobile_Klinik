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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DataError, DataLoading, useClinicData } from "@/hooks/use-clinic-data";
import { useToast } from "@/hooks/use-toast";
import { buildApiBaseUrl } from "@/lib/api-base";
import type { Patient, Referral, ReferralFacility, ReferralStatus } from "@/lib/auth-types";
import {
    completeReferral,
    deleteReferral,
    deleteReferralFacility,
    followUpReferral,
    receiveReferral,
    rejectReferral,
    saveReferral,
    saveReferralFacility,
    sendReferral,
} from "@/lib/clinic-utils";
import { downloadWithAuth } from "@/lib/download-with-auth";
import { AlertTriangle, Download, Edit, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, type ReactElement } from "react";
import { PatientCombobox } from "@/components/patient-combobox";

const API_BASE = buildApiBaseUrl(process.env.NEXT_PUBLIC_API_URL)

const STATUS_LABEL: Record<ReferralStatus, string> = {
  draft: "Draf",
  sent: "Terkirim",
  received: "Diterima",
  "followed-up": "Ditindaklanjuti",
  rejected: "Ditolak",
  completed: "Selesai",
}

const STATUS_VARIANT: Record<ReferralStatus, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  sent: "secondary",
  received: "secondary",
  "followed-up": "default",
  rejected: "destructive",
  completed: "default",
}

const initialReferralForm: Partial<Referral> = {
  direction: "outgoing",
  patientId: "",
  patientName: "",
  facilityId: undefined,
  facilityName: "",
  diagnosis: "",
  reason: "",
}

const initialFacilityForm: Partial<ReferralFacility> = {
  name: "",
  type: "rumah-sakit",
  address: "",
  phone: "",
}

export default function RujukanPage() {
  const { data: referrals = [], loading: referralsLoading, error: referralsError, refetch: refetchReferrals } = useClinicData<Referral>("referrals")
  const { data: facilities = [], loading: facilitiesLoading, error: facilitiesError, refetch: refetchFacilities } = useClinicData<ReferralFacility>("referral-facilities")
  const { data: patients = [], loading: patientsLoading, error: patientsError, refetch: refetchPatients } = useClinicData<Patient>("patients")
  const { toast } = useToast()

  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [directionFilter, setDirectionFilter] = useState<string>("all")

  const [isReferralDialogOpen, setIsReferralDialogOpen] = useState(false)
  const [referralForm, setReferralForm] = useState<Partial<Referral>>(initialReferralForm)
  const [isSubmittingReferral, setIsSubmittingReferral] = useState(false)
  const [deletingReferral, setDeletingReferral] = useState<Referral | null>(null)

  const [isFacilityDialogOpen, setIsFacilityDialogOpen] = useState(false)
  const [editingFacility, setEditingFacility] = useState<ReferralFacility | null>(null)
  const [facilityForm, setFacilityForm] = useState<Partial<ReferralFacility>>(initialFacilityForm)
  const [isSubmittingFacility, setIsSubmittingFacility] = useState(false)
  const [deletingFacility, setDeletingFacility] = useState<ReferralFacility | null>(null)

  const [transitioningId, setTransitioningId] = useState<string | null>(null)

  const patientMap = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients])
  const facilityMap = useMemo(() => new Map(facilities.map((f) => [f.id, f])), [facilities])

  const filteredReferrals = useMemo(() => {
    return referrals.filter((referral) => {
      if (statusFilter !== "all" && referral.status !== statusFilter) return false
      if (directionFilter !== "all" && referral.direction !== directionFilter) return false
      return true
    })
  }, [referrals, statusFilter, directionFilter])
  const referralPagination = useDataPagination(filteredReferrals)
  const facilityPagination = useDataPagination(facilities)

  const isLoading = referralsLoading || facilitiesLoading || patientsLoading
  const combinedError = referralsError || facilitiesError || patientsError
  const handleRetry = () => {
    if (referralsError) refetchReferrals()
    if (facilitiesError) refetchFacilities()
    if (patientsError) refetchPatients()
  }

  if (isLoading) return <DataLoading message="Memuat data rujukan..." />
  if (combinedError) return <DataError error={combinedError} onRetry={handleRetry} />

  const openReferralDialog = () => {
    setReferralForm(initialReferralForm)
    setIsReferralDialogOpen(true)
  }

  const handleSaveReferral = async () => {
    if (!referralForm.patientId) {
      toast({ title: "Pasien belum dipilih", variant: "destructive" })
      return
    }
    if (!referralForm.facilityName) {
      toast({ title: "Fasilitas wajib diisi", variant: "destructive" })
      return
    }
    if (!referralForm.reason) {
      toast({ title: "Alasan rujukan wajib diisi", variant: "destructive" })
      return
    }
    setIsSubmittingReferral(true)
    try {
      const payload = {
        ...referralForm,
        patientName: patientMap.get(referralForm.patientId)?.name ?? referralForm.patientName,
      }
      await saveReferral(payload)
      toast({ title: "Rujukan disimpan" })
      await refetchReferrals()
      setIsReferralDialogOpen(false)
    } catch (error) {
      toast({ title: "Gagal menyimpan rujukan", description: error instanceof Error ? error.message : undefined, variant: "destructive" })
    } finally {
      setIsSubmittingReferral(false)
    }
  }

  const handleTransition = async (referral: Referral, action: (id: string) => Promise<Referral>, successMessage: string) => {
    setTransitioningId(referral.id)
    try {
      await action(referral.id)
      toast({ title: successMessage })
      await refetchReferrals()
    } catch (error) {
      toast({ title: "Gagal mengubah status", description: error instanceof Error ? error.message : undefined, variant: "destructive" })
    } finally {
      setTransitioningId(null)
    }
  }

  const handleDeleteReferral = async () => {
    if (!deletingReferral) return
    try {
      await deleteReferral(deletingReferral.id)
      toast({ title: "Rujukan dihapus" })
      await refetchReferrals()
      setDeletingReferral(null)
    } catch (error) {
      toast({ title: "Gagal menghapus rujukan", description: error instanceof Error ? error.message : undefined, variant: "destructive" })
    }
  }

  const handleDownloadPdf = (referral: Referral) => {
    downloadWithAuth(`${API_BASE}/referrals/${referral.id}/pdf`, `surat-rujukan-${referral.patientName}.pdf`).catch((error) =>
      toast({ title: "Gagal mengunduh surat rujukan", description: error instanceof Error ? error.message : undefined, variant: "destructive" })
    )
  }

  const openFacilityDialog = (facility?: ReferralFacility) => {
    if (facility) {
      setEditingFacility(facility)
      setFacilityForm(facility)
    } else {
      setEditingFacility(null)
      setFacilityForm(initialFacilityForm)
    }
    setIsFacilityDialogOpen(true)
  }

  const handleSaveFacility = async () => {
    if (!facilityForm.name) {
      toast({ title: "Nama fasilitas wajib diisi", variant: "destructive" })
      return
    }
    setIsSubmittingFacility(true)
    try {
      await saveReferralFacility(editingFacility?.id ? { ...facilityForm, id: editingFacility.id } : facilityForm)
      toast({ title: `Fasilitas ${editingFacility ? "diperbarui" : "ditambahkan"}` })
      await refetchFacilities()
      setIsFacilityDialogOpen(false)
    } catch (error) {
      toast({ title: "Gagal menyimpan fasilitas", description: error instanceof Error ? error.message : undefined, variant: "destructive" })
    } finally {
      setIsSubmittingFacility(false)
    }
  }

  const handleDeleteFacility = async () => {
    if (!deletingFacility) return
    try {
      await deleteReferralFacility(deletingFacility.id)
      toast({ title: "Fasilitas dihapus" })
      await refetchFacilities()
      setDeletingFacility(null)
    } catch (error) {
      toast({ title: "Gagal menghapus fasilitas", description: error instanceof Error ? error.message : undefined, variant: "destructive" })
    }
  }

  const renderActions = (referral: Referral) => {
    const busy = transitioningId === referral.id
    const buttons: ReactElement[] = []

    if (referral.status === "draft") {
      buttons.push(
        <Button key="send" size="sm" disabled={busy} onClick={() => handleTransition(referral, sendReferral, "Rujukan terkirim")}>
          Kirim
        </Button>
      )
    }
    if (referral.status === "sent") {
      buttons.push(
        <Button key="receive" size="sm" variant="outline" disabled={busy} onClick={() => handleTransition(referral, receiveReferral, "Rujukan ditandai diterima")}>
          Tandai Diterima
        </Button>,
        <Button key="reject" size="sm" variant="destructive" disabled={busy} onClick={() => handleTransition(referral, rejectReferral, "Rujukan ditolak")}>
          Tolak
        </Button>
      )
    }
    if (referral.status === "received") {
      buttons.push(
        <Button key="follow-up" size="sm" variant="outline" disabled={busy} onClick={() => handleTransition(referral, followUpReferral, "Rujukan ditindaklanjuti")}>
          Tindak Lanjut
        </Button>,
        <Button key="reject" size="sm" variant="destructive" disabled={busy} onClick={() => handleTransition(referral, rejectReferral, "Rujukan ditolak")}>
          Tolak
        </Button>
      )
    }
    if (referral.status === "followed-up") {
      buttons.push(
        <Button key="complete" size="sm" disabled={busy} onClick={() => handleTransition(referral, completeReferral, "Rujukan selesai")}>
          Selesaikan
        </Button>
      )
    }
    if (referral.direction === "outgoing") {
      buttons.push(
        <Button key="pdf" size="sm" variant="ghost" onClick={() => handleDownloadPdf(referral)}>
          <Download className="h-4 w-4" />
        </Button>
      )
    }
    if (referral.status === "draft") {
      buttons.push(
        <Button key="delete" size="sm" variant="ghost" onClick={() => setDeletingReferral(referral)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )
    }
    return buttons
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Rujukan</p>
        <h1 className="text-3xl font-bold text-foreground">Manajemen Rujukan</h1>
        <p className="text-sm text-muted-foreground">Kelola rujukan masuk dan keluar, direktori fasilitas, serta surat rujukan.</p>
      </div>

      <Tabs defaultValue="rujukan">
        <TabsList className="w-full">
          <TabsTrigger value="rujukan">Rujukan</TabsTrigger>
          <TabsTrigger value="fasilitas">Direktori Fasilitas</TabsTrigger>
        </TabsList>

        <TabsContent value="rujukan" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Daftar Rujukan</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Select value={directionFilter} onValueChange={(value) => {
                    setDirectionFilter(value)
                    referralPagination.resetPage()
                  }}>
                    <SelectTrigger className="w-35"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Arah</SelectItem>
                      <SelectItem value="outgoing">Keluar</SelectItem>
                      <SelectItem value="incoming">Masuk</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={(value) => {
                    setStatusFilter(value)
                    referralPagination.resetPage()
                  }}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      {Object.entries(STATUS_LABEL).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={openReferralDialog}><Plus className="h-4 w-4 mr-2" />Buat Rujukan</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pasien</TableHead>
                      <TableHead>Arah</TableHead>
                      <TableHead>Fasilitas</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReferrals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Belum ada rujukan yang tercatat.
                        </TableCell>
                      </TableRow>
                    ) : (
                      referralPagination.paginatedItems.map((referral) => (
                        <TableRow key={referral.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{referral.patientName}</p>
                              {referral.diagnosis && <p className="text-xs text-muted-foreground">{referral.diagnosis}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{referral.direction === "outgoing" ? "Keluar" : "Masuk"}</Badge>
                          </TableCell>
                          <TableCell>{referral.facilityName}</TableCell>
                          <TableCell>
                            <Badge variant={STATUS_VARIANT[referral.status]}>{STATUS_LABEL[referral.status]}</Badge>
                          </TableCell>
                          <TableCell>{new Date(referral.createdAt).toLocaleDateString("id-ID")}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">{renderActions(referral)}</div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <DataPagination page={referralPagination.page} totalItems={referralPagination.totalItems} totalPages={referralPagination.totalPages} onPageChange={referralPagination.setPage} itemLabel="rujukan" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fasilitas" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Direktori Fasilitas Rujukan</CardTitle>
                <Button onClick={() => openFacilityDialog()}><Plus className="h-4 w-4 mr-2" />Tambah Fasilitas</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Alamat</TableHead>
                      <TableHead>Telepon</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {facilities.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Belum ada fasilitas rujukan yang terdaftar.
                        </TableCell>
                      </TableRow>
                    ) : (
                      facilityPagination.paginatedItems.map((facility) => (
                        <TableRow key={facility.id}>
                          <TableCell className="font-medium">{facility.name}</TableCell>
                          <TableCell className="capitalize">{facility.type.replace("-", " ")}</TableCell>
                          <TableCell>{facility.address || "-"}</TableCell>
                          <TableCell>{facility.phone || "-"}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openFacilityDialog(facility)}><Edit className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeletingFacility(facility)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <DataPagination page={facilityPagination.page} totalItems={facilityPagination.totalItems} totalPages={facilityPagination.totalPages} onPageChange={facilityPagination.setPage} itemLabel="fasilitas" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Buat Rujukan */}
      <Dialog open={isReferralDialogOpen} onOpenChange={setIsReferralDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat Rujukan</DialogTitle>
            <DialogDescription>Catat rujukan keluar ke fasilitas lain atau rujukan masuk dari FKTP/klinik jejaring.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Arah Rujukan</Label>
              <Select value={referralForm.direction} onValueChange={(v) => setReferralForm((prev) => ({ ...prev, direction: v as Referral["direction"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="outgoing">Keluar (ke fasilitas lain)</SelectItem>
                  <SelectItem value="incoming">Masuk (dari FKTP/klinik lain)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pasien</Label>
              <PatientCombobox patients={patients} value={referralForm.patientId ?? ""} onValueChange={(id) => setReferralForm((prev) => ({ ...prev, patientId: id }))} />
            </div>
            <div className="space-y-2">
              <Label>Fasilitas {referralForm.direction === "outgoing" ? "Tujuan" : "Asal"}</Label>
              <Select
                value={referralForm.facilityId ?? ""}
                onValueChange={(id) => {
                  const facility = facilityMap.get(id)
                  setReferralForm((prev) => ({ ...prev, facilityId: id, facilityName: facility?.name ?? prev.facilityName }))
                }}
              >
                <SelectTrigger><SelectValue placeholder="Pilih fasilitas" /></SelectTrigger>
                <SelectContent>
                  {facilities.map((facility) => (
                    <SelectItem key={facility.id} value={facility.id}>{facility.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {facilities.length === 0 && (
                <p className="text-xs text-muted-foreground">Belum ada fasilitas di direktori. Anda tetap bisa mengetik nama fasilitas manual di bawah.</p>
              )}
              <Input
                placeholder="Atau ketik nama fasilitas manual"
                value={referralForm.facilityName ?? ""}
                onChange={(e) => setReferralForm((prev) => ({ ...prev, facilityName: e.target.value, facilityId: undefined }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="diagnosis">Diagnosis</Label>
              <Input id="diagnosis" value={referralForm.diagnosis ?? ""} onChange={(e) => setReferralForm((prev) => ({ ...prev, diagnosis: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Alasan Rujukan</Label>
              <Textarea id="reason" value={referralForm.reason ?? ""} onChange={(e) => setReferralForm((prev) => ({ ...prev, reason: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReferralDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSaveReferral} disabled={isSubmittingReferral}>{isSubmittingReferral ? "Menyimpan..." : "Simpan Rujukan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Hapus Rujukan */}
      <Dialog open={!!deletingReferral} onOpenChange={(open) => !open && setDeletingReferral(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Hapus Rujukan</DialogTitle>
            <DialogDescription>Apakah Anda yakin ingin menghapus rujukan draf untuk <strong>{deletingReferral?.patientName}</strong>?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingReferral(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleDeleteReferral}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Fasilitas */}
      <Dialog open={isFacilityDialogOpen} onOpenChange={setIsFacilityDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFacility ? "Edit Fasilitas" : "Tambah Fasilitas"}</DialogTitle>
            <DialogDescription>Kelola data fasilitas rujukan (rumah sakit/klinik/puskesmas jejaring).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="facilityName">Nama Fasilitas</Label>
              <Input id="facilityName" value={facilityForm.name ?? ""} onChange={(e) => setFacilityForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Tipe</Label>
              <Select value={facilityForm.type} onValueChange={(v) => setFacilityForm((prev) => ({ ...prev, type: v as ReferralFacility["type"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rumah-sakit">Rumah Sakit</SelectItem>
                  <SelectItem value="klinik">Klinik</SelectItem>
                  <SelectItem value="puskesmas">Puskesmas</SelectItem>
                  <SelectItem value="lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="facilityAddress">Alamat</Label>
              <Textarea id="facilityAddress" value={facilityForm.address ?? ""} onChange={(e) => setFacilityForm((prev) => ({ ...prev, address: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facilityPhone">Telepon</Label>
              <Input id="facilityPhone" value={facilityForm.phone ?? ""} onChange={(e) => setFacilityForm((prev) => ({ ...prev, phone: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFacilityDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSaveFacility} disabled={isSubmittingFacility}>{isSubmittingFacility ? "Menyimpan..." : "Simpan Fasilitas"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingFacility} onOpenChange={(open) => !open && setDeletingFacility(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Hapus Fasilitas</DialogTitle>
            <DialogDescription>Apakah Anda yakin ingin menghapus fasilitas <strong>{deletingFacility?.name}</strong>?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingFacility(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleDeleteFacility}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
