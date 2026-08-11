"use client"

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getCurrentUser, logout } from "@/lib/auth-utils";
import { LOGO_SRC } from "@/lib/brand";
import { getAllowedModuleHrefs, loadRoleAccessSettings, ROLE_ACCESS_CHANGED_EVENT } from "@/lib/role-access";
import { SIDEBAR_NAV_ITEMS } from "@/lib/sidebar-nav";
import { cn } from "@/lib/utils";
import {
    ChevronLeft,
    LogOut,
    Menu,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type SidebarProps = {
  collapsed?: boolean
  isMobileOpen?: boolean
  onMobileClose?: () => void
  onToggleDesktop?: () => void
}

export default function Sidebar({
  collapsed = false,
  isMobileOpen = false,
  onMobileClose,
  onToggleDesktop,
}: SidebarProps) {
  const pathname = usePathname()
  const user = getCurrentUser()
  const [roleAccessSettings, setRoleAccessSettings] = useState(loadRoleAccessSettings)

  const sidebarWidthClass = collapsed ? "md:w-16" : "md:w-64"
  const handleLinkClick = () => {
    if (isMobileOpen) {
      onMobileClose?.()
    }
  }

  const handleLogout = () => {
    logout()
  }

  const visibleNavGroups = useMemo(() => {
    if (!user) return [];
    const allowedHrefs = getAllowedModuleHrefs(user.role, roleAccessSettings);
    return SIDEBAR_NAV_ITEMS.map(group => ({
      ...group,
      items: group.items.filter(item => allowedHrefs.has(item.href))
    })).filter(group => group.items.length > 0);
  }, [roleAccessSettings, user]);

  useEffect(() => {
    const syncRoleAccessSettings = () => setRoleAccessSettings(loadRoleAccessSettings())
    window.addEventListener(ROLE_ACCESS_CHANGED_EVENT, syncRoleAccessSettings)
    window.addEventListener("storage", syncRoleAccessSettings)
    return () => {
      window.removeEventListener(ROLE_ACCESS_CHANGED_EVENT, syncRoleAccessSettings)
      window.removeEventListener("storage", syncRoleAccessSettings)
    }
  }, [])

  const handleToggleDesktop = () => {
    onToggleDesktop?.()
  }

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col px-2 py-4 transition-all duration-300 ease-in-out bg-transparent",
          collapsed ? "md:gap-2" : "gap-3",
          "w-64",
          sidebarWidthClass,
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          "md:relative md:translate-x-0"
        )}
      >
        <div className={cn("flex h-full flex-col", collapsed ? "md:gap-2" : "gap-3")}>
          <div
            className={cn(
              "neumorphic-surface flex items-center transition-all duration-300",
              collapsed
                ? "h-14 md:h-20 md:flex-col md:justify-center md:gap-1 md:px-2 md:py-2"
                : "h-14 justify-between gap-2 px-3"
            )}
          >
            <Link
              href="/dashboard"
              className={cn(
                "flex min-w-0 items-center gap-2.5",
                collapsed ? "md:w-full md:justify-center" : "flex-1"
              )}
              onClick={handleLinkClick}
              aria-label="Ke dashboard"
            >
              <Image
                src={LOGO_SRC}
                alt="Logo aplikasi"
                width={96}
                height={56}
                className={cn(
                  "transition-all duration-300",
                  collapsed
                    ? "h-10 w-10 object-contain md:h-11 md:w-11"
                    : "h-12 w-24 object-contain"
                )}
                priority
              />
              <span
                className={cn(
                  "min-w-0 text-sm font-semibold leading-tight text-foreground",
                  collapsed && "md:sr-only"
                )}
              >
                Sistem Klinik Abdi Care
              </span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleDesktop}
              aria-label={collapsed ? "Tampilkan sidebar" : "Sembunyikan sidebar"}
              aria-expanded={!collapsed}
              className="hidden shrink-0 md:flex"
            >
              {collapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </Button>
          </div>

          <ScrollArea className="flex-1 overflow-hidden">
            <div
              className={cn(
                "neumorphic-surface-inset flex h-full flex-col",
                collapsed ? "md:gap-1 md:px-2 md:py-2" : "gap-2 px-3 py-3"
              )}
            >
              <nav className={cn("flex flex-1 flex-col", collapsed ? "md:gap-1" : "gap-4")}>
                {visibleNavGroups.map((group, groupIndex) => (
                  <div
                    key={group.title ?? group.items[0]?.href ?? `nav-group-${groupIndex}`}
                    className={cn(collapsed ? "md:space-y-0" : "space-y-1")}
                  >
                    {!collapsed && group.title && (
                      <div className="px-2">
                        <p className="text-[0.62rem] uppercase tracking-[0.22em] text-muted-foreground">
                          {group.title}
                        </p>
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      {group.items.map((item) => {
                        const Icon = item.icon
                        const isActive =
                          pathname === item.href || pathname.startsWith(`${item.href}/`)
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              "flex items-center rounded-[0.8rem] text-sm font-medium transition-colors",
                              collapsed ? "md:h-10 md:justify-center md:gap-0 md:px-0 md:py-0" : "h-9 gap-3 px-3",
                              isActive
                                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[--sidebar-active-shadow]"
                                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}
                            aria-label={item.title}
                            title={item.title}
                            onClick={handleLinkClick}
                          >
                            <Icon
                              className={cn(
                                'h-4 w-4 shrink-0 transition-colors',
                                isActive ? 'text-sidebar-primary-foreground' : 'text-sidebar-foreground/60'
                              )}
                            />
                            <span className={cn("truncate", collapsed && "md:sr-only")}>{item.title}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </div>
          </ScrollArea>

          <div
            className={cn(
              "neumorphic-surface-inset flex flex-col text-sm transition-all duration-300",
              collapsed
                ? "md:items-center md:gap-0 md:rounded-[1.25rem] md:px-2 md:py-2"
                : "gap-2 px-4 py-3"
            )}
          >
            {!collapsed && user && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
              </div>
            )}
            <Button
              variant="secondary"
              size={collapsed ? "icon-lg" : "default"}
              className={cn(
                "justify-center text-[0.85rem] transition-all duration-300",
                collapsed
                  ? "md:h-11 md:w-11 md:rounded-[1rem] md:px-0"
                  : "w-full gap-3 px-3"
              )}
              onClick={handleLogout}
              aria-label="Keluar"
              title="Keluar"
            >
              <LogOut className="h-5 w-5" />
              <span className={cn(collapsed && "sr-only")}>Keluar</span>
            </Button>
          </div>
        </div>
      </aside>

      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
        />
      )}
    </>
  )
}
