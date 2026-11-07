import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, type Plugin, type ResolvedConfig } from 'vite'

const ENTRY = fileURLToPath(
  new URL('../src/serviceWorker/sw.ts', import.meta.url),
)

/** Files in public/ too big to be worth keeping offline */
const NOT_PRECACHED = new Set(['og-image.png'])

function filesIn(dir: string): string[] {
  try {
    return readdirSync(dir, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) =>
        relative(dir, join(entry.parentPath, entry.name)).replace(/\\/g, '/'),
      )
  } catch {
    return []
  }
}

/**
 * Builds the service worker, src/serviceWorker/sw.ts, into sw.js beside
 * index.html, with the list of the app's files to keep offline: every
 * file of the build (its hashed scripts, styles and the map's worker,
 * the lazily loaded ones too) and the icons and manifest from public/.
 * Only in production builds; in development there is no worker.
 */
export function serviceWorker(): Plugin {
  let config: ResolvedConfig
  let files: string[] = []
  let version = ''

  return {
    name: 'mapverse-service-worker',
    apply: 'build',
    configResolved(resolved) {
      config = resolved
    },
    // Once written, as index.html is put in late
    writeBundle(_, bundle) {
      const hash = createHash('sha256')
      const built = Object.values(bundle)
        .filter((item) => !item.fileName.endsWith('.map'))
        .sort((a, b) => a.fileName.localeCompare(b.fileName))
      for (const item of built) {
        hash.update(item.fileName)
        hash.update(item.type === 'chunk' ? item.code : item.source)
      }
      const publicDir = config.publicDir
      const extras = publicDir
        ? filesIn(publicDir)
            .filter((file) => !NOT_PRECACHED.has(file))
            .sort()
        : []
      for (const file of extras) {
        hash.update(file)
        hash.update(readFileSync(join(publicDir, file)))
      }
      files = [...built.map((item) => item.fileName), ...extras]
      version = hash.digest('hex').slice(0, 12)
    },
    async closeBundle() {
      if (!files.length) return
      await build({
        configFile: false,
        logLevel: 'warn',
        publicDir: false,
        define: {
          __PRECACHE__: JSON.stringify(files),
          __SW_VERSION__: JSON.stringify(version),
        },
        build: {
          outDir: resolve(config.root, config.build.outDir),
          emptyOutDir: false,
          copyPublicDir: false,
          lib: {
            entry: ENTRY,
            formats: ['iife'],
            name: 'mapverseServiceWorker',
            fileName: () => 'sw.js',
          },
        },
      })
    },
  }
}
