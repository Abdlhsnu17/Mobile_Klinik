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
import type { BillingRecord, InsuranceClaim, InsuranceClaimStatus, InsuranceProfile, Patient } from "@/lib/auth-types";
import {
    createInsuranceClaim,
    deleteInsuranceClaim,
    deleteInsuranceProfile,
    formatCurrency,
    saveInsuranceProfile,
    updateInsuranceClaimStatus,
    verifyBpjsMember,
} from "@/lib/clinic-utils";
import { AlertTriangle, Banknote, CheckCircle2, Edit, Plus, Send, ShieldCheck, Trash2, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { PatientCombobox } from "@/components/patient-combobox";

const initialFormData: Partial<InsuranceProfile> = {
  patientId: "",
  patientName: "",
  provider: "bpjs",
  policyNumber: "",
  planName: "Kelas 1",
  validUntil: "",
  rateMultiplier: 1,
};

const CLAIM_STATUS_META: Record<InsuranceClaimStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Draft", variant: "outline" },
  submitted: { label: "Diajukan", variant: "secondary" },
  verified: { label: "Terverifikasi", variant: "secondary" },
  approved: { label: "Disetujui", variant: "default" },
  paid: { label: "Dicairkan", variant: "default" },
  rejected: { label: "Ditolak", variant: "destructive" },
};

export default function AsuransiPage() {
  const { data: profiles = [], loading: profilesLoading, error: profilesError, refetch: refetchProfiles } = useClinicData<InsuranceProfile>("insurance-profiles");
  const { data: patients = [], loading: patientsLoading, error: patientsError, refetch: refetchPatients } = useClinicData<Patient>("patients");
  const { data: claims = [], loading: claimsLoading, error: claimsError, refetch: refetchClaims } = useClinicData<InsuranceClaim>("insurance-claims");
  const { data: billings = [], loading: billingsLoading, error: billingsError, refetch: refetchBillings } = useClinicData<BillingRecord>("billing-records");
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<InsuranceProfile | null>(null);
  const [deletingProfile, setDeletingProfile] = useState<InsuranceProfile | null>(null);
  const [formData, setFormData] = useState<Partial<InsuranceProfile>>(initialFormData);
  const [verifyResult, setVerifyResult] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State panel klaim
  const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false);
  const [claimForm, setClaimForm] = useState<{ billingRecordId: string; claimedAmount: string; notes: string }>({ billingRecordId: "", claimedAmount: "", notes: "" });
  const [approvingClaim, setApprovingClaim] = useState<InsuranceClaim | null>(null);
  const [approvedAmount, setApprovedAmount] = useState("");
  const [rejectingClaim, setRejectingClaim] = useState<InsuranceClaim | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [deletingClaim, setDeletingClaim] = useState<InsuranceClaim | null>(null);
  const [claimBusyId, setClaimBusyId] = useState<string | null>(null);

  const patientMap = useMemo(() => new Map(patients.map(p => [p.id, p])), [patients]);

  // Tagihan yang punya porsi asuransi & belum punya klaim aktif/dicairkan.
  const claimedBillingIds = useMemo(
    () => new Set(claims.filter((c) => c.status !== "rejected").map((c) => c.billingRecordId)),
    [claims],
  );
  const eligibleBillings = useMemo(
    () => billings.filter((b) => Number(b.insuranceCoverage) > 0 && !claimedBillingIds.has(b.id)),
    [billings, claimedBillingIds],
  );
  const selectedClaimBilling = useMemo(
    () => billings.find((b) => b.id === claimForm.billingRecordId) ?? null,
    [billings, claimForm.billingRecordId],
  );
  const profilePagination = useDataPagination(profiles);
  const claimPagination = useDataPagination(claims);

  const handleVerify = async () => {
    if (!formData.policyNumber) return;
    setVerifyResult("Memverifikasi...");
    try {
      const result = await verifyBpjsMember(formData.policyNumber)
      if (result.success) {
        setVerifyResult(`✅ Peserta aktif (${result.facility})`)
        if (result.planName) {
          setFormData(prev => ({ ...prev, planName: result.planName }));
        }
      } else {
        setVerifyResult(`❌ ${result.message || "Tidak terverifikasi"}`)
      }
    } catch (error) {
      setVerifyResult(`Error: ${error instanceof Error ? error.message : "Terjadi kesalahan"}`)
    }
  }

  const handleSave = async () => {
    if (!formData.patientId) {
      toast({ title: "Pasien belum dipilih", description: "Silakan pilih pasien terlebih dahulu.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    // rateMultiplier valid pada rentang [0,1]. 0 = pertanggungan 100%, 1 = tanpa
    // pertanggungan. Input kosong/tidak valid jatuh ke 1 (tanpa pertanggungan).
    const parsedMultiplier = Number(formData.rateMultiplier);
    const payload = {
      ...formData,
      patientName: patientMap.get(formData.patientId)?.name ?? formData.patientName,
      rateMultiplier: Number.isFinite(parsedMultiplier)
        ? Math.max(0, Math.min(parsedMultiplier, 1))
        : 1,
    };

    try {
      await saveInsuranceProfile(editingProfile?.id ? { ...payload, id: editingProfile.id } : payload);
      toast({
        title: `Profil Asuransi ${editingProfile ? "Diperbarui" : "Disimpan"}`,
        description: `Data asuransi untuk pasien ${payload.patientName} telah disimpan.`,
      });
      await refetchProfiles();
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: "Gagal Menyimpan", description: error instanceof Error ? error.message : "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProfile) return;
    try {
      await deleteInsuranceProfile(deletingProfile.id);
      toast({ title: "Profil Dihapus", description: `Profil asuransi untuk ${deletingProfile.patientName} telah dihapus.` });
      await refetchProfiles();
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast({ title: "Gagal Menghapus", description: error instanceof Error ? error.message : "Terjadi kesalahan.", variant: "destructive" });
    }
  };

  const openDialog = (profile?: InsuranceProfile) => {
    if (profile) {
      setEditingProfile(profile);
      setFormData(profile);
    } else {
      setEditingProfile(null);
      setFormData(initialFormData);
    }
    setVerifyResult(null);
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (profile: InsuranceProfile) => {
    setDeletingProfile(profile);
    setIsDeleteDialogOpen(true);
  };

  // ------- Handler klaim -------
  const refreshClaimData = async () => {
    await Promise.all([refetchClaims(), refetchBillings()]);
  };

  const openClaimDialog = () => {
    setClaimForm({ billingRecordId: "", claimedAmount: "", notes: "" });
    setIsClaimDialogOpen(true);
  };

  const handleCreateClaim = async () => {
    if (!claimForm.billingRecordId) {
      toast({ title: "Tagihan belum dipilih", description: "Pilih tagihan yang memiliki porsi asuransi.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await createInsuranceClaim({
        billingRecordId: claimForm.billingRecordId,
        claimedAmount: claimForm.claimedAmount ? Number(claimForm.claimedAmount) : undefined,
        notes: claimForm.notes || undefined,
      });
      toast({ title: "Klaim Dibuat", description: "Klaim asuransi berhasil dibuat sebagai draft." });
      await refreshClaimData();
      setIsClaimDialogOpen(false);
    } catch (error) {
      toast({ title: "Gagal Membuat Klaim", description: error instanceof Error ? error.message : "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const runTransition = async (claim: InsuranceClaim, status: Exclude<InsuranceClaimStatus, "draft">, payload: { approvedAmount?: number; rejectionReason?: string } = {}) => {
    setClaimBusyId(claim.id);
    try {
      await updateInsuranceClaimStatus(claim.id, status, payload);
      toast({ title: "Status Klaim Diperbarui", description: `Klaim ${claim.patientName} → ${CLAIM_STATUS_META[status].label}.` });
      await refreshClaimData();
      return true;
    } catch (error) {
      toast({ title: "Gagal Memperbarui Klaim", description: error instanceof Error ? error.message : "Terjadi kesalahan.", variant: "destructive" });
      return false;
    } finally {
      setClaimBusyId(null);
    }
  };

  const openApproveDialog = (claim: InsuranceClaim) => {
    setApprovingClaim(claim);
    setApprovedAmount(String(claim.claimedAmount ?? 0));
  };

  const confirmApprove = async () => {
    if (!approvingClaim) return;
    const amount = Number(approvedAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      toast({ title: "Nominal tidak valid", variant: "destructive" });
      return;
    }
    const ok = await runTransition(approvingClaim, "approved", { approvedAmount: amount });
    if (ok) setApprovingClaim(null);
  };

  const openRejectDialog = (claim: InsuranceClaim) => {
    setRejectingClaim(claim);
    setRejectionReason("");
  };

  const confirmReject = async () => {
    if (!rejectingClaim) return;
    const ok = await runTransition(rejectingClaim, "rejected", { rejectionReason: rejectionReason || undefined });
    if (ok) setRejectingClaim(null);
  };

  const handleDeleteClaim = async () => {
    if (!deletingClaim) return;
    try {
      await deleteInsuranceClaim(deletingClaim.id);
      toast({ title: "Klaim Dihapus", description: `Klaim untuk ${deletingClaim.patientName} telah dihapus.` });
      await refreshClaimData();
      setDeletingClaim(null);
    } catch (error) {
      toast({ title: "Gagal Menghapus Klaim", description: error instanceof Error ? error.message : "Terjadi kesalahan.", variant: "destructive" });
    }
  };

  const isLoading = profilesLoading || patientsLoading || claimsLoading || billingsLoading;
  const combinedError = profilesError || patientsError || claimsError || billingsError;
  const handleRetry = () => {
    if (profilesError) refetchProfiles();
    if (patientsError) refetchPatients();
    if (claimsError) refetchClaims();
    if (billingsError) refetchBillings();
  };

  if (isLoading) return <DataLoading message="Memuat data asuransi..." />;
  if (combinedError) return <DataError error={combinedError} onRetry={handleRetry} />;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Penjamin</p>
        <h1 className="text-3xl font-bold text-foreground">Asuransi dan BPJS</h1>
        <p className="text-sm text-muted-foreground">Kelola profil asuransi, ajukan klaim, dan catat pencairan dana penjamin.</p>
      </div>

      <Tabs defaultValue="profil-penjamin" className="gap-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger
            value="profil-penjamin"          >
            <ShieldCheck className="h-4 w-4" />
            Profil Penjamin
          </TabsTrigger>
          <TabsTrigger
            value="klaim-asuransi"          >
            <Banknote className="h-4 w-4" />
            Klaim Asuransi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profil-penjamin">
          <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Profil Penjamin Pasien</CardTitle>
            <Button onClick={() => openDialog()}><Plus className="h-4 w-4 mr-2" />Tambah Profil</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pasien</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>No. Polis / Peserta</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Berlaku Hingga</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Belum ada profil asuransi yang terdaftar.
                    </TableCell>
                  </TableRow>
                ) : (
                  profilePagination.paginatedItems.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell><div><p className="font-medium">{profile.patientName}</p><p className="text-xs text-muted-foreground">No. RM: {patientMap.get(profile.patientId)?.noRM}</p></div></TableCell>
                      <TableCell><Badge variant={profile.provider === 'bpjs' ? 'default' : 'secondary'}>{profile.provider.toUpperCase()}</Badge></TableCell>
                      <TableCell>{profile.policyNumber}</TableCell>
                      <TableCell>{profile.planName}</TableCell>
                      <TableCell>{profile.validUntil ? new Date(profile.validUntil).toLocaleDateString('id-ID') : '-'}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openDialog(profile)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(profile)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DataPagination page={profilePagination.page} totalItems={profilePagination.totalItems} totalPages={profilePagination.totalPages} onPageChange={profilePagination.setPage} itemLabel="profil" />
        </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="klaim-asuransi">
          <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Klaim Asuransi</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Ajukan porsi asuransi tagihan, lalu catat verifikasi hingga pencairan dana.</p>
            </div>
            <Button onClick={openClaimDialog} disabled={eligibleBillings.length === 0}>
              <Plus className="h-4 w-4 mr-2" />Buat Klaim
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pasien</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Diajukan</TableHead>
                  <TableHead className="text-right">Disetujui</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Belum ada klaim. Buat klaim dari tagihan yang memiliki porsi asuransi.
                    </TableCell>
                  </TableRow>
                ) : (
                  claimPagination.paginatedItems.map((claim) => {
                    const meta = CLAIM_STATUS_META[claim.status];
                    const busy = claimBusyId === claim.id;
                    return (
                      <TableRow key={claim.id}>
                        <TableCell>
                          <p className="font-medium">{claim.patientName || patientMap.get(claim.patientId)?.name || "-"}</p>
                          {claim.status === "rejected" && claim.rejectionReason ? (
                            <p className="text-xs text-destructive">Alasan: {claim.rejectionReason}</p>
                          ) : null}
                        </TableCell>
                        <TableCell><Badge variant={claim.provider === 'bpjs' ? 'default' : 'secondary'}>{claim.provider.toUpperCase()}</Badge></TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(claim.claimedAmount))}</TableCell>
                        <TableCell className="text-right">{claim.status === "approved" || claim.status === "paid" ? formatCurrency(Number(claim.approvedAmount)) : "-"}</TableCell>
                        <TableCell><Badge variant={meta.variant}>{meta.label}</Badge></TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            {claim.status === "draft" && (
                              <Button size="sm" variant="outline" disabled={busy} onClick={() => runTransition(claim, "submitted")}><Send className="h-4 w-4 mr-1" />Ajukan</Button>
                            )}
                            {claim.status === "submitted" && (
                              <Button size="sm" variant="outline" disabled={busy} onClick={() => runTransition(claim, "verified")}><CheckCircle2 className="h-4 w-4 mr-1" />Verifikasi</Button>
                            )}
                            {claim.status === "verified" && (
                              <Button size="sm" variant="outline" disabled={busy} onClick={() => openApproveDialog(claim)}><CheckCircle2 className="h-4 w-4 mr-1" />Setujui</Button>
                            )}
                            {claim.status === "approved" && (
                              <Button size="sm" disabled={busy} onClick={() => runTransition(claim, "paid")}><Banknote className="h-4 w-4 mr-1" />Cairkan</Button>
                            )}
                            {["submitted", "verified", "approved"].includes(claim.status) && (
                              <Button size="sm" variant="ghost" disabled={busy} onClick={() => openRejectDialog(claim)}><XCircle className="h-4 w-4 mr-1 text-destructive" />Tolak</Button>
                            )}
                            {claim.status !== "paid" && (
                              <Button size="icon" variant="ghost" disabled={busy} onClick={() => setDeletingClaim(claim)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <DataPagination page={claimPagination.page} totalItems={claimPagination.totalItems} totalPages={claimPagination.totalPages} onPageChange={claimPagination.setPage} itemLabel="klaim" />
        </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog profil */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProfile ? "Edit Profil Asuransi" : "Tambah Profil Asuransi"}</DialogTitle>
            <DialogDescription>Lengkapi data penjamin untuk pasien yang dipilih.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Pasien</Label>
              <PatientCombobox patients={patients} value={formData.patientId ?? ""} onValueChange={(id) => setFormData(prev => ({ ...prev, patientId: id }))} disabled={!!editingProfile} />
            </div>
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={formData.provider} onValueChange={(v) => setFormData(prev => ({ ...prev, provider: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bpjs">BPJS Kesehatan</SelectItem>
                  <SelectItem value="asuransi-swasta">Asuransi Swasta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="policyNumber">No. Polis / Peserta</Label>
              <div className="flex gap-2">
                <Input id="policyNumber" value={formData.policyNumber} onChange={(e) => setFormData(prev => ({ ...prev, policyNumber: e.target.value }))} />
                {formData.provider === 'bpjs' && <Button variant="outline" onClick={handleVerify}>Verifikasi</Button>}
              </div>
              {verifyResult && <p className="text-sm text-muted-foreground mt-1">{verifyResult}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="planName">Nama Plan</Label><Input id="planName" value={formData.planName} onChange={(e) => setFormData(prev => ({ ...prev, planName: e.target.value }))} /></div>
              <div className="space-y-2"><Label htmlFor="validUntil">Berlaku Hingga</Label><Input id="validUntil" type="date" value={formData.validUntil} onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))} /></div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rateMultiplier">Pengali Tarif (Contoh: 0.8 untuk diskon 20%)</Label>
              <Input id="rateMultiplier" type="number" step="0.01" value={formData.rateMultiplier} onChange={(e) => setFormData(prev => ({ ...prev, rateMultiplier: Number(e.target.value) }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={isSubmitting}>{isSubmitting ? "Menyimpan..." : "Simpan Profil"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog hapus profil */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Hapus Profil Asuransi</DialogTitle>
            <DialogDescription>Apakah Anda yakin ingin menghapus profil asuransi untuk <strong>{deletingProfile?.patientName}</strong>? Tindakan ini tidak dapat dibatalkan.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog buat klaim */}
      <Dialog open={isClaimDialogOpen} onOpenChange={setIsClaimDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat Klaim Asuransi</DialogTitle>
            <DialogDescription>Pilih tagihan dengan porsi asuransi. Nominal diajukan default mengikuti coverage tagihan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tagihan</Label>
              <Select value={claimForm.billingRecordId} onValueChange={(v) => setClaimForm(prev => ({ ...prev, billingRecordId: v, claimedAmount: "" }))}>
                <SelectTrigger><SelectValue placeholder="Pilih tagihan" /></SelectTrigger>
                <SelectContent>
                  {eligibleBillings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.patientName} — coverage {formatCurrency(Number(b.insuranceCoverage))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {eligibleBillings.length === 0 && (
                <p className="text-xs text-muted-foreground">Tidak ada tagihan berporsi asuransi yang belum diklaim.</p>
              )}
            </div>
            {selectedClaimBilling && (
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                <p>Total tagihan: <span className="font-medium text-foreground">{formatCurrency(Number(selectedClaimBilling.total))}</span></p>
                <p>Porsi asuransi (coverage): <span className="font-medium text-foreground">{formatCurrency(Number(selectedClaimBilling.insuranceCoverage))}</span></p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="claimedAmount">Nominal Diajukan (opsional)</Label>
              <Input
                id="claimedAmount"
                type="number"
                placeholder={selectedClaimBilling ? String(selectedClaimBilling.insuranceCoverage) : "Default = coverage"}
                value={claimForm.claimedAmount}
                onChange={(e) => setClaimForm(prev => ({ ...prev, claimedAmount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="claimNotes">Catatan (opsional)</Label>
              <Textarea id="claimNotes" value={claimForm.notes} onChange={(e) => setClaimForm(prev => ({ ...prev, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClaimDialogOpen(false)}>Batal</Button>
            <Button onClick={handleCreateClaim} disabled={isSubmitting || !claimForm.billingRecordId}>{isSubmitting ? "Menyimpan..." : "Buat Klaim"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog setujui klaim */}
      <Dialog open={!!approvingClaim} onOpenChange={(open) => !open && setApprovingClaim(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Setujui Klaim</DialogTitle>
            <DialogDescription>
              Masukkan nominal yang disetujui asuransi untuk <strong>{approvingClaim?.patientName}</strong>. Selisih dari nominal diajukan otomatis menjadi tanggungan pasien.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="approvedAmount">Nominal Disetujui</Label>
            <Input id="approvedAmount" type="number" value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)} />
            <p className="text-xs text-muted-foreground">Diajukan: {approvingClaim ? formatCurrency(Number(approvingClaim.claimedAmount)) : "-"}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovingClaim(null)}>Batal</Button>
            <Button onClick={confirmApprove} disabled={!!claimBusyId}>Setujui</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog tolak klaim */}
      <Dialog open={!!rejectingClaim} onOpenChange={(open) => !open && setRejectingClaim(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><XCircle className="h-5 w-5 text-destructive" />Tolak Klaim</DialogTitle>
            <DialogDescription>
              Klaim <strong>{rejectingClaim?.patientName}</strong> akan ditolak dan seluruh tagihan menjadi tanggungan pasien.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="rejectionReason">Alasan Penolakan (opsional)</Label>
            <Textarea id="rejectionReason" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingClaim(null)}>Batal</Button>
            <Button variant="destructive" onClick={confirmReject} disabled={!!claimBusyId}>Tolak Klaim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog hapus klaim */}
      <Dialog open={!!deletingClaim} onOpenChange={(open) => !open && setDeletingClaim(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Hapus Klaim</DialogTitle>
            <DialogDescription>Hapus klaim untuk <strong>{deletingClaim?.patientName}</strong>? Tagihan akan dihitung ulang tanpa klaim ini.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingClaim(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleDeleteClaim}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
