// `vitest/config` plutôt que `vite` : c'est lui qui déclare le champ `test`.
import { defineConfig } from 'vitest/config'
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
  test: {
    // jsdom fournit File, Blob et le DOM dont les tests de composants ont
    // besoin ; les fichiers de test vivent à côté de ce qu'ils éprouvent.
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    globals: true,
  },
})
