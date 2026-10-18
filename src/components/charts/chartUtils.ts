/**
 * SVG 图表共用的小工具 —— 刻度、比例尺。
 *
 * 为什么不用图表库: 这几张图只有十几个点, 手写 SVG 比引入 recharts 之类
 * (几十 KB) 更轻, 而且能直接吃 CSS 变量 —— 主题改一处, 所有图跟着变。
 */

/** 线性比例尺: 把数据区间映射到像素区间 */
export function linear(d0: number, d1: number, r0: number, r1: number) {
  return (v: number) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0)
}

/** 对数比例尺 (用于跨几个数量级的数据) */
export function log10(d0: number, d1: number, r0: number, r1: number) {
  const l0 = Math.log10(d0)
  const l1 = Math.log10(d1)
  return (v: number) => r0 + ((Math.log10(Math.max(v, d0)) - l0) / (l1 - l0)) * (r1 - r0)
}

/** 线性刻度: 从 d0 到 d1 取大约 count 个"好看"的值 */
export function linearTicks(d0: number, d1: number, count = 6): number[] {
  const span = d1 - d0
  const raw = span / count
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag
  const out: number[] = []
  for (let v = Math.ceil(d0 / step) * step; v <= d1 + 1e-9; v += step) {
    out.push(Math.round(v / step) * step)
  }
  return out
}

/** 对数刻度: 每个数量级一个刻度 (10, 100, 1000 …) */
export function logTicks(d0: number, d1: number): number[] {
  const out: number[] = []
  for (let e = Math.floor(Math.log10(d0)); e <= Math.ceil(Math.log10(d1)); e++) {
    const v = Math.pow(10, e)
    if (v >= d0 * 0.999 && v <= d1 * 1.001) out.push(v)
  }
  return out
}

/** 1 000 -> "1k", 根据数量级决定怎么写才算好看 */
export function compact(v: number): string {
  if (v >= 1000) return `${Math.round(v / 1000)}k`
  if (v >= 1) return String(Math.round(v * 10) / 10)
  return String(v)
}

/** 好看的浮点显示, 去掉多余的 0 */
export function nice(v: number, digits = 1): string {
  return Number(v.toFixed(digits)).toString()
}
