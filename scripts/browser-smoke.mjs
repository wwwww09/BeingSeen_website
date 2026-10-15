#!/usr/bin/env node
/**
 * 浏览器冒烟测试 —— 渲染 + 交互。
 *
 * 为什么需要它
 * ----------------------------------------------------------------------------
 * `tsc` 和 `next build` 都发现不了「页面在真实浏览器里整页崩掉」这类错误。
 * 真实例子: 本项目曾经在渲染 <Canvas> 的那个组件里调用 useFrame, R3F 抛出
 *
 *     R3F: Hooks can only be used within the Canvas component!
 *
 * 构建完全通过, 但打开页面只会看到一张空白错误页。这个脚本用来在 push 之前
 * 抓住这类问题。
 *
 * 它检查什么
 * ----------------------------------------------------------------------------
 * 第一阶段 · 渲染 (五个页面各一次)
 *   1. 有没有未捕获异常 (Runtime.exceptionThrown)
 *   2. 有没有 console.error
 *   3. <canvas> 数量对不对, 尺寸是否为 0
 *   4. <h1> 是否存在且非空
 *   5. 3D 场景有没有卡在加载占位符
 *
 * 第二阶段 · 交互 (这个"严肃游戏"的核心机制真的能用吗)
 *   6. 页面二的探测极限滑块: 初始值 = 真实 ZTF 极限, 且读数与页头结论一致
 *   7. 滑块拖到别处时读数会跟着变
 *   8. 页面四的放大率滑块: 能拖到通关 (Gap cleared), Reset 能回到起点
 *   9. 页面五点星图能选中一颗星
 *
 * 用法
 * ----------------------------------------------------------------------------
 *   ./dev.sh build && ./dev.sh start        # 另开一个终端
 *   ./dev.sh smoke                          # 默认检查 http://localhost:3000
 *   ./dev.sh smoke http://localhost:3101    # 指定地址
 *   CHROME=/path/to/chrome node scripts/browser-smoke.mjs
 *
 * 找不到 Chrome 时会打印说明并「跳过」(退出码 0), 不会让流程失败。
 * 只依赖 Node 内置模块 (需要 Node 22+, 因为用到全局 WebSocket)。
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BASE = (process.argv[2] || process.env.SMOKE_URL || 'http://localhost:3000').replace(/\/$/, '')

/** 每个路由期望的 <canvas> 数量 */
const ROUTES = [
  { path: '/', canvases: 1, label: 'Home' },
  { path: '/lensing-supernovae', canvases: 1, label: 'Lensing & SNe' },
  { path: '/lensing-frbs', canvases: 2, label: 'Lensing & FRBs' },
  { path: '/gravitational-wave-lensing', canvases: 0, label: 'GW Lensing' },
  { path: '/being-seen', canvases: 1, label: 'Being Seen' },
]

/** 每个页面给多少毫秒让 3D 场景初始化 */
const SETTLE_MS = 7000

// 失败计数
let failures = 0
const fail = (name, detail) => {
  failures++
  console.log(`✗ ${name}${detail ? `  — ${detail}` : ''}`)
}
const pass = (name, detail) => {
  console.log(`✓ ${name}${detail ? `  — ${detail}` : ''}`)
}
const check = (name, ok, detail) => (ok ? pass(name, detail) : fail(name, detail))

// ------------------------------------------------------------------ Chrome
function findChrome() {
  if (process.env.CHROME && existsSync(process.env.CHROME)) return process.env.CHROME

  const macPaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  ]
  for (const p of macPaths) if (existsSync(p)) return p

  for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    const r = spawnSync('which', [bin], { encoding: 'utf8' })
    if (r.status === 0 && r.stdout.trim()) return r.stdout.trim()
  }
  return null
}

const chromePath = findChrome()
if (!chromePath) {
  console.log('[smoke] 找不到 Chrome / Chromium, 跳过浏览器检查。')
  console.log('[smoke] 如需运行: 设置 CHROME=/path/to/chrome 后重试。')
  process.exit(0)
}

// ------------------------------------------------------------------ 服务器
try {
  const res = await fetch(BASE, { method: 'GET' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
} catch (err) {
  console.error(`[smoke] 连不上 ${BASE} (${err.message})`)
  console.error('[smoke] 请先启动服务器: ./dev.sh build && ./dev.sh start')
  process.exit(1)
}

// ------------------------------------------------------------------ 启动 Chrome
const PORT = 9400 + Math.floor(Math.random() * 200)
const PROFILE = join(tmpdir(), `beingseen-smoke-${process.pid}`)
rmSync(PROFILE, { recursive: true, force: true })

const chrome = spawn(
  chromePath,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--no-first-run',
    '--enable-unsafe-swiftshader',
    '--disable-extensions',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitForDevTools(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      if (res.ok) return true
    } catch {
      /* 还没起来 */
    }
    await sleep(300)
  }
  return false
}

function cleanup(code) {
  try {
    chrome.kill('SIGKILL')
  } catch {
    /* 已经退出 */
  }
  rmSync(PROFILE, { recursive: true, force: true })
  process.exit(code)
}

if (!(await waitForDevTools())) {
  console.error('[smoke] Chrome 启动超时')
  cleanup(1)
}

// ------------------------------------------------------------------ CDP
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()
const target = targets.find((t) => t.type === 'page')
if (!target) {
  console.error('[smoke] 没有可用的 page target')
  cleanup(1)
}

const ws = new WebSocket(target.webSocketDebuggerUrl)
const pending = new Map()
let events = []
let msgId = 0

ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m)
    pending.delete(m.id)
  } else if (m.method) {
    events.push(m)
  }
})
await new Promise((r) => ws.addEventListener('open', r))

const send = (method, params) =>
  new Promise((res) => {
    const id = ++msgId
    pending.set(id, res)
    ws.send(JSON.stringify({ id, method, params }))
  })

async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.result?.exceptionDetails) {
    throw new Error(
      'Runtime.evaluate 抛出异常: ' +
        (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text || ''),
    )
  }
  return r.result?.result?.value
}

async function goto(path) {
  events = []
  await send('Page.navigate', { url: BASE + path })
  await sleep(SETTLE_MS)
}

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
})

// ================================================================== 第一阶段: 渲染
console.log('\n── 渲染 ──────────────────────────────────────────')

const INSPECT = `(() => {
  const canvases = [...document.querySelectorAll('canvas')].map((c) => {
    const r = c.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  const h1 = document.querySelector('h1');
  return {
    h1: h1 ? h1.textContent.trim() : null,
    canvases,
    spinners: document.querySelectorAll('.loading').length,
  };
})()`

for (const route of ROUTES) {
  await goto(route.path)

  const state = (await evaluate(INSPECT)) ?? {}

  const exceptions = events
    .filter((e) => e.method === 'Runtime.exceptionThrown')
    .map((e) =>
      (e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text || 'unknown').split('\n')[0],
    )

  const consoleErrors = events
    .filter((e) => e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error')
    .map((e) => (e.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ').split('\n')[0])

  const problems = []
  if (exceptions.length) problems.push(`未捕获异常: ${exceptions[0]}`)
  if (consoleErrors.length) problems.push(`console.error: ${consoleErrors[0]}`)
  if (!state.h1) problems.push('没有 <h1>')
  const actual = state.canvases?.length ?? 0
  if (actual !== route.canvases) problems.push(`<canvas> 数量 ${actual}, 期望 ${route.canvases}`)
  for (const c of state.canvases ?? []) {
    if (c.w === 0 || c.h === 0) problems.push(`<canvas> 尺寸为 0 (${c.w}×${c.h})`)
  }
  if (state.spinners > 0) problems.push(`${state.spinners} 个 3D 场景仍停在加载占位符`)

  const label = `${route.path}  (canvas=${actual})`
  check(label, problems.length === 0, problems.join('; '))
}

// ================================================================== 第二阶段: 交互
console.log('\n── 交互 ──────────────────────────────────────────')

/** React 受控 range input: 必须用原生 setter 再派发 input 事件 */
async function setRange(ariaLabel, value) {
  return evaluate(`(() => {
    const el = document.querySelector('input[type=range][aria-label=${JSON.stringify(ariaLabel)}]');
    if (!el) return null;
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set;
    setter.call(el, String(${value}));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return el.value;
  })()`)
}

const READ_EXPLORER = `(() => {
  const exp = document.querySelector('.explorer');
  if (!exp) return null;
  return {
    mag: exp.querySelector('.explorer__mag')?.textContent.replace(/\\s+/g, ' ').trim() ?? null,
    counts: [...exp.querySelectorAll('.explorer__counts .bigstat')].map((b) => ({
      value: b.querySelector('.bigstat__value')?.textContent.trim(),
      label: b.querySelector('.bigstat__label')?.textContent.trim(),
    })),
    reveal: exp.querySelector('.explorer__reveal')?.textContent.replace(/\\s+/g, ' ').trim() ?? '',
  };
})()`

// ---------------------------------------------------------- 页面二: 探测极限
await goto('/lensing-supernovae')
let s = await evaluate(READ_EXPLORER)

check(
  'SNe · 初始探测极限 = 真实 ZTF 极限 m = 20.5',
  s?.mag === 'm = 20.5',
  `实际 ${s?.mag}`,
)
check(
  'SNe · 初始读数与页头结论一致 (无透镜 0/5, 有透镜 2/5)',
  s?.counts?.[0]?.value === '0 / 5' && s?.counts?.[1]?.value === '2 / 5',
  JSON.stringify(s?.counts?.map((c) => c.value)),
)
check(
  'SNe · 揭示文案准确 (不再谎称"放大率最高的两个")',
  /^2 revealed by lensing/.test(s?.reveal ?? '') && !/most strongly magnified/.test(s?.reveal ?? ''),
  (s?.reveal ?? '').slice(0, 70),
)

await setRange('Detection limiting magnitude', 26)
await sleep(500)
s = await evaluate(READ_EXPLORER)
check(
  'SNe · 滑块拖到 m=26 后读数变化 (4/5 与 5/5)',
  s?.counts?.[0]?.value === '4 / 5' && s?.counts?.[1]?.value === '5 / 5',
  JSON.stringify(s?.counts?.map((c) => c.value)),
)

await setRange('Detection limiting magnitude', 18.5)
await sleep(500)
s = await evaluate(READ_EXPLORER)
check(
  'SNe · 拖到 m=18.5 后只剩 iPTF16geu 可见 (1/5)',
  s?.counts?.[1]?.value === '1 / 5' && /^1 revealed by lensing/.test(s?.reveal ?? ''),
  JSON.stringify(s?.counts?.map((c) => c.value)),
)

// ---------------------------------------------------------- 页面四: 放大率 + 通关
await goto('/gravitational-wave-lensing')
let g = await evaluate(READ_EXPLORER)

check('GW · 初始 μ = 1 且 0/2 脱离质量间隙', /μ = 1\.00/.test(g?.mag ?? '') && g?.counts?.[1]?.value === '0 / 2', `${g?.mag} | ${g?.counts?.[1]?.value}`)
check('GW · 初始未通关', !/Gap cleared/.test(g?.reveal ?? ''))

const maxSqrt = await evaluate(
  `document.querySelector('input[aria-label="Lensing magnification"]')?.max ?? null`,
)
await setRange('Lensing magnification', maxSqrt)
await sleep(500)
g = await evaluate(READ_EXPLORER)
check(
  'GW · 拖到最大后两颗都脱离间隙 (2/2)',
  g?.counts?.[1]?.value === '2 / 2',
  JSON.stringify(g?.counts?.map((c) => c.value)),
)
check('GW · 出现通关提示 "Gap cleared"', /Gap cleared/.test(g?.reveal ?? ''), (g?.reveal ?? '').slice(0, 80))

await evaluate(`(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim().startsWith('Reset'));
  if (b) b.click();
})()`)
await sleep(500)
g = await evaluate(READ_EXPLORER)
check('GW · Reset 后回到 0/2', g?.counts?.[1]?.value === '0 / 2', JSON.stringify(g?.counts?.map((c) => c.value)))

// ---------------------------------------------------------- 页面五: 点星星
await goto('/being-seen')

const HEADER = `document.querySelector('.guestbook__form .sub-title')?.textContent.trim() ?? null`
check('Being Seen · 初始未选中任何星', (await evaluate(HEADER)) === 'Leave an anonymous story')

const box = await evaluate(`(() => {
  const c = document.querySelector('canvas');
  if (!c) return null;
  const r = c.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
})()`)

let hit = null
if (box) {
  // 在画布上试几个位置, 命中即停 (星图会自转, 不预设坐标)
  outer: for (const fy of [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74]) {
    for (const fx of [0.5, 0.42, 0.58, 0.34, 0.66]) {
      const cx = box.x + box.w * fx
      const cy = box.y + box.h * fy
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx, y: cy })
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1 })
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx, y: cy, button: 'left', clickCount: 1 })
      await sleep(320)
      const h = await evaluate(HEADER)
      if (h && h !== 'Leave an anonymous story') {
        hit = h
        break outer
      }
    }
  }
}
check('Being Seen · 点击星图能选中一颗星', !!hit && /^You chose star #\d+$/.test(hit), hit ?? '试遍所有位置都没选中')

// ---------------------------------------------------------- 全局: 无异常
const exceptions = events.filter((e) => e.method === 'Runtime.exceptionThrown')
check('交互过程无未捕获异常', exceptions.length === 0, exceptions.length ? String(exceptions[0].params?.exceptionDetails?.exception?.description).slice(0, 100) : '')

// ================================================================== 结果
console.log('')
if (failures === 0) {
  console.log(`全部通过 (${ROUTES.length} 个页面 + 交互检查)`)
} else {
  console.log(`${failures} 项失败`)
}
ws.close()
cleanup(failures === 0 ? 0 : 1)
