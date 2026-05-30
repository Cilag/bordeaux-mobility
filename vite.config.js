import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// En dev, le proxy Vite ajoute la clé DataHub depuis VITE_DATAHUB_API_KEY (.env).
// En prod, c'est la function Vercel api/datahub/[...path].js qui le fait
// avec process.env.DATAHUB_API_KEY (jamais exposée au client).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/datahub': {
          target: 'https://data.bordeaux-metropole.fr',
          changeOrigin: true,
          rewrite: (path) => {
            const cleanPath = path.replace(/^\/api\/datahub/, '')
            const key = env.VITE_DATAHUB_API_KEY
            if (!key) return cleanPath
            const separator = cleanPath.includes('?') ? '&' : '?'
            return `${cleanPath}${separator}key=${key}`
          },
        },
        '/api/opendata': {
          target: 'https://opendata.bordeaux-metropole.fr',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/opendata/, ''),
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test-setup.js',
      env: { NODE_ENV: 'test' },
      exclude: ['**/.claude/worktrees/**', 'node_modules/**'],
    },
  }
})
