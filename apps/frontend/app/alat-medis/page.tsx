"use client"

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
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { DataError, DataLoading, useClinicData } from "@/hooks/use-clinic-data";
import { useToast } from "@/hooks/use-toast";
import type { MedicalEquipment } from "@/lib/auth-types";
import { hasRole, isAuthenticated } from "@/lib/auth-utils";
import {
    createMedicalEquipment,
    deleteMedicalEquipment,
    updateMedicalEquipment
} from "@/lib/clinic-utils";
import {
    AlertTriangle,
    CheckCircle,
    Clock,
    MoreHorizontal,
    Pencil,
    Plus,
    Search,
    Stethoscope,
    Trash2,
    Wrench
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const initialFormData: Omit<MedicalEquipment, "id" | "createdAt" | "updatedAt"> = {
  code: "",
  name: "",
  category: "Diagnostik",
  brand: "",
  model: "",
  quantity: 1,
  condition: "Baik",
  location: "",
  purchaseDate: "",
  lastMaintenanceDate: "",
  nextMaintenanceDate: "",
  notes: "",
  status: "Tersedia",
}

export default function AlatMedisPage() {
  const router = useRouter()
  const pathname = usePathname()
  const {
    data: equipments = [],
    loading,
    error,
    refetch,
  } = useClinicData<MedicalEquipment>("medical-equipments", pathname)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<MedicalEquipment | null>(null)
  const [deletingEquipment, setDeletingEquipment] = useState<MedicalEquipment | null>(null)
  const [formData, setFormData] = useState(initialFormData)
  const { toast } = useToast()

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login")
      return
    }
    if (!hasRole(["admin"])) {
      router.push("/dashboard")
    }
  }, [router])

  const filteredEquipments = useMemo(
    () =>
      equipments.filter((equipment) => {
        const matchesSearch =
          equipment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          equipment.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          equipment.brand.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = categoryFilter === "all" || equipment.category === categoryFilter
        const matchesStatus = statusFilter === "all" || equipment.status === statusFilter
        return matchesSearch && matchesCategory && matchesStatus
      }),
    [equipments, searchTerm, categoryFilter, statusFilter],
  )
  const equipmentPagination = useDataPagination(filteredEquipments)

  const stats = {
    total: equipments.length,
    available: equipments.filter((e) => e.status === "Tersedia").length,
    inUse: equipments.filter((e) => e.status === "Digunakan").length,
    maintenance: equipments.filter((e) => e.status === "Dalam Perawatan").length,
    needsRepair: equipments.filter((e) => e.condition === "Perlu Perbaikan" || e.condition === "Rusak").length,
  }

  const handleOpenDialog = async (equipment?: MedicalEquipment) => {
    if (equipment) {
      setEditingEquipment(equipment)
      setFormData({
        code: equipment.code,
        name: equipment.name,
        category: equipment.category,
        brand: equipment.brand,
        model: equipment.model,
        quantity: equipment.quantity,
        condition: equipment.condition,
        location: equipment.location,
        purchaseDate: equipment.purchaseDate,
        lastMaintenanceDate: equipment.lastMaintenanceDate || "",
        nextMaintenanceDate: equipment.nextMaintenanceDate || "",
        notes: equipment.notes || "",
        status: equipment.status,
      })
    } else {
      setEditingEquipment(null)
      setFormData({
        ...initialFormData,
        // Kode akan dibuat oleh backend untuk memastikan keunikan.
        code: "AUTO-GENERATED",
      })
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      let savedEquipment: MedicalEquipment
      if (editingEquipment) {
        // Exclude code from update payload as it shouldn't be changed
        const { code, ...updateData } = formData;
        savedEquipment = await updateMedicalEquipment(editingEquipment.id, updateData)
      } else {
        savedEquipment = await createMedicalEquipment(formData)
      }

      toast({
        title: `Berhasil ${editingEquipment ? "Diperbarui" : "Disimpan"}`,
        description: `Data alat medis "${savedEquipment.name}" telah ${editingEquipment ? "diperbarui" : "ditambahkan"}.`,
      })
      setIsDialogOpen(false)
      setFormData(initialFormData)
    } catch (error) {
      console.error("Failed to save medical equipment", error)
      toast({
        title: "Gagal Menyimpan Alat Medis",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan data.",
        variant: "destructive",
      })
    }
    await refetch()
  }

  const handleDelete = async () => {
    if (!deletingEquipment) return
    try {
      await deleteMedicalEquipment(deletingEquipment.id)
      toast({
        title: "Berhasil Dihapus",
        description: `Alat medis "${deletingEquipment.name}" telah dihapus.`,
      })
      setIsDeleteDialogOpen(false)
      setDeletingEquipment(null)
    } catch (error) {
      console.error("Failed to delete medical equipment", error)
      toast({
        title: "Gagal Menghapus Alat Medis",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menghapus data.",
        variant: "destructive",
      })
    }
    await refetch()
  }

  const getStatusBadge = (status: MedicalEquipment["status"]) => {
    switch (status) {
      case "Tersedia":
        return (
          <Badge className="border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            Tersedia
          </Badge>
        )
      case "Digunakan":
        return (
          <Badge className="border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
            Digunakan
          </Badge>
        )
      case "Dalam Perawatan":
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">Dalam Perawatan</Badge>
      case "Tidak Aktif":
        return <Badge variant="secondary">Tidak Aktif</Badge>
      default:
        return null
    }
  }

  const getConditionBadge = (condition: MedicalEquipment["condition"]) => {
    switch (condition) {
      case "Baik":
        return (
          <Badge
            variant="outline"
            className="border-teal-400 bg-teal-50 text-teal-800 dark:border-teal-700 dark:bg-teal-950/40 dark:text-teal-300"
          >
            Baik
          </Badge>
        )
      case "Perlu Perbaikan":
        return <Badge variant="outline" className="border-yellow-500/50 text-yellow-600">Perlu Perbaikan</Badge>
      case "Rusak":
        return <Badge variant="outline" className="border-destructive/50 text-destructive">Rusak</Badge>
      default:
        return null
    }
  }

  if (loading) return <DataLoading />
  if (error) return <DataError error={error} onRetry={refetch} />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alat Medis</h1>
          <p className="text-muted-foreground">Kelola inventaris alat dan peralatan medis</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Alat
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Stethoscope className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Alat</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/60">
                <CheckCircle className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.available}</p>
                <p className="text-xs text-muted-foreground">Tersedia</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inUse + stats.maintenance}</p>
                <p className="text-xs text-muted-foreground">Sedang Digunakan</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <Wrench className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.needsRepair}</p>
                <p className="text-xs text-muted-foreground">Perlu Perbaikan</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari alat medis..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  equipmentPagination.resetPage()
                }}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(value) => {
              setCategoryFilter(value)
              equipmentPagination.resetPage()
            }}>
              <SelectTrigger className="w-full md:w-45">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                <SelectItem value="Diagnostik">Diagnostik</SelectItem>
                <SelectItem value="Terapeutik">Terapeutik</SelectItem>
                <SelectItem value="Bedah">Bedah</SelectItem>
                <SelectItem value="Sterilisasi">Sterilisasi</SelectItem>
                <SelectItem value="Monitoring">Monitoring</SelectItem>
                <SelectItem value="Lainnya">Lainnya</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value) => {
              setStatusFilter(value)
              equipmentPagination.resetPage()
            }}>
              <SelectTrigger className="w-full md:w-37.5">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="Tersedia">Tersedia</SelectItem>
                <SelectItem value="Digunakan">Digunakan</SelectItem>
                <SelectItem value="Dalam Perawatan">Dalam Perawatan</SelectItem>
                <SelectItem value="Tidak Aktif">Tidak Aktif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Alat Medis</CardTitle>
          <CardDescription>
            Menampilkan {filteredEquipments.length} dari {equipments.length} alat
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama Alat</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead className="text-center">Jumlah</TableHead>
                  <TableHead>Kondisi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Belum ada data alat medis.
                    </TableCell>
                  </TableRow>
                ) : (
                  equipmentPagination.paginatedItems.map((equipment) => (
                    <TableRow key={equipment.id}>
                      <TableCell className="font-medium">{equipment.code}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{equipment.name}</p>
                          <p className="text-xs text-muted-foreground">{equipment.brand} {equipment.model}</p>
                        </div>
                      </TableCell>
                      <TableCell>{equipment.category}</TableCell>
                      <TableCell>{equipment.location}</TableCell>
                      <TableCell className="text-center">{equipment.quantity}</TableCell>
                      <TableCell>{getConditionBadge(equipment.condition)}</TableCell>
                      <TableCell>{getStatusBadge(equipment.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(equipment)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setDeletingEquipment(equipment)
                                setIsDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DataPagination
            page={equipmentPagination.page}
            totalItems={equipmentPagination.totalItems}
            totalPages={equipmentPagination.totalPages}
            onPageChange={equipmentPagination.setPage}
            itemLabel="alat"
          />
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEquipment ? "Edit Alat Medis" : "Tambah Alat Medis Baru"}</DialogTitle>
            <DialogDescription>
              {editingEquipment ? "Ubah data alat medis" : "Masukkan data alat medis baru"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Kode Alat</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  // Kode tidak bisa diubah setelah dibuat
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nama Alat</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Stetoskop"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Kategori</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value as MedicalEquipment["category"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Diagnostik">Diagnostik</SelectItem>
                    <SelectItem value="Terapeutik">Terapeutik</SelectItem>
                    <SelectItem value="Bedah">Bedah</SelectItem>
                    <SelectItem value="Sterilisasi">Sterilisasi</SelectItem>
                    <SelectItem value="Monitoring">Monitoring</SelectItem>
                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Merek</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Contoh: Littmann"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Contoh: Classic III"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Jumlah</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="condition">Kondisi</Label>
                <Select
                  value={formData.condition}
                  onValueChange={(value) => setFormData({ ...formData, condition: value as MedicalEquipment["condition"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baik">Baik</SelectItem>
                    <SelectItem value="Perlu Perbaikan">Perlu Perbaikan</SelectItem>
                    <SelectItem value="Rusak">Rusak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as MedicalEquipment["status"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tersedia">Tersedia</SelectItem>
                    <SelectItem value="Digunakan">Digunakan</SelectItem>
                    <SelectItem value="Dalam Perawatan">Dalam Perawatan</SelectItem>
                    <SelectItem value="Tidak Aktif">Tidak Aktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Lokasi</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Contoh: Ruang Periksa 1"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchaseDate">Tanggal Pembelian</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastMaintenanceDate">Perawatan Terakhir</Label>
                <Input
                  id="lastMaintenanceDate"
                  type="date"
                  value={formData.lastMaintenanceDate}
                  onChange={(e) => setFormData({ ...formData, lastMaintenanceDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nextMaintenanceDate">Perawatan Berikutnya</Label>
                <Input
                  id="nextMaintenanceDate"
                  type="date"
                  value={formData.nextMaintenanceDate}
                  onChange={(e) => setFormData({ ...formData, nextMaintenanceDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Catatan</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Catatan tambahan..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Hapus Alat Medis
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus alat <strong>{deletingEquipment?.name}</strong>?
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
