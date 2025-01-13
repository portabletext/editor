/// <reference types="vitest" />
import {defineWorkspace} from 'vitest/config'

export default defineWorkspace([
  {
    plugins: [],
    test: {
      name: 'unit',
      environment: 'node',
      setupFiles: ['./test/setup.ts'],
    },
  },
  {
    plugins: [],
    test: {
      name: 'chromium',
      environment: 'node',
      setupFiles: ['./test/setup.ts'],
    },
  },
])
