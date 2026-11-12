import {existsSync, readdirSync, readFileSync} from 'node:fs'
import {fileURLToPath, pathToFileURL} from 'node:url'
import {expect, test} from 'vitest'
import {entry} from './process.ts'

const workers = [
  'bin',
  'guard',
  'prepare/capture',
  'prepare/setup-ja',
  'prepare/dictionary',
  'run/cap',
  'run/check',
  'run/logcat',
]

test('resolves every default worker from the source package root', () => {
  expect(
    workers.map((name) => ({
      name,
      exists: existsSync(entry(name)),
      path: entry(name).endsWith(`/src/${name}.ts`),
    })),
  ).toEqual([
    {name: 'bin', exists: true, path: true},
    {name: 'guard', exists: true, path: true},
    {name: 'prepare/capture', exists: true, path: true},
    {name: 'prepare/setup-ja', exists: true, path: true},
    {name: 'prepare/dictionary', exists: true, path: true},
    {name: 'run/cap', exists: true, path: true},
    {name: 'run/check', exists: true, path: true},
    {name: 'run/logcat', exists: true, path: true},
  ])
})

test('resolves every default worker from the built package root', async () => {
  const directory = fileURLToPath(
    new URL('dist/', import.meta.resolve('thumbjar/package.json')),
  )
  const processChunk = readdirSync(directory).find(
    (name) =>
      name.startsWith('process-') &&
      name.endsWith('.js') &&
      readFileSync(directory + name, 'utf8').includes('function entry('),
  )
  if (!processChunk) {
    throw new Error('build thumbjar before running its unit tests')
  }
  const compiled = await import(pathToFileURL(directory + processChunk).href)
  const resolveEntry: typeof entry = Object.values(compiled).find(
    (value): value is typeof entry =>
      typeof value === 'function' && value.name === 'entry',
  )!
  expect(
    workers.map((name) => ({
      name,
      exists: existsSync(resolveEntry(name)),
      path: resolveEntry(name).endsWith(`/dist/${name}.js`),
    })),
  ).toEqual([
    {name: 'bin', exists: true, path: true},
    {name: 'guard', exists: true, path: true},
    {name: 'prepare/capture', exists: true, path: true},
    {name: 'prepare/setup-ja', exists: true, path: true},
    {name: 'prepare/dictionary', exists: true, path: true},
    {name: 'run/cap', exists: true, path: true},
    {name: 'run/check', exists: true, path: true},
    {name: 'run/logcat', exists: true, path: true},
  ])
})
