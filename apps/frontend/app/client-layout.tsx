"use client"

import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { ThemeModeProvider } from "@/components/theme-mode-provider";
import { Toaster } from "@/components/ui/toaster";
import { UserProvider } from "@/contexts/user-context";
import { AUTH_SESSION_CHANGED_EVENT, getCurrentUser } from "@/lib/auth-utils";
import {
    canRoleAccessPath,
    getRoleLandingPath,
    loadRoleAccessSettings,
    ROLE_ACCESS_CHANGED_EVENT,
} from "@/lib/role-access";
import { usePathname, useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";

const SIDEBAR_COLLAPSED_KEY = "sidebar:collapsed"

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null)
  const [mounted, setMounted] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
        if (saved !== null) {
          setIsSidebarCollapsed(saved === "true")
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    setMounted(true)
    setUser(getCurrentUser())
  }, [pathname])

  useEffect(() => {
    const syncUser = () => setUser(getCurrentUser())
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, syncUser)
    window.addEventListener(ROLE_ACCESS_CHANGED_EVENT, syncUser)
    window.addEventListener("storage", syncUser)
    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, syncUser)
      window.removeEventListener(ROLE_ACCESS_CHANGED_EVENT, syncUser)
      window.removeEventListener("storage", syncUser)
    }
  }, [])

  useEffect(() => {
    if (!mounted) return

    const publicPaths = ["/", "/login", "/daftar", "/lupa-password"]
    if (publicPaths.includes(pathname)) return

    if (!user) {
      router.replace("/login")
      return
    }

    const roleAccessSettings = loadRoleAccessSettings()
    if (!canRoleAccessPath(user.role, pathname, roleAccessSettings)) {
      router.replace(getRoleLandingPath(user.role, roleAccessSettings))
    }
  }, [mounted, pathname, router, user])

  useEffect(() => {
    setIsMobileSidebarOpen(false)
  }, [pathname])

  const toggleDesktopSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
        }
      } catch {}
      return next
    })
  }

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen((prev) => !prev)
  }

  const isPublicPage = ["/", "/login", "/daftar", "/lupa-password"].includes(pathname)
  const showLayout = mounted && !isPublicPage && user

  if (!mounted) {
    return null
  }

  return (
    <ThemeModeProvider>
      <UserProvider>
        {showLayout ? (
          /* Kontainer luar untuk memberikan efek "inset" pada layar besar */
          <div className="h-screen bg-transparent p-0 sm:p-2 md:p-4">
            <div className="flex h-full w-full overflow-hidden rounded-none bg-background shadow-sm sm:rounded-xl">
              <Sidebar
                collapsed={isSidebarCollapsed}
                isMobileOpen={isMobileSidebarOpen}
                onMobileClose={() => setIsMobileSidebarOpen(false)}
                onToggleDesktop={toggleDesktopSidebar}
              />
              {/* Kontainer konten utama dengan padding yang konsisten */}
              <div className="flex min-w-0 flex-1 flex-col gap-6 md:pt-4 md:pr-2">
                <Header
                  onToggleMobileSidebar={toggleMobileSidebar}
                  isMobileSidebarOpen={isMobileSidebarOpen}
                  userRole={user.role}
                />
                <main className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6">
                  <div className="flex h-full w-full max-w-full flex-col gap-6">
                    {children}
                  </div>
                </main>
              </div>
            </div>
          </div>
        ) : (
          children
        )}
        <Toaster />
      </UserProvider>
    </ThemeModeProvider>
  )
}
