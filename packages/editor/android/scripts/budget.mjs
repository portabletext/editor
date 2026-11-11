import {readFileSync, realpathSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {deviceTestFileSeconds} from 'thumbjar/vitest'

/**
 * The number of tests in a device test file: its top-level `test(` and `test.fails(` calls. A unit test
 * checks the count against the tests Vitest collects from each file.
 *
 * @param {string} source
 * @returns {number}
 */
export function countDeviceTests(source) {
  return source.match(/^test(\.fails)?\(/gm)?.length ?? 0
}

if (isMain()) {
  const file = process.argv[2]
  if (file === undefined) {
    throw new Error('usage: node android/scripts/budget.mjs <test file>')
  }
  const testCount = countDeviceTests(readFileSync(file, 'utf8'))
  if (testCount === 0) {
    throw new Error(`no tests in ${file}`)
  }
  process.stdout.write(`${deviceTestFileSeconds(testCount)}\n`)
}

/**
 * Whether `node` runs this file. Where Node sets `import.meta.main` to a boolean, from 22.18 and 24.2, that
 * is the answer. On a Node without it the entry path `process.argv[1]` decides: no entry path is not
 * this file, and an entry path equal to this file's path is, without reading the filesystem, so a file
 * removed after Node loaded it still runs. Otherwise the entry path is resolved, since a script run through
 * a symlinked directory has its real path as `import.meta.url`, and an entry path that does not resolve,
 * such as `-` for a module read from stdin, is not this file.
 *
 * @returns {boolean}
 */
function isMain() {
  /** @type {{main?: unknown}} */
  const meta = import.meta
  if (typeof meta.main === 'boolean') {
    return meta.main
  }
  const entry = process.argv[1]
  if (entry === undefined) {
    return false
  }
  const file = fileURLToPath(import.meta.url)
  if (entry === file) {
    return true
  }
  try {
    return realpathSync(entry) === file
  } catch {
    return false
  }
}
