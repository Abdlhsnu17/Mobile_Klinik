"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Activity, ChartBar, Download, Stethoscope, Wallet } from "lucide-react"
import { getFinancialReport, getMorbidityReport, getProfitLossReport, getReferralReport, getVisitReport } from "@/lib/clinic-utils"
import type { FinancialSummary, MorbidityEntry, ReferralStats, VisitCounts } from "@/lib/api-client"
import type { ProfitLossReport } from "@/lib/auth-types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { buildApiBaseUrl } from "@/lib/api-base"
import { downloadWithAuth } from "@/lib/download-with-auth"
import { useToast } from "@/hooks/use-toast"

const API_BASE = buildApiBaseUrl(process.env.NEXT_PUBLIC_API_URL)

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  tunai: "Tunai",
  qris: "QRIS",
  "transfer-himbara": "Transfer Bank",
  "asuransi-swasta": "Asuransi Swasta",
  "asuransi-bumn": "Asuransi BUMN",
  "asuransi-syariah": "Asuransi Syariah",
  bpjs: "BPJS",
}

function formatCurrency(amount: number) {
  return `Rp ${amount.toLocaleString("id-ID")}`
}

function DownloadButton({ href, filename, label }: { href: string; filename: string; label: string }) {
  const { toast } = useToast()
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() =>
        downloadWithAuth(href, filename).catch((error) =>
          toast({
            title: "Gagal mengunduh berkas",
            description: error instanceof Error ? error.message : undefined,
            variant: "destructive",
          })
        )
      }
    >
      <Download className="h-4 w-4 mr-2" />
      {label}
    </Button>
  )
}

// Tombol unduh PDF + CSV untuk sebuah laporan. `base` tanpa akhiran /pdf atau /csv.
function ReportDownloads({ base, name }: { base: string; name: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <DownloadButton href={`${base}/pdf`} filename={`${name}.pdf`} label="PDF" />
      <DownloadButton href={`${base}/csv`} filename={`${name}.csv`} label="CSV" />
    </div>
  )
}

export default function LaporanPage() {
  const [morbidity, setMorbidity] = useState<MorbidityEntry[]>([])
  const [visitCounts, setVisitCounts] = useState<VisitCounts | null>(null)
  const [financial, setFinancial] = useState<FinancialSummary | null>(null)
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null)
  const [profitLoss, setProfitLoss] = useState<ProfitLossReport | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [morbidityData, visits, finance, referrals, pl] = await Promise.all([
          getMorbidityReport(),
          getVisitReport(),
          getFinancialReport(),
          getReferralReport(),
          getProfitLossReport(),
        ])
        setMorbidity(morbidityData)
        setVisitCounts(visits)
        setFinancial(finance)
        setReferralStats(referrals)
        setProfitLoss(pl)
        setLoadError(null)
      } catch (error) {
        console.error("Gagal memuat laporan", error)
        const message = error instanceof Error ? error.message : "Gagal memuat laporan"
        setLoadError(message)
      }
    }
    void load()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Laporan & Analitik</h1>
        <p className="text-sm text-muted-foreground">
          Pantau ringkasan, laporan klinis, kinerja, dan pendapatan klinik.
        </p>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <AlertTitle>Gagal memuat laporan</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="ringkasan" className="gap-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger
            value="ringkasan"          >
            <ChartBar className="h-4 w-4" />
            Ringkasan
          </TabsTrigger>
          <TabsTrigger
            value="klinis"          >
            <Stethoscope className="h-4 w-4" />
            Klinis
          </TabsTrigger>
          <TabsTrigger
            value="kinerja"          >
            <Activity className="h-4 w-4" />
            Kinerja
          </TabsTrigger>
          <TabsTrigger
            value="pendapatan"          >
            <Wallet className="h-4 w-4" />
            Pendapatan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ringkasan" className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Pasien Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{visitCounts?.daily ?? "-"}</p>
            <CardDescription>Harian</CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pasien Bulanan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{visitCounts?.monthly ?? "-"}</p>
            <CardDescription>Sejak awal bulan</CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pendapatan Tahun Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {formatCurrency(financial?.totalRevenue ?? 0)}
            </p>
            <CardDescription>Termasuk klaim & tunai</CardDescription>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Laba Rugi (Cash-Basis)</CardTitle>
            <CardDescription>Pendapatan pembayaran dikurangi pengeluaran operasional</CardDescription>
          </div>
          <ReportDownloads base={`${API_BASE}/reports/laba-rugi`} name="laporan-laba-rugi" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Pendapatan</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(profitLoss?.totalRevenue ?? 0)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(profitLoss?.totalExpenses ?? 0)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Laba Bersih</p>
              <p className={`text-2xl font-bold ${(profitLoss?.netProfit ?? 0) >= 0 ? "text-foreground" : "text-destructive"}`}>{formatCurrency(profitLoss?.netProfit ?? 0)}</p>
            </div>
          </div>
          {profitLoss && profitLoss.expensesByCategory.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-muted-foreground">Rincian Pengeluaran</p>
              <div className="flex flex-wrap gap-2">
                {profitLoss.expensesByCategory.map((entry) => (
                  <span key={entry.category} className="rounded-full border px-3 py-1 text-sm">
                    {entry.category}: <strong>{formatCurrency(entry.total)}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="klinis" className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Top Morbiditas</CardTitle>
            <CardDescription>10 penyakit terbanyak berdasarkan rekam medis</CardDescription>
          </div>
          <ReportDownloads base={`${API_BASE}/reports/morbiditas`} name="laporan-morbiditas" />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Penyakit</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {morbidity.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-8">
                      Data belum tersedia
                    </TableCell>
                  </TableRow>
                ) : (
                  morbidity.map((item) => (
                    <TableRow key={item.diagnosis}>
                      <TableCell>{item.diagnosis}</TableCell>
                      <TableCell className="text-right">{item.occurrences}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Laporan Rujukan</CardTitle>
            <CardDescription>Jumlah dan jenis rujukan masuk/keluar</CardDescription>
          </div>
          <ReportDownloads base={`${API_BASE}/reports/rujukan`} name="laporan-rujukan" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Total: {referralStats?.total ?? 0}</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referralStats?.byStatus?.length ? (
                    referralStats.byStatus.map((entry) => (
                      <TableRow key={entry.status}>
                        <TableCell>{entry.status}</TableCell>
                        <TableCell className="text-right">{entry.total}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-4">Data belum tersedia</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Berdasarkan Fasilitas</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fasilitas</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referralStats?.byFacility?.length ? (
                    referralStats.byFacility.map((entry) => (
                      <TableRow key={entry.facilityName}>
                        <TableCell>{entry.facilityName}</TableCell>
                        <TableCell className="text-right">{entry.total}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-4">Data belum tersedia</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="kinerja">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Rekap Kunjungan</CardTitle>
              <CardDescription>Tren 6 bulan terakhir</CardDescription>
            </div>
            <ReportDownloads base={`${API_BASE}/reports/kunjungan`} name="laporan-kunjungan" />
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {visitCounts ? (
                visitCounts.monthlyTrend.map((entry) => (
                  <li key={entry.label} className="flex justify-between">
                    <span>{entry.label}</span>
                    <span className="font-semibold">{entry.count}</span>
                  </li>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Belum ada data</p>
              )}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Performa Dokter</CardTitle>
              <CardDescription>Perhitungan pendapatan</CardDescription>
            </div>
            <ReportDownloads base={`${API_BASE}/reports/keuangan`} name="laporan-keuangan" />
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dokter</TableHead>
                    <TableHead className="text-right">Pendapatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {financial?.byDoctor?.length ? (
                  financial.byDoctor.map((entry) => (
                    <TableRow key={entry.doctorId}>
                      <TableCell>{entry.doctorName}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(entry.revenue)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-4">
                      Data tidak tersedia
                    </TableCell>
                  </TableRow>
                )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="pendapatan">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Pendapatan Layanan</CardTitle>
            <CardDescription>Alokasi pendapatan sesuai harga layanan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Layanan</TableHead>
                    <TableHead className="text-right">Pendapatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financial?.byService?.length ? (
                    financial.byService.map((entry) => (
                      <TableRow key={entry.serviceId}>
                        <TableCell>{entry.serviceName}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(entry.revenue)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-4">
                        Belum ada data layanan
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metode Pembayaran</CardTitle>
            <CardDescription>Distribusi pendapatan berdasarkan kanal bayar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metode</TableHead>
                    <TableHead className="text-right">Pendapatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financial?.byMethod?.length ? (
                    financial.byMethod.map((entry) => (
                      <TableRow key={entry.method}>
                        <TableCell>{PAYMENT_METHOD_LABELS[entry.method] ?? entry.method}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(entry.revenue)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-4">
                        Belum ada data keuangan
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
