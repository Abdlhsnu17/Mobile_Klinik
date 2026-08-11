"use client"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataPagination, useDataPagination } from "@/components/data-pagination";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataError, DataLoading, useClinicData } from "@/hooks/use-clinic-data";
import { useToast } from "@/hooks/use-toast";
import type { LabOrder, LabResult, Patient, Service, User } from "@/lib/auth-types";
import { getCurrentUser, hasAdminAccess, hasRole, isAuthenticated } from "@/lib/auth-utils";
import { getFriendlyApiErrorMessage } from "@/lib/client-error";
import { createLabResult, deleteLabResult, formatDate } from "@/lib/clinic-utils";
import { AlertTriangle, FlaskConical, History, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PatientCombobox } from "@/components/patient-combobox";

export default function LaboratoriumPage() {
  const router = useRouter();
  const { data: patients = [], loading: patientsLoading, error: patientsError, refetch: refetchPatients } = useClinicData<Patient>("patients");
  const { data: labOrders = [], loading: labOrdersLoading, error: labOrdersError, refetch: refetchLabOrders } = useClinicData<LabOrder>("lab-orders");
  const { data: labResults = [], loading: labResultsLoading, error: labResultsError, refetch: refetchLabResults } = useClinicData<LabResult>("lab-results");
  const { data: services = [], loading: servicesLoading, error: servicesError, refetch: refetchLabServices } = useClinicData<Service>("services");

  const [activeTests, setActiveTests] = useState<string[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState("")
  const [selectedOrderId, setSelectedOrderId] = useState("")
  const [testValues, setTestValues] = useState<Record<string, string>>({})
  const [labNotes, setLabNotes] = useState("")
  const { toast } = useToast()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingResultId, setDeletingResultId] = useState<string | null>(null);
  const [pendingPatientChange, setPendingPatientChange] = useState<string | null>(null);
  const currentUser = getCurrentUser();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    // Roles that can access the lab page
    const allowedRoles: User["role"][] = [
      "admin",
      "dokter",
      "perawat",
      "bidan",
      "teknis",
    ];
    if (!hasRole(allowedRoles)) {
      router.push("/dashboard");
    }
  }, [router]);

  const toggleTest = (test: string) => {
    setActiveTests((prev) =>
      prev.includes(test) ? prev.filter((item) => item !== test) : [...prev, test]
    )
  }

  const clearActiveTests = () => {
    setActiveTests([])
  }

  const handlePatientChange = (newPatientId: string) => {
    if (selectedPatientId !== newPatientId && activeTests.length > 0) {
      setPendingPatientChange(newPatientId);
    } else {
      setSelectedPatientId(newPatientId);
    }
  };

  const confirmPatientChange = () => {
    if (!pendingPatientChange) return;
    setSelectedPatientId(pendingPatientChange);
    handleResetInputs(); // Reset input setelah konfirmasi
    setPendingPatientChange(null);
  };

  const selectedPatientLabResults = useMemo(() => {
    if (!selectedPatientId) return []
    return labResults
        .filter((result) => result.patientId === selectedPatientId)
        .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())
  }, [labResults, selectedPatientId])
  const labResultPagination = useDataPagination(selectedPatientLabResults)

  const activeLabOrders = useMemo(
    () =>
      labOrders
        .filter((order) => !["completed", "reviewed", "cancelled"].includes(order.status))
        .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()),
    [labOrders],
  )

  const selectedOrder = useMemo(
    () => labOrders.find((order) => order.id === selectedOrderId),
    [labOrders, selectedOrderId],
  )

  const labServices = useMemo(
    () => services.filter((service) => service.category === "Laboratorium" && service.status === "Aktif"),
    [services],
  )

  const handleResultChange = (test: string, value: string) => {
    setTestValues((prev) => ({ ...prev, [test]: value }))
  }

  const handleOrderChange = (orderId: string) => {
    const order = labOrders.find((item) => item.id === orderId)
    setSelectedOrderId(orderId)
    if (!order) return
    setSelectedPatientId(order.patientId)
    setActiveTests(order.tests)
    setLabNotes(order.notes ?? "")
    setTestValues({})
  }

  const handleSaveResults = async () => {
    if (!selectedPatientId) {
      toast({
        title: "Pasien Belum Dipilih",
        description: "Pilih pasien terlebih dahulu agar hasil tersimpan ke EMR.",
        variant: "destructive",
      })
      return
    }

    if (activeTests.length === 0) {
      toast({
        title: "Tidak Ada Tes Aktif",
        description: "Aktifkan minimal satu tes laboratorium.",
      })
      return
    }

    const entries = activeTests
      .map((test) => ({
        test,
        value: (testValues[test] ?? "").trim(),
      }))
      .filter((item) => item.value)

    if (entries.length === 0) {
      toast({
        title: "Hasil Belum Diisi",
        description: "Isi nilai minimal satu tes sebelum menyimpan.",
      })
      return
    }

    const timestamp = new Date().toISOString();
    const notes = labNotes.trim() || undefined;

    try {
      const creationPromises = entries.map((entry) =>
        createLabResult({
          patientId: selectedPatientId,
          labOrderId: selectedOrderId || undefined,
          testName: entry.test,
          resultValue: entry.value,
          notes: notes, // Attach notes to all entries for consistency
          performedAt: timestamp,
        })
      );
      const createdResults = await Promise.all(creationPromises);
      if (selectedOrderId) {
        await refetchLabOrders()
      }

      await refetchLabResults();
      toast({
        title: "Hasil Laboratorium Tersimpan",
        description: `${createdResults.length} hasil tes untuk pasien ${selectedPatient?.name ?? 'yang dipilih'} telah ditambahkan ke EMR.`,
      })
      handleResetInputs()
    } catch (error) {
      console.error("Gagal menyimpan hasil laboratorium:", error)
      toast({
        title: "Gagal Menyimpan Hasil",
        description: getFriendlyApiErrorMessage({ error, fallbackMessage: "Terjadi kesalahan saat menyimpan hasil lab." }),
        variant: "destructive",
      });
    }
  }

  const handleResetInputs = () => {
    setLabNotes("")
    setTestValues({})
    setActiveTests([])
    setSelectedOrderId("")
  }

  const openDeleteDialog = (resultId: string) => {
    setDeletingResultId(resultId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteResult = async () => {
    if (!deletingResultId) return;
    try {
      await deleteLabResult(deletingResultId);
      await refetchLabResults();
      toast({
        title: "Hasil Pemeriksaan Dihapus",
        description: "Catatan hasil lab telah berhasil dihapus dari EMR pasien.",
      });
    } catch (error) {
      console.error("Gagal menghapus hasil pemeriksaan:", error);
      toast({
        title: "Gagal Menghapus Hasil",
        description: getFriendlyApiErrorMessage({
          error,
          fallbackMessage: "Hasil lab belum dapat dihapus."
        }),
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setDeletingResultId(null);
    }
  };

  const combinedError = patientsError || labOrdersError || labResultsError || servicesError;
  const handleRetry = () => {
    if (patientsError) refetchPatients();
    if (labOrdersError) refetchLabOrders();
    if (labResultsError) refetchLabResults();
    if (servicesError) refetchLabServices();
  };

  const isLoading = patientsLoading || labOrdersLoading || labResultsLoading || servicesLoading;
  if (isLoading) return <DataLoading message="Memuat data laboratorium..." />;
  if (combinedError) return <DataError error={combinedError} onRetry={handleRetry} />;

  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId)

  return (
    <div className="space-y-6">
      <Tabs defaultValue="examination">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="examination">
            <FlaskConical className="mr-2 h-4 w-4" />
            Pengecekan Laboratorium
          </TabsTrigger>
          <TabsTrigger value="results">
            <History className="mr-2 h-4 w-4" />
            Hasil Pemeriksaan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="examination">
      <Card className="max-w-4xl">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <FlaskConical className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl font-semibold text-foreground">
              Pengecekan Laboratorium
            </CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Kelola daftar tes laboratorium standar yang bisa langsung dicatat ke rekam medis pasien.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="patient-select">Pasien</Label>
              <PatientCombobox
                patients={patients}
                value={selectedPatientId}
                onValueChange={handlePatientChange}
                placeholder="Cari pasien berdasarkan nama atau No. RM..."
                emptyMessage="Pasien tidak ditemukan."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lab-order-select">Order Laboratorium</Label>
              <Select value={selectedOrderId} onValueChange={handleOrderChange}>
                <SelectTrigger id="lab-order-select">
                  <SelectValue placeholder="Pilih order aktif dari dokter" />
                </SelectTrigger>
                <SelectContent>
                  {activeLabOrders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.patientName} - {order.tests.join(", ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {activeLabOrders.length} order aktif menunggu hasil.
              </p>
            </div>
          </div>
          {selectedOrder ? (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
              <p className="font-medium text-foreground">Order aktif: {selectedOrder.tests.join(", ")}</p>
              <p className="text-muted-foreground">
                Dokter {selectedOrder.doctorName || "-"} - status {selectedOrder.status}
              </p>
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-transparent p-4 space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Catatan EMR</p>
              <p className="text-sm text-foreground">
                {selectedPatient
                  ? `Pasien ${selectedPatient.name} memiliki ${selectedPatientLabResults.length} hasil laboratorium terakhir.`
                  : "Pilih pasien untuk melihat riwayat laboratorium yang sudah tersimpan ke EMR."}
              </p>
              <Badge variant="secondary" className="text-xs uppercase tracking-[0.3em]">
                {labResults.length} catatan tersimpan
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Tes terdaftar
            </span>
            <Badge>{activeTests.length} aktif</Badge>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {labServices.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-full">
                Tidak ada layanan laboratorium yang terdaftar. Silakan tambahkan di modul Layanan dengan kategori &quot;Laboratorium&quot;.
              </p>
            ) : labServices.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => toggleTest(service.name)}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                    activeTests.includes(service.name)
                      ? "border-primary/70 bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  <span>{service.name}</span>
                  <span className="text-xs font-semibold">
                    {activeTests.includes(service.name) ? "Aktif" : "Tambah"}
                  </span>
                </button>
              ),
            )}
          </div>
          {activeTests.length > 0 && (
            <div className="space-y-2">
              <Label>Input hasil tes laboratorium</Label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {activeTests.map((test) => (
                  <div key={test} className="rounded-2xl border border-border bg-transparent p-3 space-y-2">
                    <p className="text-sm font-medium text-foreground">{test}</p>
                    <Input
                      placeholder="Masukkan hasil (misal: 5.6 mmol/L)"
                      value={testValues[test] ?? ""}
                      onChange={(event) => handleResultChange(test, event.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="lab-notes">Catatan laboratorium (opsional)</Label>
            <Textarea
              id="lab-notes"
              placeholder="Catatan tambahan untuk teknisi atau dokter"
              value={labNotes}
              onChange={(event) => setLabNotes(event.target.value)}
              className="min-h-17.5"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={handleSaveResults}>
              Simpan hasil ke Rekam Medis
            </Button>
            <Button variant="outline" onClick={handleResetInputs}>
              Reset input
            </Button>
            <Button variant="ghost" onClick={clearActiveTests}>
              Hapus Pilihan Tes
            </Button>
          </div>
          <div className="rounded-2xl border border-border bg-transparent p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">Ringkasan penyimpanan</p>
            <p className="text-xs text-muted-foreground">
              Data hasil laboratorium akan otomatis muncul di halaman Ruang Pemeriksaan. Simpan dan buka halaman Ruang Pemeriksaan untuk meninjau riwayat pasien.
            </p>
            {selectedPatient && (
              <p className="text-xs text-muted-foreground">
                Pasien {selectedPatient.name} terakhir kali melakukan {selectedPatientLabResults.length} tes.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
      <Card className="mt-6 max-w-4xl">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-xl font-semibold text-foreground">Hasil pemeriksaan</CardTitle>
          </div>
          <CardDescription>
            {selectedPatient
              ? `Riwayat laboratorium pasien ${selectedPatient.name}.`
              : "Data hasil tes terbaru untuk semua pasien yang tersimpan di EMR."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedPatientLabResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {selectedPatient
                ? "Belum ada hasil laboratorium yang tersimpan untuk pasien ini."
                : "Pilih seorang pasien untuk melihat riwayat hasil laboratorium mereka."}
            </p>
          ) : (
            <div className="space-y-3">
            <div className="rounded-md border overflow-x-auto">
              <Table className="text-[13px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Tes</TableHead>
                  <TableHead>Hasil</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {labResultPagination.paginatedItems.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell>{formatDate(result.performedAt)}</TableCell>
                    <TableCell>{result.testName}</TableCell>
                    <TableCell>{result.resultValue}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {result.notes ?? "-"}
                    </TableCell>
                    {(hasAdminAccess(currentUser) || currentUser?.role === "dokter") && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(result.id)}
                          aria-label="Hapus hasil lab"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
            <DataPagination page={labResultPagination.page} totalItems={labResultPagination.totalItems} totalPages={labResultPagination.totalPages} onPageChange={labResultPagination.setPage} itemLabel="hasil" />
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="mt-6 max-w-4xl">
        <CardHeader className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Integrasi EMR</p>
          <CardTitle className="text-xl font-semibold text-foreground">
            Hasil laboratorium langsung ke rekam medis pasien
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Setelah disimpan, dokter atau staf medis dapat meninjau hasil ini di halaman Ruang Pemeriksaan. Gunakan tombol di bawah untuk menuju pasien atau rekam medis terkait.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => router.push("/pasien")}>
            Buka daftar pasien
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
            onClick={() => router.push("/pemeriksaan")}
          >
            Buka Ruang Pemeriksaan
          </Button>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Hapus Hasil Pemeriksaan
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus hasil pemeriksaan ini dari catatan pasien? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteResult}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingPatientChange} onOpenChange={(open) => !open && setPendingPatientChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Konfirmasi Ganti Pasien
            </AlertDialogTitle>
            <AlertDialogDescription>
              Anda memiliki tes yang aktif atau hasil yang belum disimpan. Jika Anda melanjutkan, semua input akan direset. Yakin ingin mengganti pasien?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPatientChange}>Ya, Ganti Pasien</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
