/// <reference types="vitest" />
import {defineWorkspace} from 'vitest/config'

export default defineWorkspace([
  {
    plugins: [],
    test: {
      name: 'unit',
      exclude: ['example-playwright'],
    },
  },
  {
    plugins: [],
    test: {
      name: 'chromium',
      exclude: ['example-playwright'],
    },
  },
])
