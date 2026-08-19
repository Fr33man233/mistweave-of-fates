import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '瓦伦港',
        short_name: '瓦伦港',
        description: '本地单城市持久世界 RPG 文字游戏',
        lang: 'zh-CN',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#1b1e24',
        theme_color: '#1b1e24'
      },
      workbox: {
        cleanupOutdatedCaches: true,
        runtimeCaching: []
      }
    })
  ]
});
