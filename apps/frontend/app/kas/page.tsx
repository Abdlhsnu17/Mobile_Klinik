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
import { apiClient } from "@/lib/api-client";
import type { CashierClosing, CashierDailySummary, Expense, ExpenseCategory } from "@/lib/auth-types";
import { getCurrentUser } from "@/lib/auth-utils";
import { closeCashier, deleteExpense, saveExpense } from "@/lib/clinic-utils";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "gaji", label: "Gaji & Honor" },
  { value: "sewa", label: "Sewa" },
  { value: "utilitas", label: "Utilitas (listrik/air/internet)" },
  { value: "pembelian-obat", label: "Pembelian Obat" },
  { value: "operasional", label: "Operasional" },
  { value: "pemeliharaan", label: "Pemeliharaan" },
  { value: "lainnya", label: "Lainnya" },
];

const CATEGORY_LABEL = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.value, c.label])) as Record<ExpenseCategory, string>;

function formatCurrency(amount: number) {
  return `Rp ${Number(amount || 0).toLocaleString("id-ID")}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const emptyExpense: Partial<Expense> = { date: "", category: "operasional", description: "", amount: 0, paymentMethod: "tunai" };

export default function KasPage() {
  const { data: expenses = [], loading: expensesLoading, error: expensesError, refetch: refetchExpenses } = useClinicData<Expense>("expenses");
  const { data: closings = [], loading: closingsLoading, error: closingsError, refetch: refetchClosings } = useClinicData<CashierClosing>("cashier-closings");
  const { toast } = useToast();

  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseForm, setExpenseForm] = useState<Partial<Expense>>(emptyExpense);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Tutup kasir
  const [closingDate, setClosingDate] = useState(today());
  const [openingBalance, setOpeningBalance] = useState(0);
  const [countedCash, setCountedCash] = useState(0);
  const [closingNotes, setClosingNotes] = useState("");
  const [summary, setSummary] = useState<CashierDailySummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setSummaryLoading(true);
    apiClient
      .getCashierSummary(closingDate)
      .then((result) => active && setSummary(result))
      .catch(() => active && setSummary(null))
      .finally(() => active && setSummaryLoading(false));
    return () => { active = false; };
  }, [closingDate]);

  const expectedCash = useMemo(
    () => Number(openingBalance || 0) + (summary?.systemCashTotal ?? 0) - (summary?.cashExpenseTotal ?? 0),
    [openingBalance, summary],
  );
  const difference = Number(countedCash || 0) - expectedCash;

  const openExpenseDialog = (expense?: Expense) => {
    setEditingExpense(expense ?? null);
    setExpenseForm(expense ?? { ...emptyExpense, date: today() });
    setExpenseDialogOpen(true);
  };

  const handleSaveExpense = async () => {
    if (!expenseForm.description?.trim() || !expenseForm.amount || Number(expenseForm.amount) <= 0 || !expenseForm.date) {
      toast({ title: "Data belum lengkap", description: "Tanggal, deskripsi, dan nominal (>0) wajib diisi.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await saveExpense(editingExpense?.id ? { ...expenseForm, id: editingExpense.id } : { ...expenseForm, recordedBy: getCurrentUser()?.name });
      toast({ title: `Pengeluaran ${editingExpense ? "diperbarui" : "dicatat"}` });
      await refetchExpenses();
      setExpenseDialogOpen(false);
    } catch (err) {
      toast({ title: "Gagal menyimpan", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!deletingExpense) return;
    try {
      await deleteExpense(deletingExpense.id);
      toast({ title: "Pengeluaran dihapus" });
      await refetchExpenses();
    } catch (err) {
      toast({ title: "Gagal menghapus", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setDeletingExpense(null);
    }
  };

  const handleCloseCashier = async () => {
    setSubmitting(true);
    try {
      await closeCashier({
        closingDate,
        cashierName: getCurrentUser()?.name ?? "Kasir",
        openingBalance: Number(openingBalance) || 0,
        countedCashTotal: Number(countedCash) || 0,
        notes: closingNotes || undefined,
      });
      toast({ title: "Kas ditutup", description: `Selisih ${formatCurrency(difference)}.` });
      setCountedCash(0);
      setClosingNotes("");
      await refetchClosings();
    } catch (err) {
      toast({ title: "Gagal menutup kas", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + Number(e.amount ?? 0), 0), [expenses]);
  const sortedExpenses = useMemo(() => [...expenses].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")), [expenses]);
  const sortedClosings = useMemo(() => [...closings].sort((a, b) => (b.closingDate ?? "").localeCompare(a.closingDate ?? "")), [closings]);
  const expensePagination = useDataPagination(sortedExpenses);
  const closingPagination = useDataPagination(sortedClosings);

  const isLoading = expensesLoading || closingsLoading;
  const combinedError = expensesError || closingsError;
  if (isLoading) return <DataLoading message="Memuat data kas..." />;
  if (combinedError) return <DataError error={combinedError} onRetry={() => { refetchExpenses(); refetchClosings(); }} />;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Keuangan · Kas</p>
        <h1 className="text-3xl font-bold text-foreground">Manajemen Kas</h1>
        <p className="text-sm text-muted-foreground">Catat pengeluaran operasional dan lakukan tutup kas harian.</p>
      </div>

      <Tabs defaultValue="pengeluaran">
        <TabsList className="w-full">
          <TabsTrigger value="pengeluaran">Pengeluaran</TabsTrigger>
          <TabsTrigger value="tutup-kas">Tutup Kasir</TabsTrigger>
        </TabsList>

        {/* ── Pengeluaran ── */}
        <TabsContent value="pengeluaran" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Pengeluaran Operasional</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Total tercatat: {formatCurrency(totalExpenses)}</p>
                </div>
                <Button onClick={() => openExpenseDialog()}><Plus className="mr-2 h-4 w-4" />Catat Pengeluaran</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead>Metode</TableHead>
                      <TableHead className="text-right">Nominal</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Belum ada pengeluaran.</TableCell></TableRow>
                    ) : (
                      expensePagination.paginatedItems.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>{expense.date ? new Date(expense.date).toLocaleDateString("id-ID") : "-"}</TableCell>
                          <TableCell><Badge variant="outline">{CATEGORY_LABEL[expense.category] ?? expense.category}</Badge></TableCell>
                          <TableCell>{expense.description}</TableCell>
                          <TableCell className="capitalize">{expense.paymentMethod}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(expense.amount)}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openExpenseDialog(expense)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeletingExpense(expense)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <DataPagination page={expensePagination.page} totalItems={expensePagination.totalItems} totalPages={expensePagination.totalPages} onPageChange={expensePagination.setPage} itemLabel="pengeluaran" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tutup Kasir ── */}
        <TabsContent value="tutup-kas" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Tutup Kas Harian</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2"><Label>Tanggal</Label><Input type="date" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} /></div>
                <div className="space-y-2"><Label>Saldo Awal (kas kecil)</Label><Input type="number" min={0} value={openingBalance} onChange={(e) => setOpeningBalance(Number(e.target.value))} /></div>
                <div className="space-y-2"><Label>Kas Fisik Dihitung</Label><Input type="number" min={0} value={countedCash} onChange={(e) => setCountedCash(Number(e.target.value))} /></div>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-lg border p-4 sm:grid-cols-4">
                <div><p className="text-xs text-muted-foreground">Tunai Masuk (sistem)</p><p className="text-lg font-semibold">{summaryLoading ? "…" : formatCurrency(summary?.systemCashTotal ?? 0)}</p></div>
                <div><p className="text-xs text-muted-foreground">Tunai Keluar</p><p className="text-lg font-semibold">{summaryLoading ? "…" : formatCurrency(summary?.cashExpenseTotal ?? 0)}</p></div>
                <div><p className="text-xs text-muted-foreground">Kas Seharusnya</p><p className="text-lg font-semibold">{formatCurrency(expectedCash)}</p></div>
                <div>
                  <p className="text-xs text-muted-foreground">Selisih</p>
                  <p className={`text-lg font-semibold ${difference === 0 ? "" : difference > 0 ? "text-emerald-600" : "text-destructive"}`}>{formatCurrency(difference)}</p>
                </div>
              </div>

              <div className="space-y-2"><Label>Catatan</Label><Textarea value={closingNotes} onChange={(e) => setClosingNotes(e.target.value)} placeholder="Opsional — mis. penjelasan selisih" /></div>

              <div className="flex justify-end">
                <Button onClick={handleCloseCashier} disabled={submitting || summaryLoading}>{submitting ? "Memproses..." : "Tutup & Simpan"}</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Riwayat Penutupan</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Kasir</TableHead>
                      <TableHead className="text-right">Kas Seharusnya</TableHead>
                      <TableHead className="text-right">Dihitung</TableHead>
                      <TableHead className="text-right">Selisih</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {closings.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Belum ada penutupan kas.</TableCell></TableRow>
                    ) : (
                      closingPagination.paginatedItems.map((closing) => (
                        <TableRow key={closing.id}>
                          <TableCell>{closing.closingDate ? new Date(closing.closingDate).toLocaleDateString("id-ID") : "-"}</TableCell>
                          <TableCell>{closing.cashierName}</TableCell>
                          <TableCell className="text-right">{formatCurrency(closing.expectedCashTotal)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(closing.countedCashTotal)}</TableCell>
                          <TableCell className={`text-right font-medium ${closing.difference === 0 ? "" : closing.difference > 0 ? "text-emerald-600" : "text-destructive"}`}>{formatCurrency(closing.difference)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <DataPagination page={closingPagination.page} totalItems={closingPagination.totalItems} totalPages={closingPagination.totalPages} onPageChange={closingPagination.setPage} itemLabel="penutupan" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Expense dialog ── */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Edit Pengeluaran" : "Catat Pengeluaran"}</DialogTitle>
            <DialogDescription>Pengeluaran operasional klinik.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-2"><Label>Tanggal</Label><Input type="date" value={expenseForm.date ?? ""} onChange={(e) => setExpenseForm((p) => ({ ...p, date: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Kategori</Label>
              <Select value={expenseForm.category} onValueChange={(v) => setExpenseForm((p) => ({ ...p, category: v as ExpenseCategory }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2"><Label>Deskripsi</Label><Input value={expenseForm.description ?? ""} onChange={(e) => setExpenseForm((p) => ({ ...p, description: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Nominal</Label><Input type="number" min={0} value={expenseForm.amount ?? 0} onChange={(e) => setExpenseForm((p) => ({ ...p, amount: Number(e.target.value) }))} /></div>
            <div className="space-y-2"><Label>Metode</Label>
              <Select value={expenseForm.paymentMethod} onValueChange={(v) => setExpenseForm((p) => ({ ...p, paymentMethod: v as Expense["paymentMethod"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tunai">Tunai</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="qris">QRIS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2"><Label>Catatan</Label><Textarea value={expenseForm.notes ?? ""} onChange={(e) => setExpenseForm((p) => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSaveExpense} disabled={submitting}>{submitting ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingExpense} onOpenChange={(open) => !open && setDeletingExpense(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Pengeluaran</DialogTitle><DialogDescription>Yakin menghapus <strong>{deletingExpense?.description}</strong>?</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setDeletingExpense(null)}>Batal</Button><Button variant="destructive" onClick={handleDeleteExpense}>Hapus</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
