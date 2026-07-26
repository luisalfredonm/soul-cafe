import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'),
  title: 'Soul Cafe — Specialty Coffee in Huacas, Guanacaste',
  description:
    'Specialty coffee and fresh homemade pastries at the Huacas crossroads, minutes from Tamarindo, Flamingo and Conchal.',
}

// Pasa de largo a propósito: quien emite <html> y <body> es el layout de [lang],
// donde ya se sabe si la página es española o inglesa.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}
