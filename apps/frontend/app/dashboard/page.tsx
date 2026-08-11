"use client"

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveMediaUrl } from "@/lib/api-base";
import type { User } from "@/lib/auth-types";
import { getCurrentUser } from "@/lib/auth-utils";
import { getAllowedModuleSections } from "@/lib/module-registry";
import { getAllowedModuleHrefs, loadRoleAccessSettings, ROLE_ACCESS_CHANGED_EVENT } from "@/lib/role-access";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function DashboardPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<Omit<User, "password"> | null>(null)
  const [roleAccessSettings, setRoleAccessSettings] = useState(loadRoleAccessSettings)
  const userRole = currentUser?.role
  const avatarUrl = resolveMediaUrl(currentUser?.avatarUrl, process.env.NEXT_PUBLIC_API_URL)

  const allowedModuleSections = useMemo(
    () => getAllowedModuleSections(userRole, getAllowedModuleHrefs(userRole, roleAccessSettings)),
    [roleAccessSettings, userRole],
  )
  useEffect(() => {
    const user = getCurrentUser()
    if (!user) {
      router.push("/login")
    } else {
      setCurrentUser(user)
    }
  }, [router])

  useEffect(() => {
    const syncRoleAccessSettings = () => setRoleAccessSettings(loadRoleAccessSettings())
    window.addEventListener(ROLE_ACCESS_CHANGED_EVENT, syncRoleAccessSettings)
    window.addEventListener("storage", syncRoleAccessSettings)
    return () => {
      window.removeEventListener(ROLE_ACCESS_CHANGED_EVENT, syncRoleAccessSettings)
      window.removeEventListener("storage", syncRoleAccessSettings)
    }
  }, [])

  if (!currentUser) return null

  // Kolom "Menu Utama" (Dashboard & Pendaftaran) tidak ditampilkan di grid kelompok modul.
  const moduleGridSections = allowedModuleSections.filter((section) => section.id !== "menu-utama")

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 pb-6">
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card px-5 py-5 shadow-sm sm:px-6">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-linear-to-l from-primary/10 to-transparent lg:block" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-4">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={`Foto profil ${currentUser.name}`}
                width={56}
                height={56}
                className="h-14 w-14 shrink-0 rounded-2xl border border-border/60 object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground shadow-sm">
                {currentUser.name
                  .split(" ")
                  .map((n: string) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Dashboard Operasional
              </p>
              <h1 className="truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Selamat Datang, {currentUser.name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1 capitalize">
              {currentUser.role}
            </Badge>
          </div>
        </div>
      </section>

      <section aria-labelledby="module-heading" className="space-y-3">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 id="module-heading" className="text-lg font-bold tracking-tight text-foreground">
              Menu Utama
            </h2>
            <p className="mt-1 text-sm text-muted-foreground"></p>
          </div>
        </div>
        <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {moduleGridSections.map((section) => {
            // "Layanan Medis" punya item paling banyak, jadi kartunya melebar 2 kolom
            // dengan daftar item tersusun 2 kolom agar tingginya turun dan grid rata.
            const isWide = section.id === "layanan-medis"
            return (
              <Card
                key={section.id}
                className={`h-full gap-2 rounded-2xl px-3.5 py-3.5 shadow-sm ${isWide ? "sm:col-span-2" : ""}`}
              >
                <CardHeader className="pb-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-sm">{section.label}</CardTitle>
                    <Badge variant="outline" className="rounded-full text-[11px]">
                      {section.items.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent
                  className={`px-0 ${isWide ? "grid grid-cols-1 gap-1 sm:grid-cols-2" : "space-y-1"}`}
                >
                  {section.items.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="group flex items-center gap-2.5 rounded-lg border border-transparent px-2 py-2 transition hover:border-border/70 hover:bg-muted/50"
                      >
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.toneClassName}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                          {item.shortTitle ?? item.title}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition group-hover:translate-x-0.5 group-hover:text-primary" />
                      </Link>
                    )
                  })}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}
