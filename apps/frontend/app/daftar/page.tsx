"use client"

import AuthShell from "@/components/auth-shell";
import BrandLogo from "@/components/brand-logo";
import GlassCard from "@/components/glass-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerUser } from "@/lib/auth-utils";
import { BRAND_COPYRIGHT } from "@/lib/brand";
import { CheckCircle, Eye, EyeOff, Loader2, Lock, Mail, User as UserIcon } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";

export default function DaftarPage() {
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    if (formData.password !== formData.confirmPassword) {
      setError("Password dan konfirmasi password tidak sama")
      setIsLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError("Password minimal 6 karakter")
      setIsLoading(false)
      return
    }

    try {
      await registerUser({
        name: formData.name,
        username: formData.username,
        email: formData.email,
        password: formData.password,
      })
      setSuccess(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Pendaftaran gagal. Silakan coba lagi.")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div
        className="min-h-screen w-full bg-cover bg-center"
        style={{ backgroundImage: "url(/background.png)" }}
      >
        <AuthShell>
          <div className="w-full max-w-md space-y-4 px-4 sm:px-0">
            <GlassCard className="space-y-6 bg-white/10 backdrop-blur-sm px-6 py-6 sm:px-8 text-center">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/20">
                  <CheckCircle className="h-8 w-8 text-teal-700 dark:text-teal-300" />
                </div>
              </div>
              <p className="text-2xl font-semibold text-foreground">Pendaftaran Berhasil!</p>
              <p className="text-sm text-muted-foreground">
                Akun pasien Anda telah berhasil dibuat. Akun petugas hanya dapat dibuat oleh administrator.
              </p>
              <Button
                asChild
                className="w-full rounded-[18px] bg-linear-to-r from-[#00969f] to-[#00c3c7] py-2.5 text-base font-semibold text-white shadow-lg shadow-[#00969f]/30"
              >
                <Link href="/login">Kembali ke Halaman Login</Link>
              </Button>
            </GlassCard>
            <p className="text-center text-xs text-muted-foreground">{BRAND_COPYRIGHT}</p>
          </div>
        </AuthShell>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center"
      style={{ backgroundImage: "url(/background.png)" }}
    >
      <AuthShell>
        <div className="w-full max-w-md space-y-4 px-4 sm:px-0">
          <GlassCard className="space-y-4 bg-white/10 backdrop-blur-sm px-6 py-6 sm:px-8">
            <div className="flex flex-col items-center gap-1 text-center">
              <BrandLogo className="gap-2" />
              <p className="text-lg font-semibold text-foreground">Daftar Akun Baru</p>
              <p className="text-sm text-muted-foreground">Lengkapi data untuk mengakses sistem</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1">
                <Label htmlFor="name">Nama Lengkap</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-primary">
                    <UserIcon className="h-4 w-4" />
                  </span>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Masukkan nama lengkap"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={isLoading}
                    className="rounded-xl border border-border bg-white/80 px-4 py-2 pl-11 font-medium text-foreground shadow-[0_10px_20px_rgba(2,5,21,0.08)]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-primary">
                    <UserIcon className="h-4 w-4" />
                  </span>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Masukkan username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    disabled={isLoading}
                    className="rounded-xl border border-border bg-white/80 px-4 py-2 pl-11 font-medium text-foreground shadow-[0_10px_20px_rgba(2,5,21,0.08)]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-primary">
                    <Mail className="h-4 w-4" />
                  </span>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Masukkan email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={isLoading}
                    className="rounded-xl border border-border bg-white/80 px-4 py-2 pl-11 font-medium text-foreground shadow-[0_10px_20px_rgba(2,5,21,0.08)]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-primary">
                    <Lock className="h-4 w-4" />
                  </span>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimal 6 karakter"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    disabled={isLoading}
                    className="rounded-xl border border-border bg-white/80 px-4 py-2 pl-11 pr-10 font-medium text-foreground shadow-[0_10px_20px_rgba(2,5,21,0.08)]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-primary">
                    <Lock className="h-4 w-4" />
                  </span>
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Ulangi password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    disabled={isLoading}
                    className="rounded-xl border border-border bg-white/80 px-4 py-2 pl-11 pr-10 font-medium text-foreground shadow-[0_10px_20px_rgba(2,5,21,0.08)]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full text-muted-foreground"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full rounded-[18px] bg-linear-to-r from-[#00969f] to-[#00c3c7] py-2.5 text-base font-semibold text-white shadow-lg shadow-[#00969f]/30"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  "Daftar"
                )}
              </Button>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">Sudah punya akun? </span>
                <Link href="/login" className="text-primary font-semibold hover:underline">
                  Masuk
                </Link>
              </div>
            </form>
          </GlassCard>

          <p className="text-center text-xs text-muted-foreground">{BRAND_COPYRIGHT}</p>
        </div>

        {isLoading && (
          <div className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-3 text-sm font-medium text-foreground">Memuat...</p>
          </div>
        )}
      </AuthShell>
    </div>
  )
}
