import {copyFileSync, mkdirSync} from 'node:fs'
import {defineConfig} from '@sanity/pkg-utils'

export default defineConfig({
  tsconfig: 'tsconfig.dist.json',
  // Private, so no release tags: nothing renders its API docs.
  tsdoc: false,
  bundles: [
    {source: './src/bin.ts', import: './dist/bin.js', runtime: 'node'},
    {
      source: './src/prepare/setup-ja.ts',
      import: './dist/prepare/setup-ja.js',
      runtime: 'node',
    },
  ],
  plugins: [
    {
      // `thumbjar prepare` runs `prepare.sh` next to `bin.js`, and it runs `diagnose.sh` and `setup-ja.js` next to itself.
      name: 'thumbjar-prepare-scripts',
      writeBundle() {
        mkdirSync('dist/prepare', {recursive: true})
        for (const script of ['prepare.sh', 'diagnose.sh']) {
          copyFileSync(`src/prepare/${script}`, `dist/prepare/${script}`)
        }
      },
    },
  ],
})
