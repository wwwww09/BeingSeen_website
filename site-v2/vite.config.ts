import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * site-v2 是独立的 Vite 项目，构建产物是纯静态的 dist/，
 * 没有服务端、没有 Next.js，部署到 Vercel 时 Root Directory 指向本目录。
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3100,
    strictPort: true,
  },
  build: {
    target: 'es2022',
  },
})
