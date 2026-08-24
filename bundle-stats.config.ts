import {defineConfig} from '@rexxars/bundle-stats/config'

export default defineConfig({
  packages: [
    {
      root: 'packages/editor',
      scenarios: {
        exports: {
          exclude: ['test', 'test/vitest'],
        },
      },
    },
    {
      root: 'packages/markdown',
    },
  ],
})
