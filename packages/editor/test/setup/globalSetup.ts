import path from 'path'
import {setup as setupDevServer} from 'jest-dev-server'

const testFolderPath = path.resolve(__dirname, '..')

module.exports = async function globalSetup() {
  await setupDevServer([
    {
      command: `vite ${testFolderPath}/web-server`,
      launchTimeout: 10000,
      port: 3000,
    },
    {
      command: `node -r esbuild-register ${testFolderPath}/ws-server`,
      launchTimeout: 10000,
      port: 3001,
    },
  ])
}
