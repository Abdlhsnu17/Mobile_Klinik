"use client"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { getClinicNotifications, type ClinicNotification } from "@/lib/clinic-notifications"
import { CLINIC_DATA_CHANGED_EVENT } from "@/lib/clinic-utils"
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  CheckCheck,
  Clock3,
  Inbox,
  Info,
  Menu,
  X,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import type { SafeUser } from "@/lib/auth-types"

interface HeaderProps {
  onToggleMobileSidebar: () => void
  isMobileSidebarOpen: boolean
  userRole: SafeUser["role"]
}

const NOTIFICATION_REFRESH_INTERVAL_MS = 30_000

export default function Header({
  onToggleMobileSidebar,
  isMobileSidebarOpen,
  userRole,
}: HeaderProps) {
  const pathname = usePathname()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [rawNotifications, setRawNotifications] = useState<ClinicNotification[]>([])
  const [dismissedSignatures, setDismissedSignatures] = useState<Record<string, string>>({})
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadNotifications = async () => {
      try {
        const items = await getClinicNotifications(userRole)
        if (isMounted) {
          setRawNotifications(items)
        }
      } catch (error) {
        console.error("Gagal memuat notifikasi klinik", error)
      }
    }

    void loadNotifications()
    const refreshInterval = window.setInterval(() => {
      void loadNotifications()
    }, NOTIFICATION_REFRESH_INTERVAL_MS)
    const refreshOnFocus = () => void loadNotifications()
    const refreshOnDataChange = () => void loadNotifications()
    window.addEventListener("focus", refreshOnFocus)
    window.addEventListener(CLINIC_DATA_CHANGED_EVENT, refreshOnDataChange)

    return () => {
      isMounted = false
      window.clearInterval(refreshInterval)
      window.removeEventListener("focus", refreshOnFocus)
      window.removeEventListener(CLINIC_DATA_CHANGED_EVENT, refreshOnDataChange)
    }
  }, [pathname, userRole])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const saved = window.localStorage.getItem("klinik:notifications:dismissed")
      if (saved) {
        setDismissedSignatures(JSON.parse(saved))
      }
    } catch (error) {
      console.error("Gagal memuat preferensi notifikasi", error)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(
        "klinik:notifications:dismissed",
        JSON.stringify(dismissedSignatures),
      )
    } catch (error) {
      console.error("Gagal menyimpan preferensi notifikasi", error)
    }
  }, [dismissedSignatures])

  const formatTime = (date: Date) => ({
    hours: String(date.getHours()).padStart(2, "0"),
    minutes: String(date.getMinutes()).padStart(2, "0"),
    seconds: String(date.getSeconds()).padStart(2, "0"),
  })

  const formatDate = (date: Date) => {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ]
    
    const dayName = days[date.getDay()]
    const day = date.getDate()
    const month = months[date.getMonth()]
    const year = date.getFullYear()
    
    return { dayName, day, month, year }
  }

  const { dayName, day, month, year } = formatDate(currentTime)
  const { hours, minutes, seconds } = formatTime(currentTime)
  const visibleNotifications = useMemo(
    () =>
      rawNotifications.filter(
        (notification) => dismissedSignatures[notification.id] !== notification.signature,
      ),
    [rawNotifications, dismissedSignatures],
  )
  const mobileToggleLabel = isMobileSidebarOpen ? "Tutup menu" : "Buka menu"
  const notificationCount = visibleNotifications.length
  const dismissNotification = (notification: ClinicNotification) => {
    setDismissedSignatures((prev) => ({
      ...prev,
      [notification.id]: notification.signature,
    }))
  }
  const dismissAllNotifications = () => {
    setDismissedSignatures((prev) => {
      const next = { ...prev }
      visibleNotifications.forEach((notification) => {
        next[notification.id] = notification.signature
      })
      return next
    })
  }

  return (
    <header className="neumorphic-surface relative z-30 flex w-full shrink-0 items-center justify-between gap-3 px-4 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleMobileSidebar}
          className="h-11 w-11 rounded-[1rem] md:hidden"
          aria-label={mobileToggleLabel}
          aria-expanded={isMobileSidebarOpen}
        >
          {isMobileSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className="flex min-h-10 flex-1 items-center justify-between gap-4 px-1">
          <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/70 bg-linear-to-br from-white/90 via-white/65 to-primary/10 px-2.5 py-1.5 shadow-[0_10px_26px_rgba(31,35,64,0.10),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl dark:border-white/10 dark:from-white/10 dark:via-white/5 dark:to-primary/10 dark:shadow-[0_12px_30px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.08)] sm:px-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-secondary text-primary-foreground shadow-[0_6px_16px_rgba(13,148,136,0.28)]">
              <Clock3 className="h-4 w-4" strokeWidth={2.2} />
            </div>
            <div className="flex min-w-0 items-center gap-3 whitespace-nowrap">
              <span className="hidden text-[0.58rem] font-bold uppercase tracking-[0.28em] text-muted-foreground sm:inline">
                Waktu
              </span>
              <time
                dateTime={`${hours}:${minutes}:${seconds}`}
                aria-label={`Pukul ${hours} ${minutes} ${seconds}`}
                className="flex items-baseline font-mono text-base font-bold tabular-nums tracking-[-0.04em] text-foreground sm:text-lg"
              >
                <span>{hours}</span>
                <span className="mx-0.5 text-primary/65">:</span>
                <span>{minutes}</span>
                <span className="mx-0.5 text-primary/65">:</span>
                <span className="text-[0.78em] text-muted-foreground">{seconds}</span>
              </time>
            </div>
          </div>
          <div className="shrink-0 text-right text-xs font-medium text-muted-foreground sm:text-sm">
            {dayName}, {day} {month} {year}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center">
        <Popover open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "group relative h-11 w-11 rounded-2xl border transition-all duration-200",
                "border-white/70 bg-white/65 text-foreground shadow-[0_8px_20px_rgba(31,35,64,0.10),inset_0_1px_0_rgba(255,255,255,0.9)]",
                "hover:-translate-y-0.5 hover:border-primary/20 hover:bg-primary/10 hover:text-primary hover:shadow-[0_12px_24px_rgba(15,118,110,0.16)]",
                "dark:border-white/10 dark:bg-white/5 dark:shadow-[0_8px_20px_rgba(0,0,0,0.25)]",
                isNotificationOpen && "border-primary/25 bg-primary/10 text-primary ring-4 ring-primary/10",
              )}
              aria-label="Notifikasi"
            >
              <Bell
                className="h-[1.15rem] w-[1.15rem] transition-transform duration-200 group-hover:-rotate-6"
                strokeWidth={2.2}
              />
              {notificationCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[0.6rem] font-bold leading-none text-white shadow-[0_4px_10px_rgba(244,63,94,0.35)] dark:border-[#0f1326]">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              )}
              <span className="sr-only">Notifikasi</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={12}
            className="w-[calc(100vw-1.5rem)] overflow-hidden rounded-[1.5rem] border border-white/70 bg-popover/95 p-0 shadow-[0_24px_70px_rgba(24,30,91,0.22),0_4px_16px_rgba(24,30,91,0.08)] backdrop-blur-2xl dark:border-white/10 dark:shadow-[0_26px_70px_rgba(0,0,0,0.55)] sm:w-[25rem]"
          >
            <div className="relative overflow-hidden border-b border-border/60 bg-linear-to-br from-white/80 via-white/45 to-primary/10 px-5 pb-4 pt-5 dark:from-white/8 dark:via-white/3 dark:to-primary/10">
              <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-teal-500 text-primary-foreground shadow-[0_8px_20px_rgba(15,118,110,0.25)]">
                    <Bell className="h-[1.15rem] w-[1.15rem]" strokeWidth={2.2} />
                  </div>
                  <div>
                    <p className="text-base font-bold tracking-[-0.02em]">Notifikasi</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {notificationCount > 0
                        ? `${notificationCount} informasi perlu diperhatikan`
                        : "Semua informasi sudah ditinjau"}
                    </p>
                  </div>
                </div>
                {notificationCount > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 shrink-0 rounded-xl px-2.5 text-[0.7rem] font-semibold text-primary hover:bg-primary/10 hover:text-primary"
                    onClick={dismissAllNotifications}
                  >
                    <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                    Tandai dibaca
                  </Button>
                )}
              </div>
            </div>
            <div className="max-h-[min(26rem,calc(100vh-10rem))] space-y-2 overflow-y-auto p-3">
              {visibleNotifications.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-10 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(15,118,110,0.08)]">
                    <Inbox className="h-6 w-6" strokeWidth={1.8} />
                  </div>
                  <p className="text-sm font-bold text-foreground">Semua beres</p>
                  <p className="mt-1 max-w-56 text-xs leading-relaxed text-muted-foreground">
                    Tidak ada notifikasi terbaru yang perlu ditindaklanjuti.
                  </p>
                </div>
              ) : (
                visibleNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "group/item relative overflow-hidden rounded-2xl border transition-all duration-200",
                      "hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(31,35,64,0.10)]",
                      notification.severity === "warning"
                        ? "border-rose-200/80 bg-linear-to-br from-rose-50/95 to-orange-50/65 dark:border-rose-400/20 dark:from-rose-500/10 dark:to-orange-500/5"
                        : "border-border/60 bg-linear-to-br from-white/90 to-slate-50/70 dark:from-white/6 dark:to-white/3",
                    )}
                  >
                    <Link
                      href={notification.href}
                      onClick={() => {
                        dismissNotification(notification)
                        setIsNotificationOpen(false)
                      }}
                      className="flex items-start gap-3 px-3.5 py-3.5 pr-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                          notification.severity === "warning"
                            ? "bg-rose-500/12 text-rose-600 dark:text-rose-300"
                            : "bg-primary/10 text-primary",
                        )}
                      >
                        {notification.severity === "warning" ? (
                          <AlertTriangle className="h-[1.05rem] w-[1.05rem]" strokeWidth={2.2} />
                        ) : (
                          <Info className="h-[1.05rem] w-[1.05rem]" strokeWidth={2.2} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "mb-1 block text-[0.62rem] font-bold uppercase tracking-[0.16em]",
                            notification.severity === "warning"
                              ? "text-rose-600 dark:text-rose-300"
                              : "text-primary",
                          )}
                        >
                          {notification.severity === "warning" ? "Perlu perhatian" : "Informasi"}
                        </span>
                        <span className="block text-sm font-bold leading-snug tracking-[-0.01em] text-foreground">
                          {notification.title}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                          {notification.description}
                        </span>
                      </span>
                    </Link>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-3 top-3 h-7 w-7 rounded-lg text-muted-foreground/70 opacity-70 hover:bg-background/80 hover:text-foreground group-hover/item:opacity-100"
                      aria-label={`Tutup notifikasi ${notification.title}`}
                      title="Tandai dibaca"
                      onClick={() => dismissNotification(notification)}
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </Button>
                    <ArrowUpRight className="pointer-events-none absolute bottom-3.5 right-3.5 h-3.5 w-3.5 text-muted-foreground/45 transition-all duration-200 group-hover/item:-translate-y-0.5 group-hover/item:translate-x-0.5 group-hover/item:text-primary" />
                  </div>
                ))
              )}
            </div>
            {notificationCount > 0 && (
              <div className="border-t border-border/50 bg-background/35 px-5 py-3 text-center">
                <p className="text-[0.68rem] font-medium text-muted-foreground">
                  Pilih notifikasi untuk membuka detail dan menandainya dibaca
                </p>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </header>
  )
}
