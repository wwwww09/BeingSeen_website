'use client'

import { useEffect, useState } from 'react'

/**
 * 用户是否要求「减少动效」。
 *
 * 为什么 3D 场景也要遵守
 * ----------------------------------------------------------------------------
 * 前庭功能障碍 (vestibular disorder) 的人会因为视野里持续的自发运动而眩晕、
 * 恶心。操作系统因此提供了 "减少动态效果" 开关, 浏览器把它暴露成
 * `prefers-reduced-motion: reduce`, 这也是 WCAG 2.3.3 的要求。
 *
 * 本项目的五个 3D 场景原本都在**永久自转** (天球自转 + OrbitControls 的
 * autoRotate), 而 globals.css 里原有的 `prefers-reduced-motion` 只处理了
 * CSS 动画 (.fade-up / .spinner), 完全没管 WebGL。
 *
 * 注意「减少动效」不等于「禁止交互」: 用户仍然可以自己拖动旋转、缩放。
 * 要停掉的只是**不需要用户操作就一直在动**的部分。
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)

    update()
    // 用户在系统设置里改了开关, 页面要立刻跟上
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return reduced
}
