"use client"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataPagination, useDataPagination } from "@/components/data-pagination";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";
import type { Medicine, PharmacyRequest } from "@/lib/auth-types";
import { createErrorDescription, logClientError } from "@/lib/client-error";
import {
    deletePharmacyRequest,
    fulfillPharmacyRequest,
    getMedicines,
    getPharmacyRequests,
    processPharmacyRequestWorkflow,
    returnPharmacyRequest,
    updateMedicine,
    updatePharmacyRequest,
    verifyPharmacyRequestWorkflow,
} from "@/lib/clinic-utils";
import { AlertTriangle, Boxes, ClipboardList, Loader2, Package, Pencil, RotateCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const pharmacyStatusOptions: { value: PharmacyRequest['status']; label: string }[] = [
  { value: "requested", label: "Diminta" },
  { value: "verified", label: "Diverifikasi" },
  { value: "processing", label: "Diproses" },
  { value: "dispensed", label: "Diserahkan" },
  { value: "cancelled", label: "Dibatalkan" },
]

const isDispensedStatus = (status: PharmacyRequest["status"]) => status === "dispensed" || status === "fulfilled"

const getWorkflowHint = (status: PharmacyRequest["status"]) => {
  if (status === "requested" || status === "pending") return "Langkah berikutnya: Verifikasi"
  if (status === "verified") return "Langkah berikutnya: Proses"
  if (status === "processing") return "Langkah berikutnya: Serahkan"
  if (isDispensedStatus(status)) return "Resep sudah diserahkan; gunakan Retur Obat bila perlu."
  return "Permintaan sudah dibatalkan."
}

const createEmptyEditForm = (): Partial<
  Pick<PharmacyRequest, "doctorName" | "verificationNotes" | "dispensingNotes">
> => ({
  doctorName: "",
  verificationNotes: "",
  dispensingNotes: "",
})

type MedicineEditForm = Pick<
  Medicine,
  "name" | "stock" | "minStock" | "price" | "unit" | "expiryDate"
>

const toMedicineStatus = (stock: number, minStock: number): Medicine["status"] => {
  if (stock === 0) return "Habis"
  if (stock <= minStock) return "Stok Rendah"
  return "Tersedia"
}

export default function FarmasiPage() {
  const [requests, setRequests] = useState<PharmacyRequest[]>([])
  const requestPagination = useDataPagination(requests)
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(createEmptyEditForm)
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null)
  const [medicineEditForm, setMedicineEditForm] = useState<MedicineEditForm | null>(null)
  const [isSavingMedicine, setIsSavingMedicine] = useState(false)
  const [dialogAction, setDialogAction] = useState<{ type: 'delete' | 'return'; data: any; title: string; message: string; } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [requestsData, medicinesData] = await Promise.all([
          getPharmacyRequests(),
          getMedicines(),
        ])
        setRequests(requestsData)
        setMedicines(medicinesData)
      } catch (error) {
        logClientError(error, { module: "farmasi", action: "memuat permintaan dan stok obat" })
        toast({
          title: "Gagal Memuat Data Farmasi",
          description: createErrorDescription(error, {
            module: "farmasi",
            action: "memuat permintaan dan stok obat",
          }),
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    void fetchData()
  }, [])

  const summary = useMemo(() => {
    const requested = requests.filter((request) => request.status === "requested").length
    const processing = requests.filter((request) => request.status === "processing").length
    const fulfilled = requests.filter((request) => isDispensedStatus(request.status)).length
    return { requested, processing, fulfilled }
  }, [requests])

  const nearExpiry = useMemo(() => {
    const threshold = Date.now() + 90 * 24 * 60 * 60 * 1000
    return medicines.filter((medicine) => new Date(medicine.expiryDate).getTime() <= threshold)
  }, [medicines])

  const handleUpdateStatus = async (request: PharmacyRequest, status: PharmacyRequest["status"]) => {
    setActionLoading(request.id)
    try {
      let updated: PharmacyRequest;

      if (status === 'verified') {
        updated = await verifyPharmacyRequestWorkflow(request.id, request.verificationNotes)
      } else if (status === 'processing') {
        updated = await processPharmacyRequestWorkflow(request.id, request.verificationNotes)
      } else if (status === 'dispensed') {
        updated = await fulfillPharmacyRequest(request.id)
        const medicinesData = await getMedicines()
        setMedicines(medicinesData)
      } else if (status === 'cancelled') {
        updated = await returnPharmacyRequest(request.id)
        const medicinesData = await getMedicines()
        setMedicines(medicinesData)
      } else {
        throw new Error(`Status ${status} tidak didukung melalui workflow farmasi`)
      }

      setRequests((prev) =>
        prev.map((entry) => (entry.id === updated.id ? updated : entry))
      )
    } catch (error) {
      logClientError(error, {
        module: "farmasi",
        action: `mengubah status permintaan menjadi ${status}`,
        entityId: request.id,
      })
      toast({
        title: "Gagal Mengubah Status Permintaan",
        description: createErrorDescription(error, {
          module: "farmasi",
          action: `mengubah status permintaan menjadi ${status}`,
          entityId: request.id,
        }),
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const resetEditForm = () => {
    setEditingRequestId(null)
    setEditForm(createEmptyEditForm())
  }

  const handleEditRequest = (request: PharmacyRequest) => {
    setEditingRequestId(request.id)
    setEditForm({
      doctorName: request.doctorName,
      verificationNotes: request.verificationNotes ?? "",
      dispensingNotes: request.dispensingNotes ?? "",
    })
  }

  const handleSaveEdit = async () => {
    if (!editingRequestId) return
    setActionLoading(editingRequestId)
    try {
      const { doctorName, verificationNotes, dispensingNotes } = editForm
      const updated = await updatePharmacyRequest(editingRequestId, {
        doctorName,
        verificationNotes,
        dispensingNotes,
      })
      setRequests((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)))
      resetEditForm()
    } catch (error) {
      logClientError(error, {
        module: "farmasi",
        action: "menyimpan edit permintaan",
        entityId: editingRequestId,
      })
      toast({
        title: "Gagal Menyimpan Permintaan",
        description: createErrorDescription(error, {
          module: "farmasi",
          action: "menyimpan edit permintaan",
          entityId: editingRequestId,
        }),
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleEditMedicine = (medicine: Medicine) => {
    setEditingMedicine(medicine)
    setMedicineEditForm({
      name: medicine.name,
      stock: medicine.stock,
      minStock: medicine.minStock,
      price: medicine.sellPrice ?? medicine.price,
      unit: medicine.unit,
      expiryDate: medicine.expiryDate.split("T")[0],
    })
  }

  const resetMedicineEdit = () => {
    setEditingMedicine(null)
    setMedicineEditForm(null)
  }

  const handleSaveMedicine = async () => {
    if (!editingMedicine || !medicineEditForm) return

    const name = medicineEditForm.name.trim()
    const stock = Number(medicineEditForm.stock)
    const minStock = Number(medicineEditForm.minStock)
    const price = Number(medicineEditForm.price)

    if (
      !name ||
      !medicineEditForm.expiryDate ||
      !medicineEditForm.unit.trim() ||
      !Number.isFinite(stock) ||
      !Number.isFinite(minStock) ||
      !Number.isFinite(price) ||
      stock < 0 ||
      minStock < 0 ||
      price < 0
    ) {
      toast({
        title: "Data Obat Belum Valid",
        description: "Lengkapi nama, satuan, tanggal kedaluwarsa, serta gunakan angka nol atau lebih untuk stok dan harga.",
        variant: "destructive",
      })
      return
    }

    setIsSavingMedicine(true)
    try {
      const updated = await updateMedicine(editingMedicine.id, {
        name,
        stock,
        minStock,
        price,
        sellPrice: price,
        unit: medicineEditForm.unit.trim(),
        expiryDate: medicineEditForm.expiryDate,
        status: toMedicineStatus(stock, minStock),
      })
      setMedicines((previous) =>
        previous.map((medicine) => (medicine.id === updated.id ? updated : medicine))
      )
      toast({
        title: "Data Obat Diperbarui",
        description: `${updated.name} berhasil menggantikan data sebelumnya.`,
      })
      resetMedicineEdit()
    } catch (error) {
      logClientError(error, {
        module: "farmasi",
        action: "memperbarui obat dari ringkasan stok",
        entityId: editingMedicine.id,
      })
      toast({
        title: "Gagal Memperbarui Obat",
        description: createErrorDescription(error, {
          module: "farmasi",
          action: "memperbarui obat dari ringkasan stok",
          entityId: editingMedicine.id,
        }),
        variant: "destructive",
      })
    } finally {
      setIsSavingMedicine(false)
    }
  }

  const handleDeleteRequest = async (requestId: string) => {
    setDialogAction({
      type: 'delete',
      data: requestId,
      title: 'Hapus Permintaan Farmasi?',
      message: 'Tindakan ini akan menghapus data permintaan secara permanen dan tidak dapat dibatalkan.'
    });
  }

  const executeDeleteRequest = async (requestId: string) => {
    setActionLoading(requestId)
    try {
      await deletePharmacyRequest(requestId)
      toast({ title: "Permintaan Dihapus", description: "Permintaan farmasi telah berhasil dihapus." });
      setRequests((prev) => prev.filter((entry) => entry.id !== requestId))
      if (editingRequestId === requestId) {
        resetEditForm()
      }
    } catch (error) {
      logClientError(error, {
        module: "farmasi",
        action: "menghapus permintaan",
        entityId: requestId,
      })
      toast({
        title: "Gagal Menghapus Permintaan",
        description: createErrorDescription(error, {
          module: "farmasi",
          action: "menghapus permintaan",
          entityId: requestId,
        }),
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReturnRequest = async (request: PharmacyRequest) => {
    setDialogAction({
      type: 'return',
      data: request,
      title: 'Retur Permintaan Obat?',
      message: 'Tindakan ini akan mengembalikan status permintaan dan menyesuaikan kembali stok obat. Lanjutkan?'
    });
  };

  const executeReturnRequest = async (request: PharmacyRequest) => {
    setActionLoading(request.id);
    try {
      const updated = await returnPharmacyRequest(request.id);
      setRequests((prev) =>
        prev.map((entry) => (entry.id === updated.id ? updated : entry))
      );
      setMedicines(await getMedicines());
      toast({ title: "Retur Berhasil", description: `Permintaan untuk ${request.patientName} telah ditandai sebagai retur.` });
    } catch (error) {
      logClientError(error, {
        module: "farmasi",
        action: "retur permintaan obat",
        entityId: request.id,
      });
      toast({
        title: "Gagal Retur Obat",
        description: createErrorDescription(error, {
          module: "farmasi",
          action: "retur permintaan obat",
          entityId: request.id,
        }),
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  }

  const handleDialogConfirm = () => {
    if (!dialogAction) return;

    if (dialogAction.type === 'delete') {
      void executeDeleteRequest(dialogAction.data);
    } else if (dialogAction.type === 'return') {
      void executeReturnRequest(dialogAction.data);
    }
    setDialogAction(null);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Resep Diminta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.requested}</div>
            <p className="text-sm text-muted-foreground">Menunggu diproses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Sedang Diproses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.processing}</div>
            <p className="text-sm text-muted-foreground">Siap diserahkan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Selesai Diberikan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.fulfilled}</div>
            <p className="text-sm text-muted-foreground">Catatan sudah lengkap</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="requests">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="requests">
            <ClipboardList className="mr-2 h-4 w-4" />
            Permintaan Farmasi
          </TabsTrigger>
          <TabsTrigger value="inventory">
            <Boxes className="mr-2 h-4 w-4" />
            Stok &amp; Kedaluwarsa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Daftar Permintaan Farmasi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pasien</TableHead>
                  <TableHead>Dokter</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Resep</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Belum ada permintaan farmasi
                    </TableCell>
                  </TableRow>
                ) : (
                  requestPagination.paginatedItems.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.patientName}</TableCell>
                      <TableCell>{request.doctorName || "Belum ditentukan"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={"outline"}
                          className={
                            request.status === "requested"
                              ? "bg-yellow-500/10 text-yellow-700"
                              : request.status === "verified"
                                ? "bg-indigo-500/10 text-indigo-700"
                              : request.status === "processing"
                                ? "bg-sky-500/10 text-sky-700"
                                : isDispensedStatus(request.status)
                                  ? "bg-emerald-500/10 text-emerald-700"
                                  : "bg-red-500/10 text-red-700"
                          }
                        >
                          {pharmacyStatusOptions.find(opt => opt.value === request.status)?.label ?? request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(request.items ?? request.prescription ?? []).map((rx) => rx.medicineName).join(", ")}
                      </TableCell>
                      <TableCell className="text-right space-y-2">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={request.status !== "requested" || actionLoading === request.id}
                            onClick={() => void handleUpdateStatus(request, "verified")}
                          >
                            Verifikasi
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={request.status !== "verified" || actionLoading === request.id}
                            onClick={() => void handleUpdateStatus(request, "processing")}
                          >
                            <RotateCw className="mr-1 h-4 w-4" />
                            Proses
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={request.status !== "processing" || actionLoading === request.id}
                            onClick={() => void handleUpdateStatus(request, "dispensed")}
                          >
                            <Package className="mr-1 h-4 w-4" />
                            Serahkan
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!isDispensedStatus(request.status) || actionLoading === request.id}
                            onClick={() => handleReturnRequest(request)}
                          >
                            Retur Obat
                          </Button>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={actionLoading === request.id}
                            onClick={() => handleEditRequest(request)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={actionLoading === request.id}
                            onClick={() => void handleDeleteRequest(request.id)}
                          >
                            Hapus
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {getWorkflowHint(request.status)}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DataPagination page={requestPagination.page} totalItems={requestPagination.totalItems} totalPages={requestPagination.totalPages} onPageChange={requestPagination.setPage} itemLabel="permintaan" />
        </CardContent>
      </Card>

      <Dialog
        open={editingRequestId !== null}
        onOpenChange={(open) => {
          if (!open) resetEditForm()
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Permintaan Farmasi</DialogTitle>
            <DialogDescription>
              Perbarui dokter penanggung jawab dan catatan permintaan farmasi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Dokter Penanggung Jawab</Label>
                <Input
                  value={editForm.doctorName ?? ""}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, doctorName: event.target.value }))
                  }
                  placeholder="Nama dokter"
                />
              </div>
              <div className="space-y-1">
                <Label>Status Permintaan</Label>
                <Input value="Status diubah lewat tombol aksi workflow" readOnly />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Catatan Verifikasi</Label>
                <Textarea
                  value={editForm.verificationNotes ?? ""}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, verificationNotes: event.target.value }))
                  }
                  placeholder="Catatan untuk verifikasi"
                  rows={3}
                />
              </div>
              <div className="space-y-1">
                <Label>Catatan Penyerahan</Label>
                <Textarea
                  value={editForm.dispensingNotes ?? ""}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, dispensingNotes: event.target.value }))
                  }
                  placeholder="Catatan untuk penyerahan"
                  rows={3}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetEditForm}>
              Batal
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={actionLoading === editingRequestId}
            >
              {actionLoading === editingRequestId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Perbarui Permintaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

        </TabsContent>

        <TabsContent value="inventory">
      <Card>
        <CardHeader>
          <CardTitle>Stok & Kedaluwarsa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Obat yang akan kedaluwarsa 90 hari ke depan
              </p>
              {nearExpiry.length === 0 ? (
                <p className="text-sm">Semua stok aman</p>
              ) : (
                <ul className="space-y-2">
                  {nearExpiry.map((medicine) => (
                    <li key={medicine.id} className="flex items-center justify-between gap-2">
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto justify-start p-0 text-left font-medium"
                        onClick={() => handleEditMedicine(medicine)}
                      >
                        {medicine.name}
                        <Pencil className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {medicine.expiryDate}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Stok menipis</p>
              <ul className="space-y-2">
                {medicines
                  .filter((medicine) => medicine.stock <= medicine.minStock)
                  .map((medicine) => (
                    <li key={medicine.id} className="flex items-center justify-between gap-2">
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto justify-start p-0 text-left font-medium"
                        onClick={() => handleEditMedicine(medicine)}
                      >
                        {medicine.name}
                        <Pencil className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                      <Badge className="bg-yellow-500/10 text-yellow-700 border-0">
                        {medicine.stock} tersisa
                      </Badge>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
      </div>
      <Dialog
        open={editingMedicine !== null}
        onOpenChange={(open) => {
          if (!open && !isSavingMedicine) resetMedicineEdit()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Data Obat</DialogTitle>
            <DialogDescription>
              Perubahan akan langsung menggantikan data {editingMedicine?.name} pada stok farmasi.
            </DialogDescription>
          </DialogHeader>
          {medicineEditForm && (
            <div className="grid gap-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="inventory-edit-name">Nama Obat</Label>
                <Input
                  id="inventory-edit-name"
                  value={medicineEditForm.name}
                  onChange={(event) =>
                    setMedicineEditForm((previous) =>
                      previous ? { ...previous, name: event.target.value } : previous
                    )
                  }
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="inventory-edit-stock">Stok</Label>
                  <Input
                    id="inventory-edit-stock"
                    type="number"
                    min="0"
                    value={medicineEditForm.stock}
                    onChange={(event) =>
                      setMedicineEditForm((previous) =>
                        previous ? { ...previous, stock: Number(event.target.value) } : previous
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inventory-edit-min-stock">Batas Stok Minimum</Label>
                  <Input
                    id="inventory-edit-min-stock"
                    type="number"
                    min="0"
                    value={medicineEditForm.minStock}
                    onChange={(event) =>
                      setMedicineEditForm((previous) =>
                        previous ? { ...previous, minStock: Number(event.target.value) } : previous
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inventory-edit-price">Harga Jual</Label>
                  <Input
                    id="inventory-edit-price"
                    type="number"
                    min="0"
                    value={medicineEditForm.price}
                    onChange={(event) =>
                      setMedicineEditForm((previous) =>
                        previous ? { ...previous, price: Number(event.target.value) } : previous
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inventory-edit-unit">Satuan</Label>
                  <Input
                    id="inventory-edit-unit"
                    value={medicineEditForm.unit}
                    onChange={(event) =>
                      setMedicineEditForm((previous) =>
                        previous ? { ...previous, unit: event.target.value } : previous
                      )
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inventory-edit-expiry">Tanggal Kedaluwarsa</Label>
                <Input
                  id="inventory-edit-expiry"
                  type="date"
                  value={medicineEditForm.expiryDate}
                  onChange={(event) =>
                    setMedicineEditForm((previous) =>
                      previous ? { ...previous, expiryDate: event.target.value } : previous
                    )
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={resetMedicineEdit} disabled={isSavingMedicine}>
              Batal
            </Button>
            <Button onClick={handleSaveMedicine} disabled={isSavingMedicine}>
              {isSavingMedicine && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!dialogAction} onOpenChange={(open) => !open && setDialogAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {dialogAction?.title}
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
    </>
  )
}
