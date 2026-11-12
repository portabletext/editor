import {mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    name: 'unit',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      THUMBJAR_OUT_DIR:
        process.env.THUMBJAR_OUT_DIR ??
        mkdtempSync(join(tmpdir(), 'thumbjar-unit-')),
    },
  },
})
