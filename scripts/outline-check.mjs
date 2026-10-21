#!/usr/bin/env node
/**
 * 网页布局纲要 符合性检查。
 *
 * 这个脚本把 `网页布局纲要.docx` 里的要求逐条变成可执行的断言, 对着真正跑起来
 * 的页面核对一遍 —— 而不是靠肉眼看一遍说"差不多都做了"。
 *
 * 为什么不并进 browser-smoke.mjs
 * ----------------------------------------------------------------------------
 * 两者回答的问题不同: smoke 问"网站有没有坏", 这个问"有没有按纲要做完"。
 * 前者每次改代码都该跑; 后者在改内容/改结构时才需要。混在一起会让 smoke
 * 变慢, 也会让"失败到底是坏了还是偏离了纲要"变得难以分辨。
 *
 * 两点必须知道的排版差别
 * ----------------------------------------------------------------------------
 * 页面用的是排版引号 (’ ‘ “ ”) 和长破折号 (—), 而纲要的纯文本没有。
 * 两边都归一化之后再比对, 否则会出现"内容其实对、只是引号形状不同"的假失败。
 *
 * 用法
 *   ./dev.sh build && ./dev.sh start     # 另开一个终端
 *   ./dev.sh outline                     # 默认 http://localhost:3000
 *   ./dev.sh outline http://localhost:3101
 */

const BASE = (process.argv[2] || process.env.OUTLINE_URL || 'http://localhost:3000').replace(/\/$/, '')
const PORT = 9700 + Math.floor(Math.random() * 200)

// ------------------------------------------------------------------ Chrome
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')

function findChrome() {
  if (process.env.CHROME && existsSync(process.env.CHROME)) return process.env.CHROME
  for (const p of [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ]) {
    if (existsSync(p)) return p
  }
  for (const bin of ['google-chrome', 'chromium', 'chromium-browser']) {
    const r = spawnSync('which', [bin], { encoding: 'utf8' })
    if (r.status === 0 && r.stdout.trim()) return r.stdout.trim()
  }
  return null
}

const chromePath = findChrome()
if (!chromePath) {
  console.log('[outline] 找不到 Chrome / Chromium, 跳过。设置 CHROME=/path/to/chrome 可运行。')
  process.exit(0)
}

try {
  const res = await fetch(BASE)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
} catch (err) {
  console.error(`[outline] 连不上 ${BASE} (${err.message})`)
  console.error('[outline] 请先启动服务器: ./dev.sh build && ./dev.sh start')
  process.exit(1)
}

const PROFILE = join(tmpdir(), `beingseen-outline-${process.pid}`)
rmSync(PROFILE, { recursive: true, force: true })
const chrome = spawn(
  chromePath,
  [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--enable-unsafe-swiftshader', '--disable-extensions',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, 'about:blank',
  ],
  { stdio: 'ignore' },
)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function cleanup(code) {
  try { chrome.kill('SIGKILL') } catch { /* 已退出 */ }
  rmSync(PROFILE, { recursive: true, force: true })
  process.exit(code)
}

let ready = false
for (let i = 0; i < 60 && !ready; i++) {
  try { ready = (await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok } catch { /* 还没起来 */ }
  if (!ready) await sleep(300)
}
if (!ready) {
  console.error('[outline] Chrome 启动超时')
  cleanup(1)
}

// ------------------------------------------------------------------ CDP
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()
const target = targets.find((t) => t.type === 'page')
const ws = new WebSocket(target.webSocketDebuggerUrl)
const pending = new Map()
let msgId = 0

ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
})
await new Promise((r) => ws.addEventListener('open', r))

const send = (method, params) =>
  new Promise((res) => { const id = ++msgId; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })) })
const evaluate = async (e) =>
  (await send('Runtime.evaluate', { expression: e, returnByValue: true })).result?.result?.value

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })

// 归一化排版字符后再比对
const NORM = `(t => t.replace(/[\\u2018\\u2019]/g, "'").replace(/[\\u201C\\u201D]/g, '"').replace(/\\u2014/g, '--').replace(/\\s+/g, ' ').trim())`
const TEXT = `${NORM}(document.body.innerText)`
const HAS = (s) =>
  `(${TEXT}).includes(${JSON.stringify(
    s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/\u2014/g, '--'),
  )})`

let pass = 0
let fail = 0
const results = []
const check = (id, text, ok, detail) => {
  if (ok) pass++
  else fail++
  results.push({ id, text, ok, detail })
  console.log(`${ok ? '✓' : '✗'} ${id.padEnd(4)} ${text}`)
  if (detail) console.log(`         ${detail}`)
}

async function goto(path) {
  await send('Page.navigate', { url: BASE + path })
  await sleep(6500)
}

console.log(`网页布局纲要 符合性检查 — ${BASE}\n`)

// ---------------------------------------------------------------- 总体结构
console.log('── 总体结构 ──')
await goto('/')
const nav = await evaluate(
  `[...document.querySelectorAll('.nav__link')].map(a => a.getAttribute('aria-label') || a.textContent.trim())`,
)
check('G1', '导航栏五项, 顺序 Home → Lensing & SNe → Lensing & FRBs → GW Lensing → Being Seen',
  nav?.join('|') === 'Home|Lensing & SNe|Lensing & FRBs|GW Lensing|Being Seen', nav?.join(' → '))
const navPos = await evaluate(`getComputedStyle(document.querySelector('.nav')).position`)
check('G2', '导航栏固定在顶部', navPos === 'sticky' || navPos === 'fixed', `position: ${navPos}`)
const bg = await evaluate(`getComputedStyle(document.body).backgroundColor`)
const fg = await evaluate(`getComputedStyle(document.body).color`)
// 纲要要的是"深色背景 + 浅色文字"这个**性质**, 不是某几个具体色值。
// 原来这里写死了旧版的 rgb(4,6,15) 和 rgb(232,238,252) —— 一改配色就假失败。
{
  const relLum = (css) => {
    const [r, g, b] = css.match(/\d+/g).slice(0, 3).map(Number).map((v) => v / 255)
    const f = (u) => (u <= 0.03928 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4))
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const bgL = relLum(bg)
  const fgL = relLum(fg)
  const ratio = (Math.max(bgL, fgL) + 0.05) / (Math.min(bgL, fgL) + 0.05)
  check(
    'G3',
    '深色背景 + 浅色文字',
    bgL < 0.02 && fgL > 0.6 && ratio >= 12,
    `背景 ${bg} (亮度 ${bgL.toFixed(4)}) / 文字 ${fg} (亮度 ${fgL.toFixed(3)}), 对比 ${ratio.toFixed(1)}:1`,
  )
}
const routes = ['/', '/lensing-supernovae', '/lensing-frbs', '/gravitational-wave-lensing', '/being-seen']
check('G4', '五个页面 (一页一子问题 + 留言板收尾)',
  (await Promise.all(routes.map(async (r) => (await fetch(BASE + r)).ok))).every(Boolean), routes.join(' '))

// ---------------------------------------------------------------- 页面一
console.log('\n── 页面一 Home ──')
await goto('/')
check('H1', '自动旋转的 3D 粒子星图作背景',
  await evaluate(`Boolean(document.querySelector('.hero__scene canvas'))`))
check('H2', '标题 "Being Seen"', await evaluate(HAS('Being Seen')))
check('H3', '标语逐字一致',
  (await evaluate(HAS('The universe has its own telescope.'))) &&
  (await evaluate(HAS('We just need to learn how to look.'))))
check('H4', '简介段落逐字一致',
  (await evaluate(HAS('This project explores how gravitational lensing'))) &&
  (await evaluate(HAS('we quantify how much the universe reveals when we let it do the work.'))))
check('H5', '按钮 "Explore the Unseen →" 指向页面二',
  (await evaluate(`(() => { const a = [...document.querySelectorAll('a')].find(x => /Explore the Unseen/.test(x.textContent)); return a ? a.getAttribute('href') : null; })()`)) === '/lensing-supernovae')
check('H6', '星场同时表现 FRB 与透镜系统两类天体',
  // 3D 里的点无法从 DOM 断言, 这里查的是"两类数据都真的在首页上":
  // ParticleField 的蓝色点来自 lenses.json, 金色点代表未探测源, 两者都由首页传入。
  (await evaluate(HAS('Known gravitational lenses'))) &&
    (await evaluate(HAS('Fast radio bursts searched'))),
  'ParticleField: 蓝=已知透镜, 金=未探测源, 另有背景尘埃')

// ---------------------------------------------------------------- 页面二
console.log('\n── 页面二 Lensing & Supernovae ──')
await goto('/lensing-supernovae')
check('S1', '问题标题', await evaluate(HAS('Can Lensing Make Distant Supernovae Visible?')))
check('S2', '文案: 无透镜 0/5 可见, 有透镜 2 颗可见',
  (await evaluate(HAS('Without gravitational lensing, 0 of 5'))) &&
  (await evaluate(HAS('2 became visible'))))
// 原来这条保护的是"结论框里要有那句 order of magnitude"。但那个说法本身是错的
// (无透镜时 0 个 → 2/0 无定义), 所以改成检查结论框给出的是能数出来的计数。
check(
  'S3',
  '结论框给出的是样本里的计数',
  await evaluate(`(() => {
    const q = document.querySelector('.callout--gold .callout__quote');
    if (!q) return false;
    const t = q.textContent.toLowerCase();
    return /two of these five/.test(t) && !/order of magnitude/.test(t);
  })()`),
  '五颗里有两颗是因为透镜才被看见 —— 计数, 不是倍率',
)
check('S4', '主图: 有/无透镜亮度对比', await evaluate(`Boolean(document.querySelector('.explorer'))`),
  '交互式哑铃图, 同一行左右两点即"无透镜/有透镜"')
// 纲要要求的副图是"模拟星表的分布 vs 真实样本"。
// 原来这里查的是有没有那张 PNG 图片 —— 图从 matplotlib 截图换成 SVG 之后就假失败了。
// 断言应该冲着要求去: 页面上要同时有"模拟星表直方图"和"真实样本哑铃图"两块。
check('S5', '副图: 模拟星表 vs 真实样本分布',
  await evaluate(`document.querySelectorAll('.gischart .chartpanel').length === 2`),
  '.gischart 里两个面板: 左=模拟星表直方图, 右=真实样本透镜前后')
// 防回归: 这五颗是手工从文献里整理出来的, 出处必须留在页面上。
// 少了它, 读者无从判断"为什么是这五颗", 也没法核。
check(
  'S5b',
  '真实样本标注了文献出处 (手工整理, 非星表查询)',
  await evaluate(`(() => {
    const p = [...document.querySelectorAll('p')].find((x) =>
      /compiled by hand/i.test(x.textContent || ''),
    );
    return Boolean(p) && p.querySelectorAll('a[href*="arxiv.org/abs/"]').length >= 5;
  })()`),
  '五条 arXiv 链接 + 一句"手工整理、不是完整星表"的说明',
)

check('S6', '模拟星表规模约 64,000 个事件', await evaluate(HAS('64,309')))
check('S7', '可选 3D 图: lenscat 透镜系统 vs 真实 gISNe',
  await evaluate(`Boolean(document.querySelector('.canvas-wrap canvas'))`))

// ---------------------------------------------------------------- 页面三
console.log('\n── 页面三 Lensing & FRBs ──')
await goto('/lensing-frbs')
check('F1', '问题标题', await evaluate(HAS("Can Lensing 'Copy' FRB Signals?")))
check('F2', '文案: 路径弯折 / 更晚到达 / 在 CHIME 目录中搜寻',
  (await evaluate(HAS('its path is bent'))) && (await evaluate(HAS('arriving later'))) &&
  (await evaluate(HAS('CHIME/FRB Catalogue'))))
check('F3', '主图1: 3D 光路示意图 (时间延迟机制)',
  await evaluate(`document.querySelectorAll('canvas').length >= 1`))
// 纲要要的是"候选体筛选用图"这件事本身。原来这里查的是那张 PNG 的文件名,
// 图从 matplotlib 换成 SVG 之后就假失败了 —— 又是"查实现而不是查要求"。
check('F4', '主图2: 候选体筛选用图',
  await evaluate(`Boolean(document.querySelector('.chartpanel--wide svg'))`),
  '纲要写的是 time_delay_histogram.png —— 见下方说明')
check('F5', '副图: 全样本 3D 分布 (颜色=DM, 大小=SNR)',
  await evaluate(`document.querySelectorAll('canvas').length >= 2`))
check('F6', '高亮候选体',
  await evaluate(`document.querySelectorAll('.skymap__legend-row').length > 0`))

/*
 * 防回归 (F8): 图上那句话曾经是 "That corner of the plot is empty" —— 而数据里
 * 有 3 对候选正落在那个角落, 图表本身也把它们画成了绿点。图和文案互相矛盾。
 * 这里做一次语义交叉检查: 既然有存活候选, 文案就不能说"空"。
 */
check(
  'F8',
  '筛选用图的文案不与"有存活候选"矛盾',
  await evaluate(`(() => {
    const cap = [...document.querySelectorAll('p')].find((p) =>
      /genuine lensed pair must satisfy/i.test(p.textContent || ''),
    );
    if (!cap) return false;
    const text = cap.textContent || '';
    return !/corner of the plot is empty/i.test(text) && /reach that corner/i.test(text);
  })()`),
  '3 对候选就在角落里 —— 不能再说"那个角落是空的"',
)
check('F7', '结论按复核后的结果呈现 (null result)',
  await evaluate(HAS('no reliable lensed candidate')),
  '纲要的 "546 events, 2 clean candidates" 经复核不成立')

// ---------------------------------------------------------------- 页面四
console.log('\n── 页面四 GW Lensing ──')
await goto('/gravitational-wave-lensing')
check('W1', '问题标题', await evaluate(HAS('Can GW Lensing Correct Black Hole Masses?')))
check('W2', '文案: 两个事件落入质量间隙',
  (await evaluate(HAS('pair-instability'))) && (await evaluate(HAS('GWTC-5.0'))))
check('W3', '结论框: "may simply be lensed"',
  await evaluate(HAS("some 'anomalous' black holes may simply be lensed")))
// 要求是"有一张观测 vs 修正的图, 带误差棒"。误差棒在 SVG 里是 <line>,
// 所以查"图在 + 有误差棒", 而不是查那张 PNG 的文件名。
check('W4', '主图: 观测 vs 修正, 带误差棒',
  await evaluate(`(() => {
    const svg = document.querySelector('.chartpanel--wide svg');
    if (!svg) return false;
    // 误差棒 = 带 stroke-width 且不是轴线的短竖线; 用数量粗判即可
    return svg.querySelectorAll('line').length > 20;
  })()`))
check('W5', '副图: 修正过程 (高度下降, 红→蓝)',
  await evaluate(`Boolean(document.querySelector('.explorer input[type=range]'))`))

/*
 * 这一条不是纲要要求, 是防回归 —— 页面曾经用一个**永远为假**的判定冒充结论:
 * 反解放大率时把真实质量定义在边界 45 上, 然后用 `m1Corr < 45` 去问"是否脱离
 * 间隙", 45 < 45 恒为假, 于是"Out of gap?"只能显示 no, 和页面自己的叙述矛盾。
 *
 * 现在断言两件事: 数据上要求的放大率确实能把质量压到边界或以下; 页面上也确实
 * 显示 yes。少了任何一条, 这一节就又变成自说自话。
 */
{
  const gwData = JSON.parse(readFileSync(join(REPO, 'public/data/gravitational-waves.json'), 'utf8'))
    .gravitationalWaves
  const bound = gwData.gapLowerBound
  const eps = 0.01
  const arithmeticOk = gwData.candidates.every(
    (c) => c.m1Obs / c.sqrtMu <= bound + eps && c.m2Obs / c.sqrtMu <= bound + eps,
  )
  // 页面上有好几张表 (两张候选详情卡也是表), 必须先按表头找到"判定"那一张
  const tableSaysYes = await evaluate(`(() => {
    const table = [...document.querySelectorAll('table')].find((t) =>
      /out of gap/i.test(t.querySelector('thead')?.textContent || ''),
    );
    if (!table) return false;
    const cells = [...table.querySelectorAll('tbody tr')].map((tr) =>
      tr.lastElementChild?.textContent?.trim(),
    );
    return cells.length > 0 && cells.every((c) => c === 'yes');
  })()`)
  check(
    'W6',
    '要求的放大率确实能把两颗质量压到边界 45 M☉ 或以下',
    arithmeticOk && tableSaysYes,
    `数据: ${arithmeticOk ? '满足' : '不满足'} · 表格: ${tableSaysYes ? 'yes' : '仍显示 no'}`,
  )
}

// ---------------------------------------------------------------- 页面五
console.log('\n── 页面五 Being Seen ──')
await goto('/being-seen')
check('B1', '简化 3D 星图', await evaluate(`Boolean(document.querySelector('.guestbook__canvas canvas'))`))
check('B2', '英文文案逐字一致',
  (await evaluate(HAS('Every dim star here represents an object in the universe that has not yet been fully seen.'))) &&
  (await evaluate(HAS('it will simply become the light of that star.'))))
check('B3', '点击暗淡星体 → 出现文本框', await evaluate(`Boolean(document.querySelector('textarea'))`),
  '点星后聚焦右侧输入框')
check('B4', '匿名, 无需登录', await evaluate(HAS('without any account, name, or identity')))
// 星体是否变亮发生在 WebGL 里, DOM 读不到。但提示里的 "N of 320 stars have been
// lit" 和 3D 场景用的是同一份 litIndices —— 每有一个故事就该多点亮一颗星。
// 所以「故事条数 == 点亮星数」是可以从 DOM 断言的等价物。
const litInfo = await evaluate(`(() => {
  const hint = document.querySelector('.guestbook__hint')?.textContent || '';
  const m = hint.match(/(\\d+) of (\\d+) stars/);
  return { lit: m ? Number(m[1]) : null, total: m ? Number(m[2]) : null,
           items: document.querySelectorAll('.storylist__item').length };
})()`)
check('B5', '每一条故事都点亮了一颗星',
  litInfo.lit !== null && litInfo.lit === litInfo.items,
  `点亮 ${litInfo.lit} 颗 / 列表 ${litInfo.items} 条（星图共 ${litInfo.total} 颗）`)
check('B6', '故事显示在侧边栏', await evaluate(`Boolean(document.querySelector('.guestbook__stories'))`))
// 这条说的是"用哪个存储", 是代码层面的事实, 不该靠页面上凑巧出现的字样。
// (旧写法查的是页面里有没有 "Supabase", 而那只存在于"未连接"提示中 ——
//  一旦真的接上数据库, 提示消失, 这条就会假失败。)
const pkgJson = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'))
const usesSupabaseDep = Boolean(pkgJson.dependencies?.['@supabase/supabase-js'])
const guestbookSrc = readFileSync(join(REPO, 'src/components/Guestbook.tsx'), 'utf8')
const importsClient = guestbookSrc.includes('@supabase/supabase-js')
const apiRoute = readFileSync(join(REPO, 'src/app/api/stories/route.ts'), 'utf8')
const apiUsesClient = apiRoute.includes('@supabase/supabase-js')
const hasSchema = existsSync(join(REPO, 'supabase/schema.sql'))
check('B7', '存储用 Supabase (替代纲要里的 Firebase, 按项目要求)',
  usesSupabaseDep && importsClient && apiUsesClient && hasSchema,
  `依赖 ${usesSupabaseDep} · 浏览器端 ${importsClient} · 服务端 ${apiUsesClient} · schema.sql ${hasSchema}`)
check('B8', '科学数据与人类情感并置, 不强行类比',
  await evaluate(HAS('It does not claim they are the same thing.')))

// ---------------------------------------------------------------- 结果
console.log(`
── 与纲要的两处有意不同 (已在 README 说明) ──
  F4  纲要要 time_delay_histogram.png (候选体时间延迟分布)。那份图是围绕
      "2 个干净候选体"做的, 而那个结论经复核不成立 —— 画"候选体的时间延迟"
      等于在画不存在的候选体。页面改用 DM-间距分布图, 它才是这个 null result
      的证据 (真正的透镜像对必须同时满足小间距与 DM 一致, 而那个角落是空的)。
  W4  纲要要 mass_correction_with_errors.png。原图用的是算错的公式
      (m_corr = m_obs/μ, 那不是质量), 已按 m_obs = m_true·√μ 重算,
      仍然带误差棒 —— 现在是 SVG 组件 (GwMassChart), 不再是图片。
  另:  页面五按项目要求用 Supabase, 不是纲要写的 Firebase。
`)

console.log(`通过 ${pass} 项, 未满足 ${fail} 项`)
ws.close()
cleanup(fail === 0 ? 0 : 1)
