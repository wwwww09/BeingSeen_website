/**
 * 数据色板的 TypeScript 镜像。
 *
 * 为什么需要两份
 * ----------------------------------------------------------------------------
 * - DOM 和 SVG 直接写 `var(--gold)`, 颜色自动跟着主题走;
 * - three.js 要的是真正的 RGB 数值, 拿不到 CSS 变量, 所以必须有一份字面量。
 *
 * 两份会不会悄悄跑偏? 不会 —— `./dev.sh palette` 会把这里的每个值拿去和
 * globals.css 里的 `:root` 定义逐一比对, 有出入就报错。这条检查存在的理由
 * 就是教训: 之前 --text-faint 从 #6a7b98 改成 #8595b2, 图表里那 6 处拷贝
 * 出来的字面量没人记得改, 于是一个已经废弃的颜色在 5 个文件里活了很久。
 *
 * 加新颜色时: 先加到 globals.css 的 `:root`, 再在这里镜像一份。
 */

export const PALETTE = {
  // 背景层次
  bgVoid: '#04060f',
  bgDeep: '#070c1a',
  bgPanel: '#0d1424',
  bgPanel2: '#111a2e',
  bgElevated: '#16203a',

  // 文字
  text: '#e8eefc',
  textDim: '#9aabc7',
  textFaint: '#8595b2',

  // 描边
  border: '#1e2b47',
  borderBright: '#2d3f63',

  // 语义色
  accent: '#4da3ff',
  accentSoft: '#2d6fbf',
  accentDeep: '#2b6ea8',
  gold: '#ffb703',
  goldSoft: '#ffd166',
  goldDeep: '#a8761b',
  lensGreen: '#27ae60',
  lensGreenSoft: '#1e7a45',
  lensGreenBright: '#5fd68f',
  red: '#e56060',
  redSoft: '#ff8b8b',
  redDeep: '#c0392b',
  violet: '#9b7bff',
} as const

export type PaletteKey = keyof typeof PALETTE

/**
 * 从 :root 读一个 CSS 变量 —— 让 3D 场景用的是**真正生效**的颜色,
 * 而不是这里写死的字面量。读不到 (SSR / 老浏览器) 就退回上面的值。
 */
export function cssColor(name: PaletteKey): string {
  if (typeof window === 'undefined') return PALETTE[name]
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${kebab(name)}`)
    .trim()
  return value || PALETTE[name]
}

/** goldSoft -> gold-soft, bgPanel2 -> bg-panel-2 */
export function kebab(key: string): string {
  return key
    .replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
    .replace(/([a-z])(\d)/g, '$1-$2')
}
