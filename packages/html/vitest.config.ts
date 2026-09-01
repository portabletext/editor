import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [],
        test: {
          name: 'unit',
          environment: 'node',
          // Some fixtures are 300KB Word exports that can need more than
          // the default 5s on a busy CI runner. The tests are all
          // synchronous converters, so a high timeout is safe.
          testTimeout: 30_000,
        },
      },
    ],
  },
})
