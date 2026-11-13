import {defineConfig} from '@playwright/test'

export default defineConfig({
  testDir: './example-playwright',
  forbidOnly: !!process.env.CI,
  reporter: 'line',
  use: {browserName: 'chromium', trace: 'off'},
})
