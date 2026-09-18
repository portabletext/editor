import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {afterEach, beforeEach, describe, expect, test} from 'vitest'
import {
  cacheDirForSha,
  isCached,
  readCachedTarballs,
  tarballCacheDir,
  writeCachedTarballsManifest,
} from './cache'

const SHA = 'a'.repeat(40)

describe('cache-key layout', () => {
  const root = path.join(os.tmpdir(), 'bench-cache-test-layout')

  test('keys each artifact directory by the resolved sha, under root', () => {
    expect(cacheDirForSha(SHA, root)).toBe(path.join(root, SHA))
    expect(tarballCacheDir(SHA, root)).toBe(path.join(root, SHA, 'tarballs'))
  })

  test('two different shas never share a cache directory', () => {
    const otherSha = 'b'.repeat(40)
    expect(cacheDirForSha(SHA, root)).not.toBe(cacheDirForSha(otherSha, root))
  })
})

describe('isCached', () => {
  const sha = `test-${Math.random().toString(36).slice(2)}`
  let root: string

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-cache-test-'))
  })

  afterEach(() => {
    fs.rmSync(root, {recursive: true, force: true})
  })

  test('false when nothing has been built for this sha', () => {
    expect(isCached(sha, root)).toBe(false)
  })

  test('false when the tarball directory exists but has no manifest', () => {
    fs.mkdirSync(tarballCacheDir(sha, root), {recursive: true})
    expect(isCached(sha, root)).toBe(false)
  })

  test('true once the tarball manifest is written, and it round-trips the map', () => {
    const tarballs = new Map([
      ['@portabletext/editor', '/tmp/tarballs/portabletext-editor-8.1.5.tgz'],
    ])
    writeCachedTarballsManifest(sha, tarballs, root)
    expect(isCached(sha, root)).toBe(true)
    expect(readCachedTarballs(sha, root)).toEqual(tarballs)
  })
})
