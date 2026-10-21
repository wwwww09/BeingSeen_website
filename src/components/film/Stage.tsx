'use client'

import { Component, useEffect, useState, type ComponentType, type ReactNode } from 'react'
import dynamic from 'next/dynamic'

/**
 * 全站背景画布。
 *
 * 这是新纲要里的架构核心: 一整块**固定**铺满视口的三维星空, 位于所有文字的
 * 下层。页面本身正常滚动, 滚动进度驱动镜头 (见 film/scroll.tsx)。
 *
 * 和以前一样保留两道防线 —— 拿不到 WebGL 时不能整页白屏:
 *   1. 挂载前先探测 WebGL, 不支持就根本不加载 three.js;
 *   2. 渲染期抛错由错误边界兜住, 换成一层静态星点。
 * 对一个以文字为主体的教学网站, 星空是增强, 不是主体。
 */

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    if (!gl) return false
    ;(gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

const FilmCanvas = dynamic(() => import('@/components/film/FilmCanvas'), { ssr: false })

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    /* 静默降级: 正文不受影响 */
  }
  render() {
    if (this.state.failed) return null
    return this.props.children
  }
}

export default function Stage() {
  const [ok, setOk] = useState<boolean | null>(null)

  useEffect(() => {
    setOk(detectWebGL())
  }, [])

  // 探测之前先渲染空壳, 避免闪烁; 探测失败就只留 CSS 星点
  if (ok === false) return <div className="stage stage--flat" aria-hidden="true" />
  if (ok === null) return <div className="stage" aria-hidden="true" />

  return (
    <div className="stage" aria-hidden="true">
      <Boundary>
        <FilmCanvas />
      </Boundary>
    </div>
  )
}
