import path from 'node:path'
import {fileURLToPath} from 'node:url'

export const BENCH_ROOT = path.dirname(
  path.dirname(fileURLToPath(import.meta.url)),
)

export const REPO_ROOT = path.dirname(path.dirname(BENCH_ROOT))
