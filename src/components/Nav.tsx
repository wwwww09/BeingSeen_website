'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/lensing-supernovae', label: 'Lensing & SNe' },
  { href: '/lensing-frbs', label: 'Lensing & FRBs' },
  { href: '/gravitational-wave-lensing', label: 'GW Lensing' },
  { href: '/being-seen', label: 'Being Seen' },
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
              >
                {l.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
