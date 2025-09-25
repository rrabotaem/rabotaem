import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import { loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [sveltekit()],

    define: {
      __VERSION__: JSON.stringify(process.env.npm_package_version),
    },
    server: {
      watch: {
        ignored: ['!**/node_modules/mono-svelte/**'],
      },
      proxy: {
        '/api': {
          target: `https://${env.PUBLIC_INSTANCE_URL}`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      },
      fs: {
        allow: ['static']
      }
    },
  }
})
