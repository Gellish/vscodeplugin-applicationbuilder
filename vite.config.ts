import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        sidebarMain: resolve(__dirname, 'sidebar.html'),
        canvasMain: resolve(__dirname, 'canvas.html'),
        propertiesMain: resolve(__dirname, 'properties.html'),
      },
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name]-chunk-[hash].js`,
        assetFileNames: `assets/[name].[ext]`,
        manualChunks: undefined,
      }
    }
  }
})
