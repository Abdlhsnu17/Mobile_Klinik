"use client"

import { useThemeMode, type ThemeMode } from "@/components/theme-mode-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/contexts/user-context";
import { useToast } from "@/hooks/use-toast";
import { resolveMediaUrl } from "@/lib/api-base";
import type { ClinicSetting } from "@/lib/auth-types";
import { changeUserPassword, hasAdminAccess, logout, updateUser, updateUserAvatar } from "@/lib/auth-utils";
import {
    createClinicSetting,
    getClinicSettings,
    updateClinicSetting
} from "@/lib/clinic-utils";
import { apiClient } from "@/lib/api-client";
import { buildApiBaseUrl } from "@/lib/api-base";
import { downloadWithAuth } from "@/lib/download-with-auth";
import { cn } from "@/lib/utils";
import {
    AlertTriangle,
    Building2,
    DatabaseBackup,
    Download,
    Eye,
    EyeOff,
    Info,
    KeyRound,
    Loader2,
    Palette,
    RefreshCcw,
    Save,
    Upload,
    User as UserIcon
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

const API_BASE = buildApiBaseUrl(process.env.NEXT_PUBLIC_API_URL)

type ClinicSettingsPayload = Omit<ClinicSetting, "id" | "createdAt" | "updatedAt">

const DEFAULT_SETTINGS: ClinicSettingsPayload = {
  name: "Klinik Anda",
  address: "Jl. Kesehatan No. 123, Jakarta Selatan",
  phone: "021-12345678",
  email: "info@kliniksehat.com",
  operationalHours: "Senin - Sabtu: 08:00 - 20:00",
  description: "Klinik kesehatan terpercaya dengan layanan profesional dan peralatan modern.",
}

const toPayload = (record: ClinicSetting): ClinicSettingsPayload => ({
  name: record.name,
  address: record.address,
  phone: record.phone,
  email: record.email,
  operationalHours: record.operationalHours,
  description: record.description,
})

const THEME_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: "Ikuti sistem", value: "system" },
  { label: "Terang", value: "light" },
  { label: "Gelap", value: "dark" },
]

export default function PengaturanPage() {
  const [settings, setSettings] = useState<ClinicSettingsPayload>(DEFAULT_SETTINGS)
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const { currentUser, refetchUser } = useUser();
  const { theme, resolvedTheme, setTheme, isReady: isThemeReady } = useThemeMode()
  const { toast } = useToast();

  // State for password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // State for avatar change
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  // State backup & restore
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [isRunningDump, setIsRunningDump] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const handleExportBackup = async () => {
    setIsExportingBackup(true);
    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      await downloadWithAuth(`${API_BASE}/backup/export`, `simklab-backup-${stamp}.json`);
      toast({ title: "Snapshot backup diunduh" });
    } catch (error) {
      toast({ title: "Gagal mengekspor backup", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setIsExportingBackup(false);
    }
  };

  const handleRestoreBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!window.confirm("Memulihkan backup akan MENIMPA seluruh data saat ini. Lanjutkan?")) return;
    setIsRestoringBackup(true);
    try {
      const snapshot = JSON.parse(await file.text());
      const result = await apiClient.importBackup(snapshot);
      const total = Object.values(result.restored ?? {}).reduce((sum, n) => sum + n, 0);
      toast({ title: "Pemulihan selesai", description: `${total} baris dipulihkan.` });
    } catch (error) {
      toast({ title: "Gagal memulihkan backup", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setIsRestoringBackup(false);
    }
  };

  const handleRunDump = async () => {
    setIsRunningDump(true);
    try {
      const result = await apiClient.runBackup();
      toast({ title: "Backup database dibuat", description: result.file });
    } catch (error) {
      toast({ title: "Gagal menjalankan backup DB", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setIsRunningDump(false);
    }
  };

  useEffect(() => {
    setProfileName(currentUser?.name ?? "")
  }, [currentUser?.name])

  useEffect(() => {
    if (!hasAdminAccess(currentUser)) return;

    let isMounted = true
    setIsLoading(true)
    setSettingsError(null)

    getClinicSettings()
      .then((data) => {
        if (!isMounted || data.length === 0) return
        const [record] = data
        setSettings(toPayload(record))
        setSettingsId(record.id)
      })
      .catch((error) => {
        if (!isMounted) return
        console.error("Gagal memuat pengaturan klinik:", error)
        setSettingsError("Pengaturan klinik belum dapat dimuat. Muat ulang halaman atau coba beberapa saat lagi.")
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [currentUser])

  const handleSave = async () => {
    setIsSavingSettings(true)
    try {
      const saved = settingsId
        ? await updateClinicSetting(settingsId, settings)
        : await createClinicSetting(settings)
      setSettings(toPayload(saved))
      setSettingsId(saved.id)
      setSettingsError(null)
      toast({
        title: "Pengaturan Disimpan",
        description: "Informasi profil klinik telah berhasil diperbarui.",
      });
    } catch (error) {
      console.error("Gagal menyimpan pengaturan klinik:", error);
      toast({
        title: "Gagal Menyimpan",
        description: "Pengaturan klinik belum dapat disimpan. Periksa kembali isian lalu coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsSavingSettings(false)
    }
  }

  const executeReset = async () => {
    setIsSavingSettings(true)
    try {
      const saved = settingsId
        ? await updateClinicSetting(settingsId, DEFAULT_SETTINGS)
        : await createClinicSetting(DEFAULT_SETTINGS)
      setSettings(toPayload(saved))
      setSettingsId(saved.id)
      setSettingsError(null)
      toast({ title: "Pengaturan Direset", description: "Profil klinik telah dikembalikan ke pengaturan default." });
    } catch (error) {
      console.error("Gagal mengembalikan pengaturan default:", error);
      toast({
        title: "Gagal Reset",
        description: "Pengaturan default belum dapat diterapkan. Coba lagi beberapa saat.",
        variant: "destructive",
      });
    } finally {
      setIsSavingSettings(false)
      setIsResetDialogOpen(false);
    }
  }

  const handleAvatarFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "Ukuran file terlalu besar", description: "Maksimal ukuran foto profil adalah 5MB.", variant: "destructive" });
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleAvatarSave = async () => {
    if (!avatarFile) return;
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);

      await updateUserAvatar(formData);

      toast({ title: "Foto Profil Diperbarui", description: "Foto profil Anda berhasil diubah." });
      setAvatarFile(null);
      setAvatarPreview(null);
      refetchUser();
    } catch (error) {
      console.error("Gagal mengubah foto profil:", error);
      toast({ title: "Gagal Mengubah Foto", description: "Foto profil belum dapat diunggah. Pastikan format dan ukuran file sesuai lalu coba lagi.", variant: "destructive" });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleProfileSave = async () => {
    const name = profileName.trim()
    if (!currentUser || !name || name === currentUser.name) return

    setIsSavingProfile(true)
    try {
      await updateUser(currentUser.id, { name })
      setProfileName(name)
      refetchUser()
      toast({ title: "Nama Diperbarui", description: "Nama profil Anda berhasil disimpan." })
    } catch (error) {
      console.error("Gagal mengubah nama profil:", error)
      toast({
        title: "Gagal Mengubah Nama",
        description: "Nama profil belum dapat disimpan. Coba lagi beberapa saat.",
        variant: "destructive",
      })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError("Password baru dan konfirmasi tidak cocok.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password baru minimal harus 6 karakter.");
      return;
    }
    setIsChangingPassword(true);
    try {
      await changeUserPassword({ currentPassword, newPassword });

      toast({ title: "Password Berhasil Diubah", description: "Silakan login kembali dengan password baru Anda." });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      
      // Logout setelah ganti password untuk keamanan
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (error) {
      console.error("Gagal mengubah password:", error);
      setPasswordError("Password belum dapat diubah. Pastikan password saat ini benar lalu coba lagi.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pengaturan</h1>
        <p className="text-muted-foreground text-sm">
          Konfigurasi sistem dan tema aplikasi
        </p>
      </div>

      {settingsError && (
        <Alert className="bg-destructive/10 border-destructive">
          <AlertDescription className="text-destructive">{settingsError}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="akun" className="gap-4">
        <TabsList
          className={cn(
            "grid w-full grid-cols-2",
            hasAdminAccess(currentUser) ? "sm:grid-cols-4" : "sm:grid-cols-2"
          )}
        >
          <TabsTrigger value="akun">
            <UserIcon className="h-4 w-4" />
            Akun
          </TabsTrigger>
          {hasAdminAccess(currentUser) && (
            <TabsTrigger value="klinik">
              <Building2 className="h-4 w-4" />
              Profil Klinik
            </TabsTrigger>
          )}
          <TabsTrigger value="tampilan">
            <Palette className="h-4 w-4" />
            Tampilan
          </TabsTrigger>
          {hasAdminAccess(currentUser) && (
            <TabsTrigger value="sistem">
              <Info className="h-4 w-4" />
              Sistem
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="akun" className="grid gap-4 lg:grid-cols-2">
        {/* User Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              Profil Pengguna
            </CardTitle>
            <CardDescription>Kelola foto profil dan informasi pribadi Anda.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="relative">
                <Image
                  src={
                    avatarPreview
                    || resolveMediaUrl(currentUser?.avatarUrl, process.env.NEXT_PUBLIC_API_URL)
                    || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=random`
                  }
                  alt="Foto Profil"
                  width={96}
                  height={96}
                  className="rounded-full w-24 h-24 object-cover border"
                />
              </div>
              <div className="space-y-2 grow">
                <Label htmlFor="avatar-upload">Ubah Foto Profil</Label>
                <Input id="avatar-upload" type="file" accept="image/png, image/jpeg" onChange={handleAvatarFileChange} className="max-w-xs" />
                <p className="text-xs text-muted-foreground">PNG atau JPG, maks 5MB.</p>
                {avatarFile && (
                  <div className="flex items-center gap-4 pt-2">
                    <Button size="sm" onClick={handleAvatarSave} disabled={isUploadingAvatar}>
                      {isUploadingAvatar ? "Mengunggah..." : "Simpan Foto"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setAvatarFile(null); setAvatarPreview(null); }}>
                      Batal
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Nama</Label>
                <Input
                  id="profile-name"
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  maxLength={100}
                  disabled={isSavingProfile}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <p className="text-sm font-medium p-2 border rounded-md bg-muted/50">{currentUser.email}</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleProfileSave}
              disabled={isSavingProfile || !profileName.trim() || profileName.trim() === currentUser.name}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSavingProfile ? "Menyimpan..." : "Simpan Nama"}
            </Button>
          </CardContent>
        </Card>

        {/* Account Security */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              Keamanan Akun
            </CardTitle>
            <CardDescription>Ubah password Anda secara berkala untuk menjaga keamanan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {passwordError && <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{passwordError}</AlertDescription>
            </Alert>}
            <div className="space-y-2 relative">
              <Label htmlFor="currentPassword">Password Saat Ini</Label>
              <Input id="currentPassword" type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-6 h-8 w-8 text-muted-foreground" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <div className="grid gap-4">
              <div className="space-y-2 relative">
                <Label htmlFor="newPassword">Password Baru</Label>
                <Input id="newPassword" type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-6 h-8 w-8 text-muted-foreground" onClick={() => setShowNewPassword(!showNewPassword)}>
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                <Input id="confirmPassword" type={showNewPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleChangePassword} disabled={isChangingPassword || !currentPassword || !newPassword}>
              <Save className="w-4 h-4 mr-2" />
              {isChangingPassword ? "Menyimpan..." : "Ubah Password"}
            </Button>
          </CardContent>
        </Card>
        </TabsContent>

        {hasAdminAccess(currentUser) && (
          <TabsContent value="klinik">
            <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Profil Klinik
            </CardTitle>
            <CardDescription>Informasi dasar tentang klinik Anda (hanya dapat diakses Admin).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memuat pengaturan klinik...
              </div>
            ) : (
            <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Klinik</Label>
                <Input
                  id="name"
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">No. Telepon</Label>
                <Input
                  id="phone"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="operationalHours">Jam Operasional</Label>
                <Input
                  id="operationalHours"
                  value={settings.operationalHours}
                  onChange={(e) =>
                    setSettings({ ...settings, operationalHours: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="address">Alamat</Label>
                <Textarea
                  id="address"
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="min-h-24"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={settings.description}
                  onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                  className="min-h-24"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={isLoading || isSavingSettings}>
                <Save className="w-4 h-4 mr-2" />
                {isSavingSettings ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsResetDialogOpen(true)}
                disabled={isLoading || isSavingSettings}
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Reset ke Default
              </Button>
            </div>
            </>
            )}
          </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Theme */}
        <TabsContent value="tampilan">
          <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Tema Aplikasi
            </CardTitle>
            <CardDescription>
              Ikuti mode sistem atau pilih tema terang/gelap secara eksplisit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Mode sekarang</p>
              <Badge variant="secondary" className="uppercase">
                {isThemeReady ? resolvedTheme : "Memuat..."}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {THEME_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  size="sm"
                  variant={theme === option.value ? "secondary" : "outline"}
                  disabled={!isThemeReady}
                  onClick={() => isThemeReady && setTheme(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Mode sistem mengikuti pengaturan perangkat pengguna, sedangkan pilihan terang/gelap
              berlaku secara eksplisit untuk aplikasi.
            </p>
          </CardContent>
          </Card>
        </TabsContent>

        {hasAdminAccess(currentUser) && (
          <TabsContent value="sistem" className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Info className="h-4 w-4" />
                  Informasi Sistem
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y text-sm">
                  <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
                    <p className="text-muted-foreground">Versi Aplikasi</p>
                    <p className="font-medium">1.0.0</p>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3">
                    <p className="text-muted-foreground">Framework</p>
                    <p className="font-medium">Next.js 14</p>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3 last:pb-0">
                    <p className="text-muted-foreground">UI Library</p>
                    <p className="font-medium">shadcn/ui</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <DatabaseBackup className="h-4 w-4" />
                  Backup &amp; Pemulihan Data
                </CardTitle>
                <CardDescription>
                  Ekspor snapshot data ke file JSON, pulihkan dari file, atau jalankan backup database (mysqldump) di server.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <input
                  ref={restoreInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={handleRestoreBackup}
                />
                <Button variant="outline" className="w-full justify-start" onClick={handleExportBackup} disabled={isExportingBackup}>
                  {isExportingBackup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Ekspor Snapshot JSON
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => restoreInputRef.current?.click()}
                  disabled={isRestoringBackup}
                >
                  {isRestoringBackup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Pulihkan dari Snapshot JSON
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={handleRunDump} disabled={isRunningDump}>
                  {isRunningDump ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseBackup className="mr-2 h-4 w-4" />}
                  Jalankan Backup Database (mysqldump)
                </Button>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Pemulihan akan menimpa seluruh data yang ada. Pastikan Anda mengekspor snapshot terlebih dahulu.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Reset Pengaturan Klinik?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan mengembalikan semua informasi profil klinik ke pengaturan default. Apakah Anda yakin ingin melanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={executeReset}>Ya, Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
