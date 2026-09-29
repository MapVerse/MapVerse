import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset paths, so the build also works under /MapVerse/ on GitHub Pages
  base: './',
  build: {
    // maplibre-gl is lazy-loaded in its own ~1 MB chunk; that's expected
    chunkSizeWarningLimit: 1200,
  },
  // maplibre-gl's worker is an ES module that imports a shared chunk
  worker: { format: 'es' },
})
