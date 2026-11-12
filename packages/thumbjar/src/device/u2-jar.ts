// The uiautomator2 server jar's download into the calling package's cache and its hash check.
// `u2-jar.json` pins the URL and the hash, and the Android IME workflow keys its cache of the jar on
// that file.

import {createHash} from 'node:crypto'
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import findCacheDirectory from 'find-cache-dir'
import {U2_JAR_ATTEMPT_SECONDS} from './budget.ts'
import jar from './u2-jar.json' with {type: 'json'}

/**
 * Download u2.jar into the calling package's cache unless it is already there with its pinned hash,
 * and check the hash of a download. `downloaded` says which.
 */
export async function ensureJar({
  path = jarPath(),
  url = jar.url,
  sha256: expected = jar.sha256,
}: {path?: string; url?: string; sha256?: string} = {}): Promise<{
  path: string
  downloaded: boolean
}> {
  if (existsSync(path) && sha256(readFileSync(path)) === expected) {
    return {path, downloaded: false}
  }
  const response = await fetch(url, {
    signal: AbortSignal.timeout(U2_JAR_ATTEMPT_SECONDS * 1000),
  })
  if (!response.ok) {
    throw new Error(
      `u2.jar download failed: ${response.status} ${response.statusText} from ${answeringUrl(response)}`,
    )
  }
  const data = Buffer.from(await response.arrayBuffer())
  const hash = sha256(data)
  if (hash !== expected) {
    throw new Error(`u2.jar sha256 ${hash}, expected ${expected}`)
  }
  mkdirSync(dirname(path), {recursive: true})
  writeFileSync(path, data)
  return {path, downloaded: true}
}

function jarPath(): string {
  const cwd = process.cwd()
  const cacheDirectory = findCacheDirectory({name: 'thumbjar', cwd})
  if (cacheDirectory === undefined) {
    throw new Error(
      `Cannot find a cache directory from cwd ${cwd}; run inside a package or set CACHE_DIR`,
    )
  }
  return join(cacheDirectory, 'u2.jar')
}

function sha256(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex')
}

/**
 * The URL that answered, after redirects: github.com or the release-assets host it redirects to. The query
 * is dropped, since the release-assets redirect carries a signature and a token there.
 */
function answeringUrl(response: Response): string {
  if (response.url === '') {
    return '(no URL)'
  }
  const url = new URL(response.url)
  return `${url.origin}${url.pathname}`
}
