import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,        // 前端端口
    strictPort: true,  // 端口被占用时直接报错(不自动换下一个)
    host: true,        // 局域网也能访问,顺便打印 Network 地址
    open: true,        // 启动时自动打开浏览器
    proxy: {
      // 把 /api 转发到 FastAPI 后端,避免 CORS / 跨域问题
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
