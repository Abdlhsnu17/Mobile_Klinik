import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { login, resetPassword, updateUser } from "./auth-utils"

describe("auth-utils", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it("mengembalikan pesan token reset invalid tanpa console error dev overlay", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "Token tidak valid atau sudah digunakan" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(resetPassword(" reset-token ", "secret123")).rejects.toThrow("Token tidak valid atau sudah digunakan")

    expect(consoleErrorSpy).not.toHaveBeenCalled()
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ token: "reset-token", password: "secret123" })
  })

  it("login mengirim username yang sudah ditrim dan menyimpan sesi aman", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: "user-1",
            username: "admin",
            name: "Admin Klinik",
            email: "admin@klinik.com",
            role: "admin",
            password: "$2a$hash",
            createdAt: "2026-07-02T00:00:00.000Z",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    )
    vi.stubGlobal("fetch", fetchMock)

    const user = await login(" admin ", "admin123")

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ username: "admin", password: "admin123" })
    expect(user).not.toHaveProperty("password")
    expect(localStorage.getItem("clinic_current_user")).toContain('"username":"admin"')
  })

  it("update profil sendiri menyinkronkan nama baru ke sesi lokal", async () => {
    localStorage.setItem(
      "clinic_current_user",
      JSON.stringify({
        id: "user-1",
        username: "admin",
        name: "Nama Lama",
        email: "admin@klinik.com",
        role: "admin",
        createdAt: "2026-07-02T00:00:00.000Z",
      })
    )
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "user-1",
          username: "admin",
          name: "Nama Baru",
          email: "admin@klinik.com",
          role: "admin",
          password: "$2a$hash",
          createdAt: "2026-07-02T00:00:00.000Z",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    )
    vi.stubGlobal("fetch", fetchMock)

    const user = await updateUser("user-1", { name: "Nama Baru" })

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ name: "Nama Baru" })
    expect(user).not.toHaveProperty("password")
    expect(JSON.parse(localStorage.getItem("clinic_current_user") ?? "{}").name).toBe("Nama Baru")
  })
})
