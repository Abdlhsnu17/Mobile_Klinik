/**
 * Ubah path aset backend (mis. "/uploads/avatars/x.png") menjadi URL yang bisa
 * dimuat browser. Ketika API base absolut (http://localhost:4004/api), aset
 * harus menunjuk ke origin backend, bukan origin frontend.
 */
export function resolveMediaUrl(pathOrUrl?: string | null, configuredEnv?: string): string | null {
  if (!pathOrUrl) return null
  if (/^(https?:)?\/\//.test(pathOrUrl) || pathOrUrl.startsWith("data:")) return pathOrUrl

  const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`
  const apiBase = buildApiBaseUrl(configuredEnv)

  if (apiBase.startsWith("/")) return normalizedPath

  try {
    return `${new URL(apiBase).origin}${normalizedPath}`
  } catch {
    return normalizedPath
  }
}

export function buildApiBaseUrl(configuredEnv?: string, defaultUrl = "/api"): string {
  const configured = (configuredEnv || defaultUrl).replace(/\/$/, "")

  if (configured.startsWith("/")) {
    return configured.endsWith("/api") ? configured : `${configured}/api`
  }

  try {
    const url = new URL(configured)
    const isBrowser = typeof window !== "undefined"
    const isLocalBackend = ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
    const isRemoteFrontend = isBrowser && !["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)

    if (isLocalBackend && isRemoteFrontend) {
      return "/api"
    }

    return `${url.origin}/api`
  } catch {
    const sanitized = configured.replace(/\/$/, "")
    return `${sanitized}/api`
  }
}
