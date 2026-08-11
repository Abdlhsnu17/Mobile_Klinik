"use client"

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataPagination, useDataPagination } from "@/components/data-pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";
import type { AlertCategory, OperationalAlert, OperationalAlertsResponse } from "@/lib/auth-types";
import { AlertTriangle, CalendarClock, PackageX, RefreshCw, Wrench } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const CATEGORY_META: Record<AlertCategory, { label: string; icon: typeof PackageX; href: string }> = {
  "stok-menipis": { label: "Stok Menipis", icon: PackageX, href: "/farmasi" },
  "obat-kadaluarsa": { label: "Obat Kedaluwarsa", icon: CalendarClock, href: "/kartu-stok" },
  "maintenance-alat": { label: "Maintenance Alat", icon: Wrench, href: "/alat-medis" },
};

function AlertTable({ alerts }: { alerts: OperationalAlert[] }) {
  const alertPagination = useDataPagination(alerts);

  if (alerts.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada peringatan pada kategori ini. 🎉</p>;
  }
  return (
    <div className="space-y-3">
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">Prioritas</TableHead>
            <TableHead>Peringatan</TableHead>
            <TableHead>Detail</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alertPagination.paginatedItems.map((alert) => {
            const meta = CATEGORY_META[alert.category];
            return (
              <TableRow key={alert.id}>
                <TableCell>
                  <Badge variant={alert.severity === "critical" ? "destructive" : "secondary"}>
                    {alert.severity === "critical" ? "Kritis" : "Perhatian"}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{alert.title}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{alert.detail}</TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={meta.href}>Tindak lanjut</Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
    <DataPagination page={alertPagination.page} totalItems={alertPagination.totalItems} totalPages={alertPagination.totalPages} onPageChange={alertPagination.setPage} itemLabel="peringatan" />
    </div>
  );
}

export default function PeringatanPage() {
  const { toast } = useToast();
  const [data, setData] = useState<OperationalAlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await apiClient.getOperationalAlerts();
      setData(result);
    } catch (error) {
      toast({
        title: "Gagal memuat peringatan",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = data?.summary;
  const alerts = data?.alerts ?? [];
  const byCategory = (category: AlertCategory) => alerts.filter((alert) => alert.category === category);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Otomatisasi</p>
          <h1 className="text-3xl font-bold text-foreground">Pusat Peringatan</h1>
          <p className="text-sm text-muted-foreground">
            Deteksi dini stok menipis, obat kedaluwarsa, dan jadwal maintenance alat medis.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={() => {
            setRefreshing(true);
            load();
          }}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Perbarui
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Peringatan</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{loading ? "…" : summary?.total ?? 0}</p></CardContent>
        </Card>
        <Card className="border-destructive/40">
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="h-4 w-4 text-destructive" />Kritis</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-destructive">{loading ? "…" : summary?.critical ?? 0}</p></CardContent>
        </Card>
        {(["stok-menipis", "obat-kadaluarsa"] as AlertCategory[]).map((category) => {
          const meta = CATEGORY_META[category];
          const Icon = meta.icon;
          return (
            <Card key={category}>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="h-4 w-4" />{meta.label}</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold">{loading ? "…" : summary?.byCategory[category] ?? 0}</p></CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle>Daftar Peringatan</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Memuat peringatan…</p>
          ) : (
            <Tabs defaultValue="semua">
              <TabsList className="mb-4 flex flex-wrap">
                <TabsTrigger value="semua">Semua ({alerts.length})</TabsTrigger>
                <TabsTrigger value="stok-menipis">{CATEGORY_META["stok-menipis"].label} ({byCategory("stok-menipis").length})</TabsTrigger>
                <TabsTrigger value="obat-kadaluarsa">{CATEGORY_META["obat-kadaluarsa"].label} ({byCategory("obat-kadaluarsa").length})</TabsTrigger>
                <TabsTrigger value="maintenance-alat">{CATEGORY_META["maintenance-alat"].label} ({byCategory("maintenance-alat").length})</TabsTrigger>
              </TabsList>
              <TabsContent value="semua"><AlertTable alerts={alerts} /></TabsContent>
              <TabsContent value="stok-menipis"><AlertTable alerts={byCategory("stok-menipis")} /></TabsContent>
              <TabsContent value="obat-kadaluarsa"><AlertTable alerts={byCategory("obat-kadaluarsa")} /></TabsContent>
              <TabsContent value="maintenance-alat"><AlertTable alerts={byCategory("maintenance-alat")} /></TabsContent>
            </Tabs>
          )}
          {data && (
            <p className="mt-4 text-xs text-muted-foreground">
              Ambang: kedaluwarsa ≤ {data.thresholds.expiryDays} hari · maintenance ≤ {data.thresholds.maintenanceDays} hari ·
              diperbarui {new Date(data.generatedAt).toLocaleString("id-ID")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
