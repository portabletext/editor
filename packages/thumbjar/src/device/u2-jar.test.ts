import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'
import jar from './u2-jar.json' with {type: 'json'}
import {ensureJar} from './u2-jar.ts'

const url = 'https://example.com/u2.jar'
const foo = {
  data: 'foo',
  sha256: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
}
const bar = {
  data: 'bar',
  sha256: 'fcde2b2edba56bf408601fb721fe9b5c338d10ee429ea04fae5511b68fbf8fb9',
}

let directory: string
let path: string

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'u2-jar-'))
  path = join(directory, '.cache', 'u2.jar')
})

afterEach(() => {
  vi.unstubAllGlobals()
  rmSync(directory, {recursive: true, force: true})
})

describe(ensureJar.name, () => {
  test('returns a jar already at its path with its pinned hash without downloading it', async () => {
    mkdirSync(join(directory, '.cache'))
    writeFileSync(path, foo.data)
    const fetches: unknown[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn((input: unknown) => {
        fetches.push(input)
        throw new Error('no download expected')
      }),
    )

    expect({
      result: await ensureJar({path, url, sha256: foo.sha256}),
      fetches,
    }).toEqual({result: {path, downloaded: false}, fetches: []})
  })

  test('downloads a missing jar and writes it', async () => {
    const fetches: unknown[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn((input: unknown) => {
        fetches.push(input)
        return Promise.resolve(new Response(foo.data))
      }),
    )

    expect({
      result: await ensureJar({path, url, sha256: foo.sha256}),
      fetches,
      written: readFileSync(path, 'utf8'),
    }).toEqual({
      result: {path, downloaded: true},
      fetches: [url],
      written: foo.data,
    })
  })

  test('downloads again over a jar whose hash differs', async () => {
    mkdirSync(join(directory, '.cache'))
    writeFileSync(path, bar.data)
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(foo.data))),
    )

    expect({
      result: await ensureJar({path, url, sha256: foo.sha256}),
      written: readFileSync(path, 'utf8'),
    }).toEqual({result: {path, downloaded: true}, written: foo.data})
  })

  test('rejects a download with another hash and writes nothing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(bar.data))),
    )

    await expect(
      ensureJar({path, url, sha256: foo.sha256}),
    ).rejects.toThrowError(
      `u2.jar sha256 ${bar.sha256}, expected ${foo.sha256}`,
    )
    expect(existsSync(path)).toEqual(false)
  })

  test('rejects a failed response with its status and the URL that answered, without its query', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          Object.defineProperty(
            new Response('', {status: 504, statusText: 'Gateway Time-out'}),
            'url',
            {
              value:
                'https://release-assets.githubusercontent.com/asset/1?sig=secret&jwt=token',
            },
          ),
        ),
      ),
    )

    await expect(
      ensureJar({path, url, sha256: foo.sha256}),
    ).rejects.toThrowError(
      'u2.jar download failed: 504 Gateway Time-out from https://release-assets.githubusercontent.com/asset/1',
    )
  })

  test('downloads from the URL and checks the hash that `u2-jar.json` pins', async () => {
    const fetches: unknown[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn((input: unknown) => {
        fetches.push(input)
        return Promise.resolve(new Response(foo.data))
      }),
    )

    let error: string | undefined
    try {
      await ensureJar({path})
    } catch (thrown) {
      error = thrown instanceof Error ? thrown.message : undefined
    }
    expect({fetches, error}).toEqual({
      fetches: [jar.url],
      error: `u2.jar sha256 ${foo.sha256}, expected ${jar.sha256}`,
    })
  })
})
