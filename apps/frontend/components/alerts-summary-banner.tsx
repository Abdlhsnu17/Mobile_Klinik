"use client"

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import type { OperationalAlertsResponse } from "@/lib/auth-types";
import { AlertTriangle, ArrowRight, CalendarClock, PackageX, Wrench } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Ringkasan peringatan operasional untuk dashboard. Menarik data sendiri dan
 * menyembunyikan diri bila tidak ada peringatan atau pengguna tak berhak (403).
 */
export function AlertsSummaryBanner() {
  const [data, setData] = useState<OperationalAlertsResponse | null>(null);

  useEffect(() => {
    let active = true;
    apiClient
      .getOperationalAlerts()
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        // Diamkan: pengguna tanpa akses (umum) atau kegagalan jaringan — banner cukup disembunyikan.
      });
    return () => {
      active = false;
    };
  }, []);

  if (!data || data.summary.total === 0) return null;

  const { summary } = data;
  const items = [
    { label: "Stok menipis", count: summary.byCategory["stok-menipis"], icon: PackageX },
    { label: "Obat kedaluwarsa", count: summary.byCategory["obat-kadaluarsa"], icon: CalendarClock },
    { label: "Maintenance alat", count: summary.byCategory["maintenance-alat"], icon: Wrench },
  ].filter((item) => item.count > 0);

  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold text-foreground">
              {summary.total} peringatan operasional
              {summary.critical > 0 && <span className="text-destructive"> · {summary.critical} kritis</span>}
            </p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <span key={item.label} className="flex items-center gap-1">
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}: <strong className="text-foreground">{item.count}</strong>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href="/peringatan">
            Lihat semua
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
