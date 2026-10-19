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
  bgVoid: '#05070d',
  bgDeep: '#080b12',
  bgPanel: '#0c1018',
  bgPanel2: '#101520',
  bgElevated: '#141a26',

  // 文字
  text: '#dfe6ef',
  textDim: '#8e9aa8',
  textFaint: '#8b96a4',

  // 描边
  border: '#171d28',
  borderBright: '#232c3a',

  // 语义色
  accent: '#7d8fa3',
  accentSoft: '#5c6a7a',
  accentDeep: '#4a5666',
  gold: '#d9c8a4',
  goldSoft: '#e8dcc2',
  goldDeep: '#8a7c62',
  lensGreen: '#9fb0b2',
  lensGreenSoft: '#788789',
  lensGreenBright: '#bcc9cb',
  red: '#9d8c8c',
  redSoft: '#bba9a9',
  redDeep: '#6b5e5e',
  violet: '#9391ac',
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
