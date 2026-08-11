"use client"

import AuthShell from "@/components/auth-shell";
import BrandLogo from "@/components/brand-logo";
import GlassCard from "@/components/glass-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/auth-utils";
import { BRAND_COPYRIGHT } from "@/lib/brand";
import { Eye, EyeOff, Loader2, Lock, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Mulai siapkan halaman tujuan saat pengguna masih mengisi form. Pada mode
    // development, prefetch Next.js dinonaktifkan sehingga request HEAD dipakai
    // untuk memicu kompilasi dashboard lebih awal.
    router.prefetch("/dashboard")

    let warmupTimer: ReturnType<typeof setTimeout> | undefined
    let warmupController: AbortController | undefined
    if (process.env.NODE_ENV === "development") {
      warmupController = new AbortController()
      warmupTimer = setTimeout(() => {
        void fetch("/dashboard", {
          method: "HEAD",
          cache: "no-store",
          signal: warmupController?.signal,
        }).catch(() => {
          // Warm-up hanya optimasi; kegagalannya tidak boleh mengganggu login.
        })
      }, 100)
    }

    const rememberedUser = localStorage.getItem("remembered_user");
    if (rememberedUser) {
      try {
        const { username: rememberedUsername } = JSON.parse(rememberedUser);
        if (typeof rememberedUsername === "string") {
          setUsername(rememberedUsername);
          setRemember(true);
        }
      } catch {
        localStorage.removeItem("remembered_user")
      }
    }

    return () => {
      if (warmupTimer) clearTimeout(warmupTimer)
      warmupController?.abort()
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      if (remember) {
        // Security Fix: Do not store password in localStorage. Only username.
        localStorage.setItem("remembered_user", JSON.stringify({ username }));
      } else {
        localStorage.removeItem("remembered_user");
      }
      await login(username, password)
      router.replace("/dashboard")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Username atau password salah")
      setIsLoading(false)
    }
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
              <p className="text-lg font-semibold text-foreground">Sistem Informasi Klinik</p>
              <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">"SIMKLAB"</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1">
                <Label htmlFor="username">Username atau Email</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-primary">
                    <User className="h-4 w-4" />
                  </span>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Masukkan username atau email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={isLoading}
                    className="rounded-[14px] border border-border bg-white/80 px-4 py-2 pl-11 pr-3 font-medium text-foreground shadow-[0_10px_20px_rgba(2,5,21,0.08)]"
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
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="rounded-[14px] border border-border bg-white/80 px-4 py-2 pl-11 pr-10 font-medium text-foreground shadow-[0_10px_20px_rgba(2,5,21,0.08)]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/70 text-muted-foreground shadow-sm"
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

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    disabled={isLoading}
                    className="h-4 w-4 rounded border border-border bg-background text-primary focus:ring-0"
                  />
                  Ingat saya di perangkat ini
                </label>
                <Link href="/lupa-password" className="text-sm font-medium text-primary hover:underline">
                  Lupa Password?
                </Link>
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
                  "Login"
                )}
              </Button>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">Belum memiliki akun? </span>
                <Link href="/daftar" className="text-primary font-semibold hover:underline">
                  Daftar sekarang
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
