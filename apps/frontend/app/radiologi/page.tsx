"use client";

import { PatientCombobox } from "@/components/patient-combobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataPagination, useDataPagination } from "@/components/data-pagination";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DataError, DataLoading, useClinicData } from "@/hooks/use-clinic-data";
import { useToast } from "@/hooks/use-toast";
import type { Doctor, MedicalRecord, Patient, RadiologyOrder, Service, User } from "@/lib/auth-types";
import { getCurrentUser, hasRole, isAuthenticated } from "@/lib/auth-utils";
import { createErrorDescription, logClientError } from "@/lib/client-error";
import { createRadiologyOrder, updateRadiologyOrder } from "@/lib/clinic-utils";
import { History, Radiation } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type OrderStatus = RadiologyOrder["status"];

const STATUS_LABELS: Record<OrderStatus, string> = {
  requested: "Diminta",
  scheduled: "Dijadwalkan",
  performed: "Selesai Dilakukan",
  reported: "Sudah Dibaca",
  reviewed: "Ditinjau Dokter",
  cancelled: "Dibatalkan",
};

const STATUS_BADGE_CLASSES: Record<OrderStatus, string> = {
  requested: "bg-slate-500/10 text-slate-700",
  scheduled: "bg-sky-500/10 text-sky-700",
  performed: "bg-amber-500/10 text-amber-700",
  reported: "bg-violet-500/10 text-violet-700",
  reviewed: "bg-emerald-500/10 text-emerald-700",
  cancelled: "bg-red-500/10 text-red-700",
};

/**
 * Alur order radiologi. Setiap status hanya boleh maju ke status berikutnya,
 * dan pembatalan hanya mungkin selama pemeriksaan belum dikerjakan.
 * `reported` butuh hasil bacaan, sehingga transisinya lewat dialog terpisah.
 */
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  requested: "scheduled",
  scheduled: "performed",
  performed: "reported",
  reported: "reviewed",
};

const NEXT_STATUS_LABELS: Partial<Record<OrderStatus, string>> = {
  requested: "Jadwalkan",
  scheduled: "Tandai Selesai",
  performed: "Input Hasil Bacaan",
  reported: "Tinjau & Tutup",
};

const CANCELLABLE_STATUSES: OrderStatus[] = ["requested", "scheduled"];
const ACTIVE_STATUSES: OrderStatus[] = ["requested", "scheduled", "performed"];

function formatTimestamp(value?: string) {
  if (!value) return "-";
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

export default function RadiologiPage() {
  const router = useRouter();
  const currentUser = getCurrentUser();

  const { data: patients = [], loading: patientsLoading, error: patientsError, refetch: refetchPatients } =
    useClinicData<Patient>("patients");
  const { data: doctors = [], loading: doctorsLoading, error: doctorsError, refetch: refetchDoctors } =
    useClinicData<Doctor>("doctors");
  const { data: services = [], loading: servicesLoading, error: servicesError, refetch: refetchServices } =
    useClinicData<Service>("services");
  const { data: medicalRecords = [], loading: recordsLoading, error: recordsError, refetch: refetchRecords } =
    useClinicData<MedicalRecord>("medical-records");
  const { data: orders = [], loading: ordersLoading, error: ordersError, refetch: refetchOrders } =
    useClinicData<RadiologyOrder>("radiology-orders");

  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedStudy, setSelectedStudy] = useState("");
  const [priority, setPriority] = useState<RadiologyOrder["priority"]>("routine");
  const [indication, setIndication] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [reportingOrder, setReportingOrder] = useState<RadiologyOrder | null>(null);
  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");

  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    const allowedRoles: User["role"][] = ["admin", "dokter", "perawat", "bidan", "teknis"];
    if (!hasRole(allowedRoles)) {
      router.push("/dashboard");
    }
  }, [router]);

  const radiologyServices = useMemo(
    () => services.filter((service) => service.category === "Radiologi" && service.status === "Aktif"),
    [services]
  );

  const patientRecords = useMemo(
    () =>
      medicalRecords
        .filter((record) => record.patientId === selectedPatientId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [medicalRecords, selectedPatientId]
  );

  const activeOrders = useMemo(
    () =>
      orders
        .filter((order) => ACTIVE_STATUSES.includes(order.status))
        .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()),
    [orders]
  );

  const finishedOrders = useMemo(
    () =>
      orders
        .filter((order) => !ACTIVE_STATUSES.includes(order.status))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [orders]
  );
  const activeOrderPagination = useDataPagination(activeOrders);
  const finishedOrderPagination = useDataPagination(finishedOrders);

  // Order baru selalu menempel ke satu kunjungan, jadi memilih pasien lain
  // membuat rekam medis yang sebelumnya dipilih tidak lagi relevan.
  const handlePatientChange = (patientId: string) => {
    setSelectedPatientId(patientId);
    setSelectedRecordId("");
  };

  const resetOrderForm = () => {
    setSelectedPatientId("");
    setSelectedRecordId("");
    setSelectedDoctorId("");
    setSelectedStudy("");
    setPriority("routine");
    setIndication("");
  };

  const handleCreateOrder = async () => {
    const patient = patients.find((item) => item.id === selectedPatientId);
    const doctor = doctors.find((item) => item.id === selectedDoctorId);

    if (!patient || !selectedRecordId || !doctor || !selectedStudy) {
      toast({
        title: "Data Belum Lengkap",
        description: "Pasien, kunjungan, dokter pengirim, dan jenis pemeriksaan wajib diisi.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      await createRadiologyOrder({
        patientId: patient.id,
        patientName: patient.name,
        medicalRecordId: selectedRecordId,
        doctorId: doctor.id,
        doctorName: doctor.name,
        study: selectedStudy,
        priority,
        status: "requested",
        indication: indication.trim() || undefined,
        requestedAt: timestamp,
        updatedAt: timestamp,
      });

      toast({
        title: "Order Radiologi Dibuat",
        description: `${selectedStudy} untuk ${patient.name} masuk ke daftar order aktif.`,
      });
      resetOrderForm();
      await refetchOrders();
    } catch (error) {
      logClientError(error, { module: "radiologi", action: "membuat order", entityId: patient.id });
      toast({
        title: "Gagal Membuat Order",
        description: createErrorDescription(error, {
          module: "radiologi",
          action: "membuat order",
          entityId: patient.id,
        }),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyStatusChange = async (order: RadiologyOrder, payload: Partial<RadiologyOrder>, successMessage: string) => {
    setIsSubmitting(true);
    try {
      await updateRadiologyOrder(order.id, { ...payload, updatedAt: new Date().toISOString() });
      toast({ title: "Status Diperbarui", description: successMessage });
      await refetchOrders();
      return true;
    } catch (error) {
      logClientError(error, { module: "radiologi", action: "memperbarui status order", entityId: order.id });
      toast({
        title: "Gagal Memperbarui Status",
        description: createErrorDescription(error, {
          module: "radiologi",
          action: "memperbarui status order",
          entityId: order.id,
        }),
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdvanceStatus = async (order: RadiologyOrder) => {
    const nextStatus = NEXT_STATUS[order.status];
    if (!nextStatus) return;

    // Transisi ke "reported" menuntut hasil bacaan, jadi dialihkan ke dialog input.
    if (nextStatus === "reported") {
      setReportingOrder(order);
      setFindings(order.findings ?? "");
      setImpression(order.impression ?? "");
      return;
    }

    // Penutupan order dicatat bersama dokter peninjau agar hasil bacaan punya penanggung jawab.
    const reviewPayload: Partial<RadiologyOrder> =
      nextStatus === "reviewed"
        ? {
            status: nextStatus,
            reviewedAt: new Date().toISOString(),
            reviewedByDoctorId: currentUser?.id,
            reviewedByDoctorName: currentUser?.name,
          }
        : { status: nextStatus };

    await applyStatusChange(
      order,
      reviewPayload,
      `${order.study} untuk ${order.patientName} kini berstatus ${STATUS_LABELS[nextStatus]}.`
    );
  };

  const handleCancelOrder = async (order: RadiologyOrder) => {
    await applyStatusChange(
      order,
      { status: "cancelled" },
      `Order ${order.study} untuk ${order.patientName} dibatalkan.`
    );
  };

  const handleSaveReport = async () => {
    if (!reportingOrder) return;
    if (!findings.trim() || !impression.trim()) {
      toast({
        title: "Hasil Bacaan Belum Lengkap",
        description: "Temuan dan kesan radiologi wajib diisi sebelum order ditandai sudah dibaca.",
        variant: "destructive",
      });
      return;
    }

    const saved = await applyStatusChange(
      reportingOrder,
      { status: "reported", findings: findings.trim(), impression: impression.trim() },
      `Hasil bacaan ${reportingOrder.study} untuk ${reportingOrder.patientName} tersimpan.`
    );

    if (saved) {
      setReportingOrder(null);
      setFindings("");
      setImpression("");
    }
  };

  const isLoading = patientsLoading || doctorsLoading || servicesLoading || recordsLoading || ordersLoading;
  const combinedError = patientsError || doctorsError || servicesError || recordsError || ordersError;

  const handleRetry = () => {
    if (patientsError) void refetchPatients();
    if (doctorsError) void refetchDoctors();
    if (servicesError) void refetchServices();
    if (recordsError) void refetchRecords();
    if (ordersError) void refetchOrders();
  };

  if (isLoading) return <DataLoading message="Memuat data radiologi..." />;
  if (combinedError) return <DataError error={combinedError} onRetry={handleRetry} />;

  const renderOrderRow = (order: RadiologyOrder, options: { withActions: boolean }) => (
    <TableRow key={order.id}>
      <TableCell>
        <div className="font-medium text-foreground">{order.patientName}</div>
        <div className="text-xs text-muted-foreground">{formatTimestamp(order.requestedAt)}</div>
      </TableCell>
      <TableCell>
        <div className="font-medium text-foreground">{order.study}</div>
        {order.indication ? (
          <div className="text-xs text-muted-foreground">Indikasi: {order.indication}</div>
        ) : null}
      </TableCell>
      <TableCell>{order.doctorName}</TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={order.priority === "urgent" ? "bg-red-500/10 text-red-700" : "bg-slate-500/10 text-slate-700"}
        >
          {order.priority === "urgent" ? "Cito" : "Rutin"}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={STATUS_BADGE_CLASSES[order.status]}>
          {STATUS_LABELS[order.status]}
        </Badge>
      </TableCell>
      {options.withActions ? (
        <TableCell className="text-right">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {NEXT_STATUS[order.status] ? (
              <Button size="sm" disabled={isSubmitting} onClick={() => void handleAdvanceStatus(order)}>
                {NEXT_STATUS_LABELS[order.status]}
              </Button>
            ) : null}
            {CANCELLABLE_STATUSES.includes(order.status) ? (
              <Button
                size="sm"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => void handleCancelOrder(order)}
              >
                Batalkan
              </Button>
            ) : null}
          </div>
        </TableCell>
      ) : (
        <TableCell className="text-xs text-muted-foreground">
          {order.impression ? `Kesan: ${order.impression}` : "-"}
        </TableCell>
      )}
    </TableRow>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Radiation className="h-6 w-6 text-primary" />
          Radiologi
        </h1>
        <p className="text-muted-foreground">
          Kelola permintaan pemeriksaan radiologi mulai dari penjadwalan sampai hasil bacaan ditinjau dokter.
        </p>
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orders">
            <Radiation className="mr-2 h-4 w-4" />
            Order Aktif
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-2 h-4 w-4" />
            Riwayat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Buat Order Radiologi</CardTitle>
              <CardDescription>
                Order menempel pada satu kunjungan pasien agar hasilnya bisa ditelusuri dari rekam medis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Pasien</Label>
                  <PatientCombobox
                    patients={patients}
                    value={selectedPatientId}
                    onValueChange={handlePatientChange}
                    placeholder="Cari pasien berdasarkan nama atau No. RM..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="radiology-record">Kunjungan / Rekam Medis</Label>
                  <Select
                    value={selectedRecordId}
                    onValueChange={setSelectedRecordId}
                    disabled={!selectedPatientId || patientRecords.length === 0}
                  >
                    <SelectTrigger id="radiology-record">
                      <SelectValue
                        placeholder={
                          !selectedPatientId
                            ? "Pilih pasien terlebih dahulu"
                            : patientRecords.length === 0
                              ? "Pasien belum punya rekam medis"
                              : "Pilih kunjungan"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {patientRecords.map((record) => (
                        <SelectItem key={record.id} value={record.id}>
                          {formatTimestamp(record.date)} - {record.diagnosis || "Tanpa diagnosis"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="radiology-doctor">Dokter Pengirim</Label>
                  <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                    <SelectTrigger id="radiology-doctor">
                      <SelectValue placeholder="Pilih dokter" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          {doctor.name} - {doctor.specialization}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="radiology-study">Jenis Pemeriksaan</Label>
                  <Select value={selectedStudy} onValueChange={setSelectedStudy}>
                    <SelectTrigger id="radiology-study">
                      <SelectValue
                        placeholder={
                          radiologyServices.length === 0 ? "Belum ada layanan radiologi" : "Pilih pemeriksaan"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {radiologyServices.map((service) => (
                        <SelectItem key={service.id} value={service.name}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="radiology-priority">Prioritas</Label>
                  <Select
                    value={priority}
                    onValueChange={(value) => setPriority(value as RadiologyOrder["priority"])}
                  >
                    <SelectTrigger id="radiology-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Rutin</SelectItem>
                      <SelectItem value="urgent">Cito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="radiology-indication">Indikasi Klinis (opsional)</Label>
                <Textarea
                  id="radiology-indication"
                  value={indication}
                  onChange={(event) => setIndication(event.target.value)}
                  placeholder="Alasan klinis pemeriksaan, misal: curiga fraktur distal radius"
                  className="min-h-17.5"
                />
              </div>

              {radiologyServices.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada layanan berkategori &quot;Radiologi&quot;. Tambahkan lebih dulu di modul Layanan Klinis.
                </p>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleCreateOrder} disabled={isSubmitting}>
                  Buat Order
                </Button>
                <Button variant="outline" onClick={resetOrderForm} disabled={isSubmitting}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order Aktif</CardTitle>
              <CardDescription>{activeOrders.length} order menunggu tindak lanjut.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <Table className="text-[13px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pasien</TableHead>
                      <TableHead>Pemeriksaan</TableHead>
                      <TableHead>Dokter Pengirim</TableHead>
                      <TableHead>Prioritas</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          Tidak ada order radiologi yang aktif.
                        </TableCell>
                      </TableRow>
                    ) : (
                      activeOrderPagination.paginatedItems.map((order) => renderOrderRow(order, { withActions: true }))
                    )}
                  </TableBody>
                </Table>
              </div>
              <DataPagination page={activeOrderPagination.page} totalItems={activeOrderPagination.totalItems} totalPages={activeOrderPagination.totalPages} onPageChange={activeOrderPagination.setPage} itemLabel="order" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Order</CardTitle>
              <CardDescription>
                Order yang sudah dibaca, ditinjau dokter, atau dibatalkan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <Table className="text-[13px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pasien</TableHead>
                      <TableHead>Pemeriksaan</TableHead>
                      <TableHead>Dokter Pengirim</TableHead>
                      <TableHead>Prioritas</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Hasil</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {finishedOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          Belum ada riwayat order radiologi.
                        </TableCell>
                      </TableRow>
                    ) : (
                      finishedOrderPagination.paginatedItems.map((order) => renderOrderRow(order, { withActions: false }))
                    )}
                  </TableBody>
                </Table>
              </div>
              <DataPagination page={finishedOrderPagination.page} totalItems={finishedOrderPagination.totalItems} totalPages={finishedOrderPagination.totalPages} onPageChange={finishedOrderPagination.setPage} itemLabel="riwayat" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!reportingOrder}
        onOpenChange={(open) => {
          if (!open) {
            setReportingOrder(null);
            setFindings("");
            setImpression("");
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Input Hasil Bacaan Radiologi</DialogTitle>
            <DialogDescription>
              {reportingOrder
                ? `${reportingOrder.study} untuk ${reportingOrder.patientName}, dikirim oleh ${reportingOrder.doctorName}.`
                : null}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="radiology-findings">Temuan</Label>
              <Textarea
                id="radiology-findings"
                value={findings}
                onChange={(event) => setFindings(event.target.value)}
                placeholder="Deskripsi temuan radiologis secara rinci"
                className="min-h-32"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="radiology-impression">Kesan</Label>
              <Textarea
                id="radiology-impression"
                value={impression}
                onChange={(event) => setImpression(event.target.value)}
                placeholder="Kesimpulan bacaan, misal: fraktur transversal distal radius dekstra"
                className="min-h-17.5"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportingOrder(null)}>
              Batal
            </Button>
            <Button onClick={handleSaveReport} disabled={isSubmitting}>
              Simpan Hasil Bacaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
