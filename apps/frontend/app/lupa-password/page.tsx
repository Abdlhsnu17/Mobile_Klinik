"use client"

import AuthShell from "@/components/auth-shell";
import BrandLogo from "@/components/brand-logo";
import GlassCard from "@/components/glass-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset, resetPassword } from "@/lib/auth-utils";
import { BRAND_COPYRIGHT } from "@/lib/brand";
import { CheckCircle, Eye, EyeOff, KeyRound, Loader2, Lock, Mail } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

export default function LupaPasswordPage() {
  const [step, setStep] = useState<"request" | "reset" | "success">("request")
  const [email, setEmail] = useState("")
  const [token, setToken] = useState("")
  const [devToken, setDevToken] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const tokenFromEmail = new URLSearchParams(window.location.search).get("token")
    if (tokenFromEmail) {
      setToken(tokenFromEmail)
      setStep("reset")
    }
  }, [])

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const result = await requestPasswordReset(email)
      const localToken = result.devToken ?? ""
      setDevToken(localToken)
      setToken(localToken)
      setStep("reset")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Permintaan gagal. Coba kembali.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (newPassword !== confirmPassword) {
      setError("Password dan konfirmasi password tidak sama")
      return
    }

    if (newPassword.length < 6) {
      setError("Password minimal 6 karakter")
      return
    }

    setIsLoading(true)
    try {
      await resetPassword(token.trim(), newPassword)
      setStep("success")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Gagal menyetel ulang password.")
    } finally {
      setIsLoading(false)
    }
  }

  if (step === "success") {
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
            <p className="text-2xl font-semibold text-foreground">Password Berhasil Diubah!</p>
            <p className="text-sm text-muted-foreground">
              Password Anda telah berhasil diubah. Silakan login dengan password baru.
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
          <div className="flex flex-col items-center gap-2 text-center">
            <BrandLogo className="gap-2" />
            <p className="text-lg font-semibold text-foreground">
              {step === "request" ? "Lupa Password" : "Reset Password"}
            </p>
            <p className="text-sm text-muted-foreground">
              {step === "request"
                ? "Masukkan email yang terdaftar untuk menerima token reset."
                : "Masukkan token dan password baru untuk menyelesaikan reset."}
            </p>
          </div>

          {step === "request" ? (
            <form onSubmit={handleRequestReset} className="space-y-3">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-primary">
                    <Mail className="h-4 w-4" />
                  </span>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Masukkan email terdaftar"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="rounded-[14px] border border-border bg-white/80 px-4 py-2 pl-11 font-medium text-foreground shadow-[0_10px_20px_rgba(2,5,21,0.08)]"
                  />
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
                  "Kirim Permintaan Reset"
                )}
              </Button>

              <div className="text-center text-sm">
                <Link href="/login" className="text-primary font-semibold hover:underline">
                  Kembali ke halaman login
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-3">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Alert className="bg-accent/10 border-accent/30">
                <AlertDescription className="text-sm">
                  {devToken ? (
                    <>
                      <strong>Token reset lokal:</strong>
                      <code className="block mt-2 p-2 bg-background rounded text-xs break-all">{devToken}</code>
                      <span className="text-xs text-muted-foreground mt-2 block">
                        Token ini hanya ditampilkan pada mode pengembangan.
                      </span>
                    </>
                  ) : (
                    "Instruksi reset password telah dibuat. Masukkan token yang Anda terima untuk melanjutkan."
                  )}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="token">Token Reset</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-primary">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <Input
                    id="token"
                    type="text"
                    placeholder="Masukkan token reset"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    required
                    disabled={isLoading}
                    className="rounded-[14px] border border-border bg-white/80 px-4 py-2 pl-11 font-medium text-foreground shadow-[0_10px_20px_rgba(2,5,21,0.08)]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Password Baru</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-primary">
                    <Lock className="h-4 w-4" />
                  </span>
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="rounded-[14px] border border-border bg-white/80 px-4 py-2 pl-11 pr-10 font-medium text-foreground shadow-[0_10px_20px_rgba(2,5,21,0.08)]"
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-primary">
                    <Lock className="h-4 w-4" />
                  </span>
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Ulangi password baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="rounded-[14px] border border-border bg-white/80 px-4 py-2 pl-11 pr-10 font-medium text-foreground shadow-[0_10px_20px_rgba(2,5,21,0.08)]"
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
                    Menyimpan...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>

              <div className="text-center text-sm">
                <Link href="/login" className="text-primary font-semibold hover:underline">
                  Kembali ke halaman login
                </Link>
              </div>
            </form>
          )}
          </GlassCard>
          <p className="text-center text-xs text-muted-foreground">{BRAND_COPYRIGHT}</p>
        </div>
      </AuthShell>
    </div>
  )
}
