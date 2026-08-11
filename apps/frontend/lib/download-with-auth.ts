import { getAuthToken } from "./auth-utils";

async function fetchAsBlob(url: string): Promise<Blob> {
  const token = getAuthToken()
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: "include",
  })
  if (!response.ok) {
    throw new Error("Gagal mengambil berkas. Silakan coba lagi.")
  }
  return response.blob()
}

export async function openWithAuth(url: string): Promise<void> {
  const blob = await fetchAsBlob(url)
  const objectUrl = URL.createObjectURL(blob)
  window.open(objectUrl, "_blank")
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
}

export async function downloadWithAuth(url: string, filename: string): Promise<void> {
  const blob = await fetchAsBlob(url)
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = objectUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}
