/**
 * Build script for webviews.
 * Uses Vite's Node.js API to build sidebar and canvas as separate IIFE bundles.
 * Each output is a fully self-contained JS file with no external imports.
 * This is required for VS Code webviews which cannot resolve relative ES module chunks.
 */
import { build } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const entries = [
  {
    name: 'sidebarMain',
    entry: resolve(__dirname, 'src/sidebarMain.ts'),
    exportName: 'SidebarApp',
  },
  {
    name: 'canvasMain',
    entry: resolve(__dirname, 'src/canvasMain.ts'),
    exportName: 'CanvasApp',
  },
]

for (const { name, entry, exportName } of entries) {
  console.log(`\n🔨 Building ${name}...`)
  await build({
    plugins: [svelte()],
    define: { __DEV__: 'false' },
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      lib: {
        entry,
        name: exportName,
        fileName: () => `assets/${name}.js`,
        formats: ['iife'],
      },
      rollupOptions: {
        output: {
          assetFileNames: (info) => {
            if (info.name?.endsWith('.css')) return `assets/${name}.css`
            return `assets/[name].[ext]`
          }
        }
      },
      cssCodeSplit: false,
    },
  })
  console.log(`✅ ${name} built!`)
}

console.log('\n🎉 All webviews built successfully!')
