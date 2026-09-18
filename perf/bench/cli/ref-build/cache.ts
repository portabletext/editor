import fs from 'node:fs'
import path from 'node:path'
import {BENCH_ROOT} from '../bench-root'

const CACHE_ROOT = path.join(BENCH_ROOT, '.cache', 'refs')

export function cacheDirForSha(sha: string, root: string = CACHE_ROOT): string {
  return path.join(root, sha)
}

export function tarballCacheDir(
  sha: string,
  root: string = CACHE_ROOT,
): string {
  return path.join(cacheDirForSha(sha, root), 'tarballs')
}

function manifestPath(sha: string, root: string = CACHE_ROOT): string {
  return path.join(tarballCacheDir(sha, root), 'manifest.json')
}

export function isCached(sha: string, root: string = CACHE_ROOT): boolean {
  return fs.existsSync(manifestPath(sha, root))
}

export function readCachedTarballs(
  sha: string,
  root: string = CACHE_ROOT,
): Map<string, string> {
  const manifest = JSON.parse(
    fs.readFileSync(manifestPath(sha, root), 'utf8'),
  ) as Record<string, string>
  return new Map(Object.entries(manifest))
}

export function writeCachedTarballsManifest(
  sha: string,
  tarballs: ReadonlyMap<string, string>,
  root: string = CACHE_ROOT,
): void {
  fs.mkdirSync(tarballCacheDir(sha, root), {recursive: true})
  fs.writeFileSync(
    manifestPath(sha, root),
    JSON.stringify(Object.fromEntries(tarballs), null, 2),
  )
}
