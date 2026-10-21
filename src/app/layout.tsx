import type { Metadata, Viewport } from 'next'
import Nav from '@/components/Nav'
import { PALETTE } from '@/lib/palette'
import './globals.css'

/** 完整 URL(带协议), 例如 https://example.com —— 用于 NEXT_PUBLIC_SITE_URL */
function envUrl(value: string | undefined): string | undefined {
  const v = value?.trim()
  if (!v) return undefined
  try {
    new URL(v)
    return v
  } catch {
    return undefined
  }
}

/**
 * 裸主机名, 例如 being-seen.vercel.app —— 用于 VERCEL_URL 系列。
 *
 * 必须和 envUrl 分开: Vercel 注入的这两个变量**不带协议头**, 拿
 * `new URL('being-seen.vercel.app')` 去校验会抛错, 于是被误判成"没设置",
 * 分享卡片就退回 localhost —— 线上 og:image 变成 http://localhost:3000/og.png,
 * 社交平台抓不到图。补上 https:// 再校验才对。
 */
function envHost(value: string | undefined): string | undefined {
  const v = value?.trim()
  if (!v) return undefined
  try {
    new URL(`https://${v}`)
    return v
  } catch {
    return undefined
  }
}

/**
 * 站点自身的地址, 用来把分享卡片的图片转成绝对 URL —— 绝大多数平台都要求
 * openGraph 的图片是绝对地址, 否则预览卡片会不显示。
 *
 * 优先用 NEXT_PUBLIC_SITE_URL (绑定了自定义域名时设它);
 * 否则在 Vercel 上自动取部署域名, 零配置也能出正确的卡片;
 * 本地开发退回到 localhost。
 */
const vercelHost =
  envHost(process.env.VERCEL_PROJECT_PRODUCTION_URL) ?? envHost(process.env.VERCEL_URL)

const siteUrl =
  envUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
  (vercelHost ? `https://${vercelHost}` : 'http://localhost:3000')

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
  /* 手机浏览器地址栏的底色 —— 从色板取, 免得主题一改这里就变成另一个色 */
  themeColor: PALETTE.bgVoid,
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
