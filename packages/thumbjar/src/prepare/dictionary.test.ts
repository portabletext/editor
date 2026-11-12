import {spawnSync} from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
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

describe('dictionary.ts wait', () => {
  test('exits 3 for the recorded boot whose Gboard never loaded the dictionary, with the reason `prepare.sh` quotes', () => {
    expect(
      waitOnDevice({deviceBootId: '62cd1ade-9b02-4723-ba9e-2749dda3d074'}),
    ).toEqual({
      status: 3,
      reason:
        "DICTIONARY FAILED: Gboard's Japanese dictionary never loaded on this boot: Gboard 15.1.08.726012951-preload-x86_64 logged no `data_loader.cc` `New data is loaded` line for a `mozcdata-<version>.data` file within 360s of boot. It logged `Fallback to minimal engine`, and 2 downloads of `__MOZCPACK_mozcmain_ja_JP` were cancelled. The capture may also lack the line: the main buffer had dropped 2865 of its 9812 lines by the capture's first dump, so the capture may lack lines from boot on, its oldest kept line is from 26.9s after boot, so a load before then would not show.",
    })
  })

  test('exits 1 for a capture that cannot show the load, a capture of another boot', () => {
    expect(
      waitOnDevice({deviceBootId: 'a0d6c1b9-0000-4000-8000-000000000000'}),
    ).toEqual({
      status: 1,
      reason:
        'DICTIONARY FAILED: the boot capture cannot show whether Gboard loaded its Japanese dictionary: the capture is of boot 62cd1ade-9b02-4723-ba9e-2749dda3d074, the device runs boot a0d6c1b9-0000-4000-8000-000000000000',
    })
  })
})

/**
 * Runs `dictionary.ts wait` on the capture of a real CI boot whose Gboard never loaded the dictionary, long
 * past its deadline, against a fake `adb` that answers with `deviceBootId`, the capture's last device time
 * and the boot's Gboard version. Returns the exit status and the first line on stderr.
 */
function waitOnDevice({deviceBootId}: {deviceBootId: string}) {
  const directory = mkdtempSync(join(tmpdir(), 'thumbjar-dictionary-'))
  try {
    const bin = join(directory, 'bin')
    const out = join(directory, 'out')
    mkdirSync(bin)
    mkdirSync(out)
    copyFileSync(
      fileURLToPath(
        new URL('../fixtures/boot-logcat-never-loaded.txt', import.meta.url),
      ),
      join(out, 'boot-logcat.txt'),
    )
    writeFileSync(
      join(bin, 'adb'),
      `#!/usr/bin/env bash
case "$*" in
  "shell cat /proc/sys/kernel/random/boot_id") echo ${deviceBootId} ;;
  "shell date +%s") echo 1793515368 ;;
  "shell dumpsys package com.google.android.inputmethod.latin") echo '    versionName=15.1.08.726012951-preload-x86_64' ;;
  *) exit 1 ;;
esac
`,
    )
    chmodSync(join(bin, 'adb'), 0o755)
    const result = spawnSync(
      process.execPath,
      [cli, 'wait', out, '1000000000'],
      {
        encoding: 'utf8',
        env: {...process.env, PATH: `${bin}:${process.env.PATH}`},
      },
    )
    return {status: result.status, reason: result.stderr.split('\n')[0]}
  } finally {
    rmSync(directory, {recursive: true, force: true})
  }
}
