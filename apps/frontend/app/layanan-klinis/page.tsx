"use client"

import React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataPagination, useDataPagination } from "@/components/data-pagination";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { DataError, DataLoading, useClinicData } from "@/hooks/use-clinic-data";
import { useToast } from "@/hooks/use-toast";
import type { Service } from "@/lib/auth-types";
import { getCurrentUser, hasAdminAccess } from "@/lib/auth-utils";
import { createService, deleteService, formatCurrency, updateService } from "@/lib/clinic-utils";
import { SPECIALIZATIONS } from "@/lib/specializations";
import {
    AlertTriangle,
    Banknote,
    ClipboardList,
    Clock,
    Edit,
    Plus,
    Search,
    Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const CATEGORIES: Service["category"][] = ["Konsultasi", "Pemeriksaan", "Tindakan", "Laboratorium", "Radiologi"];

export default function LayananPage() {
  const router = useRouter()
  const {
    data: services,
    loading,
    error,
    refetch: refetchServices,
  } = useClinicData<Service>("services")
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof getCurrentUser>>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingService, setDeletingService] = useState<Service | null>(null)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const initialFormData: Omit<Service, "id"> = {
    name: "",
    category: "Konsultasi",
    price: 0,
    duration: 15,
    description: "",
    status: "Aktif",
    applicableSpecializations: [],
  };
  const [formData, setFormData] = useState<Omit<Service, "id">>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const user = getCurrentUser()
    setCurrentUser(user)
    if (!user) {
      router.push("/login")
    }
  }, [router])

  const canManageServices = hasAdminAccess(currentUser)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (editingService) {
        await updateService(editingService.id, formData)
        toast({
          title: "Layanan Diperbarui",
          description: `Layanan "${formData.name}" telah berhasil diperbarui.`,
        })
      } else {
        await createService(formData)
        toast({
          title: "Layanan Ditambahkan",
          description: `Layanan "${formData.name}" telah berhasil ditambahkan.`,
        })
      }

      await refetchServices()
      resetForm({ keepDialogOpen: !editingService })
    } catch (error) {
      toast({
        title: "Gagal Menyimpan Layanan",
        description: error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = ({ keepDialogOpen = false }: { keepDialogOpen?: boolean } = {}) => {
    setFormData(initialFormData);
    setEditingService(null)
    if (!keepDialogOpen) {
      setIsDialogOpen(false)
    }
  }

  const handleEdit = (service: Service) => {
    setEditingService(service)
    setFormData({ ...service, applicableSpecializations: service.applicableSpecializations ?? [] })
    setIsDialogOpen(true)
  }

  const toggleFormSpecialization = (specialization: string, shouldSelect: boolean) => {
    setFormData((prev) => ({
      ...prev,
      applicableSpecializations: shouldSelect
        ? [...(prev.applicableSpecializations ?? []), specialization]
        : (prev.applicableSpecializations ?? []).filter((item) => item !== specialization),
    }))
  }

  const openDeleteDialog = (service: Service) => {
    setDeletingService(service)
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingService) return
    try {
      await deleteService(deletingService.id)
      toast({
        title: "Layanan Dihapus",
        description: `Layanan "${deletingService.name}" telah berhasil dihapus.`,
      })
      await refetchServices()
    } catch (error) {
      toast({
        title: "Aksi Ditolak",
        // Menampilkan pesan error yang lebih spesifik dari backend
        description: error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.",
        variant: "destructive",
      })
    } finally {
      setIsDeleteDialogOpen(false)
      setDeletingService(null)
    }
  }

  const filteredServices = React.useMemo(() =>
    services.filter((s) => {
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch =
        s.name.toLowerCase().includes(searchTermLower) ||
        (s.description ?? "").toLowerCase().includes(searchTermLower);
      const matchesCategory = filterCategory === "all" || s.category === filterCategory;
      return matchesSearch && matchesCategory;
    }), [services, searchTerm, filterCategory]);
  const servicePagination = useDataPagination(filteredServices);

  const serviceStats = React.useMemo(() => {
    const total = services.length;
    if (total === 0) {
      return {
        total: 0,
        active: 0,
        avgPrice: 0,
        avgDuration: 0,
      };
    }
    const active = services.filter((s) => s.status === "Aktif").length;
    const totalPrice = services.reduce((sum, s) => sum + s.price, 0);
    const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);
    return {
      total,
      active,
      avgPrice: Math.round(totalPrice / total),
      avgDuration: Math.round(totalDuration / total),
    };
  }, [services]);

  const categoryBadgeClass = "bg-primary/10 text-primary"

  if (loading) return <DataLoading />
  if (error) return <DataError error={error} onRetry={refetchServices} />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Katalog Layanan</h1>
          <p className="text-muted-foreground text-sm">
            Master layanan, tarif, durasi, dan kategori yang dipilih saat pendaftaran
          </p>
        </div>
        {canManageServices && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingService(null);
                setFormData(initialFormData);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Tambah Layanan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingService ? "Edit Layanan" : "Tambah Layanan Baru"}
              </DialogTitle>
              <DialogDescription>
                {editingService
                  ? "Perbarui informasi layanan"
                  : "Isi formulir untuk menambahkan layanan baru"}
              </DialogDescription>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-2">
                <strong>Catatan:</strong> Form ini untuk membuat <strong>master/katalog layanan</strong>, bukan untuk mencatat layanan yang diterima pasien. Data pasien akan dihubungkan dengan layanan ini di modul <strong>Antrian</strong> dan <strong>Ruang Pemeriksaan</strong>.
              </p>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Layanan *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kategori *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value as Service["category"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value as "Aktif" | "Tidak Aktif" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aktif">Aktif</SelectItem>
                      <SelectItem value="Tidak Aktif">Tidak Aktif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Tarif (Rp) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min={0}
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: parseInt(e.target.value) || 0 })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Durasi (menit) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={5}
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({ ...formData, duration: parseInt(e.target.value) || 15 })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Deskripsi layanan (opsional)"
                />
              </div>

              <div className="space-y-2">
                <Label>Spesialisasi Dokter Terkait</Label>
                <p className="text-xs text-muted-foreground">
                  Kosongkan jika layanan ini berlaku untuk semua spesialisasi. Dipakai untuk auto-pilih layanan saat dokter dipilih di modul Antrian.
                </p>
                <div className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-3">
                  {SPECIALIZATIONS.map((spec) => (
                    <label key={spec} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={(formData.applicableSpecializations ?? []).includes(spec)}
                        onCheckedChange={(checked) => toggleFormSpecialization(spec, checked === true)}
                      />
                      {spec}
                    </label>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={!formData.name || isSubmitting}>
                  {isSubmitting
                    ? editingService
                      ? "Menyimpan..."
                      : "Menambahkan..."
                    : editingService
                      ? "Simpan Perubahan"
                      : "Tambah Layanan"}
                </Button>
              </DialogFooter>
            </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Layanan
            </CardTitle>
            <ClipboardList className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{serviceStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Layanan Aktif
            </CardTitle>
            <ClipboardList className="w-4 h-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{serviceStats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rata-rata Tarif
            </CardTitle>
            <Banknote className="w-4 h-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {formatCurrency(serviceStats.avgPrice)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rata-rata Durasi
            </CardTitle>
            <Clock className="w-4 h-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {serviceStats.avgDuration}{" "}
              <span className="text-sm font-normal text-muted-foreground">menit</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <CardTitle className="text-base">Daftar Layanan</CardTitle>
              <CardDescription>
                Cari berdasarkan nama atau deskripsi
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari layanan..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    servicePagination.resetPage();
                  }}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Layanan</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="hidden md:table-cell">Tarif</TableHead>
                  <TableHead className="hidden md:table-cell">Durasi</TableHead>
                  <TableHead>Status</TableHead>
                  {canManageServices && <TableHead className="text-right">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={canManageServices ? 6 : 5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {searchTerm || filterCategory !== "all"
                        ? "Tidak ada layanan yang sesuai dengan filter"
                        : "Belum ada data layanan"}
                    </TableCell>
                  </TableRow>
                ) : (
                  servicePagination.paginatedItems.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{service.name}</p>
                          {service.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {service.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={categoryBadgeClass}>
                          {service.category}
                        </Badge>
                        {service.applicableSpecializations && service.applicableSpecializations.length > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {service.applicableSpecializations.join(", ")}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-medium">
                        {formatCurrency(service.price)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {service.duration} menit
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            service.status === "Aktif"
                              ? "bg-chart-2 text-foreground"
                              : "border border-border bg-transparent text-muted-foreground"
                          }
                        >
                          {service.status}
                        </Badge>
                      </TableCell>
                      {canManageServices && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(service)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(service)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DataPagination
            page={servicePagination.page}
            totalItems={servicePagination.totalItems}
            totalPages={servicePagination.totalPages}
            onPageChange={servicePagination.setPage}
            itemLabel="layanan"
          />
        </CardContent>
      </Card>

      {canManageServices && (
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Hapus Layanan
              </DialogTitle>
              <DialogDescription>
                Apakah Anda yakin ingin menghapus layanan{" "}
                <span className="font-semibold text-foreground">{deletingService?.name}</span>? Tindakan ini tidak dapat dibatalkan.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Batal</Button>
              <Button variant="destructive" onClick={handleDelete}>Hapus</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
