import type { Metadata, Viewport } from 'next'
import Nav from '@/components/Nav'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Being Seen — Gravitational Lensing and the Invisible Universe',
    template: '%s — Being Seen',
  },
  description:
    'A serious game about how gravitational lensing helps us detect astronomical phenomena that would otherwise remain invisible. From supernovae to fast radio bursts to gravitational waves.',
  keywords: [
    'gravitational lensing',
    'supernova',
    'fast radio burst',
    'gravitational waves',
    'astrophysics',
    'serious game',
  ],
  authors: [{ name: 'Yigu Eva Xie' }],
  openGraph: {
    title: 'Being Seen',
    description:
      'The universe has its own telescope. We just need to learn how to look.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#04060f',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Nav />
        {children}
      </body>
    </html>
  )
}
