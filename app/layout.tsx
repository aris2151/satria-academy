import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SATRIA ACADEMY | Persiapan TNI & Polri',
  description: 'Tempa diri dan persiapkan masa depan bersama SATRIA ACADEMY. Program persiapan seleksi TNI dan Polri yang terarah.',
  generator: 'SATRIA ACADEMY',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#080909',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
