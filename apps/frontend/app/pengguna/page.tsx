"use client"

import React, { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleAccessManager } from "@/components/role-access-manager";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DataError, DataLoading, useClinicData } from "@/hooks/use-clinic-data";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@/lib/auth-types";
import {
    createUser,
    deleteUser,
    getCurrentUser,
    hasAdminAccess,
    RegisterPayload,
    updateUser,
} from "@/lib/auth-utils";
import {
    AlertTriangle,
    Baby,
    Bandage,
    Edit,
    FlaskConical,
    Plus,
    Search,
    Shield,
    ShieldCheck,
    Stethoscope,
    Trash2,
    Users,
    UserSquare
} from "lucide-react";
import { useRouter } from "next/navigation";
 
const ROLE_DETAILS: Record<User["role"], { label: string; className: string }> = {
  admin: { label: "Administrator", className: "bg-destructive text-destructive-foreground" },
  dokter: { label: "Dokter", className: "bg-primary text-primary-foreground" },
  perawat: { label: "Perawat", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300" },
  bidan: { label: "Bidan", className: "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300" },
  teknis: { label: "Teknis", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300" },
  umum: { label: "Umum", className: "border border-border bg-transparent text-foreground" },
};

const EDITABLE_ROLES = (Object.keys(ROLE_DETAILS) as User["role"][]).filter(
  (role) => role !== "umum"
);

export default function PenggunaPage() {
  const router = useRouter()
  const {
    data: users = [],
    loading: isLoadingUsers,
    error: loadError,
    refetch: loadUsers,
  } = useClinicData<User>("users")
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    email: "",
    password: "",
    role: "umum" as User["role"],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const currentUser = getCurrentUser()
  const { toast } = useToast()

  useEffect(() => {
    if (!hasAdminAccess(currentUser)) {
      router.push("/dashboard")
    }
  }, [router, currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")

    if (!formData.role) {
      setFormError("Silakan pilih peran pengguna.")
      return
    }

    if (!editingUser && (!formData.password || formData.password.length < 6)) {
      setFormError("Password dibutuhkan untuk akun baru.")
      if (formData.password && formData.password.length < 6) {
        setFormError("Password baru minimal harus 6 karakter.");
      } else {
        setFormError("Password dibutuhkan untuk akun baru.");
      }
      return
    }

    setIsSubmitting(true)
    const payload = {
      username: formData.username,
      name: formData.name,
      email: formData.email,
      role: formData.role,
      ...(formData.password ? { password: formData.password } : {}),
    }

    try {
      if (editingUser) {
        await updateUser(editingUser.id, payload)
      } else {
        await createUser(payload as RegisterPayload)
      }
      resetForm()
      toast({
        title: `Pengguna ${editingUser ? "diperbarui" : "ditambahkan"}`,
        description: `Data untuk ${payload.name} telah berhasil disimpan.`,
      })
      await loadUsers()
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Gagal menyimpan pengguna. Coba lagi."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      username: "",
      name: "",
      email: "",
      password: "",
      role: "umum",
    })
    setEditingUser(null)
    setFormError("")
    setIsDialogOpen(false)
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
    })
    setFormError("")
    setIsDialogOpen(true)
  }

  const openDeleteDialog = (user: User) => {
    if (user.id === currentUser?.id) {
      toast({
        title: "Aksi Ditolak",
        description: "Anda tidak dapat menghapus akun yang sedang digunakan.",
        variant: "destructive",
      })
      return
    }
    setDeletingUser(user)
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingUser) return
    try {
      await deleteUser(deletingUser.id)
      toast({
        title: "Pengguna Dihapus",
        description: `Pengguna ${deletingUser.name} telah berhasil dihapus.`,
      })
      await loadUsers()
    } catch (error) {
      toast({
        title: "Gagal Menghapus",
        description: error instanceof Error ? error.message : "Gagal menghapus pengguna.",
        variant: "destructive",
      })
    } finally {
      setIsDeleteDialogOpen(false)
      setDeletingUser(null)
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const userPagination = useDataPagination(filteredUsers)

  const countByRoles = (roles: User["role"][]) =>
    users.filter((user) => roles.includes(user.role)).length

  type StatCard = {
    title: string
    icon: typeof Users
    value: number
  }

  const stats: StatCard[] = [
    {
      title: "Total Pengguna",
      icon: Users,
      value: users.length,
    },
    {
      title: "Administrator",
      icon: Shield,
      value: countByRoles(["admin"]),
    },
    {
      title: "Dokter",
      icon: Stethoscope,
      value: countByRoles(["dokter"]),
    },
    {
      title: "Perawat",
      icon: Bandage,
      value: countByRoles(["perawat"]),
    },
    {
      title: "Bidan",
      icon: Baby,
      value: countByRoles(["bidan"]),
    },
    {
      title: "Teknis",
      icon: FlaskConical,
      value: countByRoles(["teknis"]),
    },
    {
      title: "Umum",
      icon: UserSquare,
      value: countByRoles(["umum"]),
    },
  ]

  if (isLoadingUsers) return <DataLoading />
  if (loadError) return <DataError error={loadError} onRetry={loadUsers} />

  return (
    <TooltipProvider>
    <Tabs defaultValue="daftar-pengguna" className="space-y-5">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger
          value="daftar-pengguna"        >
          <Users className="h-5 w-5" />
          Daftar Pengguna
        </TabsTrigger>
        <TabsTrigger
          value="hak-akses-role"        >
          <ShieldCheck className="h-5 w-5" />
          Hak Akses Role
        </TabsTrigger>
      </TabsList>

      <TabsContent value="daftar-pengguna" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kelola Pengguna</h1>
          <p className="text-muted-foreground text-sm">
            Kelola akun pengguna sistem
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Pengguna
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? "Edit Pengguna" : "Tambah Pengguna Baru"}
              </DialogTitle>
              <DialogDescription>
                {editingUser
                  ? "Perbarui informasi pengguna"
                  : "Isi formulir untuk menambahkan pengguna baru"}
              </DialogDescription>
            </DialogHeader>
            {formError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Tooltip>
                  <TooltipTrigger className="w-full">
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      required
                      disabled={!!editingUser}
                      className="disabled:cursor-not-allowed"
                    />
                  </TooltipTrigger>
                  {editingUser && <TooltipContent><p>Username tidak dapat diubah.</p></TooltipContent>}
                </Tooltip>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
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
                <Label htmlFor="password">
                  Password {editingUser ? "(kosongkan jika tidak diubah)" : "*"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required={!editingUser}
                />
              </div>

              <div className="space-y-2">
                <Label>Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value as User["role"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EDITABLE_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_DETAILS[role].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {editingUser ? "Simpan Perubahan" : "Tambah Pengguna"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Hapus Pengguna
              </DialogTitle>
              <DialogDescription>
                Apakah Anda yakin ingin menghapus pengguna{" "}
                <span className="font-semibold text-foreground">{deletingUser?.name}</span>?
                Tindakan ini tidak dapat dibatalkan.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Batal</Button>
              <Button variant="destructive" onClick={handleDelete}>Hapus</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>


      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <CardTitle className="text-base">Daftar Pengguna</CardTitle>
              <CardDescription>
                Cari berdasarkan nama, username, atau email
              </CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari pengguna..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  userPagination.resetPage()
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
                  <TableHead>Username</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {searchTerm
                        ? `Tidak ada pengguna yang cocok dengan "${searchTerm}"`
                        : "Belum ada data pengguna"}
                    </TableCell>
                  </TableRow>
                ) : (
                  userPagination.paginatedItems.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {user.name}
                          {user.id === currentUser?.id && (
                            <Badge variant="outline" className="text-xs">
                              Anda
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{user.username}</TableCell>
                      <TableCell className="hidden md:table-cell">{user.email}</TableCell>
                      <TableCell>
                        <Badge className={ROLE_DETAILS[user.role]?.className ?? ""}>
                          {ROLE_DETAILS[user.role]?.label ?? user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(user)}
                            disabled={user.id === currentUser?.id}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DataPagination
            page={userPagination.page}
            totalItems={userPagination.totalItems}
            totalPages={userPagination.totalPages}
            onPageChange={userPagination.setPage}
            itemLabel="pengguna"
          />
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="hak-akses-role">
        <RoleAccessManager />
      </TabsContent>
    </Tabs>
    </TooltipProvider>
  )
}
