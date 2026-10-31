// Spike: map the stack frames a `timing=1` page logs on its selection writes to editor source.
//
// Usage: node scripts/map-stack.ts <sourcemaps dir> <case json>...
//
// The page's bundle maps to the editor's built `lib/` files, which `vite build` does not follow into their
// own maps, so each frame takes two hops: the page's map to a `lib/` file, and that file's map to `src/`.
// `run-on-device.sh` saves both into `out/sourcemaps/`: `page/` holds `dist/assets/*.map`, `editor-lib/` the
// editor's `lib/**/*.js.map`. Locally, `node scripts/map-stack.ts --local <case json>...` reads them in place.

import {readFileSync} from 'node:fs'
import {SourceMap, type SourceMapPayload} from 'node:module'
import {basename, join} from 'node:path'

const [directory, ...files] = process.argv.slice(2)
if (!directory || files.length === 0)
  throw new Error(
    'usage: node scripts/map-stack.ts <sourcemaps dir | --local> <case json>...',
  )
const pageMaps =
  directory === '--local' ? 'dist/assets' : join(directory, 'page')
const libMaps =
  directory === '--local'
    ? '../../packages/editor/lib'
    : join(directory, 'editor-lib')

const maps = new Map<string, SourceMap>()

for (const file of files) {
  const result = JSON.parse(readFileSync(file, 'utf8')) as Record<
    string,
    unknown
  >
  console.log(`# ${file}`)
  for (const key of Object.keys(result)) {
    const entries = (result[key] as {splitTiming?: Entry[]} | null)?.splitTiming
    if (!Array.isArray(entries)) continue
    // Each read holds the log so far, so the last read alone holds every entry.
    if (key !== lastReadKey(result)) continue
    console.log(`## ${key}`)
    for (const entry of entries) {
      if (entry.kind === 'leaf')
        console.log(
          `input ${entry.input} ${entry.ms}ms ${entry.phase} leaf ${JSON.stringify(entry.text)}`,
        )
      if (entry.kind !== 'select' || !entry.stack) continue
      console.log(
        `input ${entry.input} ${entry.ms}ms ${entry.phase} ${entry.data} -> ${entry.anchor.node} ${JSON.stringify(entry.anchor.text)}@${entry.anchor.offset} sameNode=${entry.anchor.sameNode}`,
      )
      for (const frame of entry.stack) console.log(`    ${mapFrame(frame)}`)
    }
  }
}

type Entry = {
  kind: string
  input: number | null
  ms: number | null
  phase: string | null
  data?: string | null
  text?: string
  anchor: {
    node: string | null
    text: string | null
    offset: number | null
    sameNode: boolean | null
  }
  stack?: string[]
}

function lastReadKey(result: Record<string, unknown>): string | undefined {
  const keys = Object.keys(result).filter(
    (key) =>
      (result[key] as {splitTiming?: unknown} | null)?.splitTiming !==
      undefined,
  )
  return (
    keys.find((key) => key === 'faultState') ??
    keys.find((key) => key === 'state') ??
    keys.at(-1)
  )
}

function mapFrame(frame: string): string {
  const match =
    /^at (?:(.*?) \()?(.*?\/assets\/([^/:]+\.js)):(\d+):(\d+)\)?$/.exec(frame)
  if (!match) return frame
  const [, name, , bundle, line, column] = match
  const inLib = load(join(pageMaps, `${bundle}.map`))?.findOrigin(
    Number(line),
    Number(column),
  )
  if (!inLib || !('fileName' in inLib)) return frame
  const libFile = /packages\/editor\/lib\/(.*)$/.exec(inLib.fileName)?.[1]
  if (!libFile)
    return `${name ?? '<anonymous>'} ${shorten(inLib.fileName)}:${inLib.lineNumber}:${inLib.columnNumber}`
  const inSource = load(join(libMaps, `${libFile}.map`))?.findOrigin(
    inLib.lineNumber,
    inLib.columnNumber,
  )
  if (!inSource || !('fileName' in inSource))
    return `${name ?? '<anonymous>'} lib/${libFile}:${inLib.lineNumber}:${inLib.columnNumber}`
  return `${inSource.name ?? name ?? '<anonymous>'} ${shorten(inSource.fileName)}:${inSource.lineNumber}:${inSource.columnNumber}`
}

function load(path: string): SourceMap | undefined {
  if (!maps.has(path)) {
    try {
      maps.set(
        path,
        new SourceMap(
          JSON.parse(readFileSync(path, 'utf8')) as SourceMapPayload,
        ),
      )
    } catch {
      console.warn(`no source map ${basename(path)}`)
      return undefined
    }
  }
  return maps.get(path)
}

function shorten(fileName: string): string {
  return fileName.replace(
    /^.*?(packages\/editor\/src\/|node_modules\/\.pnpm\/[^/]+\/node_modules\/)/,
    '$1',
  )
}
