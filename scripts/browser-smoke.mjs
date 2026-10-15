#!/usr/bin/env node
/**
 * 浏览器冒烟测试。
 *
 * 为什么需要它
 * ----------------------------------------------------------------------------
 * `tsc` 和 `next build` 都发现不了「页面在真实浏览器里整页崩掉」这类错误。
 * 真实例子: 本项目曾经在渲染 <Canvas> 的那个组件里调用 useFrame, R3F 抛出
 *
 *     R3F: Hooks can only be used within the Canvas component!
 *
 * 构建完全通过, 但打开页面只会看到一张空白错误页 —— 整个子问题一的
 * 内容都看不见。这个脚本就是用来在 push 之前抓住这类问题的。
 *
 * 它做什么
 * ----------------------------------------------------------------------------
 * 用无头 Chrome 逐个打开页面, 通过 DevTools 协议检查:
 *   1. 有没有未捕获异常 (Runtime.exceptionThrown)
 *   2. 有没有 console.error
 *   3. 页面的 <canvas> 数量对不对, 且尺寸不是 0
 *   4. <h1> 是否存在且非空
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

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
})

// ------------------------------------------------------------------ 逐页检查
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

const results = []

for (const route of ROUTES) {
  events = []
  await send('Page.navigate', { url: BASE + route.path })
  await sleep(SETTLE_MS)

  const res = await send('Runtime.evaluate', { expression: INSPECT, returnByValue: true })
  const state = res.result?.result?.value ?? {}

  const exceptions = events
    .filter((e) => e.method === 'Runtime.exceptionThrown')
    .map((e) => (e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text || 'unknown').split('\n')[0])

  const consoleErrors = events
    .filter((e) => e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error')
    .map((e) => (e.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ').split('\n')[0])

  const problems = []
  if (exceptions.length) problems.push(`未捕获异常: ${exceptions[0]}`)
  if (consoleErrors.length) problems.push(`console.error: ${consoleErrors[0]}`)
  if (!state.h1) problems.push('没有 <h1>')
  const actual = state.canvases?.length ?? 0
  if (actual !== route.canvases) {
    problems.push(`<canvas> 数量 ${actual}, 期望 ${route.canvases}`)
  }
  for (const c of state.canvases ?? []) {
    if (c.w === 0 || c.h === 0) problems.push(`<canvas> 尺寸为 0 (${c.w}×${c.h})`)
  }
  if (state.spinners > 0) problems.push(`${state.spinners} 个 3D 场景仍停在加载占位符`)

  results.push({ route, state, problems })
  const mark = problems.length === 0 ? '✓' : '✗'
  console.log(
    `${mark} ${route.path.padEnd(30)} canvas=${String(actual).padEnd(2)} h1=${state.h1 ? 'yes' : 'NO '}` +
      (problems.length ? `  <-- ${problems.join('; ')}` : ''),
  )
}

ws.close()
cleanup(results.some((r) => r.problems.length) ? 1 : 0)
