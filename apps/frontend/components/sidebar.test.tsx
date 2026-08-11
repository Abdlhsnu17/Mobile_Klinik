import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import Sidebar from "./sidebar"
import { SIDEBAR_NAV_ITEMS } from "@/lib/sidebar-nav"

afterEach(() => {
  cleanup()
})

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}))

const mockGetCurrentUser = vi.fn()
vi.mock("@/lib/auth-utils", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
  logout: vi.fn(),
}))

describe("Sidebar", () => {
  beforeEach(() => {
    mockGetCurrentUser.mockReset()
    window.localStorage.clear()
  })

  it("menampilkan menu sesuai role admin (akses penuh)", () => {
    mockGetCurrentUser.mockReturnValue({ name: "Admin Klinik", role: "admin" })
    render(<Sidebar />)
    expect(screen.getByText("Dashboard")).toBeInTheDocument()
    expect(screen.getByText("Dokter")).toBeInTheDocument()
    expect(screen.getByText("Pengguna")).toBeInTheDocument()
  })

  it("tidak memuat route modul yang belum punya halaman", () => {
    const staleRoutes = new Set([
      "/audit",
      "/roles",
      "/jadwal-dokter",
      "/rawat-inap/master",
    ])
    const routes = SIDEBAR_NAV_ITEMS.flatMap((group) => group.items.map((item) => item.href))

    expect(routes.some((route) => staleRoutes.has(route))).toBe(false)
  })

  it("membuka seluruh menu secara default untuk role teknis", () => {
    mockGetCurrentUser.mockReturnValue({ name: "Teknis", role: "teknis" })
    render(<Sidebar />)
    expect(screen.getByRole("link", { name: "Farmasi" })).toBeInTheDocument()
    expect(screen.getByText("Dokter")).toBeInTheDocument()
    expect(screen.getByText("Pengguna")).toBeInTheDocument()
  })

  it("membuka seluruh menu secara default untuk role umum", () => {
    mockGetCurrentUser.mockReturnValue({ name: "Umum", role: "umum" })
    render(<Sidebar />)
    expect(screen.getByText("Dashboard")).toBeInTheDocument()
    expect(screen.getByText("Dokter")).toBeInTheDocument()
    expect(screen.getByText("Layanan")).toBeInTheDocument()
    expect(screen.getByText("Pengguna")).toBeInTheDocument()
  })

  it("tidak menampilkan menu apa pun jika user null", () => {
    mockGetCurrentUser.mockReturnValue(null)
    render(<Sidebar />)
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument()
  })

  it("meminimize panel user dan menyisakan tombol keluar berbentuk ikon saat collapsed", () => {
    mockGetCurrentUser.mockReturnValue({ name: "Admin Klinik", role: "admin" })
    render(<Sidebar collapsed />)

    expect(screen.queryByText("Admin Klinik")).not.toBeInTheDocument()

    const logoutButton = screen.getByRole("button", { name: "Keluar" })
    expect(logoutButton).toHaveClass("md:w-11")
    expect(logoutButton).toHaveClass("md:h-11")
  })
})
