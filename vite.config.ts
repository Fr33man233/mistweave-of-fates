import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { modelGatewayPlugin } from './server/model/vite-plugin.ts';

const base = process.env.GITHUB_ACTIONS ? '/mistweave-of-fates/' : '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    modelGatewayPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Mistweave of Fates（灰雾织命）',
        short_name: '灰雾织命',
        description: 'Mistweave of Fates：本地单城市持续世界调查 RPG',
        lang: 'zh-CN',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#111619',
        theme_color: '#111619'
      },
      workbox: {
        cleanupOutdatedCaches: true,
        runtimeCaching: []
      }
    })
  ]
});
