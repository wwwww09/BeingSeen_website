import type { Metadata, Viewport } from 'next'
import Nav from '@/components/Nav'
import './globals.css'

/**
 * 站点自身的地址, 用来把分享卡片的图片转成绝对 URL —— 绝大多数平台都要求
 * openGraph 的图片是绝对地址, 否则预览卡片会不显示。
 *
 * 优先用 NEXT_PUBLIC_SITE_URL (绑定了自定义域名时设它);
 * 否则在 Vercel 上自动取部署域名, 零配置也能出正确的卡片;
 * 本地开发退回到 localhost。
 */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000')

const tagline =
  'The universe has its own telescope. We just need to learn how to look.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
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
    description: tagline,
    type: 'website',
    siteName: 'Being Seen',
    url: '/',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'Being Seen — how gravitational lensing reveals what would stay invisible',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Being Seen',
    description: tagline,
    images: ['/og.png'],
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
