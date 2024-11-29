/// <reference types="vitest" />
import {defineWorkspace} from 'vitest/config'

export default defineWorkspace([
  {
    plugins: [],
    test: {
      name: 'unit',
    },
  },
])
