import { moduleSections, type UserRole } from "./module-registry"
import type { LucideIcon } from "lucide-react"

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  roles: UserRole[]
  label?: string
}

export type NavItemGroup = {
  title?: string
  items: NavItem[]
}

export const SIDEBAR_NAV_ITEMS: NavItemGroup[] = moduleSections.map((section) => ({
  title: section.label,
  items: section.items.map((item) => ({
    title: item.shortTitle ?? item.title,
    href: item.href,
    icon: item.icon,
    roles: item.roles,
  })),
}))
