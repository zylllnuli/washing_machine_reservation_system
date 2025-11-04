import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
	plugins: [vue()],
	server: {
		port: 5173,
		open: true,
		host: true,
		strictPort: true,
		allowedHosts: ['.trycloudflare.com', '.loca.lt'],
		proxy: {
			'/api': {
				target: 'http://localhost:3000',
				changeOrigin: true,
				ws: false
			}
		}
	}
})
