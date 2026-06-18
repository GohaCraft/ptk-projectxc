import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ЗГУ College Model',
  description: 'ZGU 3D Model',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
