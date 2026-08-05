import babel from '@rolldown/plugin-babel'
import react, {reactCompilerPreset} from '@vitejs/plugin-react'
import {playwright} from '@vitest/browser-playwright'
import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [
          react(),
          babel({presets: [reactCompilerPreset({target: '19'})]}),
        ],
        test: {
          name: 'browser',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [
              {
                browser: 'chromium',
              },
              {
                browser: 'firefox',
              },
              {
                browser: 'webkit',
              },
            ],
            screenshotFailures: false,
          },
        },
      },
    ],
  },
})
