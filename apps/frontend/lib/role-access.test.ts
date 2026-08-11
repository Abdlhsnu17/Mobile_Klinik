import { beforeEach, describe, expect, it } from "vitest"

import {
  canRoleAccessPath,
  getDefaultRoleAccessSettings,
  loadRoleAccessSettings,
  ROLE_ACCESS_STORAGE_KEY,
  saveRoleAccessSettings,
} from "./role-access"

describe("role access settings", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("membuka seluruh modul sebagai aturan awal untuk setiap role", () => {
    const defaults = getDefaultRoleAccessSettings()

    expect(defaults.admin).toContain("/pengguna")
    expect(defaults.dokter).toContain("/pemeriksaan")
    expect(defaults.dokter).toContain("/pengguna")
    expect(defaults.umum).toContain("/laboratorium")
  })

  it("mengizinkan admin menambahkan modul apa pun ke role terpilih", () => {
    const saved = saveRoleAccessSettings({
      dokter: ["/dashboard", "/pengguna", "/farmasi"],
    })

    expect(saved.dokter).toEqual(["/dashboard", "/pengguna", "/farmasi"])
    expect(canRoleAccessPath("dokter", "/dashboard", saved)).toBe(true)
    expect(canRoleAccessPath("dokter", "/pengguna", saved)).toBe(true)
  })

  it("selalu mempertahankan akses penuh administrator", () => {
    const saved = saveRoleAccessSettings({ admin: [] })
    const defaults = getDefaultRoleAccessSettings()

    expect(saved.admin).toEqual(defaults.admin)
    expect(canRoleAccessPath("admin", "/pengguna", saved)).toBe(true)
    expect(JSON.parse(window.localStorage.getItem(ROLE_ACCESS_STORAGE_KEY) ?? "{}")).toEqual(saved)
    expect(loadRoleAccessSettings()).toEqual(saved)
  })
})
