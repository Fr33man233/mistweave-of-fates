import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/mistweave-of-fates/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Mistweave of Fates（灰雾织命）',
        short_name: '灰雾织命',
        description: 'Mistweave of Fates：本地单城市持续世界调查 RPG',
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
