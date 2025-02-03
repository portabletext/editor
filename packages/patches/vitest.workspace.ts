/// <reference types="vitest" />
import {defineWorkspace} from 'vitest/config'

export default defineWorkspace([
  {
    plugins: [],
    test: {
      name: 'unit',
      environment: 'node',
    },
  },
  {
    plugins: [],
    test: {
      name: 'browser (chromium)',
      environment: 'node',
    },
  },
])
