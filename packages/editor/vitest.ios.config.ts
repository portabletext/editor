import {fileURLToPath} from 'node:url'
import {deviceProject} from 'thumbjar/vitest'
import {defineConfig} from 'vitest/config'

export default defineConfig({
  root: fileURLToPath(new URL('android', import.meta.url)),
  test: {
    projects: [
      deviceProject({
        device: 'ios',
        include: ['tests/en.test.ts', 'tests/ja.test.ts'],
        outDir: fileURLToPath(new URL('android/out', import.meta.url)),
        pageUrl: 'http://localhost:8765/editor.html',
        pageHint:
          'Build with `pnpm --filter @portabletext/editor build:android` and serve android/dist on port 8765.',
        summaryFile: process.env.GITHUB_STEP_SUMMARY,
      }),
    ],
  },
})
