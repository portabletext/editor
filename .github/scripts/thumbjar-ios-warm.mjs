import {execFile} from 'node:child_process'
import {readFileSync, statSync} from 'node:fs'
import {join} from 'node:path'
import {setTimeout as delay} from 'node:timers/promises'

const started = Date.now()
const budget = 300_000
const page = new URL('http://localhost:8765/plain.html?prefix=')
const root = 'packages/editor/android/dist'
const log = 'packages/editor/android/out/http.log'
const target = process.env.UDID || 'booted'
const assets = new Set()
/** @type {import('node:child_process').ChildProcess | undefined} */
let opener
let phase = 'prepare'
const elapsed = () => Math.floor((Date.now() - started) / 1000)
const timeout = setTimeout(() => {
  console.log(
    `safari warm: timeout during ${phase} after ${elapsed()}s; continuing cold`,
  )
  opener?.kill('SIGKILL')
  process.exit(0)
}, budget)

try {
  collectAssets(page)
  if (assets.size === 0) {
    throw new Error('plain.html has no JavaScript assets')
  }
  const offset = statSync(log).size
  phase = 'openurl'
  await new Promise((resolve, reject) => {
    opener = execFile(
      'xcrun',
      ['simctl', 'openurl', target, page.href],
      (error) => {
        if (error) reject(error)
        else resolve(undefined)
      },
    )
  })
  console.log(
    `safari warm: openurl completed for ${target} after ${elapsed()}s`,
  )
  phase = 'page request'
  await waitForRequests([page.pathname + page.search], offset)
  console.log(`safari warm: page requested after ${elapsed()}s`)
  phase = 'JavaScript requests'
  await waitForRequests([...assets], offset)
  console.log(`safari warm: JavaScript assets requested after ${elapsed()}s`)
  phase = 'pause'
  await delay(3000)
  console.log(
    `safari warm: page and JavaScript assets served, then waited 3s (${elapsed()}s total)`,
  )
} catch (error) {
  console.log(
    `safari warm: failed during ${phase} after ${elapsed()}s; continuing cold (${String(error).replace(/\s+/g, ' ').trim()})`,
  )
} finally {
  clearTimeout(timeout)
}

/** @param {URL} resource */
function collectAssets(resource) {
  const source = readFileSync(join(root, resource.pathname), 'utf8')
  for (const match of source.matchAll(/["']([^"'\s]+\.js)["']/g)) {
    const asset = new URL(match[1] ?? '', resource)
    if (asset.origin !== page.origin || assets.has(asset.pathname)) continue
    assets.add(asset.pathname)
    collectAssets(asset)
  }
}

/** @param {string[]} paths @param {number} offset */
async function waitForRequests(paths, offset) {
  while (true) {
    const requests = new Set(
      [
        ...readFileSync(log)
          .subarray(offset)
          .toString()
          .matchAll(/"GET (\S+) HTTP\/[\d.]+" 200 /g),
      ].map((match) => match[1]),
    )
    if (paths.every((path) => requests.has(path))) return
    await delay(250)
  }
}
