import {defineConfig} from '@sanity/pkg-utils'

export default defineConfig({
  tsconfig: 'tsconfig.dist.json',
  // Private, so no release tags: nothing renders its API docs.
  tsdoc: false,
  bundles: [
    {source: './src/guard.ts', import: './dist/guard.js', runtime: 'node'},
    {
      source: './src/prepare/capture.ts',
      import: './dist/prepare/capture.js',
      runtime: 'node',
    },
    {
      source: './src/run/logcat.ts',
      import: './dist/run/logcat.js',
      runtime: 'node',
    },
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
})
