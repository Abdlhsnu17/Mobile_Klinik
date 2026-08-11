import type { User } from "@/lib/auth-types";
import { moduleSections, type UserRole } from "@/lib/module-registry";

export const ROLE_ACCESS_STORAGE_KEY = "clinic_role_access_settings_v2";
export const ROLE_ACCESS_CHANGED_EVENT = "clinic-role-access-changed";

export type RoleAccessSettings = Partial<Record<UserRole, string[]>>;

export const MANAGED_ROLE_ORDER: UserRole[] = [
  "admin",
  "dokter",
  "perawat",
  "bidan",
  "teknis",
  "umum",
];

const allModuleHrefs = moduleSections.flatMap((section) => section.items.map((item) => item.href));
const validModuleHrefs = new Set(allModuleHrefs);
const moduleByHref = new Map(
  moduleSections.flatMap((section) => section.items.map((item) => [item.href, item]))
);
const PUBLIC_PATHS = new Set(["/", "/login", "/daftar", "/lupa-password"]);

const READABLE_COLLECTION_ROLES: Record<string, UserRole[]> = {
  patients: ["admin", "dokter", "bidan", "perawat", "teknis", "umum"],
  users: ["admin"],
  doctors: ["admin", "dokter", "bidan", "perawat", "teknis", "umum"],
  services: ["admin", "dokter", "bidan", "perawat", "teknis", "umum"],
  appointments: ["admin", "dokter", "bidan", "perawat", "umum"],
  "appointments/today": ["admin", "dokter", "bidan", "perawat", "umum"],
  "medical-records": ["admin", "dokter", "bidan", "perawat", "teknis", "umum"],
  medicines: ["admin", "teknis", "dokter", "bidan", "perawat", "umum"],
  "medical-equipments": ["admin", "perawat", "dokter", "bidan"],
  "lab-orders": ["admin", "teknis", "dokter", "bidan", "perawat"],
  "lab-results": ["admin", "teknis", "dokter", "bidan", "perawat"],
  "radiology-orders": ["admin", "teknis", "dokter", "bidan", "perawat"],
  payments: ["admin", "dokter", "bidan", "perawat", "teknis", "umum"],
  "billing-records": ["admin", "dokter", "bidan", "perawat", "teknis", "umum"],
  "payment-summaries": ["admin", "dokter", "bidan", "perawat", "teknis", "umum"],
  documents: ["admin", "umum"],
  "pharmacy-requests": ["admin", "teknis", "dokter", "bidan", "perawat", "umum"],
  "insurance-profiles": ["admin", "umum", "dokter", "bidan"],
  "insurance-bridge-members": ["admin", "umum"],
  beds: ["admin", "perawat", "dokter", "bidan"],
  "inpatient-admissions": ["admin", "perawat", "dokter", "bidan"],
  "doctor-visit-notes": ["admin", "dokter", "bidan", "perawat"],
  "patient-notifications": ["admin", "umum"],
  "satisfaction-surveys": ["admin", "umum"],
  "audit-logs": ["admin"],
  referrals: ["admin", "dokter", "bidan", "perawat", "umum"],
  "referral-facilities": ["admin", "dokter", "bidan", "perawat", "umum"],
};

function canRoleUseModule(role: UserRole, href: string) {
  const module = moduleByHref.get(href);
  return Boolean(module && role);
}

export function getAllAccessModules() {
  return moduleSections.flatMap((section) =>
    section.items.map((item) => ({
      sectionId: section.id,
      sectionLabel: section.label,
      title: item.title,
      shortTitle: item.shortTitle,
      href: item.href,
      icon: item.icon,
    }))
  );
}

export function getDefaultRoleAccessSettings(): Record<UserRole, string[]> {
  const defaults = {} as Record<UserRole, string[]>;

  MANAGED_ROLE_ORDER.forEach((role) => {
    defaults[role] = allModuleHrefs.filter((href) => canRoleUseModule(role, href));
  });

  return defaults;
}

function normalizeRoleAccessSettings(settings: RoleAccessSettings): Record<UserRole, string[]> {
  const defaults = getDefaultRoleAccessSettings();

  return Object.fromEntries(
    (Object.keys(defaults) as UserRole[]).map((role) => {
      if (role === "admin") return [role, defaults[role]];

      const configuredHrefs = settings[role];
      if (!configuredHrefs) return [role, defaults[role]];

      return [
        role,
        Array.from(new Set(configuredHrefs)).filter(
          (href) => validModuleHrefs.has(href) && canRoleUseModule(role, href)
        ),
      ];
    })
  ) as Record<UserRole, string[]>;
}

export function loadRoleAccessSettings(): Record<UserRole, string[]> {
  if (typeof window === "undefined") return getDefaultRoleAccessSettings();

  const rawSettings = window.localStorage.getItem(ROLE_ACCESS_STORAGE_KEY);
  if (!rawSettings) return getDefaultRoleAccessSettings();

  try {
    return normalizeRoleAccessSettings(JSON.parse(rawSettings) as RoleAccessSettings);
  } catch {
    return getDefaultRoleAccessSettings();
  }
}

export function saveRoleAccessSettings(settings: RoleAccessSettings): Record<UserRole, string[]> {
  const normalizedSettings = normalizeRoleAccessSettings(settings);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(ROLE_ACCESS_STORAGE_KEY, JSON.stringify(normalizedSettings));
    window.dispatchEvent(new Event(ROLE_ACCESS_CHANGED_EVENT));
  }

  return normalizedSettings;
}

export function getAllowedModuleHrefs(
  role?: Pick<User, "role">["role"] | null,
  settings: RoleAccessSettings = getDefaultRoleAccessSettings()
) {
  if (!role) return new Set<string>();

  return new Set(normalizeRoleAccessSettings(settings)[role] ?? []);
}

export function canRoleAccessPath(
  role: Pick<User, "role">["role"] | null | undefined,
  pathname: string,
  settings: RoleAccessSettings = getDefaultRoleAccessSettings()
) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (!role) return false;

  const matchedModule = allModuleHrefs
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  if (!matchedModule) return true;
  return getAllowedModuleHrefs(role, settings).has(matchedModule);
}

export function getRoleLandingPath(
  role: Pick<User, "role">["role"] | null | undefined,
  settings: RoleAccessSettings = getDefaultRoleAccessSettings()
) {
  if (!role) return "/login";

  const allowedHrefs = getAllowedModuleHrefs(role, settings);
  if (allowedHrefs.has("/dashboard")) return "/dashboard";

  return allModuleHrefs.find((href) => allowedHrefs.has(href)) ?? "/pengaturan";
}

export function canRoleReadCollection(
  role: Pick<User, "role">["role"] | null | undefined,
  collection: string
) {
  if (!role) return false;
  if (role === "admin") return true;

  const baseCollection = collection.startsWith("documents?category=") ? "documents" : collection;
  return READABLE_COLLECTION_ROLES[baseCollection]?.includes(role) ?? false;
}
