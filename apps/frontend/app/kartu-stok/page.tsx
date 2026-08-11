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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DataError, DataLoading, useClinicData } from "@/hooks/use-clinic-data";
import { useToast } from "@/hooks/use-toast";
import type { Medicine, MedicineBatch, StockMovement } from "@/lib/auth-types";
import { createErrorDescription, logClientError } from "@/lib/client-error";
import {
    adjustMedicineStock,
    getMedicineBatches,
    getStockMovements,
    receiveMedicineBatch,
} from "@/lib/clinic-utils";
import { ClipboardCheck, History, Layers, Loader2, PackagePlus, RefreshCw, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const ALL_OPTION = "semua";
const MOVEMENT_LIMIT = 300;
/** Ambang peringatan obat mendekati kedaluwarsa, dalam hari. */
const EXPIRY_WARNING_DAYS = 90;

const REASON_LABELS: Record<StockMovement["reason"], string> = {
  dispense: "Penyerahan Resep",
  adjustment: "Penyesuaian",
  "stock-opname": "Stock Opname",
  receipt: "Penerimaan Barang",
};

const REASON_BADGE_CLASSES: Record<StockMovement["reason"], string> = {
  dispense: "bg-sky-500/10 text-sky-700",
  adjustment: "bg-amber-500/10 text-amber-700",
  "stock-opname": "bg-violet-500/10 text-violet-700",
  receipt: "bg-emerald-500/10 text-emerald-700",
};

type AdjustmentMode = "adjustment" | "stock-opname";

function daysUntil(dateString: string) {
  const target = new Date(dateString);
  if (Number.isNaN(target.getTime())) return null;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000));
}

function formatDateOnly(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function renderExpiryBadge(expiryDate: string) {
  const remaining = daysUntil(expiryDate);
  if (remaining === null) return null;
  if (remaining < 0) {
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-700">
        Kedaluwarsa
      </Badge>
    );
  }
  if (remaining <= EXPIRY_WARNING_DAYS) {
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-700">
        {remaining} hari lagi
      </Badge>
    );
  }
  return null;
}

function formatTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function KartuStokPage() {
  const {
    data: medicines = [],
    loading: medicinesLoading,
    error: medicinesError,
    refetch: refetchMedicines,
  } = useClinicData<Medicine>("medicines");

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [batches, setBatches] = useState<MedicineBatch[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [ledgerError, setLedgerError] = useState<Error | null>(null);

  const [medicineFilter, setMedicineFilter] = useState(ALL_OPTION);
  const [reasonFilter, setReasonFilter] = useState(ALL_OPTION);

  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustMode, setAdjustMode] = useState<AdjustmentMode>("adjustment");
  const [adjustMedicineId, setAdjustMedicineId] = useState("");
  const [adjustBatchId, setAdjustBatchId] = useState("");
  const [quantityChange, setQuantityChange] = useState("");
  const [countedStock, setCountedStock] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [receiveMedicineId, setReceiveMedicineId] = useState("");
  const [receiveBatchNumber, setReceiveBatchNumber] = useState("");
  const [receiveExpiryDate, setReceiveExpiryDate] = useState("");
  const [receiveQuantity, setReceiveQuantity] = useState("");
  const [receiveBuyPrice, setReceiveBuyPrice] = useState("");
  const [receiveSupplier, setReceiveSupplier] = useState("");
  const [receiveNotes, setReceiveNotes] = useState("");

  const { toast } = useToast();

  const loadLedger = useCallback(async () => {
    try {
      setLedgerLoading(true);
      setLedgerError(null);
      const [loadedMovements, loadedBatches] = await Promise.all([
        getStockMovements(MOVEMENT_LIMIT),
        getMedicineBatches(),
      ]);
      setMovements(loadedMovements);
      setBatches(loadedBatches);
    } catch (error) {
      logClientError(error, { module: "kartu-stok", action: "memuat kartu stok" });
      setLedgerError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLedgerLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLedger();
  }, [loadLedger]);

  const medicinesById = useMemo(
    () => new Map(medicines.map((medicine) => [medicine.id, medicine])),
    [medicines]
  );

  const sortedMedicines = useMemo(
    () => [...medicines].sort((a, b) => a.name.localeCompare(b.name, "id-ID", { sensitivity: "base" })),
    [medicines]
  );

  const displayedMovements = useMemo(
    () =>
      movements
        .filter((movement) => (medicineFilter === ALL_OPTION ? true : movement.medicineId === medicineFilter))
        .filter((movement) => (reasonFilter === ALL_OPTION ? true : movement.reason === reasonFilter))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [movements, medicineFilter, reasonFilter]
  );

  const displayedBatches = useMemo(
    () =>
      batches
        .filter((batch) => (medicineFilter === ALL_OPTION ? true : batch.medicineId === medicineFilter))
        // Urutan FEFO, sama seperti urutan pengambilan saat penyerahan resep.
        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()),
    [batches, medicineFilter]
  );
  const movementPagination = useDataPagination(displayedMovements);
  const batchPagination = useDataPagination(displayedBatches);

  const selectedAdjustMedicine = medicinesById.get(adjustMedicineId);

  const adjustableBatches = useMemo(
    () =>
      batches
        .filter((batch) => batch.medicineId === adjustMedicineId)
        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()),
    [batches, adjustMedicineId]
  );

  const selectedAdjustBatch = adjustableBatches.find((batch) => batch.id === adjustBatchId);

  // Obat yang sudah dipecah per batch hanya boleh dikoreksi per batch, sebab
  // mengubah total agregat akan menyimpang dari rincian batch.
  const requiresBatchSelection = adjustableBatches.length > 0;

  // Jumlah yang akan tercatat setelah koreksi disimpan, ditampilkan sebagai
  // pratinjau supaya petugas sadar kalau salah ketik sebelum menekan simpan.
  const recordedQuantity = requiresBatchSelection
    ? selectedAdjustBatch?.quantity ?? null
    : selectedAdjustMedicine?.stock ?? null;

  const projectedStock = useMemo(() => {
    if (recordedQuantity === null) return null;
    if (adjustMode === "stock-opname") {
      const counted = Number(countedStock);
      return countedStock.trim() === "" || Number.isNaN(counted) ? null : counted;
    }
    const change = Number(quantityChange);
    return quantityChange.trim() === "" || Number.isNaN(change) ? null : recordedQuantity + change;
  }, [recordedQuantity, adjustMode, countedStock, quantityChange]);

  const resetAdjustForm = () => {
    setAdjustMedicineId("");
    setAdjustBatchId("");
    setQuantityChange("");
    setCountedStock("");
    setNotes("");
    setAdjustMode("adjustment");
  };

  const resetReceiveForm = () => {
    setReceiveMedicineId("");
    setReceiveBatchNumber("");
    setReceiveExpiryDate("");
    setReceiveQuantity("");
    setReceiveBuyPrice("");
    setReceiveSupplier("");
    setReceiveNotes("");
  };

  const handleReceiveBatch = async () => {
    const medicine = medicinesById.get(receiveMedicineId);
    const parsedQuantity = Number(receiveQuantity);

    if (!medicine || !receiveBatchNumber.trim() || !receiveExpiryDate) {
      toast({
        title: "Data Belum Lengkap",
        description: "Obat, nomor batch, dan tanggal kedaluwarsa wajib diisi.",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      toast({
        title: "Jumlah Tidak Valid",
        description: "Jumlah penerimaan harus bilangan bulat minimal 1.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await receiveMedicineBatch(medicine.id, {
        batchNumber: receiveBatchNumber.trim(),
        expiryDate: receiveExpiryDate,
        quantity: parsedQuantity,
        buyPrice: receiveBuyPrice.trim() === "" ? undefined : Number(receiveBuyPrice),
        supplier: receiveSupplier.trim() || undefined,
        notes: receiveNotes.trim() || undefined,
      });

      toast({
        title: "Batch Diterima",
        description: `${parsedQuantity} ${medicine.unit} ${medicine.name} batch ${receiveBatchNumber.trim()} masuk ke stok.`,
      });

      setIsReceiveOpen(false);
      resetReceiveForm();
      await Promise.all([refetchMedicines(), loadLedger()]);
    } catch (error) {
      logClientError(error, {
        module: "kartu-stok",
        action: "menerima batch obat",
        entityId: medicine.id,
      });
      toast({
        title: "Gagal Mencatat Penerimaan",
        description: createErrorDescription(error, {
          module: "kartu-stok",
          action: "menerima batch obat",
          entityId: medicine.id,
        }),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAdjustment = async () => {
    if (!selectedAdjustMedicine) {
      toast({
        title: "Obat Belum Dipilih",
        description: "Pilih obat yang stoknya akan dikoreksi.",
        variant: "destructive",
      });
      return;
    }

    if (requiresBatchSelection && !selectedAdjustBatch) {
      toast({
        title: "Batch Belum Dipilih",
        description: `${selectedAdjustMedicine.name} dikelola per batch. Pilih batch yang akan dikoreksi.`,
        variant: "destructive",
      });
      return;
    }

    const rawValue = adjustMode === "stock-opname" ? countedStock : quantityChange;
    const parsedValue = Number(rawValue);
    if (rawValue.trim() === "" || !Number.isInteger(parsedValue)) {
      toast({
        title: "Jumlah Tidak Valid",
        description:
          adjustMode === "stock-opname"
            ? "Isi hasil hitung fisik berupa bilangan bulat."
            : "Isi selisih stok berupa bilangan bulat, gunakan tanda minus untuk pengurangan.",
        variant: "destructive",
      });
      return;
    }

    if (adjustMode === "adjustment" && parsedValue === 0) {
      toast({
        title: "Tidak Ada Perubahan",
        description: "Selisih stok tidak boleh nol.",
        variant: "destructive",
      });
      return;
    }

    if (projectedStock !== null && projectedStock < 0) {
      toast({
        title: "Stok Menjadi Negatif",
        description: `Koreksi ini membuat stok ${selectedAdjustMedicine.name} menjadi ${projectedStock}.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedNotes = notes.trim() || undefined;
      const batchId = selectedAdjustBatch?.id;
      await adjustMedicineStock(
        selectedAdjustMedicine.id,
        adjustMode === "stock-opname"
          ? { reason: "stock-opname", countedStock: parsedValue, batchId, notes: trimmedNotes }
          : { reason: "adjustment", quantityChange: parsedValue, batchId, notes: trimmedNotes }
      );

      toast({
        title: adjustMode === "stock-opname" ? "Stock Opname Tersimpan" : "Stok Disesuaikan",
        description: selectedAdjustBatch
          ? `Batch ${selectedAdjustBatch.batchNumber} kini ${projectedStock ?? "-"} ${selectedAdjustMedicine.unit}.`
          : `Stok ${selectedAdjustMedicine.name} kini ${projectedStock ?? "-"} ${selectedAdjustMedicine.unit}.`,
      });

      setIsAdjustOpen(false);
      resetAdjustForm();
      await Promise.all([refetchMedicines(), loadLedger()]);
    } catch (error) {
      logClientError(error, {
        module: "kartu-stok",
        action: "mengoreksi stok",
        entityId: selectedAdjustMedicine.id,
      });
      toast({
        title: "Gagal Mengoreksi Stok",
        description: createErrorDescription(error, {
          module: "kartu-stok",
          action: "mengoreksi stok",
          entityId: selectedAdjustMedicine.id,
        }),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    if (medicinesError) void refetchMedicines();
    if (ledgerError) void loadLedger();
  };

  if (medicinesLoading || ledgerLoading) return <DataLoading message="Memuat kartu stok..." />;
  const combinedError = medicinesError || ledgerError;
  if (combinedError) return <DataError error={combinedError} onRetry={handleRetry} />;

  const expiringBatches = displayedBatches.filter((batch) => {
    const remaining = daysUntil(batch.expiryDate);
    return batch.quantity > 0 && remaining !== null && remaining <= EXPIRY_WARNING_DAYS;
  });

  const medicineFilterControl = (
    <div className="space-y-1">
      <Label htmlFor="movement-medicine">Obat</Label>
      <Select value={medicineFilter} onValueChange={setMedicineFilter}>
        <SelectTrigger id="movement-medicine">
          <SelectValue placeholder="Semua obat" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value={ALL_OPTION}>Semua obat</SelectItem>
          {sortedMedicines.map((medicine) => (
            <SelectItem key={medicine.id} value={medicine.id}>
              {medicine.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            Kartu Stok Obat
          </h1>
          <p className="text-muted-foreground">
            Riwayat setiap mutasi stok obat, dari penerimaan barang sampai penyerahan resep dan stock opname.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void loadLedger()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Muat ulang
          </Button>
          <Button variant="outline" onClick={() => setIsReceiveOpen(true)}>
            <PackagePlus className="mr-2 h-4 w-4" />
            Terima Batch
          </Button>
          <Button onClick={() => setIsAdjustOpen(true)}>
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Koreksi Stok
          </Button>
        </div>
      </div>

      {expiringBatches.length > 0 ? (
        <Card className="border-amber-500/40">
          <CardHeader>
            <CardTitle className="text-base">Perlu perhatian</CardTitle>
            <CardDescription>
              {expiringBatches.length} batch sudah kedaluwarsa atau akan kedaluwarsa dalam {EXPIRY_WARNING_DAYS} hari.
              Batch yang lewat tanggal tidak ikut terserahkan saat penyerahan resep.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Tabs defaultValue="movements">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="movements">
            <History className="mr-2 h-4 w-4" />
            Mutasi Stok
          </TabsTrigger>
          <TabsTrigger value="batches">
            <Layers className="mr-2 h-4 w-4" />
            Batch &amp; Kedaluwarsa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="movements" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Mutasi Stok</CardTitle>
          <CardDescription>
            {displayedMovements.length === movements.length
              ? `Menampilkan ${movements.length} mutasi terakhir.`
              : `Menampilkan ${displayedMovements.length} dari ${movements.length} mutasi terakhir.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {medicineFilterControl}
            <div className="space-y-1">
              <Label htmlFor="movement-reason">Jenis Mutasi</Label>
              <Select value={reasonFilter} onValueChange={setReasonFilter}>
                <SelectTrigger id="movement-reason">
                  <SelectValue placeholder="Semua jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_OPTION}>Semua jenis</SelectItem>
                  {(Object.keys(REASON_LABELS) as StockMovement["reason"][]).map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {REASON_LABELS[reason]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table className="text-[13px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Obat</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead className="text-right">Perubahan</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      {movements.length === 0
                        ? "Belum ada mutasi stok yang tercatat."
                        : "Tidak ada mutasi yang cocok dengan filter."}
                    </TableCell>
                  </TableRow>
                ) : (
                  movementPagination.paginatedItems.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="whitespace-nowrap">{formatTimestamp(movement.createdAt)}</TableCell>
                      <TableCell className="font-medium">
                        {movement.medicineName ?? medicinesById.get(movement.medicineId)?.name ?? movement.medicineId}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {movement.batchNumber ?? "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={REASON_BADGE_CLASSES[movement.reason]}>
                          {REASON_LABELS[movement.reason] ?? movement.reason}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${
                          movement.quantityChange < 0 ? "text-red-600" : "text-emerald-600"
                        }`}
                      >
                        {movement.quantityChange > 0 ? `+${movement.quantityChange}` : movement.quantityChange}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{movement.notes ?? "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DataPagination page={movementPagination.page} totalItems={movementPagination.totalItems} totalPages={movementPagination.totalPages} onPageChange={movementPagination.setPage} itemLabel="mutasi" />
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="batches" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Batch &amp; Tanggal Kedaluwarsa</CardTitle>
              <CardDescription>
                Diurutkan sesuai FEFO — batch paling atas yang diambil lebih dulu saat penyerahan resep.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{medicineFilterControl}</div>

              <div className="overflow-x-auto rounded-md border">
                <Table className="text-[13px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Obat</TableHead>
                      <TableHead>No. Batch</TableHead>
                      <TableHead>Kedaluwarsa</TableHead>
                      <TableHead className="text-right">Sisa</TableHead>
                      <TableHead className="text-right">Diterima</TableHead>
                      <TableHead>Supplier</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedBatches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          {batches.length === 0
                            ? "Belum ada batch tercatat. Obat tanpa batch tetap dilayani lewat stok agregat."
                            : "Tidak ada batch yang cocok dengan filter."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      batchPagination.paginatedItems.map((batch) => {
                        const unit = medicinesById.get(batch.medicineId)?.unit ?? "";
                        return (
                          <TableRow key={batch.id}>
                            <TableCell className="font-medium">
                              {batch.medicineName ?? medicinesById.get(batch.medicineId)?.name ?? batch.medicineId}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{batch.batchNumber}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap items-center gap-2">
                                <span>{formatDateOnly(batch.expiryDate)}</span>
                                {renderExpiryBadge(batch.expiryDate)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {batch.quantity} {unit}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {batch.initialQuantity} {unit}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{batch.supplier ?? "-"}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <DataPagination page={batchPagination.page} totalItems={batchPagination.totalItems} totalPages={batchPagination.totalPages} onPageChange={batchPagination.setPage} itemLabel="batch" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={isReceiveOpen}
        onOpenChange={(open) => {
          setIsReceiveOpen(open);
          if (!open) resetReceiveForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terima Batch Obat</DialogTitle>
            <DialogDescription>
              Catat penerimaan barang dari supplier. Setiap batch punya tanggal kedaluwarsa sendiri dan akan
              diserahkan mengikuti urutan FEFO.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="receive-medicine">Obat</Label>
              <Select value={receiveMedicineId} onValueChange={setReceiveMedicineId}>
                <SelectTrigger id="receive-medicine">
                  <SelectValue placeholder="Pilih obat..." />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {sortedMedicines.map((medicine) => (
                    <SelectItem key={medicine.id} value={medicine.id}>
                      {medicine.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="receive-batch-number">No. Batch</Label>
                <Input
                  id="receive-batch-number"
                  value={receiveBatchNumber}
                  onChange={(event) => setReceiveBatchNumber(event.target.value)}
                  placeholder="Contoh: B240715A"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="receive-expiry">Tgl. Kedaluwarsa</Label>
                <Input
                  id="receive-expiry"
                  type="date"
                  value={receiveExpiryDate}
                  onChange={(event) => setReceiveExpiryDate(event.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="receive-quantity">Jumlah</Label>
                <Input
                  id="receive-quantity"
                  type="number"
                  min={1}
                  value={receiveQuantity}
                  onChange={(event) => setReceiveQuantity(event.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="receive-buy-price">Harga Beli</Label>
                <Input
                  id="receive-buy-price"
                  type="number"
                  min={0}
                  value={receiveBuyPrice}
                  onChange={(event) => setReceiveBuyPrice(event.target.value)}
                  placeholder="Rp 0"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="receive-supplier">Supplier</Label>
                <Input
                  id="receive-supplier"
                  value={receiveSupplier}
                  onChange={(event) => setReceiveSupplier(event.target.value)}
                  placeholder="Nama distributor"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="receive-notes">Catatan (opsional)</Label>
              <Textarea
                id="receive-notes"
                value={receiveNotes}
                onChange={(event) => setReceiveNotes(event.target.value)}
                placeholder="Nomor faktur atau keterangan penerimaan"
                className="min-h-17.5"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReceiveOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleReceiveBatch} disabled={isSubmitting || !receiveMedicineId}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Penerimaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isAdjustOpen}
        onOpenChange={(open) => {
          setIsAdjustOpen(open);
          if (!open) resetAdjustForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Koreksi Stok Obat</DialogTitle>
            <DialogDescription>
              Setiap koreksi tercatat permanen di kartu stok dan riwayat aktivitas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="adjust-medicine">Obat</Label>
              <Select
                value={adjustMedicineId}
                onValueChange={(value) => {
                  setAdjustMedicineId(value);
                  setAdjustBatchId("");
                }}
              >
                <SelectTrigger id="adjust-medicine">
                  <SelectValue placeholder="Pilih obat..." />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {sortedMedicines.map((medicine) => (
                    <SelectItem key={medicine.id} value={medicine.id}>
                      {medicine.name} - stok {medicine.stock} {medicine.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {requiresBatchSelection ? (
              <div className="space-y-1">
                <Label htmlFor="adjust-batch">Batch</Label>
                <Select value={adjustBatchId} onValueChange={setAdjustBatchId}>
                  <SelectTrigger id="adjust-batch">
                    <SelectValue placeholder="Pilih batch yang dikoreksi..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {adjustableBatches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.batchNumber} - ED {formatDateOnly(batch.expiryDate)} - sisa {batch.quantity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Obat ini dikelola per batch, jadi koreksi harus menunjuk satu batch.
                </p>
              </div>
            ) : null}

            <div className="space-y-1">
              <Label htmlFor="adjust-mode">Jenis Koreksi</Label>
              <Select value={adjustMode} onValueChange={(value) => setAdjustMode(value as AdjustmentMode)}>
                <SelectTrigger id="adjust-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adjustment">Penyesuaian (isi selisih)</SelectItem>
                  <SelectItem value="stock-opname">Stock Opname (isi hasil hitung fisik)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {adjustMode === "adjustment" ? (
              <div className="space-y-1">
                <Label htmlFor="adjust-quantity">Selisih Stok</Label>
                <Input
                  id="adjust-quantity"
                  type="number"
                  value={quantityChange}
                  onChange={(event) => setQuantityChange(event.target.value)}
                  placeholder="Contoh: -5 untuk obat rusak, 20 untuk barang masuk"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <Label htmlFor="adjust-counted">Hasil Hitung Fisik</Label>
                <Input
                  id="adjust-counted"
                  type="number"
                  min={0}
                  value={countedStock}
                  onChange={(event) => setCountedStock(event.target.value)}
                  placeholder="Jumlah obat yang benar-benar ada di rak"
                />
              </div>
            )}

            {selectedAdjustMedicine && recordedQuantity !== null ? (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                <p className="text-muted-foreground">
                  {selectedAdjustBatch ? `Sisa batch ${selectedAdjustBatch.batchNumber}` : "Stok tercatat"}:{" "}
                  <span className="font-semibold text-foreground">
                    {recordedQuantity} {selectedAdjustMedicine.unit}
                  </span>
                </p>
                {projectedStock !== null ? (
                  <p className="text-muted-foreground">
                    Setelah koreksi:{" "}
                    <span
                      className={`font-semibold ${projectedStock < 0 ? "text-red-600" : "text-foreground"}`}
                    >
                      {projectedStock} {selectedAdjustMedicine.unit}
                    </span>
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-1">
              <Label htmlFor="adjust-notes">Catatan (opsional)</Label>
              <Textarea
                id="adjust-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Alasan koreksi, misal: obat rusak / kedaluwarsa / hasil opname bulanan"
                className="min-h-17.5"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdjustOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmitAdjustment} disabled={isSubmitting || !adjustMedicineId}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Koreksi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
