'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * 导航。
 *
 * `short` 是窄屏 (≤ 640px) 用的标签: 五个完整标签在 390px 宽的手机上
 * 放不下, 会被横向截断, 最后一个 "Being Seen" 根本看不到 —— 而它正是
 * 全站的留言板页面。窄屏改用短标签, 无障碍名称仍用完整的 `label`。
 */
const LINKS = [
  { href: '/', label: 'Home', short: 'Home' },
  { href: '/lensing-supernovae', label: 'Lensing & SNe', short: 'SNe' },
  { href: '/lensing-frbs', label: 'Lensing & FRBs', short: 'FRBs' },
  { href: '/gravitational-wave-lensing', label: 'GW Lensing', short: 'GW' },
  { href: '/being-seen', label: 'Being Seen', short: 'Seen' },
]

export default function Nav() {
  const pathname = usePathname()

  return (
    <nav className="nav">
      <div className="nav__inner">
        <Link href="/" className="nav__brand">
          Being Seen
        </Link>
        <div className="nav__links">
          {LINKS.map((l) => {
            const active =
              l.href === '/' ? pathname === '/' : pathname.startsWith(l.href)
            return (
              <Link
                key={l.href}
                href={l.href}
                className="nav__link"
                data-active={active}
                aria-current={active ? 'page' : undefined}
                aria-label={l.label}
              >
                <span className="nav__label-full">{l.label}</span>
                <span className="nav__label-short">{l.short}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
