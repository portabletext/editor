import react from '@vitejs/plugin-react'
import {playwright} from '@vitest/browser-playwright'
import {defineConfig} from 'vitest/config'
import {COMPILED_SOURCES} from './react-compiler-sources.ts'

export default defineConfig({
  plugins: [
    react({
      compiler: {
        target: '19',
        sources: [...COMPILED_SOURCES, '/packages/editor/tests/'],
      },
    }),
  ],
  resolve: {tsconfigPaths: true},
  server: {fs: {allow: ['/workspace']}},
  test: {
    name: 'probe',
    include: ['tests/probe-m2-shape.test.tsx'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({
        launchOptions: {
          executablePath:
            '/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell',
        },
      }),
      instances: [{browser: 'chromium'}],
      screenshotFailures: false,
    },
  },
})
