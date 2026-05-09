import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: '人生遊戲系統',
        short_name: 'Life Game',
        description: '將日常任務遊戲化的個人生產力工具',
        theme_color: '#111827',
        background_color: '#111827',
        display: 'standalone',
        start_url: '/LifeGameSystem/',
        scope: '/LifeGameSystem/',
        icons: [
          {
            src: 'icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  base: '/LifeGameSystem/',
  server: {
    port: 5173,
    strictPort: true,
  },
})
