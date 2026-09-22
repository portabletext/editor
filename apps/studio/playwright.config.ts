import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {defineConfig, devices} from '@playwright/test'
import dotenv from 'dotenv'

const dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({path: path.join(dirname, '.env.local')})

const baseURL = 'http://localhost:3391'
const projectId = 'e2sapjbh'

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  workers: 1,
  reporter: 'line',
  // Keep traces, video, and screenshots off: CI uploads failure artifacts
  // from a public repo, and Playwright traces record network requests
  // including the auth token this storage state carries.
  use: {
    baseURL,
    storageState: {
      cookies: [],
      origins: [
        {
          origin: baseURL,
          localStorage: [
            {
              name: `__studio_auth_token_${projectId}`,
              value: JSON.stringify({
                token: process.env.SANITY_PTE_LAB_TOKEN,
                time: new Date().toISOString(),
              }),
            },
          ],
        },
      ],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // The bundled headless-shell binary fails to register its Mach
        // bootstrap port under this sandbox (`bootstrap_check_in ...
        // Permission denied`); the full Chromium-for-Testing binary
        // doesn't hit that path.
        channel: 'chromium',
      },
    },
  ],
  webServer: {
    command: 'pnpm dev --port 3391',
    port: 3391,
    reuseExistingServer: true,
    timeout: 180_000,
    env: {
      // The monorepo's workspace-linked `node_modules` defeat the native
      // directory watcher (EMFILE on the very first watch), so the dev
      // server falls back to chokidar's polling watcher here.
      CHOKIDAR_USEPOLLING: '1',
    },
  },
})
