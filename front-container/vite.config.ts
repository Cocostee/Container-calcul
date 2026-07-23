import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Polling keeps hot reload reliable when the source is bind-mounted from
    // the host into the Docker container (notably on macOS).
    watch: { usePolling: true },
  },
})
