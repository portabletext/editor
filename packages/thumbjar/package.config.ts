import {copyFileSync, mkdirSync} from 'node:fs'
import {defineConfig} from '@sanity/pkg-utils'

export default defineConfig({
  tsconfig: 'tsconfig.dist.json',
  // Private, so no release tags: nothing renders its API docs.
  tsdoc: false,
  bundles: [
    {source: './src/run/cap.ts', import: './dist/run/cap.js', runtime: 'node'},
    {
      source: './src/run/check.ts',
      import: './dist/run/check.js',
      runtime: 'node',
    },
    {source: './src/bin.ts', import: './dist/bin.js', runtime: 'node'},
    {
      source: './src/prepare/setup-ja.ts',
      import: './dist/prepare/setup-ja.js',
      runtime: 'node',
    },
    {
      source: './src/prepare/dictionary.ts',
      import: './dist/prepare/dictionary.js',
      runtime: 'node',
    },
  ],
  plugins: [
    {
      // `thumbjar prepare` runs `prepare.sh` next to `bin.js`, and it runs `diagnose.sh`, `setup-ja.js` and `dictionary.js` next to itself.
      name: 'thumbjar-prepare-scripts',
      writeBundle() {
        mkdirSync('dist/run', {recursive: true})
        copyFileSync('src/run/run.sh', 'dist/run/run.sh')
        mkdirSync('dist/prepare', {recursive: true})
        for (const script of ['prepare.sh', 'diagnose.sh']) {
          copyFileSync(`src/prepare/${script}`, `dist/prepare/${script}`)
        }
      },
    },
  ],
})
