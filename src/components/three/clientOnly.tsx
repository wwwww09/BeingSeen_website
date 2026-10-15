'use client'

import dynamic from 'next/dynamic'
import {
  Component,
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react'

/**
 * 只在浏览器里渲染 3D 场景, 并且**保证它失败时不会毁掉整页**。
 *
 * `ssr: false` 只能出现在 Client Component 里 —— 这是 Next.js App Router 的硬性约束。
 * 本组件是 Client Component, 因此在这里调用 dynamic(..., { ssr: false }) 是合法的。
 *
 * 为什么需要错误边界
 * ----------------------------------------------------------------------------
 * 如果拿不到 WebGL 上下文, three.js 会抛
 *
 *     THREE.WebGLRenderer: Error creating WebGL context.
 *
 * 这是未捕获异常, React 会卸载整棵树 —— 五个页面里有四个会变成一张空白错误页,
 * 连导航栏和正文一起消失。而 WebGL 拿不到是很常见的情况: 学校/公司的浏览器策略、
 * 隐私浏览器、老旧硬件、显卡驱动黑名单、甚至只是显存不够。
 * 对一个教学网站来说, 正文是主体, 3D 是增强, 不能因为增强失败就整页白屏。
 *
 * 两道防线:
 *   1. 挂载前先探测 WebGL。不支持就根本不加载 three.js 那一大坨代码, 直接给占位说明。
 *   2. 渲染期出错 (包括动态 chunk 加载失败) 由错误边界兜住, 降级为同样的占位说明。
 *
 * 用法:
 *   const StarMap = clientOnly(() => import('@/components/three/StarMap'))
 *   <StarMap height={520} ... />
 */

/** 这个环境能不能创建 WebGL 上下文 */
function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    if (!gl) return false
    // 有些环境能创建上下文但立刻丢失, 这里主动释放避免占用一个 context
    const lose = (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')
    lose?.loseContext()
    return true
  } catch {
    return false
  }
}

/** 场景不可用时的占位说明: 页面其余内容照常 */
function SceneFallback({
  height,
  note,
}: {
  height: number
  note?: string
}) {
  return (
    <div className="scene-fallback" style={{ minHeight: height }} role="note">
      <p className="scene-fallback__title">3D view unavailable</p>
      <p className="scene-fallback__body">
        This scene needs WebGL, which this browser is not providing. Everything
        else on this page — the text, the charts and the numbers — works
        normally.
      </p>
      {note && <p className="scene-fallback__body">{note}</p>}
    </div>
  )
}

class SceneBoundary extends Component<
  { children: ReactNode; height: number; note?: string; silent?: boolean },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    // 不弹错误页, 只留一条控制台记录方便排查
    console.warn('[3D] 场景渲染失败, 已降级为静态说明:', error)
  }

  render() {
    if (this.state.failed) {
      if (this.props.silent) return null
      return <SceneFallback height={this.props.height} note={this.props.note} />
    }
    return this.props.children
  }
}

/** clientOnly 可以接受的可选 props (不会传给 3D 场景本身) */
export interface ClientOnlyOptions {
  /** 降级说明里追加的一句话, 例如留言板可以提示"仍可在右侧写故事" */
  fallbackNote?: string
}

/** clientOnly 的第三个参数 */
export interface ClientOnlyConfig {
  /**
   * 纯装饰性的场景 (例如首页背景星场) 在不可用时**什么都不显示**。
   * 给它一个"3D VIEW UNAVAILABLE"的框反而是噪音 —— 它背后本来就有 CSS 渐变。
   */
  silent?: boolean
}

/**
 * 当前环境是否支持 WebGL。
 * 给页面用来调整文案 —— 例如留言板在 3D 不可用时不该再提示"点一颗星星"。
 */
export function useWebGLSupport(): boolean | null {
  const [supported, setSupported] = useState<boolean | null>(null)
  useEffect(() => {
    setSupported(detectWebGL())
  }, [])
  return supported
}

function Loading({ height }: { height: number }) {
  return (
    <div
      className="loading"
      style={{ height, width: '100%' }}
      aria-label="Loading 3D scene"
    >
      <div className="spinner" />
    </div>
  )
}

export function clientOnly<P extends object>(
  loader: () => Promise<{ default: ComponentType<P> }>,
  loadingHeight = 420,
  config: ClientOnlyConfig = {},
) {
  const Lazy = dynamic(loader, {
    ssr: false,
    loading: () => <Loading height={loadingHeight} />,
  })

  function ClientOnlyWrapper(props: P & ClientOnlyOptions) {
    // null = 还不确定 (服务端和首次客户端渲染), true/false = 探测结果
    const [supported, setSupported] = useState<boolean | null>(null)

    useEffect(() => {
      setSupported(detectWebGL())
    }, [])

    if (supported === null) return <Loading height={loadingHeight} />

    if (!supported) {
      if (config.silent) return null
      return <SceneFallback height={loadingHeight} note={props.fallbackNote} />
    }

    const { fallbackNote, ...sceneProps } = props

    return (
      <SceneBoundary
        height={loadingHeight}
        note={fallbackNote}
        silent={config.silent}
      >
        <Lazy {...(sceneProps as P)} />
      </SceneBoundary>
    )
  }

  return ClientOnlyWrapper
}
