import { defineConfig } from 'vite'
import { resolve, relative } from 'path'
import { readdirSync, statSync } from 'fs'

function getTsEntries(dir: string): Record<string, string> {
  const entries: Record<string, string> = {}
  function walk(current: string) {
    for (const name of readdirSync(current)) {
      const full = resolve(current, name)
      if (statSync(full).isDirectory()) {
        walk(full)
      } else if (name.endsWith('.ts') && !name.endsWith('.d.ts')) {
        const key = relative(dir, full).replace(/\.ts$/, '')
        entries[key] = full
      }
    }
  }
  walk(dir)
  return entries
}

export default defineConfig({
  publicDir: 'public',
  build: {
    outDir: 'build',
    emptyOutDir: true,
    rollupOptions: {
      input: getTsEntries(resolve(__dirname, 'src')),
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
})
