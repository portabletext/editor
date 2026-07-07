import {readFileSync} from 'node:fs'
import {defineConfig} from '@sanity/pkg-utils'

export default defineConfig({
  tsconfig: 'tsconfig.dist.json',
  babel: {reactCompiler: true},
  reactCompilerOptions: {target: '19'},
  rollup: {
    plugins: (plugins) => [
      // Vite-style `?raw` imports (the stylesheet as text). Vitest handles
      // them natively; the library build needs this shim.
      {
        name: 'raw-imports',
        async resolveId(source, importer) {
          if (!source.endsWith('?raw')) {
            return null
          }
          const resolved = await this.resolve(
            source.slice(0, -'?raw'.length),
            importer,
            {skipSelf: true},
          )
          return resolved ? `\0raw:${resolved.id}` : null
        },
        load(id) {
          if (!id.startsWith('\0raw:')) {
            return null
          }
          const text = readFileSync(id.slice('\0raw:'.length), 'utf8')
          return `export default ${JSON.stringify(text)}`
        },
      },
      ...plugins,
    ],
  },
})
