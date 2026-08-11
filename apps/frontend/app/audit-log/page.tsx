"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataPagination, useDataPagination } from "@/components/data-pagination";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataError, DataLoading, useClinicData } from "@/hooks/use-clinic-data";
import type { AuditLog } from "@/lib/auth-types";
import { COLLECTION_LABELS } from "@/lib/collection-labels";
import { Eye, History, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";

const ALL_OPTION = "semua";

const ACTION_LABELS: Record<AuditLog["action"], string> = {
  create: "Tambah",
  update: "Ubah",
  delete: "Hapus",
  lock: "Kunci",
  "status-change": "Ubah Status",
};

const ACTION_BADGE_CLASSES: Record<AuditLog["action"], string> = {
  create: "bg-emerald-500/10 text-emerald-700",
  update: "bg-sky-500/10 text-sky-700",
  delete: "bg-red-500/10 text-red-700",
  lock: "bg-amber-500/10 text-amber-700",
  "status-change": "bg-violet-500/10 text-violet-700",
};

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

function toReadableJson(value: unknown) {
  if (value === undefined || value === null) return "-";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * Mengumpulkan field yang benar-benar berubah antara snapshot `before` dan `after`
 * supaya reviewer tidak perlu membandingkan dua blok JSON utuh secara manual.
 * Hanya berlaku bila keduanya berupa objek biasa (kasus `update`/`status-change`).
 */
function diffFields(before: unknown, after: unknown) {
  const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

  if (!isPlainObject(before) || !isPlainObject(after)) return [];

  return Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
    .map((key) => ({ key, before: before[key], after: after[key] }))
    .filter(({ before: prev, after: next }) => JSON.stringify(prev) !== JSON.stringify(next));
}

export default function AuditLogPage() {
  const { data: auditLogs = [], loading, error, refetch } = useClinicData<AuditLog>("audit-logs");

  const [searchQuery, setSearchQuery] = useState("");
  const [collectionFilter, setCollectionFilter] = useState(ALL_OPTION);
  const [actionFilter, setActionFilter] = useState(ALL_OPTION);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const availableCollections = useMemo(
    () =>
      Array.from(new Set(auditLogs.map((log) => log.collection))).sort((a, b) =>
        (COLLECTION_LABELS[a] ?? a).localeCompare(COLLECTION_LABELS[b] ?? b, "id-ID")
      ),
    [auditLogs]
  );

  const displayedLogs = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    return auditLogs
      .filter((log) => (collectionFilter === ALL_OPTION ? true : log.collection === collectionFilter))
      .filter((log) => (actionFilter === ALL_OPTION ? true : log.action === actionFilter))
      .filter((log) => {
        if (!keyword) return true;
        return [log.username, log.role, log.itemId, log.reason, COLLECTION_LABELS[log.collection] ?? log.collection]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(keyword));
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [auditLogs, collectionFilter, actionFilter, searchQuery]);
  const auditPagination = useDataPagination(displayedLogs);

  const changedFields = useMemo(
    () => (selectedLog ? diffFields(selectedLog.before, selectedLog.after) : []),
    [selectedLog]
  );

  if (loading) return <DataLoading message="Memuat riwayat aktivitas..." />;
  if (error) return <DataError error={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <History className="h-6 w-6 text-primary" />
            Riwayat Aktivitas
          </h1>
          <p className="text-muted-foreground">
            Riwayat setiap perubahan data yang tercatat sistem, lengkap dengan pelaku dan nilai sebelum/sesudah.
          </p>
        </div>
        <Button variant="outline" onClick={() => void refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Muat ulang
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Aktivitas</CardTitle>
          <CardDescription>
            {displayedLogs.length === auditLogs.length
              ? `Total ${auditLogs.length} aktivitas tercatat.`
              : `Menampilkan ${displayedLogs.length} dari ${auditLogs.length} aktivitas.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="audit-search">Cari</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="audit-search"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    auditPagination.resetPage();
                  }}
                  placeholder="Nama pengguna, ID data, atau alasan..."
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="audit-collection">Modul Data</Label>
              <Select value={collectionFilter} onValueChange={(value) => {
                setCollectionFilter(value);
                auditPagination.resetPage();
              }}>
                <SelectTrigger id="audit-collection">
                  <SelectValue placeholder="Semua modul" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value={ALL_OPTION}>Semua modul</SelectItem>
                  {availableCollections.map((collection) => (
                    <SelectItem key={collection} value={collection}>
                      {COLLECTION_LABELS[collection] ?? collection}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="audit-action">Jenis Aksi</Label>
              <Select value={actionFilter} onValueChange={(value) => {
                setActionFilter(value);
                auditPagination.resetPage();
              }}>
                <SelectTrigger id="audit-action">
                  <SelectValue placeholder="Semua aksi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_OPTION}>Semua aksi</SelectItem>
                  {(Object.keys(ACTION_LABELS) as AuditLog["action"][]).map((action) => (
                    <SelectItem key={action} value={action}>
                      {ACTION_LABELS[action]}
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
                  <TableHead>Pengguna</TableHead>
                  <TableHead>Aksi</TableHead>
                  <TableHead>Modul Data</TableHead>
                  <TableHead>ID Data</TableHead>
                  <TableHead>Alasan</TableHead>
                  <TableHead className="text-right">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      {auditLogs.length === 0
                        ? "Belum ada aktivitas yang tercatat."
                        : "Tidak ada aktivitas yang cocok dengan filter."}
                    </TableCell>
                  </TableRow>
                ) : (
                  auditPagination.paginatedItems.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">{formatTimestamp(log.createdAt)}</TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{log.username ?? "Sistem"}</div>
                        <div className="text-xs capitalize text-muted-foreground">{log.role ?? "-"}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={ACTION_BADGE_CLASSES[log.action]}>
                          {ACTION_LABELS[log.action] ?? log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>{COLLECTION_LABELS[log.collection] ?? log.collection}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{log.itemId}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.reason ?? "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedLog(log)}
                          aria-label="Lihat detail perubahan"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DataPagination page={auditPagination.page} totalItems={auditPagination.totalItems} totalPages={auditPagination.totalPages} onPageChange={auditPagination.setPage} itemLabel="aktivitas" />
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detail Perubahan</DialogTitle>
            <DialogDescription>
              {selectedLog
                ? `${ACTION_LABELS[selectedLog.action] ?? selectedLog.action} pada ${
                    COLLECTION_LABELS[selectedLog.collection] ?? selectedLog.collection
                  } oleh ${selectedLog.username ?? "Sistem"} - ${formatTimestamp(selectedLog.createdAt)}`
                : null}
            </DialogDescription>
          </DialogHeader>

          {selectedLog ? (
            <div className="max-h-[60vh] space-y-4 overflow-y-auto">
              {changedFields.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Field yang berubah</p>
                  <div className="overflow-x-auto rounded-md border">
                    <Table className="text-[13px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Field</TableHead>
                          <TableHead>Sebelum</TableHead>
                          <TableHead>Sesudah</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {changedFields.map((field) => (
                          <TableRow key={field.key}>
                            <TableCell className="font-medium">{field.key}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {toReadableJson(field.before)}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-foreground">
                              {toReadableJson(field.after)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sebelum</p>
                  <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
                    {toReadableJson(selectedLog.before)}
                  </pre>
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sesudah</p>
                  <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
                    {toReadableJson(selectedLog.after)}
                  </pre>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
