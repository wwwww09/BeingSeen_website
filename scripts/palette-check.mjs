#!/usr/bin/env node
/**
 * 检查 src/lib/palette.ts 和 globals.css 的 :root 是否一致。
 *
 * 为什么需要这条检查
 * ----------------------------------------------------------------------------
 * 颜色有两份表示: CSS 变量 (给 DOM / SVG) 和 TS 字面量 (给 three.js, 它拿不到
 * CSS 变量)。两份一旦跑偏, 页面就会悄悄分裂成两套配色 —— 这不是假想:
 * --text-faint 从 #6a7b98 改到 #8595b2 之后, 拷贝出去的字面量没人同步,
 * 那个废弃的颜色在 5 个文件里继续用了很久。
 *
 * 另外还会扫一遍 src/, 确认没有新的硬编码色值绕过色板。
 *
 *   node scripts/palette-check.mjs
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')

let pass = 0
let fail = 0
const ok = (m) => { pass++; console.log(`✓ ${m}`) }
const no = (m, d) => { fail++; console.log(`✗ ${m}${d ? '  — ' + d : ''}`) }

// ---------------------------------------------------------------- 解析 CSS
const css = readFileSync(join(REPO, 'src/app/globals.css'), 'utf8')
const rootBlock = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')))
const cssVars = new Map()
for (const m of rootBlock.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,6})\s*;/g)) {
  cssVars.set(m[1], m[2].toLowerCase())
}

// ---------------------------------------------------------------- 解析 TS
const ts = readFileSync(join(REPO, 'src/lib/palette.ts'), 'utf8')
const paletteBlock = ts.slice(ts.indexOf('export const PALETTE = {'))
const tsVars = new Map()
for (const m of paletteBlock.matchAll(/^\s*([a-zA-Z0-9]+):\s*'(#[0-9a-fA-F]{3,6})'/gm)) {
  const kebab = m[1]
    .replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
    .replace(/([a-z])(\d)/g, '$1-$2')
  tsVars.set(kebab, m[2].toLowerCase())
}

console.log(`── palette.ts 与 globals.css 对照 (${tsVars.size} 个数据色) ──`)
for (const [name, hex] of tsVars) {
  const inCss = cssVars.get(name)
  if (!inCss) no(`--${name} 在 globals.css 里不存在`, `palette.ts 写着 ${hex}`)
  else if (inCss !== hex) no(`--${name} 两边不一致`, `css=${inCss} ts=${hex}`)
}
if (fail === 0) ok(`${tsVars.size} 个数据色两边完全一致`)

// ---------------------------------------------------------------- 扫硬编码
console.log('\n── src/ 里有没有硬编码色值绕过色板 ──')
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(tsx|ts)$/.test(p)) out.push(p)
  }
  return out
}

const ALLOWED = new Set([...tsVars.values(), ...cssVars.values()])
// palette.ts 本身就是色板的定义处; layout.tsx 的 theme-color 需要字面量
const EXEMPT = [join('src', 'lib', 'palette.ts')]

let offenders = 0
for (const file of walk(join(REPO, 'src'))) {
  if (EXEMPT.some((e) => file.endsWith(e))) continue
  const text = readFileSync(file, 'utf8')
  text.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
      const hex = m[0].toLowerCase()
      if (ALLOWED.has(hex)) continue
      offenders++
      console.log(`  ✗ ${file.replace(REPO + '/', '')}:${i + 1}  ${hex}`)
    }
  })
}
if (offenders === 0) ok('src/ 里没有色板之外的颜色')

console.log(`\n通过 ${pass} 项, 失败 ${fail} 项${offenders ? `, 另有 ${offenders} 处硬编码色值` : ''}`)
process.exit(fail === 0 && offenders === 0 ? 0 : 1)
