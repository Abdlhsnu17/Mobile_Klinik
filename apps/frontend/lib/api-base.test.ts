import { afterEach, describe, expect, it, vi } from "vitest"
import { buildApiBaseUrl } from "./api-base"

describe("buildApiBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("menggunakan relative /api ketika backend localhost dibuka dari domain remote", () => {
    vi.stubGlobal("window", {
      location: {
        hostname: "klinik.example.com",
      },
    })

    expect(buildApiBaseUrl("http://localhost:4004")).toBe("/api")
  })

  it("mempertahankan origin backend eksternal", () => {
    expect(buildApiBaseUrl("https://api.klinik.example.com")).toBe("https://api.klinik.example.com/api")
  })

  it("menormalisasi path relative", () => {
    expect(buildApiBaseUrl("/backend")).toBe("/backend/api")
  })
})
