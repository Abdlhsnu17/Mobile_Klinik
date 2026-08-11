import { afterEach, describe, expect, it, vi } from "vitest"
import { ApiClientError, apiClient, isForbiddenApiError } from "./api-client"

describe("ApiClient authorization errors", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("mengembalikan error 403 terstruktur tanpa console error", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: "HTTP_403", message: "Anda tidak memiliki akses untuk aksi ini" },
          requestId: "request-403",
        }),
        { status: 403, headers: { "content-type": "application/json" } },
      ),
    ))

    const request = apiClient.getAppointments()

    await expect(request).rejects.toMatchObject({
      name: "ApiClientError",
      status: 403,
      method: "GET",
      path: "/appointments",
      requestId: "request-403",
    } satisfies Partial<ApiClientError>)
    await expect(request.catch((error) => isForbiddenApiError(error))).resolves.toBe(true)
    expect(consoleError).not.toHaveBeenCalled()
  })

  it("membuat profil klinik saat data awal belum tersedia", async () => {
    const payload = {
      name: "Klinik Abdi Care",
      address: "Jl. Kesehatan No. 123",
      phone: "021-12345678",
      email: "info@kliniksehat.com",
      operationalHours: "Senin - Sabtu: 08:00 - 20:00",
      description: "Klinik kesehatan terpercaya.",
    }
    const saved = {
      id: "clinic-setting-1",
      ...payload,
      createdAt: "2026-07-19T00:00:00.000Z",
      updatedAt: "2026-07-19T00:00:00.000Z",
    }
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: saved }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(apiClient.createClinicSetting(payload)).resolves.toEqual(saved)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/clinic-settings"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      }),
    )
  })
})
