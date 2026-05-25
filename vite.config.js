import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/opensky': {
        target: 'https://opensky-network.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/opensky/, '/api'),
        headers: {
          Authorization: `Basic ${Buffer.from('apu974-api-client:0pScEX4YUfBecMd4HXeM3OU8vvMt9vJI').toString('base64')}`,
        },
      },
      '/api/datahub': {
        target: 'https://data.bordeaux-metropole.fr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/datahub/, ''),
      },
      '/api/opendata': {
        target: 'https://opendata.bordeaux-metropole.fr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/opendata/, ''),
      },
      '/api/sncf': {
        target: 'https://api.sncf.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sncf/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.js',
  },
})
