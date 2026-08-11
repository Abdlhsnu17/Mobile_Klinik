"use client"

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataPagination, useDataPagination } from "@/components/data-pagination";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataError, DataLoading, useClinicData } from "@/hooks/use-clinic-data";
import { useToast } from "@/hooks/use-toast";
import type { MedicalCode, MedicalCodeSystem } from "@/lib/auth-types";
import { deleteMedicalCode, saveMedicalCode } from "@/lib/clinic-utils";
import { AlertTriangle, Edit, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

const SYSTEM_LABELS: Record<MedicalCodeSystem, string> = {
  icd10: "ICD-10 (Diagnosa)",
  icd9cm: "ICD-9-CM (Tindakan)",
};

const initialFormData: Partial<MedicalCode> = {
  system: "icd10",
  code: "",
  name: "",
  category: "",
  isActive: true,
};

export default function KodeDiagnosaPage() {
  const { data: codes = [], loading, error, refetch } = useClinicData<MedicalCode>("medical-codes");
  const { toast } = useToast();

  const [systemFilter, setSystemFilter] = useState<MedicalCodeSystem>("icd10");
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MedicalCode | null>(null);
  const [deleting, setDeleting] = useState<MedicalCode | null>(null);
  const [formData, setFormData] = useState<Partial<MedicalCode>>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return codes
      .filter((code) => code.system === systemFilter)
      .filter((code) =>
        keyword.length === 0 ||
        code.code.toLowerCase().includes(keyword) ||
        code.name.toLowerCase().includes(keyword) ||
        (code.category ?? "").toLowerCase().includes(keyword),
      )
      .sort((a, b) => a.code.localeCompare(b.code, "id"));
  }, [codes, systemFilter, search]);
  const codePagination = useDataPagination(filtered);

  const counts = useMemo(
    () => ({
      icd10: codes.filter((c) => c.system === "icd10").length,
      icd9cm: codes.filter((c) => c.system === "icd9cm").length,
    }),
    [codes],
  );

  const handleSave = async () => {
    if (!formData.code?.trim() || !formData.name?.trim()) {
      toast({ title: "Data belum lengkap", description: "Kode dan nama diagnosa/tindakan wajib diisi.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const payload: Partial<MedicalCode> = {
      ...formData,
      code: formData.code.trim(),
      name: formData.name.trim(),
      category: formData.category?.trim() || undefined,
    };
    try {
      await saveMedicalCode(editing?.id ? { ...payload, id: editing.id } : payload);
      toast({
        title: `Kode ${editing ? "Diperbarui" : "Ditambahkan"}`,
        description: `${payload.code} — ${payload.name} berhasil disimpan.`,
      });
      await refetch();
      setIsDialogOpen(false);
    } catch (err) {
      toast({ title: "Gagal Menyimpan", description: err instanceof Error ? err.message : "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMedicalCode(deleting.id);
      toast({ title: "Kode Dihapus", description: `${deleting.code} — ${deleting.name} telah dihapus.` });
      await refetch();
      setIsDeleteDialogOpen(false);
    } catch (err) {
      toast({ title: "Gagal Menghapus", description: err instanceof Error ? err.message : "Terjadi kesalahan.", variant: "destructive" });
    }
  };

  const openDialog = (code?: MedicalCode) => {
    if (code) {
      setEditing(code);
      setFormData(code);
    } else {
      setEditing(null);
      setFormData({ ...initialFormData, system: systemFilter });
    }
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (code: MedicalCode) => {
    setDeleting(code);
    setIsDeleteDialogOpen(true);
  };

  if (loading) return <DataLoading message="Memuat master kode diagnosa..." />;
  if (error) return <DataError error={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Master Data</p>
        <h1 className="text-3xl font-bold text-foreground">Kode Diagnosa &amp; Tindakan</h1>
        <p className="text-sm text-muted-foreground">
          Kelola standar klasifikasi klinis ICD-10 (diagnosa) dan ICD-9-CM (tindakan) yang dipakai saat pemeriksaan.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Daftar Kode Terstandar</CardTitle>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select value={systemFilter} onValueChange={(v) => {
                setSystemFilter(v as MedicalCodeSystem);
                codePagination.resetPage();
              }}>
                <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="icd10">{SYSTEM_LABELS.icd10} · {counts.icd10}</SelectItem>
                  <SelectItem value="icd9cm">{SYSTEM_LABELS.icd9cm} · {counts.icd9cm}</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="w-full pl-8 sm:w-64"
                  placeholder="Cari kode / nama / kategori"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    codePagination.resetPage();
                  }}
                />
              </div>
              <Button onClick={() => openDialog()}><Plus className="mr-2 h-4 w-4" />Tambah Kode</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      {search ? "Tidak ada kode yang cocok dengan pencarian." : "Belum ada kode terdaftar untuk sistem ini."}
                    </TableCell>
                  </TableRow>
                ) : (
                  codePagination.paginatedItems.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell className="font-mono font-medium">{code.code}</TableCell>
                      <TableCell>{code.name}</TableCell>
                      <TableCell className="text-muted-foreground">{code.category ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant={code.isActive ? "default" : "secondary"}>{code.isActive ? "Aktif" : "Nonaktif"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openDialog(code)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(code)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DataPagination
            page={codePagination.page}
            totalItems={codePagination.totalItems}
            totalPages={codePagination.totalPages}
            onPageChange={codePagination.setPage}
            itemLabel="kode"
          />
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Kode" : "Tambah Kode"}</DialogTitle>
            <DialogDescription>Lengkapi data kode klasifikasi klinis terstandar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Sistem Klasifikasi</Label>
              <Select value={formData.system} onValueChange={(v) => setFormData((prev) => ({ ...prev, system: v as MedicalCodeSystem }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="icd10">{SYSTEM_LABELS.icd10}</SelectItem>
                  <SelectItem value="icd9cm">{SYSTEM_LABELS.icd9cm}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Kode</Label>
                <Input id="code" className="font-mono" value={formData.code ?? ""} onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))} placeholder="mis. J06.9" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="category">Kategori</Label>
                <Input id="category" value={formData.category ?? ""} onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))} placeholder="mis. Sistem Pernapasan" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nama Diagnosa / Tindakan</Label>
              <Input id="name" value={formData.name ?? ""} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} placeholder="mis. ISPA" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="isActive">Status Aktif</Label>
                <p className="text-xs text-muted-foreground">Kode nonaktif tidak muncul pada lookup pemeriksaan.</p>
              </div>
              <Switch id="isActive" checked={formData.isActive ?? true} onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={isSubmitting}>{isSubmitting ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Hapus Kode</DialogTitle>
            <DialogDescription>
              Yakin menghapus <strong>{deleting?.code}</strong> — {deleting?.name}? Kode yang sudah tercatat pada rekam medis lama tidak terpengaruh.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
