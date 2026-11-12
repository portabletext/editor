import {copyFileSync, mkdirSync, mkdtempSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, expect, test, vi} from 'vitest'
import * as device from '../device/adb.ts'

vi.mock(import('../device/adb.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
}))

describe('dictionary.ts', () => {
  test('answers a call without its arguments with a `DICTIONARY FAILED:` line naming its usage, the line `prepare.sh` quotes', async () => {
    const result = await dictionary([])

    expect({status: result.status, stderr: result.stderr}).toEqual({
      status: 1,
      stderr:
        'DICTIONARY FAILED: usage: node dist/prepare/dictionary.js wait <outdir> <booted> | check <outdir> <page url>\n',
    })
  })
})

describe('dictionary.ts wait', () => {
  test('exits 3 for the recorded boot whose Gboard never loaded the dictionary, with the reason `prepare.sh` quotes', async () => {
    expect(
      await waitOnDevice({
        deviceBootId: '62cd1ade-9b02-4723-ba9e-2749dda3d074',
      }),
    ).toEqual({
      status: 3,
      reason:
        "DICTIONARY FAILED: Gboard's Japanese dictionary never loaded on this boot: Gboard 15.1.08.726012951-preload-x86_64 logged no `data_loader.cc` `New data is loaded` line for a `mozcdata-<version>.data` file within 360s of boot. It logged `Fallback to minimal engine`, and 2 downloads of `__MOZCPACK_mozcmain_ja_JP` were cancelled. The capture may also lack the line: the main buffer had dropped 2865 of its 9812 lines by the capture's first dump, so the capture may lack lines from boot on, its oldest kept line is from 26.9s after boot, so a load before then would not show.",
    })
  })

  test('exits 1 for a capture that cannot show the load, a capture of another boot', async () => {
    expect(
      await waitOnDevice({
        deviceBootId: 'a0d6c1b9-0000-4000-8000-000000000000',
      }),
    ).toEqual({
      status: 1,
      reason:
        'DICTIONARY FAILED: the boot capture cannot show whether Gboard loaded its Japanese dictionary: the capture is of boot 62cd1ade-9b02-4723-ba9e-2749dda3d074, the device runs boot a0d6c1b9-0000-4000-8000-000000000000',
    })
  })
})

async function waitOnDevice({deviceBootId}: {deviceBootId: string}) {
  const directory = mkdtempSync(join(tmpdir(), 'thumbjar-dictionary-'))
  try {
    const out = join(directory, 'out')
    mkdirSync(out)
    copyFileSync(
      fileURLToPath(
        new URL('../fixtures/boot-logcat-never-loaded.txt', import.meta.url),
      ),
      join(out, 'boot-logcat.txt'),
    )
    const result = await dictionary(['wait', out, '1000000000'], deviceBootId)
    return {status: result.status, reason: result.stderr.split('\n')[0]}
  } finally {
    rmSync(directory, {recursive: true, force: true})
  }
}

async function dictionary(args: string[], deviceBootId = '') {
  const argv = process.argv
  const exitCode = process.exitCode
  const environment = {...process.env}
  let stderr = ''
  const exited = Promise.withResolvers<number>()
  try {
    process.argv = [process.execPath, 'dictionary.ts', ...args]
    vi.spyOn(device, 'adb').mockImplementation((args) => {
      if (args.join(' ') === 'shell cat /proc/sys/kernel/random/boot_id') {
        return Promise.resolve(deviceBootId)
      }
      expect(args).toEqual(['shell', 'date', '+%s'])
      return Promise.resolve('1793515368')
    })
    vi.spyOn(device, 'adbOutput').mockResolvedValue(
      '    versionName=15.1.08.726012951-preload-x86_64',
    )
    vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    vi.spyOn(console, 'error').mockImplementation((line) => {
      stderr += `${line}\n`
    })
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      exited.resolve(Number(code))
      return undefined!
    })
    vi.resetModules()
    await import('./dictionary.ts')
    return {status: await exited.promise, stderr}
  } finally {
    process.argv = argv
    process.exitCode = exitCode
    process.env = environment
    vi.restoreAllMocks()
  }
}
