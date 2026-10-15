#!/usr/bin/env node
/**
 * 静态产物预览服务器。
 *
 * 为什么不用 `python -m http.server` / `npx serve`
 * ----------------------------------------------------------------------------
 * Next 的静态导出会为每个子页面同时生成**两样东西**:
 *
 *     out/lensing-supernovae.html      <- 真正的页面
 *     out/lensing-supernovae/          <- RSC 客户端导航用的 .txt 载荷, 没有 index.html
 *
 * 普通静态服务器遇到 `/lensing-supernovae` 会先 301 到 `/lensing-supernovae/`,
 * 然后因为目录里没有 index.html 而**列出文件目录** —— 五个页面里有四个
 * 预览出来是一堆 .txt 文件名, 看起来像是导出坏了, 其实没有。
 *
 * 这个服务器按真实托管平台的行为解析 URL (精确文件 -> .html -> /index.html),
 * 所以 `./dev.sh serve-static` 看到的就是部署后的样子。
 *
 * 用法: ./dev.sh static && ./dev.sh serve-static    (PORT 默认 3200)
 */

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('../out', import.meta.url)))
const PORT = Number(process.env.PORT || 3200)
const HOST = process.env.HOST || '127.0.0.1'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
}

async function fileSize(p) {
  try {
    const s = await stat(p)
    return s.isFile() ? s.size : null
  } catch {
    return null
  }
}

/** 把 URL 解析成 out/ 里的一个真实文件, 顺序模仿托管平台的 clean URL 行为 */
async function resolveRequest(pathname) {
  // 去掉尾部斜杠 (根路径除外), 这样 /a/ 和 /a 走同一条路
  const clean = pathname.replace(/\/+$/, '') || '/'
  const rel = normalize(decodeURIComponent(clean)).replace(/^(\.\.[/\\])+/, '')
  const base = join(ROOT, rel)

  const candidates = [
    base, // 精确文件: /charts/x.png, /index.html
    `${base}.html`, // clean URL: /lensing-supernovae -> lensing-supernovae.html
    join(base, 'index.html'), // 目录: / -> index.html
  ]

  for (const c of candidates) {
    // 防目录穿越: 解析后的路径必须仍在 out/ 内
    if (!resolve(c).startsWith(ROOT)) continue
    const size = await fileSize(c)
    if (size !== null) return { file: c, size }
  }
  return null
}

const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' })
    res.end('Method Not Allowed')
    return
  }

  const pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname
  const hit = await resolveRequest(pathname)

  if (!hit) {
    // 有 404.html 就用它 (和托管平台一致)
    const notFound = await fileSize(join(ROOT, '404.html'))
    if (notFound !== null) {
      const body = await readFile(join(ROOT, '404.html'))
      res.writeHead(404, { 'Content-Type': MIME['.html'], 'Content-Length': body.length })
      res.end(req.method === 'HEAD' ? undefined : body)
      return
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end(`404 Not Found: ${pathname}`)
    return
  }

  const type = MIME[extname(hit.file).toLowerCase()] ?? 'application/octet-stream'
  // 哈希过的构建产物可以长期缓存; HTML 不缓存, 方便反复构建预览
  const immutable = hit.file.includes(`${join('_next', 'static')}`) || /\.(png|webp|woff2?)$/.test(hit.file)
  const headers = {
    'Content-Type': type,
    'Content-Length': hit.size,
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  }

  if (req.method === 'HEAD') {
    res.writeHead(200, headers)
    res.end()
    return
  }

  res.writeHead(200, headers)
  res.end(await readFile(hit.file))
})

server.listen(PORT, HOST, () => {
  console.log(`[serve-static] 静态产物预览 http://${HOST}:${PORT}`)
  console.log('[serve-static] 目录: ' + ROOT)
  console.log('[serve-static] 按 clean URL 解析: /a -> a.html -> a/index.html')
})
