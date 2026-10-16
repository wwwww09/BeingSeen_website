import type { Metadata, Viewport } from 'next'
import Nav from '@/components/Nav'
import './globals.css'

/**
 * 读一个环境变量里的 URL, 把"没设置"和"设成了没用的值"一律当作未设置。
 *
 * 这里踩过一个真实的坑: .env.example 里 `NEXT_PUBLIC_SITE_URL=` 是留空的,
 * 而空字符串**不是** nullish, 所以 `??` 会直接采用它, 于是
 * `new URL('')` 在构建阶段抛 ERR_INVALID_URL, 整个 build 失败。
 * 任何照着 README 执行 `cp .env.example .env.local` 的人都会中招。
 *
 * 顺带把格式不合法的值也挡掉 (比如漏了 https://), 让它退回默认值而不是崩溃。
 */
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
 * 站点自身的地址, 用来把分享卡片的图片转成绝对 URL —— 绝大多数平台都要求
 * openGraph 的图片是绝对地址, 否则预览卡片会不显示。
 *
 * 优先用 NEXT_PUBLIC_SITE_URL (绑定了自定义域名时设它);
 * 否则在 Vercel 上自动取部署域名, 零配置也能出正确的卡片;
 * 本地开发退回到 localhost。
 */
const vercelHost =
  envUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ?? envUrl(process.env.VERCEL_URL)

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
