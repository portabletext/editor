import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [],
        test: {
          name: 'unit',
          environment: 'node',
        },
      },
    ],
  },
})
