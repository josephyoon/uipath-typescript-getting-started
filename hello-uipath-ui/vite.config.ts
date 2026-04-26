import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const org = env.VITE_UIPATH_ORG

  return {
    plugins: [react()],
    server: {
      proxy: {
        [`/${org}`]: {
          target: 'https://staging.uipath.com',
          changeOrigin: true,
        },
      },
    },
  }
})
