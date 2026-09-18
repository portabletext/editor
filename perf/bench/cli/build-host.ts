import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {build} from 'vite'

const HOST_DIR = path.join(
  path.dirname(path.dirname(fileURLToPath(import.meta.url))),
  'host',
)
const HOST_DIST_DIR = path.join(HOST_DIR, 'dist')

/** One build serves both sides of a comparison (see the README). */
export async function buildHost(): Promise<string> {
  await build({
    root: HOST_DIR,
    configFile: path.join(HOST_DIR, 'vite.config.ts'),
    logLevel: 'warn',
  })
  return HOST_DIST_DIR
}
