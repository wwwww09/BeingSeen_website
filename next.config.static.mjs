/**
 * 静态导出专用配置 —— 用于"不需要 GitHub 授权"的拖拽上传部署路径。
 *
 * 用法: node dev.sh static   (生成 out/ 目录)
 *
 * 与 next.config.mjs 的差别只有两点:
 *   1. output: 'export'     生成静态文件而不是 serverless 应用
 *   2. images.unoptimized   静态导出下没有 next/image 优化服务, 必须关掉
 *
 * 注意: 静态导出不支持 Route Handler, 所以 build:static 会临时把
 * src/app/api 移开, 留言板改用客户端直连 Supabase 写入
 * (需要执行 supabase/schema-public-insert.sql 打开最小写入权限)。
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  transpilePackages: ['three'],
  experimental: {
    optimizePackageImports: ['@react-three/drei'],
  },
  images: {
    // 静态导出没有图片优化服务
    unoptimized: true,
  },
}

export default nextConfig
