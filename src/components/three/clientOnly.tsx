'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState, type ComponentType } from 'react'

/**
 * `ssr: false` 只能出现在 Client Component 里 —— 这是 Next.js App Router 的硬性约束。
 * 本组件是 Client Component, 因此在这里调用 dynamic(..., { ssr: false }) 是合法的。
 *
 * 用法:
 *   const StarMap = clientOnly(() => import('@/components/three/StarMap'))
 *   <StarMap height={520} ... />
 */

export function clientOnly<P extends object>(
  loader: () => Promise<{ default: ComponentType<P> }>,
  loadingHeight = 420,
) {
  const Lazy = dynamic(loader, {
    ssr: false,
    loading: () => (
      <div
        className="loading"
        style={{ height: loadingHeight, width: '100%' }}
        aria-label="Loading 3D scene"
      >
        <div className="spinner" />
      </div>
    ),
  })

  function ClientOnlyWrapper(props: P) {
    // 双保险: 即使动态导入在极早期被求值, 也保证 WebGL 只在浏览器里初始化
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    if (!mounted) {
      return (
        <div
          className="loading"
          style={{ height: loadingHeight, width: '100%' }}
          aria-label="Loading 3D scene"
        >
          <div className="spinner" />
        </div>
      )
    }

    return <Lazy {...props} />
  }

  return ClientOnlyWrapper
}
