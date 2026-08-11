"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { DataError, DataLoading, useClinicData } from "@/hooks/use-clinic-data";
import { useToast } from "@/hooks/use-toast";
import type { BillingRecord, Patient, PaymentMethod, PaymentRecord } from "@/lib/auth-types";
import { createPayment, formatCurrency } from "@/lib/clinic-utils";
import { Banknote, CheckCircle, CircleDollarSign, FileText, History, ReceiptText, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const PAYMENT_METHODS: { label: string; value: PaymentMethod }[] = [
  { label: "Tunai", value: "tunai" },
  { label: "QRIS", value: "qris" },
  { label: "Transfer Bank", value: "transfer-himbara" },
  { label: "Asuransi Swasta", value: "asuransi-swasta" },
  { label: "Asuransi BUMN", value: "asuransi-bumn" },
  { label: "Asuransi Syariah", value: "asuransi-syariah" },
  { label: "BPJS", value: "bpjs" },
];

const PAYMENT_METHOD_LABELS = new Map(PAYMENT_METHODS.map((method) => [method.value, method.label]));

const BILLING_STATUS_LABELS: Record<BillingRecord["status"], string> = {
  draft: "Draft",
  calculated: "Dihitung",
  waiting_payment: "Menunggu Bayar",
  partially_paid: "Terbayar Sebagian",
  paid: "Lunas",
  claimed_to_insurance: "Klaim Asuransi",
  cancelled: "Dibatalkan",
};

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PembayaranPage() {
  const { data: patients = [], loading: patientsLoading, error: patientsError, refetch: refetchPatients } = useClinicData<Patient>("patients");
  const { data: billingRecords = [], loading: billingsLoading, error: billingsError, refetch: refetchBillings } = useClinicData<BillingRecord>("billing-records");
  const { data: paymentRecords = [], loading: paymentsLoading, error: paymentsError, refetch: refetchPayments } = useClinicData<PaymentRecord>("payments");
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const medicalRecordIdParam = searchParams.get("medicalRecordId");
  const autoOpenedRecordId = useRef<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState<BillingRecord | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentRecord | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("tunai");
  const [amountPaid, setAmountPaid] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const patientMap = useMemo(() => new Map(patients.map(p => [p.id, p])), [patients]);
  const billingMap = useMemo(() => new Map(billingRecords.map((billing) => [billing.medicalRecordId, billing])), [billingRecords]);

  const outstandingBillings = useMemo(() => {
    return billingRecords.filter((billing) => {
      const remaining = Math.max(0, billing.total - billing.paidAmount)
      return remaining > 0 && !["paid", "cancelled"].includes(billing.status)
    })
  }, [billingRecords]);

  const filteredOutstanding = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return outstandingBillings;
    return outstandingBillings.filter(billing =>
      billing.patientName.toLowerCase().includes(term) ||
      billing.medicalRecordId.toLowerCase().includes(term) ||
      patientMap.get(billing.patientId)?.noRM?.toLowerCase().includes(term)
    );
  }, [searchTerm, outstandingBillings, patientMap]);

  const filteredPayments = useMemo(() => {
    const sortedPayments = [...paymentRecords].sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
    const term = historySearchTerm.toLowerCase();
    if (!term) return sortedPayments;
    return sortedPayments.filter((record) => {
      const patient = patientMap.get(record.patientId);
      const billing = billingMap.get(record.medicalRecordId);
      return (
        patient?.name.toLowerCase().includes(term) ||
        patient?.noRM?.toLowerCase().includes(term) ||
        billing?.patientName.toLowerCase().includes(term) ||
        record.medicalRecordId.toLowerCase().includes(term) ||
        record.method.toLowerCase().includes(term)
      );
    });
  }, [billingMap, historySearchTerm, patientMap, paymentRecords]);
  const outstandingPagination = useDataPagination(filteredOutstanding);
  const paymentPagination = useDataPagination(filteredPayments);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayPayments = paymentRecords.filter(p => p.paidAt.startsWith(today));
    const totalRevenueToday = todayPayments.reduce((sum, p) => sum + p.amount, 0);
    return {
      outstandingCount: outstandingBillings.length,
      outstandingAmount: outstandingBillings.reduce((sum, billing) => sum + Math.max(0, billing.total - billing.paidAmount), 0),
      paidTodayCount: todayPayments.length,
      paidTodayAmount: totalRevenueToday,
    };
  }, [outstandingBillings, paymentRecords]);

  const handleOpenPayDialog = (billing: BillingRecord) => {
    setSelectedBilling(billing);
    setAmountPaid(Math.max(0, billing.total - billing.paidAmount));
    setPaymentMethod("tunai");
    setIsPayDialogOpen(true);
  };

  useEffect(() => {
    if (!medicalRecordIdParam || autoOpenedRecordId.current === medicalRecordIdParam) return;
    const billing = billingRecords.find((record) => record.medicalRecordId === medicalRecordIdParam);
    if (billing) {
      autoOpenedRecordId.current = medicalRecordIdParam;
      handleOpenPayDialog(billing);
    }
  }, [medicalRecordIdParam, billingRecords]);

  const handleProcessPayment = async () => {
    if (!selectedBilling) return;
    const remainingAmount = Math.max(0, selectedBilling.total - selectedBilling.paidAmount)
    const appliedAmount = Math.min(amountPaid, remainingAmount)
    if (appliedAmount <= 0) {
      toast({
        title: "Jumlah Tidak Valid",
        description: "Masukkan jumlah pembayaran lebih dari nol.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await createPayment({
        patientId: selectedBilling.patientId,
        medicalRecordId: selectedBilling.medicalRecordId,
        amount: appliedAmount,
        method: paymentMethod,
        notes: `Pembayaran tagihan ${selectedBilling.id}${amountPaid > remainingAmount ? `, diterima ${formatCurrency(amountPaid)}, kembalian ${formatCurrency(amountPaid - remainingAmount)}` : ""}`,
        paidAt: new Date().toISOString(),
      });
      toast({
        title: "Pembayaran Berhasil",
        description: `Pembayaran untuk ${selectedBilling.patientName} telah dicatat.`,
      });
      await refetchBillings();
      await refetchPayments();
      setIsPayDialogOpen(false);
      setSelectedBilling(null);
    } catch (error) {
      console.error("Gagal memproses pembayaran", error);
      toast({
        title: "Gagal Memproses Pembayaran",
        description: "Pembayaran belum dapat dicatat. Periksa kembali data lalu coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = patientsLoading || billingsLoading || paymentsLoading;
  const combinedError = patientsError || billingsError || paymentsError;
  const handleRetry = () => {
    if (patientsError) refetchPatients();
    if (billingsError) refetchBillings();
    if (paymentsError) refetchPayments();
  };
  const selectedRemaining = selectedBilling ? Math.max(0, selectedBilling.total - selectedBilling.paidAmount) : 0;
  const selectedChange = selectedBilling ? Math.max(0, amountPaid - selectedRemaining) : 0;
  const selectedReceiptBilling = selectedReceipt ? billingMap.get(selectedReceipt.medicalRecordId) : null;
  const selectedReceiptPatient = selectedReceipt ? patientMap.get(selectedReceipt.patientId) : null;

  if (isLoading) return <DataLoading message="Memuat data pembayaran..." />;
  if (combinedError) return <DataError error={combinedError} onRetry={handleRetry} />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Modul Pembayaran & Kasir</h1>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Tagihan Terbuka</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.outstandingCount}</div><p className="text-xs text-muted-foreground">{formatCurrency(stats.outstandingAmount)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Transaksi Hari Ini</CardTitle><CheckCircle className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.paidTodayCount}</div><p className="text-xs text-muted-foreground">{formatCurrency(stats.paidTodayAmount)}</p></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="outstanding">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="outstanding"><CircleDollarSign className="mr-2 h-4 w-4" />Tagihan Belum Lunas</TabsTrigger>
          <TabsTrigger value="history"><History className="mr-2 h-4 w-4" />Riwayat Transaksi</TabsTrigger>
        </TabsList>

        <TabsContent value="outstanding" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Cari pasien atau No. RM..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); outstandingPagination.resetPage(); }} className="pl-9" /></div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Pasien</TableHead><TableHead>Status</TableHead><TableHead>Rincian</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Terbayar</TableHead><TableHead className="text-right">Sisa</TableHead><TableHead className="text-center">Aksi</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredOutstanding.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8">Tidak ada tagihan terbuka.</TableCell></TableRow>
                  ) : (
                    outstandingPagination.paginatedItems.map(billing => (
                      <TableRow key={billing.id}>
                        <TableCell><div><p className="font-medium">{billing.patientName}</p><p className="text-xs text-muted-foreground">No. RM: {patientMap.get(billing.patientId)?.noRM}</p></div></TableCell>
                        <TableCell><Badge variant="outline">{BILLING_STATUS_LABELS[billing.status]}</Badge></TableCell>
                        <TableCell>
                          <div className="text-sm">Rekam medis {billing.medicalRecordId}</div>
                          <div className="text-xs text-muted-foreground">
                            Layanan {formatCurrency(billing.serviceCost)} · Obat {formatCurrency(billing.medicineCost)} · Lab {formatCurrency(billing.labCost)} · Ranap {formatCurrency(billing.inpatientCost)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(billing.total)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(billing.paidAmount)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(Math.max(0, billing.total - billing.paidAmount))}</TableCell>
                        <TableCell className="text-center"><Button size="sm" onClick={() => handleOpenPayDialog(billing)}>Bayar</Button></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <DataPagination page={outstandingPagination.page} totalItems={outstandingPagination.totalItems} totalPages={outstandingPagination.totalPages} onPageChange={outstandingPagination.setPage} itemLabel="tagihan" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Cari pasien, No. RM, rekam medis, atau metode..." value={historySearchTerm} onChange={(e) => { setHistorySearchTerm(e.target.value); paymentPagination.resetPage(); }} className="pl-9" /></div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Pasien</TableHead><TableHead>Rekam Medis</TableHead><TableHead>Tanggal Bayar</TableHead><TableHead>Metode</TableHead><TableHead className="text-right">Jumlah</TableHead><TableHead className="text-center">Kuitansi</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8">Belum ada riwayat transaksi.</TableCell></TableRow>
                  ) : (
                    paymentPagination.paginatedItems.map(record => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="font-medium">{patientMap.get(record.patientId)?.name ?? billingMap.get(record.medicalRecordId)?.patientName ?? "Pasien Dihapus"}</div>
                          <div className="text-xs text-muted-foreground">No. RM: {patientMap.get(record.patientId)?.noRM ?? "-"}</div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{record.medicalRecordId}</TableCell>
                        <TableCell>{formatDateTime(record.paidAt)}</TableCell>
                        <TableCell><Badge variant="outline">{PAYMENT_METHOD_LABELS.get(record.method) ?? record.method}</Badge></TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(record.amount)}</TableCell>
                        <TableCell className="text-center">
                          <Button size="sm" variant="outline" onClick={() => setSelectedReceipt(record)}>
                            <ReceiptText className="h-4 w-4" />
                            Lihat
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <DataPagination page={paymentPagination.page} totalItems={paymentPagination.totalItems} totalPages={paymentPagination.totalPages} onPageChange={paymentPagination.setPage} itemLabel="transaksi" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proses Pembayaran</DialogTitle>
            <DialogDescription>
              Catat pembayaran untuk pasien <span className="font-semibold">{selectedBilling?.patientName}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Total Tagihan</Label>
                <Input value={formatCurrency(selectedBilling?.total ?? 0)} disabled />
              </div>
              <div className="space-y-2">
                <Label>Sudah Dibayar</Label>
                <Input value={formatCurrency(selectedBilling?.paidAmount ?? 0)} disabled />
              </div>
              <div className="space-y-2">
                <Label>Sisa Tagihan</Label>
                <Input value={formatCurrency(selectedRemaining)} disabled />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment-method">Metode Pembayaran</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                  <SelectTrigger id="payment-method"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(method => <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount-paid">Jumlah Dibayar</Label>
                <Input id="amount-paid" type="number" value={amountPaid} onChange={(e) => setAmountPaid(Number(e.target.value))} />
              </div>
            </div>
            {selectedChange > 0 && (
              <Alert>
                <Banknote className="h-4 w-4" />
                <AlertTitle>Kembalian</AlertTitle>
                <AlertDescription className="font-semibold text-lg">{formatCurrency(selectedChange)}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPayDialogOpen(false)}>Batal</Button>
            <Button onClick={handleProcessPayment} disabled={isSubmitting}>
              {isSubmitting ? "Memproses..." : "Konfirmasi Pembayaran"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedReceipt)} onOpenChange={(open) => !open && setSelectedReceipt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kuitansi Pembayaran</DialogTitle>
            <DialogDescription>Ringkasan transaksi kasir yang sudah tercatat.</DialogDescription>
          </DialogHeader>
          {selectedReceipt ? (
            <div className="space-y-4 py-2">
              <div className="rounded-md border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nomor Transaksi</p>
                    <p className="font-mono text-sm font-medium">{selectedReceipt.id}</p>
                  </div>
                  <Badge variant="outline">{PAYMENT_METHOD_LABELS.get(selectedReceipt.method) ?? selectedReceipt.method}</Badge>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Pasien</p>
                  <p className="font-medium">{selectedReceiptPatient?.name ?? selectedReceiptBilling?.patientName ?? "Pasien Dihapus"}</p>
                  <p className="text-xs text-muted-foreground">No. RM: {selectedReceiptPatient?.noRM ?? "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Bayar</p>
                  <p className="font-medium">{formatDateTime(selectedReceipt.paidAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rekam Medis</p>
                  <p className="font-mono text-sm font-medium">{selectedReceipt.medicalRecordId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status Tagihan</p>
                  <p className="font-medium">{selectedReceiptBilling ? BILLING_STATUS_LABELS[selectedReceiptBilling.status] : "-"}</p>
                </div>
              </div>
              <div className="rounded-md border">
                <div className="flex items-center justify-between border-b px-4 py-3 text-sm">
                  <span>Total Tagihan</span>
                  <span className="font-medium">{formatCurrency(selectedReceiptBilling?.total ?? selectedReceipt.amount)}</span>
                </div>
                <div className="flex items-center justify-between border-b px-4 py-3 text-sm">
                  <span>Total Terbayar</span>
                  <span className="font-medium">{formatCurrency(selectedReceiptBilling?.paidAmount ?? selectedReceipt.amount)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <span>Pembayaran Ini</span>
                  <span className="text-lg font-semibold">{formatCurrency(selectedReceipt.amount)}</span>
                </div>
              </div>
              {selectedReceipt.notes ? (
                <div>
                  <p className="text-sm text-muted-foreground">Catatan</p>
                  <p className="text-sm">{selectedReceipt.notes}</p>
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReceipt(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
