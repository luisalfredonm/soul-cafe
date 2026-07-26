import type { MetadataRoute } from 'next'

const base = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['', '/menu', '/visit']
  const now = new Date()

  return paths.flatMap((path) => [
    {
      url: `${base}${path || '/'}`,
      lastModified: now,
      alternates: { languages: { en: `${base}${path || '/'}`, es: `${base}/es${path}` } },
    },
    {
      url: `${base}/es${path}`,
      lastModified: now,
    },
  ])
}
