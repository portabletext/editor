import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {describe, expect, test} from 'vitest'

const cli = fileURLToPath(new URL('dictionary.ts', import.meta.url))

describe('dictionary.ts', () => {
  test('answers a call without its arguments with a `DICTIONARY FAILED:` line naming its usage, the line `prepare.sh` quotes', () => {
    const result = spawnSync(process.execPath, [cli], {encoding: 'utf8'})

    expect({status: result.status, stderr: result.stderr}).toEqual({
      status: 1,
      stderr:
        'DICTIONARY FAILED: usage: node dist/prepare/dictionary.js wait <outdir> <booted> | check <outdir> <page url>\n',
    })
  })
})
