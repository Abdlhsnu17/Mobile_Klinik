"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataPagination, useDataPagination } from "@/components/data-pagination";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataError, DataLoading, useClinicData } from "@/hooks/use-clinic-data";
import { useToast } from "@/hooks/use-toast";
import type { Medicine } from "@/lib/auth-types";
import { createErrorDescription, logClientError } from "@/lib/client-error";
import { createMedicine, deleteMedicine, updateMedicine, updateMedicineStatus } from "@/lib/clinic-utils";
import { allFormulariumMedicines, medicineToCategoryMap } from "@/lib/formularium-data";
import { AlertTriangle, Loader2, Pencil, PlusCircle, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

type MedicineWithLegacyFields = Omit<Medicine, "category"> & {
  category: string;
  brandName?: string;
  sellPrice?: number;
};

// This should match the payload for creating a medicine
const initialNewMedicineForm = {
  name: "",
  category: "",
  stock: 0,
  minStock: 10,
  sellPrice: 0,
  unit: "Tablet",
  expiryDate: "",
};

// This will be used for the edit form
type EditMedicineFormState = Partial<Omit<MedicineWithLegacyFields, 'id' | 'createdAt' | 'updatedAt'>>;

const buildMedicineCode = () => `OBT-${Date.now()}`;

const toMedicineStatus = (stock: number, minStock: number): Medicine["status"] => {
  if (stock === 0) return "Habis";
  if (stock <= minStock) return "Stok Rendah";
  return "Tersedia";
};

const toMedicineForm = (unit: string): Medicine["form"] => {
  const allowedForms: Medicine["form"][] = ["Tablet", "Kapsul", "Sirup", "Injeksi", "Salep", "Tetes", "Inhaler"];
  return allowedForms.includes(unit as Medicine["form"]) ? (unit as Medicine["form"]) : "Tablet";
};

export default function ObatPage() {
  const {
    data: medicines,
    loading,
    error,
    refetch: fetchData,
  } = useClinicData<Medicine>("medicines")
  const medicinesList = medicines as MedicineWithLegacyFields[]
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // State for adding new medicine
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [newMedicineForm, setNewMedicineForm] = useState(initialNewMedicineForm);

  // State for editing medicine
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<MedicineWithLegacyFields | null>(null);
  const [editForm, setEditForm] = useState<EditMedicineFormState>({});

  // State for deleting medicine
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingMedicineId, setDeletingMedicineId] = useState<string | null>(null);

  // State for searching medicine
  const [searchQuery, setSearchQuery] = useState("");

  const displayedMedicines = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    const filtered = keyword
      ? medicinesList.filter((medicine) =>
          [medicine.name, medicine.category, medicine.brandName]
            .filter(Boolean)
            .some((field) => String(field).toLowerCase().includes(keyword))
        )
      : medicinesList;
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name, "id-ID", { sensitivity: "base" }));
  }, [medicinesList, searchQuery]);

  const medicinePagination = useDataPagination(displayedMedicines);

  // --- Add Medicine Logic ---
  const handleSelectFormulariumMedicine = (medicineName: string) => {
    if (!medicineName) {
      setNewMedicineForm(initialNewMedicineForm);
      return;
    }
    const category = medicineToCategoryMap.get(medicineName) || "Lainnya";
    setNewMedicineForm(prev => ({ ...prev, name: medicineName, category }));
  };

  const handleAddMedicine = async () => {
    if (!newMedicineForm.name || newMedicineForm.stock <= 0 || !newMedicineForm.expiryDate) {
      toast({
        title: "Data Tidak Lengkap",
        description: "Nama obat, stok awal, dan tanggal kedaluwarsa wajib diisi.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const stock = Number(newMedicineForm.stock) || 0;
      const minStock = Number(newMedicineForm.minStock) || 0;
      const sellPrice = Number(newMedicineForm.sellPrice) || 0;
      const now = new Date().toISOString();
      const medicinePayload = {
        code: buildMedicineCode(),
        name: newMedicineForm.name,
        genericName: newMedicineForm.name,
        brandName: newMedicineForm.name,
        category: newMedicineForm.category || "Obat Bebas",
        form: toMedicineForm(newMedicineForm.unit),
        unit: newMedicineForm.unit || "Tablet",
        stock,
        minStock,
        price: sellPrice,
        sellPrice,
        manufacturer: "",
        expiryDate: newMedicineForm.expiryDate,
        description: "",
        status: toMedicineStatus(stock, minStock),
        lastStockOpname: now,
      } satisfies Omit<MedicineWithLegacyFields, "id" | "createdAt" | "updatedAt">;

      await createMedicine(medicinePayload as Omit<Medicine, "id" | "createdAt" | "updatedAt">);
      toast({
        title: "Obat Baru Ditambahkan",
        description: `${newMedicineForm.name} telah berhasil ditambahkan ke master data.`,
      });
      setNewMedicineForm(initialNewMedicineForm);
      setIsAddCardOpen(false);
      await fetchData();
    } catch (error) {
      logClientError(error, { module: "depo-farmasi", action: "menambahkan obat", entityId: newMedicineForm.name });
      toast({
        title: "Gagal Menambahkan Obat",
        description: createErrorDescription(error, {
          module: "depo-farmasi",
          action: "menambahkan obat",
          entityId: newMedicineForm.name,
        }),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Edit Medicine Logic ---
  const openEditDialog = (medicine: MedicineWithLegacyFields) => {
    setEditingMedicine(medicine);
    setEditForm({
      name: medicine.name,
      brandName: medicine.brandName,
      category: medicine.category,
      form: medicine.form,
      stock: medicine.stock,
      minStock: medicine.minStock,
      price: medicine.sellPrice ?? medicine.price,
      sellPrice: medicine.sellPrice ?? medicine.price,
      unit: medicine.unit,
      expiryDate: medicine.expiryDate.split('T')[0], // Format to YYYY-MM-DD for input type date
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateMedicine = async () => {
    if (!editingMedicine || !editForm.name) return;
    setIsSubmitting(true);
    try {
      const stock = Number(editForm.stock ?? editingMedicine.stock) || 0;
      const minStock = Number(editForm.minStock ?? editingMedicine.minStock) || 0;
      const sellPrice = Number(editForm.sellPrice ?? editForm.price ?? editingMedicine.price) || 0;
      const payload = {
        ...editForm,
        price: sellPrice,
        sellPrice,
        status: toMedicineStatus(stock, minStock),
      };

      await updateMedicine(editingMedicine.id, payload as Partial<Medicine>);
      toast({
        title: "Data Obat Diperbarui",
        description: `Data untuk ${editForm.name} telah berhasil diperbarui.`,
      });
      setIsEditDialogOpen(false);
      setEditingMedicine(null);
      await fetchData();
    } catch (error) {
      logClientError(error, {
        module: "depo-farmasi",
        action: "memperbarui obat",
        entityId: editingMedicine.id,
      });
      toast({
        title: "Gagal Memperbarui Obat",
        description: createErrorDescription(error, {
          module: "depo-farmasi",
          action: "memperbarui obat",
          entityId: editingMedicine.id,
        }),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Delete Medicine Logic ---
  const openDeleteDialog = (medicineId: string) => {
    setDeletingMedicineId(medicineId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteMedicine = async () => {
    if (!deletingMedicineId) return;
    setIsSubmitting(true);
    try {
      await deleteMedicine(deletingMedicineId);
      toast({
        title: "Obat Dihapus",
        description: "Obat telah berhasil dihapus dari master data.",
      });
      setIsDeleteDialogOpen(false);
      setDeletingMedicineId(null);
      await fetchData();
    } catch (error) {
      logClientError(error, {
        module: "depo-farmasi",
        action: "menghapus obat",
        entityId: deletingMedicineId,
      });
      toast({
        title: "Gagal Menghapus Obat",
        description: createErrorDescription(error, {
          module: "depo-farmasi",
          action: "menghapus obat",
          entityId: deletingMedicineId,
        }),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (medicine: MedicineWithLegacyFields) => {
    const status = updateMedicineStatus(medicine);
    let className = "";
    switch (status) {
      case "Tersedia":
        className = "bg-emerald-500/10 text-emerald-700";
        break;
      case "Stok Rendah":
        className = "bg-yellow-500/10 text-yellow-700";
        break;
      case "Habis":
        className = "bg-red-500/10 text-red-700";
        break;
    }
    return <Badge variant="outline" className={className}>{status}</Badge>;
  };

  if (loading) return <DataLoading />;
  if (error) return <DataError error={error} onRetry={fetchData} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Data Obat</h1>
          <p className="text-muted-foreground">
            Kelola semua data obat, stok, harga, dan kategori di klinik Anda.
          </p>
        </div>
        <Button onClick={() => setIsAddCardOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Tambah Obat Baru
        </Button>
      </div>

      {isAddCardOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5" />
              Tambah Obat Baru dari Formularium
            </CardTitle>
            <CardDescription>
              Percepat penambahan master data obat dengan memilih dari daftar formularium. Kategori akan terisi otomatis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1 md:col-span-2">
                <Label>Pilih Nama Obat (Generik)</Label>
                <Select value={newMedicineForm.name} onValueChange={handleSelectFormulariumMedicine}>
                  <SelectTrigger>
                    <SelectValue placeholder="Cari atau pilih obat dari formularium..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {allFormulariumMedicines.map((med, index) => (
                      <SelectItem key={`${med.value}-${index}`} value={med.value}>
                        {med.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Kategori Obat</Label>
                <Input value={newMedicineForm.category} placeholder="Terisi otomatis" disabled />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label htmlFor="stock">Stok Awal</Label>
                <Input id="stock" type="number" value={newMedicineForm.stock} onChange={e => setNewMedicineForm(p => ({...p, stock: Number(e.target.value)}))} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="unit">Satuan</Label>
                <Input id="unit" value={newMedicineForm.unit} onChange={e => setNewMedicineForm(p => ({...p, unit: e.target.value}))} placeholder="Tablet" />
              </div>
               <div className="space-y-1">
                <Label htmlFor="price">Harga Jual</Label>
                <Input id="price" type="number" value={newMedicineForm.sellPrice} onChange={e => setNewMedicineForm(p => ({...p, sellPrice: Number(e.target.value)}))} placeholder="Rp 0" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="expiryDate">Tgl. Kedaluwarsa</Label>
                <Input id="expiryDate" type="date" value={newMedicineForm.expiryDate} onChange={e => setNewMedicineForm(p => ({...p, expiryDate: e.target.value}))} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleAddMedicine} disabled={isSubmitting || !newMedicineForm.name}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menambahkan...</> : "Simpan Data Obat"}
              </Button>
              <Button variant="outline" onClick={() => setIsAddCardOpen(false)}>
                Tutup
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Daftar Obat</CardTitle>
          <CardDescription>
            {searchQuery.trim()
              ? `Ditemukan ${displayedMedicines.length} dari ${medicinesList.length} jenis obat. Maksimal 20 obat per halaman.`
              : `Total ${medicinesList.length} jenis obat terdaftar. Maksimal 20 obat per halaman.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                medicinePagination.resetPage();
              }}
              placeholder="Cari nama obat atau kategori..."
              className="pl-9"
            />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Obat</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Stok</TableHead>
                  <TableHead>Harga Jual</TableHead>
                  <TableHead>Tgl. Kedaluwarsa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedMedicines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      {searchQuery.trim() ? "Obat tidak ditemukan." : "Belum ada data obat."}
                    </TableCell>
                  </TableRow>
                ) : (
                  medicinePagination.paginatedItems.map((medicine) => (
                    <TableRow key={medicine.id}>
                      <TableCell className="font-medium">{medicine.name}</TableCell>
                      <TableCell>{medicine.category}</TableCell>
                      <TableCell>{medicine.stock} {medicine.unit}</TableCell>
                      <TableCell>Rp {medicine.sellPrice?.toLocaleString('id-ID') ?? medicine.price?.toLocaleString('id-ID') ?? 0}</TableCell>
                      <TableCell>{new Date(medicine.expiryDate).toLocaleDateString('id-ID')}</TableCell>
                      <TableCell>{getStatusBadge(medicine)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(medicine)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => openDeleteDialog(medicine.id)}>
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
            page={medicinePagination.page}
            totalItems={medicinePagination.totalItems}
            totalPages={medicinePagination.totalPages}
            onPageChange={medicinePagination.setPage}
            itemLabel="obat"
          />
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Data Obat</DialogTitle>
            <DialogDescription>
              Perbarui informasi untuk obat: {editingMedicine?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">Nama Obat</Label>
              <Input id="edit-name" value={editForm.name ?? ''} onChange={(e) => setEditForm(p => ({...p, name: e.target.value}))} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-category" className="text-right">Kategori</Label>
              <Input id="edit-category" value={editForm.category ?? ''} onChange={(e) => setEditForm(p => ({...p, category: e.target.value}))} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-stock" className="text-right">Stok</Label>
              <Input id="edit-stock" type="number" value={editForm.stock ?? 0} onChange={(e) => setEditForm(p => ({...p, stock: Number(e.target.value)}))} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-minStock" className="text-right">Stok Min.</Label>
              <Input id="edit-minStock" type="number" value={editForm.minStock ?? 0} onChange={(e) => setEditForm(p => ({...p, minStock: Number(e.target.value)}))} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-price" className="text-right">Harga Jual</Label>
              <Input id="edit-price" type="number" value={editForm.sellPrice ?? 0} onChange={(e) => setEditForm(p => ({...p, sellPrice: Number(e.target.value)}))} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-expiry" className="text-right">Tgl. Kedaluwarsa</Label>
              <Input id="edit-expiry" type="date" value={editForm.expiryDate ?? ''} onChange={(e) => setEditForm(p => ({...p, expiryDate: e.target.value}))} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Batal</Button>
            <Button onClick={handleUpdateMedicine} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Hapus Obat
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus obat ini dari master data? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDeleteMedicine} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ya, Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
