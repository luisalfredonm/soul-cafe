import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Payload sirve imágenes desde /api/media; se permiten aquí
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  experimental: {
    reactCompiler: false,
  },
}

export default withPayload(nextConfig)
