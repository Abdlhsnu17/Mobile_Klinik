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
import { DataError, DataLoading, useClinicData } from "@/hooks/use-clinic-data";
import { useToast } from "@/hooks/use-toast";
import type { Doctor, DoctorSchedule } from "@/lib/auth-types";
import { getCurrentUser, hasAdminAccess } from "@/lib/auth-utils";
import { createDoctor, deleteDoctor, updateDoctor } from "@/lib/clinic-utils";
import { SPECIALIZATIONS } from "@/lib/specializations";
import {
    Edit,
    AlertTriangle,
    Mail,
    Phone,
    Plus,
    Search,
    Stethoscope,
    Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]

export default function DokterPage() {
  const router = useRouter()
  const { data: doctors, loading, error, refetch: refetchDoctors } =
    useClinicData<Doctor>("doctors")
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof getCurrentUser>>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingDoctor, setDeletingDoctor] = useState<Doctor | null>(null)
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    specialization: "",
    phone: "",
    email: "",
    status: "Aktif" as "Aktif" | "Tidak Aktif",
  })
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const user = getCurrentUser()
    setCurrentUser(user)
    if (!user) {
      router.push("/login")
    }
  }, [router])

  const canManageDoctors = hasAdminAccess(currentUser)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (editingDoctor) {
        const updatedDoctor = await updateDoctor(editingDoctor.id, {
          name: formData.name,
          specialization: formData.specialization,
          phone: formData.phone,
          email: formData.email,
          status: formData.status,
          schedules,
        })
        toast({
          title: "Berhasil Diperbarui",
          description: `Data dokter ${updatedDoctor.name} telah diperbarui.`,
        })
      } else {
        const newDoctor = await createDoctor({
          name: formData.name,
          specialization: formData.specialization,
          phone: formData.phone,
          email: formData.email,
          status: formData.status,
          schedules,
        })
        toast({
          title: "Berhasil Ditambahkan",
          description: `Data dokter ${newDoctor.name} telah ditambahkan.`,
        })
      }

      await refetchDoctors()
      resetForm()
    } catch (error) {
      console.error("Error saving doctor:", error)
      toast({
        title: "Gagal Menyimpan Data Dokter",
        description: error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      specialization: "",
      phone: "",
      email: "",
      status: "Aktif",
    })
    setSchedules([])
    setEditingDoctor(null)
    setIsDialogOpen(false)
  }

  const handleEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor)
    setFormData({
      name: doctor.name,
      specialization: doctor.specialization,
      phone: doctor.phone,
      email: doctor.email,
      status: doctor.status,
    })
    setSchedules(doctor.schedules)
    setIsDialogOpen(true)
  }

  const openDeleteDialog = (doctor: Doctor) => {
    setDeletingDoctor(doctor);
    setIsDeleteDialogOpen(true);
  }

  const handleDelete = async () => {
    if (!deletingDoctor) return;
    try {
      await deleteDoctor(deletingDoctor.id)
      await refetchDoctors()
      toast({
        title: "Berhasil Dihapus",
        description: `Data dokter ${deletingDoctor.name} telah dihapus.`,
      })
    } catch (error) {
      console.error("Error deleting doctor:", error)
      toast({
        title: "Gagal Menghapus Data Dokter",
        description: error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.",
        variant: "destructive",
      })
    } finally {
      setDeletingDoctor(null);
      setIsDeleteDialogOpen(false);
    }
  }

  const addSchedule = () => {
    setSchedules([...schedules, { day: "Senin", startTime: "08:00", endTime: "12:00" }])
  }

  const updateSchedule = (index: number, field: keyof DoctorSchedule, value: string) => {
    const updated = schedules.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    )
    setSchedules(updated)
  }

  const removeSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index))
  }

  const filteredDoctors = doctors.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const doctorPagination = useDataPagination(filteredDoctors)

  if (loading) return <DataLoading />
  if (error) return <DataError error={error} onRetry={refetchDoctors} />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Dokter</h1>
          <p className="text-muted-foreground text-sm">
            Kelola data dan jadwal praktek dokter
          </p>
        </div>
        {canManageDoctors && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="w-4 h-4 mr-2" />
                Tambah Dokter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingDoctor ? "Edit Dokter" : "Tambah Dokter Baru"}
              </DialogTitle>
              <DialogDescription>
                {editingDoctor
                  ? "Perbarui informasi dokter"
                  : "Isi formulir untuk menambahkan dokter baru"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Lengkap *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Dr. Nama Lengkap, Sp.XX"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialization">Spesialisasi *</Label>
                  <Select
                    value={formData.specialization}
                    onValueChange={(value) =>
                      setFormData({ ...formData, specialization: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih spesialisasi" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIALIZATIONS.map((spec) => (
                        <SelectItem key={spec} value={spec}>
                          {spec}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">No. Telepon *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
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

              {/* Schedules */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Jadwal Praktek</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addSchedule}>
                    <Plus className="w-3 h-3 mr-1" />
                    Tambah Jadwal
                  </Button>
                </div>
                {schedules.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Belum ada jadwal. Klik tombol di atas untuk menambahkan.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {schedules.map((schedule, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 rounded-lg border border-border/60 bg-transparent p-3"
                      >
                        <Select
                          value={schedule.day}
                          onValueChange={(value) => updateSchedule(index, "day", value)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DAYS.map((day) => (
                              <SelectItem key={day} value={day}>
                                {day}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="time"
                          value={schedule.startTime}
                          onChange={(e) => updateSchedule(index, "startTime", e.target.value)}
                          className="w-28"
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="time"
                          value={schedule.endTime}
                          onChange={(e) => updateSchedule(index, "endTime", e.target.value)}
                          className="w-28"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSchedule(index)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={!formData.name || !formData.specialization || isSubmitting}
                >
                  {isSubmitting
                    ? editingDoctor
                      ? "Menyimpan..."
                      : "Menambahkan..."
                    : editingDoctor
                      ? "Simpan Perubahan"
                      : "Tambah Dokter"}
                </Button>
              </DialogFooter>
            </form>
            </DialogContent>
          </Dialog>
        )}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Hapus Dokter
              </DialogTitle>
              <DialogDescription>
                Apakah Anda yakin ingin menghapus data dokter{" "}
                <span className="font-semibold text-foreground">{deletingDoctor?.name}</span>?
                Tindakan ini tidak dapat dibatalkan.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Batal
              </Button>
              <Button variant="destructive" onClick={handleDelete}>Hapus</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Dokter
            </CardTitle>
            <Stethoscope className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{doctors.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dokter Aktif
            </CardTitle>
            <Stethoscope className="w-4 h-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {doctors.filter((d) => d.status === "Aktif").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Spesialisasi
            </CardTitle>
            <Stethoscope className="w-4 h-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(doctors.map((d) => d.specialization)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <CardTitle className="text-base">Daftar Dokter</CardTitle>
              <CardDescription>
                Cari berdasarkan nama atau spesialisasi
              </CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari dokter..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  doctorPagination.resetPage()
                }}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Spesialisasi</TableHead>
                  <TableHead className="hidden md:table-cell">Kontak</TableHead>
                  <TableHead className="hidden lg:table-cell">Jadwal</TableHead>
                  <TableHead>Status</TableHead>
                  {canManageDoctors && <TableHead className="text-right">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDoctors.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={canManageDoctors ? 6 : 5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {searchTerm
                        ? "Tidak ada dokter yang sesuai dengan pencarian"
                        : "Belum ada data dokter"}
                    </TableCell>
                  </TableRow>
                ) : (
                  doctorPagination.paginatedItems.map((doctor) => (
                    <TableRow key={doctor.id}>
                      <TableCell className="font-medium">{doctor.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{doctor.specialization}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="w-3 h-3" />
                            {doctor.phone}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {doctor.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {doctor.schedules.slice(0, 3).map((s, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {s.day.slice(0, 3)}
                            </Badge>
                          ))}
                          {doctor.schedules.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{doctor.schedules.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            doctor.status === "Aktif"
                              ? "bg-chart-2 text-foreground"
                              : "border border-border bg-transparent text-muted-foreground"
                          }
                        >
                          {doctor.status}
                        </Badge>
                      </TableCell>
                      {canManageDoctors && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(doctor)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(doctor)}
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
            page={doctorPagination.page}
            totalItems={doctorPagination.totalItems}
            totalPages={doctorPagination.totalPages}
            onPageChange={doctorPagination.setPage}
            itemLabel="dokter"
          />
        </CardContent>
      </Card>
    </div>
  )
}
