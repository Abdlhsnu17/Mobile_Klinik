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
import type {
  Medicine,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  ReceivePurchaseOrderLine,
  Supplier,
} from "@/lib/auth-types";
import {
  deletePurchaseOrder,
  deleteSupplier,
  receivePurchaseOrder,
  savePurchaseOrder,
  saveSupplier,
} from "@/lib/clinic-utils";
import { Edit, PackageCheck, Plus, Trash2, Truck } from "lucide-react";
import { useMemo, useState } from "react";

const PO_STATUS_META: Record<PurchaseOrderStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "outline" },
  dipesan: { label: "Dipesan", variant: "secondary" },
  "diterima-sebagian": { label: "Diterima Sebagian", variant: "default" },
  selesai: { label: "Selesai", variant: "default" },
  batal: { label: "Batal", variant: "destructive" },
};

function formatCurrency(amount: number) {
  return `Rp ${Number(amount || 0).toLocaleString("id-ID")}`;
}

function generatePoNumber() {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const random = String(Math.floor(Math.random() * 900) + 100);
  return `PO-${stamp}-${random}`;
}

const emptySupplier: Partial<Supplier> = { code: "", name: "", status: "aktif" };

type DraftItem = { medicineId: string; quantity: number; unitPrice: number };

export default function PengadaanPage() {
  const { data: suppliers = [], loading: suppliersLoading, error: suppliersError, refetch: refetchSuppliers } = useClinicData<Supplier>("suppliers");
  const { data: purchaseOrders = [], loading: poLoading, error: poError, refetch: refetchPo } = useClinicData<PurchaseOrder>("purchase-orders");
  const { data: medicines = [], loading: medsLoading, error: medsError, refetch: refetchMeds } = useClinicData<Medicine>("medicines");
  const { toast } = useToast();

  // Supplier dialog state
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState<Partial<Supplier>>(emptySupplier);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  // PO dialog state
  const [poDialogOpen, setPoDialogOpen] = useState(false);
  const [editingPo, setEditingPo] = useState<PurchaseOrder | null>(null);
  const [poSupplierId, setPoSupplierId] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [poNotes, setPoNotes] = useState("");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [deletingPo, setDeletingPo] = useState<PurchaseOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Receive dialog state
  const [receivePo, setReceivePo] = useState<PurchaseOrder | null>(null);
  const [receiveLines, setReceiveLines] = useState<Record<string, ReceivePurchaseOrderLine>>({});

  const medicineMap = useMemo(() => new Map(medicines.map((m) => [m.id, m])), [medicines]);
  const activeSuppliers = useMemo(() => suppliers.filter((s) => s.status === "aktif"), [suppliers]);
  const purchaseOrderPagination = useDataPagination(purchaseOrders);
  const supplierPagination = useDataPagination(suppliers);

  const draftTotal = useMemo(
    () => draftItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0),
    [draftItems],
  );

  // ── Supplier handlers ──
  const openSupplierDialog = (supplier?: Supplier) => {
    setEditingSupplier(supplier ?? null);
    setSupplierForm(supplier ?? emptySupplier);
    setSupplierDialogOpen(true);
  };

  const handleSaveSupplier = async () => {
    if (!supplierForm.code?.trim() || !supplierForm.name?.trim()) {
      toast({ title: "Data belum lengkap", description: "Kode dan nama supplier wajib diisi.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await saveSupplier(editingSupplier?.id ? { ...supplierForm, id: editingSupplier.id } : supplierForm);
      toast({ title: `Supplier ${editingSupplier ? "diperbarui" : "ditambahkan"}` });
      await refetchSuppliers();
      setSupplierDialogOpen(false);
    } catch (err) {
      toast({ title: "Gagal menyimpan supplier", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSupplier = async () => {
    if (!deletingSupplier) return;
    try {
      await deleteSupplier(deletingSupplier.id);
      toast({ title: "Supplier dihapus" });
      await refetchSuppliers();
    } catch (err) {
      toast({ title: "Gagal menghapus", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setDeletingSupplier(null);
    }
  };

  // ── Purchase Order handlers ──
  const openPoDialog = (po?: PurchaseOrder) => {
    if (po) {
      setEditingPo(po);
      setPoSupplierId(po.supplierId);
      setPoNumber(po.poNumber);
      setOrderDate(po.orderDate?.slice(0, 10) ?? "");
      setExpectedDate(po.expectedDate?.slice(0, 10) ?? "");
      setPoNotes(po.notes ?? "");
      setDraftItems(po.items.map((item) => ({ medicineId: item.medicineId, quantity: item.quantity, unitPrice: item.unitPrice })));
    } else {
      setEditingPo(null);
      setPoSupplierId("");
      setPoNumber(generatePoNumber());
      setOrderDate(new Date().toISOString().slice(0, 10));
      setExpectedDate("");
      setPoNotes("");
      setDraftItems([]);
    }
    setPoDialogOpen(true);
  };

  const addDraftItem = () => setDraftItems((prev) => [...prev, { medicineId: "", quantity: 1, unitPrice: 0 }]);
  const updateDraftItem = (index: number, patch: Partial<DraftItem>) =>
    setDraftItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const removeDraftItem = (index: number) => setDraftItems((prev) => prev.filter((_, i) => i !== index));

  const handleSavePo = async () => {
    const supplier = suppliers.find((s) => s.id === poSupplierId);
    if (!supplier) {
      toast({ title: "Supplier belum dipilih", variant: "destructive" });
      return;
    }
    const validItems = draftItems.filter((item) => item.medicineId && Number(item.quantity) > 0);
    if (validItems.length === 0) {
      toast({ title: "Item pesanan kosong", description: "Tambahkan minimal satu obat.", variant: "destructive" });
      return;
    }
    const items: PurchaseOrderItem[] = validItems.map((item) => {
      const existing = editingPo?.items.find((it) => it.medicineId === item.medicineId);
      return {
        medicineId: item.medicineId,
        medicineName: medicineMap.get(item.medicineId)?.name ?? "Obat",
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice) || 0,
        receivedQuantity: existing?.receivedQuantity ?? 0,
      };
    });
    const payload: Partial<PurchaseOrder> = {
      poNumber,
      supplierId: supplier.id,
      supplierName: supplier.name,
      status: editingPo?.status && editingPo.status !== "draft" ? editingPo.status : "dipesan",
      orderDate,
      expectedDate: expectedDate || undefined,
      items,
      totalAmount: items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0),
      notes: poNotes || undefined,
    };
    setSubmitting(true);
    try {
      await savePurchaseOrder(editingPo?.id ? { ...payload, id: editingPo.id } : payload);
      toast({ title: `Purchase order ${editingPo ? "diperbarui" : "dibuat"}` });
      await refetchPo();
      setPoDialogOpen(false);
    } catch (err) {
      toast({ title: "Gagal menyimpan PO", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePo = async () => {
    if (!deletingPo) return;
    try {
      await deletePurchaseOrder(deletingPo.id);
      toast({ title: "Purchase order dihapus" });
      await refetchPo();
    } catch (err) {
      toast({ title: "Gagal menghapus", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setDeletingPo(null);
    }
  };

  // ── Receive handlers ──
  const openReceiveDialog = (po: PurchaseOrder) => {
    setReceivePo(po);
    const initial: Record<string, ReceivePurchaseOrderLine> = {};
    po.items.forEach((item) => {
      const outstanding = item.quantity - (item.receivedQuantity ?? 0);
      initial[item.medicineId] = {
        medicineId: item.medicineId,
        receivedQuantity: outstanding > 0 ? outstanding : 0,
        batchNumber: "",
        expiryDate: "",
        buyPrice: item.unitPrice,
      };
    });
    setReceiveLines(initial);
  };

  const updateReceiveLine = (medicineId: string, patch: Partial<ReceivePurchaseOrderLine>) =>
    setReceiveLines((prev) => ({ ...prev, [medicineId]: { ...prev[medicineId], ...patch } }));

  const handleReceive = async () => {
    if (!receivePo) return;
    const lines = Object.values(receiveLines).filter((line) => Number(line.receivedQuantity) > 0);
    if (lines.length === 0) {
      toast({ title: "Tidak ada barang diterima", description: "Isi jumlah terima minimal satu baris.", variant: "destructive" });
      return;
    }
    const missing = lines.find((line) => !line.batchNumber?.trim() || !line.expiryDate);
    if (missing) {
      toast({ title: "Data batch belum lengkap", description: "Nomor batch dan tanggal kedaluwarsa wajib untuk tiap baris yang diterima.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await receivePurchaseOrder(receivePo.id, lines);
      toast({ title: "Penerimaan tercatat", description: "Stok obat telah diperbarui." });
      await Promise.all([refetchPo(), refetchMeds()]);
      setReceivePo(null);
    } catch (err) {
      toast({ title: "Gagal menerima barang", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = suppliersLoading || poLoading || medsLoading;
  const combinedError = suppliersError || poError || medsError;
  if (isLoading) return <DataLoading message="Memuat data pengadaan..." />;
  if (combinedError) return <DataError error={combinedError} onRetry={() => { refetchSuppliers(); refetchPo(); refetchMeds(); }} />;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Keuangan · Rantai Pasok</p>
        <h1 className="text-3xl font-bold text-foreground">Pengadaan</h1>
        <p className="text-sm text-muted-foreground">Kelola supplier, buat purchase order, dan terima barang untuk menambah stok obat.</p>
      </div>

      <Tabs defaultValue="po">
        <TabsList className="w-full">
          <TabsTrigger value="po">Purchase Order ({purchaseOrders.length})</TabsTrigger>
          <TabsTrigger value="supplier">Supplier ({suppliers.length})</TabsTrigger>
        </TabsList>

        {/* ── Purchase Orders ── */}
        <TabsContent value="po" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Daftar Purchase Order</CardTitle>
                <Button onClick={() => openPoDialog()} disabled={activeSuppliers.length === 0}>
                  <Plus className="mr-2 h-4 w-4" />Buat PO
                </Button>
              </div>
              {activeSuppliers.length === 0 && (
                <p className="text-sm text-muted-foreground">Tambahkan supplier aktif terlebih dahulu sebelum membuat PO.</p>
              )}
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. PO</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Tgl Order</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Belum ada purchase order.</TableCell></TableRow>
                    ) : (
                      purchaseOrderPagination.paginatedItems.map((po) => {
                        const canReceive = po.status !== "selesai" && po.status !== "batal";
                        return (
                          <TableRow key={po.id}>
                            <TableCell className="font-mono font-medium">{po.poNumber}</TableCell>
                            <TableCell>{po.supplierName}</TableCell>
                            <TableCell>{po.orderDate ? new Date(po.orderDate).toLocaleDateString("id-ID") : "-"}</TableCell>
                            <TableCell>{po.items.length} item</TableCell>
                            <TableCell className="text-right">{formatCurrency(po.totalAmount)}</TableCell>
                            <TableCell><Badge variant={PO_STATUS_META[po.status].variant}>{PO_STATUS_META[po.status].label}</Badge></TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                {canReceive && (
                                  <Button variant="ghost" size="icon" title="Terima barang" onClick={() => openReceiveDialog(po)}>
                                    <Truck className="h-4 w-4 text-primary" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" title="Edit" onClick={() => openPoDialog(po)}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" title="Hapus" onClick={() => setDeletingPo(po)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <DataPagination page={purchaseOrderPagination.page} totalItems={purchaseOrderPagination.totalItems} totalPages={purchaseOrderPagination.totalPages} onPageChange={purchaseOrderPagination.setPage} itemLabel="purchase order" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Suppliers ── */}
        <TabsContent value="supplier" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Daftar Supplier</CardTitle>
                <Button onClick={() => openSupplierDialog()}><Plus className="mr-2 h-4 w-4" />Tambah Supplier</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kode</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Kontak</TableHead>
                      <TableHead>Telepon</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Belum ada supplier.</TableCell></TableRow>
                    ) : (
                      supplierPagination.paginatedItems.map((supplier) => (
                        <TableRow key={supplier.id}>
                          <TableCell className="font-mono">{supplier.code}</TableCell>
                          <TableCell className="font-medium">{supplier.name}</TableCell>
                          <TableCell>{supplier.contactPerson ?? "-"}</TableCell>
                          <TableCell>{supplier.phone ?? "-"}</TableCell>
                          <TableCell><Badge variant={supplier.status === "aktif" ? "default" : "secondary"}>{supplier.status}</Badge></TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openSupplierDialog(supplier)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeletingSupplier(supplier)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <DataPagination page={supplierPagination.page} totalItems={supplierPagination.totalItems} totalPages={supplierPagination.totalPages} onPageChange={supplierPagination.setPage} itemLabel="supplier" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Supplier dialog ── */}
      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? "Edit Supplier" : "Tambah Supplier"}</DialogTitle>
            <DialogDescription>Data pemasok obat dan alat kesehatan.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-2"><Label>Kode</Label><Input value={supplierForm.code ?? ""} onChange={(e) => setSupplierForm((p) => ({ ...p, code: e.target.value }))} placeholder="SUP-001" /></div>
            <div className="space-y-2"><Label>Status</Label>
              <Select value={supplierForm.status} onValueChange={(v) => setSupplierForm((p) => ({ ...p, status: v as Supplier["status"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="aktif">Aktif</SelectItem><SelectItem value="nonaktif">Nonaktif</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2"><Label>Nama</Label><Input value={supplierForm.name ?? ""} onChange={(e) => setSupplierForm((p) => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Kontak Person</Label><Input value={supplierForm.contactPerson ?? ""} onChange={(e) => setSupplierForm((p) => ({ ...p, contactPerson: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Telepon</Label><Input value={supplierForm.phone ?? ""} onChange={(e) => setSupplierForm((p) => ({ ...p, phone: e.target.value }))} /></div>
            <div className="col-span-2 space-y-2"><Label>Email</Label><Input value={supplierForm.email ?? ""} onChange={(e) => setSupplierForm((p) => ({ ...p, email: e.target.value }))} /></div>
            <div className="col-span-2 space-y-2"><Label>Alamat</Label><Textarea value={supplierForm.address ?? ""} onChange={(e) => setSupplierForm((p) => ({ ...p, address: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplierDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSaveSupplier} disabled={submitting}>{submitting ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── PO dialog ── */}
      <Dialog open={poDialogOpen} onOpenChange={setPoDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPo ? "Edit Purchase Order" : "Buat Purchase Order"}</DialogTitle>
            <DialogDescription>Pilih supplier dan tambahkan obat yang dipesan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>No. PO</Label><Input className="font-mono" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} /></div>
              <div className="space-y-2"><Label>Supplier</Label>
                <Select value={poSupplierId} onValueChange={setPoSupplierId}>
                  <SelectTrigger><SelectValue placeholder="Pilih supplier" /></SelectTrigger>
                  <SelectContent>{activeSuppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Tanggal Order</Label><Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Estimasi Datang</Label><Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} /></div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Item Pesanan</Label>
                <Button type="button" variant="outline" size="sm" onClick={addDraftItem}><Plus className="mr-1 h-3.5 w-3.5" />Tambah item</Button>
              </div>
              {draftItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada item.</p>
              ) : (
                <div className="space-y-2">
                  {draftItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 items-end gap-2 rounded-lg border p-2">
                      <div className="col-span-5 space-y-1">
                        <Label className="text-xs">Obat</Label>
                        <Select value={item.medicineId} onValueChange={(v) => updateDraftItem(index, { medicineId: v, unitPrice: item.unitPrice || Number(medicineMap.get(v)?.buyPrice ?? medicineMap.get(v)?.price ?? 0) })}>
                          <SelectTrigger><SelectValue placeholder="Pilih obat" /></SelectTrigger>
                          <SelectContent>{medicines.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 space-y-1"><Label className="text-xs">Qty</Label><Input type="number" min={1} value={item.quantity} onChange={(e) => updateDraftItem(index, { quantity: Number(e.target.value) })} /></div>
                      <div className="col-span-3 space-y-1"><Label className="text-xs">Harga Beli</Label><Input type="number" min={0} value={item.unitPrice} onChange={(e) => updateDraftItem(index, { unitPrice: Number(e.target.value) })} /></div>
                      <div className="col-span-2 flex items-center justify-end pb-1">
                        <Button variant="ghost" size="icon" onClick={() => removeDraftItem(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end pt-1 text-sm font-medium">Total: {formatCurrency(draftTotal)}</div>
            </div>

            <div className="space-y-2"><Label>Catatan</Label><Textarea value={poNotes} onChange={(e) => setPoNotes(e.target.value)} placeholder="Opsional" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPoDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSavePo} disabled={submitting}>{submitting ? "Menyimpan..." : "Simpan PO"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Receive dialog ── */}
      <Dialog open={!!receivePo} onOpenChange={(open) => !open && setReceivePo(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-primary" />Terima Barang · {receivePo?.poNumber}</DialogTitle>
            <DialogDescription>Isi jumlah terima, nomor batch, dan tanggal kedaluwarsa. Stok obat akan bertambah otomatis.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {receivePo?.items.map((item) => {
              const line = receiveLines[item.medicineId];
              const outstanding = item.quantity - (item.receivedQuantity ?? 0);
              return (
                <div key={item.medicineId} className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-medium">{item.medicineName}</p>
                    <span className="text-xs text-muted-foreground">Dipesan {item.quantity} · diterima {item.receivedQuantity ?? 0} · sisa {outstanding}</span>
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-3 space-y-1"><Label className="text-xs">Jumlah Terima</Label><Input type="number" min={0} max={outstanding} value={line?.receivedQuantity ?? 0} onChange={(e) => updateReceiveLine(item.medicineId, { receivedQuantity: Number(e.target.value) })} disabled={outstanding <= 0} /></div>
                    <div className="col-span-3 space-y-1"><Label className="text-xs">No. Batch</Label><Input value={line?.batchNumber ?? ""} onChange={(e) => updateReceiveLine(item.medicineId, { batchNumber: e.target.value })} disabled={outstanding <= 0} /></div>
                    <div className="col-span-3 space-y-1"><Label className="text-xs">Kedaluwarsa</Label><Input type="date" value={line?.expiryDate ?? ""} onChange={(e) => updateReceiveLine(item.medicineId, { expiryDate: e.target.value })} disabled={outstanding <= 0} /></div>
                    <div className="col-span-3 space-y-1"><Label className="text-xs">Harga Beli</Label><Input type="number" min={0} value={line?.buyPrice ?? 0} onChange={(e) => updateReceiveLine(item.medicineId, { buyPrice: Number(e.target.value) })} disabled={outstanding <= 0} /></div>
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceivePo(null)}>Batal</Button>
            <Button onClick={handleReceive} disabled={submitting}>{submitting ? "Memproses..." : "Konfirmasi Penerimaan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmations ── */}
      <Dialog open={!!deletingSupplier} onOpenChange={(open) => !open && setDeletingSupplier(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Supplier</DialogTitle><DialogDescription>Yakin menghapus <strong>{deletingSupplier?.name}</strong>?</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setDeletingSupplier(null)}>Batal</Button><Button variant="destructive" onClick={handleDeleteSupplier}>Hapus</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingPo} onOpenChange={(open) => !open && setDeletingPo(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Purchase Order</DialogTitle><DialogDescription>Yakin menghapus <strong>{deletingPo?.poNumber}</strong>? Stok yang sudah terlanjur diterima tidak akan berubah.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setDeletingPo(null)}>Batal</Button><Button variant="destructive" onClick={handleDeletePo}>Hapus</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
