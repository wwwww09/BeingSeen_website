/**
 * Supabase 配置检测
 *
 * 留言板是整站唯一需要后端的部分。为了让网站能在数据库配好之前就上线，
 * 这里做优雅降级: 未配置环境变量时页面仍可正常浏览, 只是提交会给出提示。
 *
 * 需要的环境变量 (在 Vercel / .env.local 中设置):
 *   NEXT_PUBLIC_SUPABASE_URL              项目 URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  可公开的 key (旧称 anon key)
 *   SUPABASE_SECRET_KEY                   仅服务端使用 (旧称 service_role key)
 */

export function getSupabaseUrl(): string | undefined {
  const v = process.env.NEXT_PUBLIC_SUPABASE_URL
  return v && v.startsWith('http') ? v : undefined
}

export function getPublishableKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export function getSecretKey(): string | undefined {
  return process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
}

/** 浏览器端是否可以使用 Supabase (读取与订阅需要) */
export function isSupabaseBrowserConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getPublishableKey())
}

/** 服务端是否可以写入 (需要 secret key) */
export function isSupabaseServerConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSecretKey())
}

/**
 * 留言板是否可用 —— 只看可公开的凭证。
 * 故事读取一律走客户端, 所以服务端有没有 secret key 不影响本判断。
 */
export function isSupabaseConfigured(): boolean {
  return isSupabaseBrowserConfigured()
}

/**
 * 是否运行在静态导出产物里 (没有 /api/stories)。
 * 由 ./dev.sh static 在构建时注入 NEXT_PUBLIC_STATIC_EXPORT=1。
 */
export function isStaticExport(): boolean {
  return process.env.NEXT_PUBLIC_STATIC_EXPORT === '1'
}
