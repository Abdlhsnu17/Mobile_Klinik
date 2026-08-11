import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const workspaceRoot = resolve(__dirname, '..', '..')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce a minimal, self-contained server bundle for the production image.
  output: 'standalone',
  outputFileTracingRoot: workspaceRoot,
  turbopack: {
    root: workspaceRoot,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const backendUrl = (process.env.BACKEND_INTERNAL_URL || 'http://localhost:4004').replace(/\/$/, '')

    if (backendUrl.startsWith('/')) return []

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${backendUrl}/socket.io/:path*`,
      },
    ]
  },
}

export default nextConfig
