import { build } from 'vite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const entries = ['background', 'content', 'popup']

for (let i = 0; i < entries.length; i++) {
  const name = entries[i]
  console.log(`[build] ${name}.ts...`)

  await build({
    root,
    configFile: false,
    publicDir: i === 0 ? resolve(root, 'public') : false,
    build: {
      outDir: resolve(root, 'build'),
      emptyOutDir: i === 0,
      lib: {
        entry: resolve(root, 'src', `${name}.ts`),
        formats: ['iife'],
        name,
        fileName: () => `${name}.js`,
      },
    },
    logLevel: 'warn',
  })
}

console.log('[build] done')
