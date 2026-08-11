"use client"

import { useMemo, useState } from "react"
import { Save, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { moduleSections, type UserRole } from "@/lib/module-registry"
import {
  loadRoleAccessSettings,
  MANAGED_ROLE_ORDER,
  saveRoleAccessSettings,
} from "@/lib/role-access"
import { cn } from "@/lib/utils"

const ROLE_DETAILS: Record<UserRole, { label: string; description: string }> = {
  admin: {
    label: "Admin",
    description: "Administrator dengan akses penuh sistem.",
  },
  dokter: {
    label: "Dokter",
    description: "Akses pelayanan medis, pemeriksaan, dan rekam medis pasien.",
  },
  perawat: {
    label: "Perawat",
    description: "Akses pelayanan keperawatan dan operasional pasien.",
  },
  bidan: {
    label: "Bidan",
    description: "Akses pelayanan kebidanan dan data medis terkait.",
  },
  teknis: {
    label: "Teknis",
    description: "Akses laboratorium, farmasi, serta operasional teknis.",
  },
  umum: {
    label: "Umum",
    description: "Akses administrasi dan pelayanan umum klinik.",
  },
}

export function RoleAccessManager() {
  const { toast } = useToast()
  const [selectedRole, setSelectedRole] = useState<UserRole>("admin")
  const [draftSettings, setDraftSettings] = useState(loadRoleAccessSettings)

  const availableModules = useMemo(
    () => moduleSections.flatMap((section) => section.items),
    []
  )

  const selectedAccess = useMemo(
    () => new Set(draftSettings[selectedRole] ?? []),
    [draftSettings, selectedRole]
  )

  const toggleModule = (href: string, checked: boolean) => {
    if (selectedRole === "admin") return

    setDraftSettings((current) => {
      const nextRoleAccess = new Set(current[selectedRole] ?? [])
      if (checked) {
        nextRoleAccess.add(href)
      } else {
        nextRoleAccess.delete(href)
      }

      return {
        ...current,
        [selectedRole]: Array.from(nextRoleAccess),
      }
    })
  }

  const handleSave = () => {
    const normalized = saveRoleAccessSettings(draftSettings)
    setDraftSettings(normalized)
    toast({
      title: "Hak akses disimpan",
      description: `Menu untuk role ${ROLE_DETAILS[selectedRole].label} berhasil diperbarui.`,
    })
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <Card className="h-fit gap-3 px-3 py-4">
        <CardHeader className="px-1 pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Role
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 px-0">
          {MANAGED_ROLE_ORDER.map((role) => {
            const isSelected = selectedRole === role

            return (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={cn(
                  "h-[4.5rem] w-full rounded-xl px-3 py-2.5 text-left transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-primary/10"
                )}
                aria-pressed={isSelected}
              >
                <span className="block text-sm font-bold">{ROLE_DETAILS[role].label}</span>
                <span
                  className={cn(
                    "mt-0.5 line-clamp-2 block text-xs leading-snug",
                    isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}
                >
                  {ROLE_DETAILS[role].description}
                </span>
              </button>
            )
          })}
        </CardContent>
      </Card>

      <Card className="min-w-0 gap-4 px-5 py-5">
        <CardHeader className="gap-3 pb-4 sm:grid-cols-[1fr_auto]">
          <div>
            <CardTitle className="text-xl">Menu yang Diizinkan</CardTitle>
            <CardDescription className="mt-1 text-sm">
              Centang menu yang boleh tampil dan diakses oleh role terpilih.
            </CardDescription>
          </div>
          <div className="flex sm:justify-end">
            <Button
              type="button"
              onClick={handleSave}
              className="h-10 rounded-full px-5 text-sm"
            >
              <Save className="mr-2 h-4 w-4" />
              Simpan Hak Akses
            </Button>
          </div>
        </CardHeader>

        <CardContent className="grid auto-rows-fr gap-2.5 px-0 sm:grid-cols-2 xl:grid-cols-3">
          {availableModules.map((item) => {
            const checkboxId = `role-access-${selectedRole}-${item.href.replaceAll("/", "-")}`

            return (
              <label
                key={item.href}
                htmlFor={checkboxId}
                className={cn(
                  "flex h-12 min-w-0 items-center gap-3 rounded-xl border border-border/60 bg-background/45 px-3.5 py-2.5 transition-colors",
                  selectedRole === "admin"
                    ? "cursor-default"
                    : "cursor-pointer hover:border-primary/40 hover:bg-primary/5"
                )}
              >
                <Checkbox
                  id={checkboxId}
                  checked={selectedAccess.has(item.href)}
                  disabled={selectedRole === "admin"}
                  onCheckedChange={(checked) => toggleModule(item.href, checked === true)}
                  aria-label={`Izinkan menu ${item.title}`}
                  className="h-4 w-4 disabled:opacity-100"
                />
                <span className="min-w-0 truncate text-sm font-semibold leading-tight">
                  {item.title}
                </span>
              </label>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
