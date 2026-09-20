import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import {fileURLToPath} from 'node:url'
import type {BenchRun} from './types'

const RESULTS_DIR = path.join(
  path.dirname(path.dirname(fileURLToPath(import.meta.url))),
  'results',
)

export async function writeBenchRun(
  run: BenchRun,
  runId: string,
  outDir?: string,
): Promise<string> {
  const targetDir = outDir ? path.resolve(outDir) : RESULTS_DIR
  await fs.mkdir(targetDir, {recursive: true})
  const filePath = path.join(targetDir, `${runId}-${Date.now()}.json`)
  await fs.writeFile(filePath, `${JSON.stringify(run, null, 2)}\n`)
  return filePath
}
