'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

/**
 * 导航（新纲要）:
 *
 *   Being Seen | The Science ▾ (Supernovae / FRBs / GW Lensing) | The Unseen | About
 *
 * "The Science" 是下拉菜单 —— 三项是并列子页, 而不是把三个标题铺在顶上。
 * 首页要留给叙事, 导航越安静越好。
 *
 * 无障碍: 用真正的 <button> 打开, 标了 aria-expanded / aria-haspopup;
 * 点击外部或按 Esc 关闭; 键盘 Tab 能进入菜单项。
 */

const SCIENCE = [
  {
    href: '/lensing-supernovae',
    label: 'Supernovae',
    hint: 'How a lens makes a dying star visible',
  },
  {
    href: '/lensing-frbs',
    label: 'FRBs',
    hint: 'Millisecond flashes, and the pairs that never were',
  },
  {
    href: '/gravitational-wave-lensing',
    label: 'GW Lensing',
    hint: 'Black holes that may only look too heavy',
  },
]

export default function Nav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const groupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!groupRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const inScience = SCIENCE.some((s) => pathname.startsWith(s.href))

  return (
    <nav className="nav" aria-label="Main">
      <div className="nav__inner">
        <Link href="/" className="nav__brand">
          Being Seen<span className="nav__brand-dot">.</span>
        </Link>

        <div className="nav__links">
          <div className="nav__group" ref={groupRef} data-open={open}>
            <button
              type="button"
              className="nav__link"
              data-active={inScience}
              aria-expanded={open}
              aria-haspopup="true"
              onClick={() => setOpen((v) => !v)}
            >
              The Science{' '}
              <span className="nav__caret" aria-hidden="true">
                ▾
              </span>
            </button>
            {open && (
              <div className="nav__menu" role="menu">
                {SCIENCE.map((s) => (
                  <Link
                    key={s.href}
                    href={s.href}
                    className="nav__menu-item"
                    role="menuitem"
                    data-active={pathname.startsWith(s.href)}
                  >
                    {s.label}
                    <small>{s.hint}</small>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/the-unseen"
            className="nav__link nav__link--cta"
            data-active={pathname.startsWith('/the-unseen')}
          >
            The Unseen
          </Link>

          <Link href="/about" className="nav__link" data-active={pathname.startsWith('/about')}>
            About
          </Link>
        </div>
      </div>
    </nav>
  )
}
