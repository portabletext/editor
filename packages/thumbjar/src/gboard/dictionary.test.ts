import {readFileSync} from 'node:fs'
import {describe, expect, test} from 'vitest'
import {
  confirmDictionary,
  dictionaryLines,
  notLoadedMessage,
  parseCapture,
  waitForDictionary,
  waitOutcome,
  type Capture,
  type ScratchKeyboard,
} from './dictionary.ts'

// A boot captured from boot on a Play Store emulator: its lines are real, the header is this capture's.
const BOOT_ID = '5f0c4c2e-9a1b-4c0e-8d3f-2b7a6e1d9c40'
const capture = fixture('boot-logcat.txt')
const LOAD_LINE = capture
  .split('\n')
  .find((line) => line.includes('data_loader.cc:121'))!
const RELOADED_LINE = capture
  .split('\n')
  .find((line) => line.includes('RELOADED'))!
const MARKER = 'thumbjar-prep-switch-0b6a3e2c-1d4f-4a8e-9c7b-5e2d1f0a3b4c'
// A real CI boot whose Gboard never loaded the dictionary: its header, its logd statistics, the first line
// of each reader, every dictionary line and the capture's last line.
const NEVER_LOADED_BOOT_ID = '62cd1ade-9b02-4723-ba9e-2749dda3d074'
const neverLoaded = fixture('boot-logcat-never-loaded.txt')
const KANJI_STRIP = [
  '今日。コンゲツ ノ コン，イマ。ニチヨウビ ノ ニチ，ヒ',
  '今日',
  'きょう。ヒラガナ きょう',
  'きょう',
  '教。キョウカショ ノ キョウ，オシエル',
  '教',
  '2026/10/31。今日の日付',
  '2026/10/31',
  '2026-10-31。今日の日付',
  '2026-10-31',
]

describe(waitOutcome.name, () => {
  test('finds the load line of this boot', () => {
    expect(
      waitOutcome(parseCapture(capture), {
        bootId: BOOT_ID,
        now: 1793453700,
        deadlinePassed: false,
      }),
    ).toEqual({
      kind: 'loaded',
      line: {time: 1793453688.106, text: LOAD_LINE},
    })
  })

  test('ignores a load line logged before this boot', () => {
    const text = capture.replace('btime=1793453503', 'btime=1793453690')

    expect(
      waitOutcome(parseCapture(text), {
        bootId: BOOT_ID,
        now: 1793453700,
        deadlinePassed: false,
      }),
    ).toEqual({kind: 'waiting'})
  })

  test('rejects a capture of an earlier boot at once, load line and all', () => {
    expect(
      waitOutcome(parseCapture(capture), {
        bootId: 'a0d6c1b9-0000-4000-8000-000000000000',
        now: 1793453700,
        deadlinePassed: false,
      }),
    ).toEqual({
      kind: 'capture-fault',
      reason: `the capture is of boot ${BOOT_ID}, the device runs boot a0d6c1b9-0000-4000-8000-000000000000`,
    })
  })

  test('rejects a capture without its header at once, load line and all', () => {
    expect(
      waitOutcome(parseCapture(capture.replace(/^CAPTURE boot_id=.*\n/, '')), {
        bootId: BOOT_ID,
        now: 1793453700,
        deadlinePassed: false,
      }),
    ).toEqual({
      kind: 'capture-fault',
      reason:
        'the capture has no CAPTURE header, so nothing ties it to this boot',
    })
  })

  test('keeps waiting for a load line before the deadline', () => {
    expect(
      waitOutcome(parseCapture(withoutLoad(capture)), {
        bootId: BOOT_ID,
        now: 1793453700,
        deadlinePassed: false,
      }),
    ).toEqual({kind: 'waiting'})
  })

  test('reports the recorded boot that never loaded as a missing load once the deadline passed, with its dropped lines as context', () => {
    expect(
      waitOutcome(parseCapture(neverLoaded), {
        bootId: NEVER_LOADED_BOOT_ID,
        now: 1793515368,
        deadlinePassed: true,
      }),
    ).toEqual({
      kind: 'not-loaded',
      captureFault:
        "the main buffer had dropped 2865 of its 9812 lines by the capture's first dump, so the capture may lack lines from boot on, its oldest kept line is from 26.9s after boot, so a load before then would not show",
    })
  })
})

describe(waitForDictionary.name, () => {
  test('counts the 360 seconds from when the emulator came online, so a load 350 seconds after that counts even when it came more than 360 seconds after the device booted', async () => {
    const booted = 1793453563
    const load = LOAD_LINE.replace(
      '1793453688.106',
      `${booted + 350}.106`,
    ).replaceAll('1793453688', `${booted + 350}`)
    const source = fakeWaitSource({
      start: booted + 300,
      loadsAt: booted + 350,
      capture: capture.replace(LOAD_LINE, load),
    })

    expect({
      gap: booted + 350 - 1793453503,
      outcome: await waitForDictionary(source.source, booted),
      readsUntil: source.hostTime() - booted,
    }).toEqual({
      gap: 410,
      outcome: {
        kind: 'loaded',
        line: {time: booted + 350.106, text: load},
      },
      readsUntil: 350,
    })
  })

  test('fails once 360 seconds after the emulator came online passed with no load, naming the dictionary that never loaded before the reader that stopped', async () => {
    const booted = 1793453563
    const source = fakeWaitSource({
      start: booted + 300,
      loadsAt: Infinity,
      capture: withoutLoad(capture),
    })

    const outcome = await waitForDictionary(source.source, booted)

    expect({
      kind: outcome.kind,
      reason:
        outcome.kind === 'not-loaded'
          ? outcome.reason.split('\n')[0]
          : undefined,
      readsUntil: source.hostTime() - booted,
    }).toEqual({
      kind: 'not-loaded',
      reason:
        "Gboard's Japanese dictionary never loaded on this boot: Gboard 15.1.08.726012951-preload-x86_64 logged no `data_loader.cc` `New data is loaded` line for a `mozcdata-<version>.data` file within 360s of boot. It logged `Fallback to minimal engine`, and 1 download of `__MOZCPACK_mozcmain_ja_JP` was cancelled. The capture may also lack the line: the capture's last line is from 233s ago, so its reader stopped.",
      readsUntil: 360,
    })
  })

  test("rejects a load 361.1 seconds after the emulator came online, past the deadline and its 1-second allowance for the device clock's whole seconds, even when the wait first reads it later", async () => {
    const booted = 1793453563
    const load = LOAD_LINE.replace(
      '1793453688.106',
      `${booted + 361}.106`,
    ).replaceAll('1793453688', `${booted + 361}`)
    // Reads land on odd seconds, so the first read past the deadline, at 361, already holds the load.
    const source = fakeWaitSource({
      start: booted + 301,
      loadsAt: booted + 361,
      capture: capture.replace(LOAD_LINE, load),
    })

    const outcome = await waitForDictionary(source.source, booted)

    expect({
      kind: outcome.kind,
      reason:
        outcome.kind === 'not-loaded'
          ? outcome.reason.split('\n')[0]
          : undefined,
    }).toEqual({
      kind: 'not-loaded',
      reason:
        "Gboard's Japanese dictionary never loaded on this boot: Gboard 15.1.08.726012951-preload-x86_64 logged no `data_loader.cc` `New data is loaded` line for a `mozcdata-<version>.data` file within 360s of boot. It logged `Fallback to minimal engine`, and 1 download of `__MOZCPACK_mozcmain_ja_JP` was cancelled.",
    })
  })

  test('reads the deadline on the device clock, so a load 350 seconds after the emulator came online counts on a device clock 30 seconds behind the host', async () => {
    const booted = 1793453563
    const load = LOAD_LINE.replace(
      '1793453688.106',
      `${booted + 320}.106`,
    ).replaceAll('1793453688', `${booted + 320}`)
    const source = fakeWaitSource({
      start: booted + 300,
      loadsAt: booted + 350,
      capture: capture.replace(LOAD_LINE, load),
      deviceBehind: 30,
    })

    expect(await waitForDictionary(source.source, booted)).toEqual({
      kind: 'loaded',
      line: {time: booted + 320.106, text: load},
    })
  })

  test('fails a capture of an earlier boot on its first read', async () => {
    const source = fakeWaitSource({
      start: 1793453600,
      loadsAt: 1793453600,
      capture,
      bootId: 'a0d6c1b9-0000-4000-8000-000000000000',
    })

    expect(await waitForDictionary(source.source, 1793453563)).toEqual({
      kind: 'failed',
      reason: `the boot capture cannot show whether Gboard loaded its Japanese dictionary: the capture is of boot ${BOOT_ID}, the device runs boot a0d6c1b9-0000-4000-8000-000000000000`,
    })
  })
})

describe('the dictionary wait on a sampled device clock', () => {
  // `adb shell date +%s` gives a whole device second, read between two host readings, `booted` 1000.
  test.each([
    {
      name: 'the device clock read in the same host second, the load 0.2 seconds before the deadline',
      hostBefore: 1100.9,
      deviceSecond: 1100,
      hostAfter: 1100.9,
      load: 1359.8,
    },
    {
      name: 'the device clock read late in its second, the load 0.1 seconds before the deadline',
      hostBefore: 1100.05,
      deviceSecond: 1100,
      hostAfter: 1100.1,
      load: 1359.9,
    },
    {
      name: 'a 1.2-second adb round trip, the load 0.1 seconds before the deadline',
      hostBefore: 1100.2,
      deviceSecond: 1100,
      hostAfter: 1101.4,
      load: 1359.9,
    },
    {
      name: 'a 1.2-second adb round trip on a device 30 seconds ahead, the load 0.1 seconds before the deadline',
      hostBefore: 1100.2,
      deviceSecond: 1131,
      hostAfter: 1101.4,
      load: 1390.9,
    },
    {
      name: 'a device 30 seconds behind, the load exactly at the deadline',
      hostBefore: 1100.5,
      deviceSecond: 1070,
      hostAfter: 1100.6,
      load: 1330.5,
    },
  ])(
    'counts a load inside 360 seconds of boot: $name',
    async ({hostBefore, deviceSecond, hostAfter, load}) => {
      expect(
        await waitOnSampledClock({hostBefore, deviceSecond, hostAfter, load}),
      ).toEqual('loaded')
    },
  )

  test.each([
    {
      name: 'the device clock read in the same host second, the load 2 seconds late',
      hostBefore: 1100.9,
      deviceSecond: 1100,
      hostAfter: 1100.9,
      load: 1362,
    },
    {
      name: 'a 1.2-second adb round trip, the load 3 seconds late',
      hostBefore: 1100.2,
      deviceSecond: 1100,
      hostAfter: 1101.4,
      load: 1363,
    },
    {
      name: 'a 1.2-second adb round trip on a device 30 seconds ahead, the load 3 seconds late',
      hostBefore: 1100.2,
      deviceSecond: 1131,
      hostAfter: 1101.4,
      load: 1394,
    },
  ])(
    'rejects a load clearly after 360 seconds of boot: $name',
    async ({hostBefore, deviceSecond, hostAfter, load}) => {
      expect(
        await waitOnSampledClock({hostBefore, deviceSecond, hostAfter, load}),
      ).toEqual('not-loaded')
    },
  )
})

describe(notLoadedMessage.name, () => {
  test('leads the recorded boot that never loaded with that, then names the Gboard version, its fallback and cancelled downloads, then the dropped lines, then the dictionary lines', () => {
    const parsed = parseCapture(neverLoaded)

    expect(
      notLoadedMessage(
        '15.1.08.726012951-preload-x86_64',
        dictionaryLines(parsed, NEVER_LOADED_BOOT_ID),
        "the main buffer had dropped 2865 of its 9812 lines by the capture's first dump, so the capture may lack lines from boot on, its oldest kept line is from 26.9s after boot, so a load before then would not show",
      ).split('\n'),
    ).toEqual([
      "Gboard's Japanese dictionary never loaded on this boot: Gboard 15.1.08.726012951-preload-x86_64 logged no `data_loader.cc` `New data is loaded` line for a `mozcdata-<version>.data` file within 360s of boot. It logged `Fallback to minimal engine`, and 2 downloads of `__MOZCPACK_mozcmain_ja_JP` were cancelled. The capture may also lack the line: the main buffer had dropped 2865 of its 9812 lines by the capture's first dump, so the capture may lack lines from boot on, its oldest kept line is from 26.9s after boot, so a load before then would not show.",
      'Dictionary lines seen:',
      '1793515005.511  1756  1756 I GoogleInputMethodService: GoogleInputMethodService.onCurrentInputMethodEntryChanged():2285 onCurrentInputMethodEntryChanged(): imeDefsChanged=true, entryLanguageVariantChanged=true, keyboardContextChanged=true',
      '1793515005.536  1756  1756 I KeyboardModeManager: KeyboardModeManager.onCurrentInputMethodEntryChanged():1400 Reload data for context change',
      '1793515005.906  1756  1756 I GoogleInputMethodService: GoogleInputMethodService.onCurrentInputMethodEntryChanged():2285 onCurrentInputMethodEntryChanged(): imeDefsChanged=true, entryLanguageVariantChanged=false, keyboardContextChanged=false',
      '1793515005.912  1756  1756 I KeyboardModeManager: KeyboardModeManager.onCurrentInputMethodEntryChanged():1400 Reload data for context change',
      '1793515010.160  1756  1756 I SystemSubtypesReportModule: SystemSubtypesReportModule$3.onCurrentInputMethodEntryChanged():149 entry: en-US, source: UNSPECIFIED',
      '1793515010.160  1756  1756 I SystemSubtypesReportModule: SystemSubtypesReportModule$3.onCurrentInputMethodEntryChanged():163 switchSubtype(en-US)',
      '1793515010.166  1756  1756 I GoogleInputMethodService: GoogleInputMethodService.onCurrentInputMethodEntryChanged():2285 onCurrentInputMethodEntryChanged(): imeDefsChanged=false, entryLanguageVariantChanged=false, keyboardContextChanged=true',
      '1793515044.433  1756  1756 I SystemSubtypesReportModule: SystemSubtypesReportModule$3.onCurrentInputMethodEntryChanged():149 entry: en-US, source: UNSPECIFIED',
      '1793515044.433  1756  1756 I GoogleInputMethodService: GoogleInputMethodService.onCurrentInputMethodEntryChanged():2285 onCurrentInputMethodEntryChanged(): imeDefsChanged=false, entryLanguageVariantChanged=false, keyboardContextChanged=false',
      '1793515044.433  1756  1756 I GoogleInputMethodService: GoogleInputMethodService.onCurrentInputMethodEntryChanged():2302 Skip the entry change as the input method entry is consider as not changed.',
      '1793515060.365  1756  4711 E native  : E0000 00:00:1793515060.365886    4711 mozcjni.cc:114] j_data_file_path is null.  Fallback to minimal engine.',
      '1793515065.914  1756  2161 I DownloadManager: DownloadManager.downloadInternal():412 Download for __MOZCPACK_mozcmain_ja_JP scheduled with params DownloadParams{allowMetered=true, requireCharging=false, foreground=true, immediately=true, priority=0}',
      '1793515065.914  1756  2161 I DownloadManager: DownloadManager.startDownload():495 start download of __MOZCPACK_mozcmain_ja_JP',
      '1793515065.914  1756  2161 I DownloadManager: DownloadManager.downloadInternal():412 Download for __MOZCPACK_mozcspellchecker_ja_JP scheduled with params DownloadParams{allowMetered=false, requireCharging=false, foreground=false, immediately=false, priority=0}',
      '1793515066.032  1756  1756 I DownloadManager: DownloadManager$4.onFailure():573 download for __MOZCPACK_mozcmain_ja_JP is cancelled',
      '1793515066.040  1756  2157 I DownloadManager: DownloadManager$3.onProgress():514 Downloading __MOZCPACK_mozcmain_ja_JP with size 32748',
      '1793515066.113  1756  2007 I DownloadManager: DownloadManager.startDownload():495 start download of __MOZCPACK_mozcspellchecker_ja_JP',
      '1793515066.118  1756  2007 I DownloadManager: DownloadManager$4.onFailure():573 download for __MOZCPACK_mozcspellchecker_ja_JP is cancelled',
      '1793515066.205  1756  2003 I DownloadManager: DownloadManager.startDownload():495 start download of __MOZCPACK_mozcmain_ja_JP',
      '1793515066.206  1756  2003 I DownloadManager: DownloadManager$4.onFailure():573 download for __MOZCPACK_mozcmain_ja_JP is cancelled',
    ])
  })

  test('names neither a fallback, cancelled downloads nor capture gaps when the boot logged none and the capture is whole', () => {
    expect(
      notLoadedMessage('15.1.08.726012951-preload-x86_64', [], undefined),
    ).toEqual(
      "Gboard's Japanese dictionary never loaded on this boot: Gboard 15.1.08.726012951-preload-x86_64 logged no `data_loader.cc` `New data is loaded` line for a `mozcdata-<version>.data` file within 360s of boot.\nDictionary lines seen:\n(none)",
    )
  })
})

describe(confirmDictionary.name, () => {
  test('marks the capture, switches an English keyboard to Japanese, reads RELOADED after that switch, then confirms a kanji candidate for kyou and clears the field', async () => {
    const gboard = fakeGboard({japanese: false})

    expect(await confirmDictionary(gboard.keyboard, BOOT_ID)).toEqual({
      switch: 'to-japanese',
      marker: MARKER,
      marked: true,
      reloaded: {time: 1793453690.133, text: RELOADED_LINE},
      labels: KANJI_STRIP,
      text: '',
      open: false,
      failure: undefined,
    })
    expect(gboard.actions).toEqual([
      `mark ${MARKER}`,
      'switch to japanese',
      'read capture',
      'type kyou',
      'read strip',
      'delete',
      'read field',
    ])
  })

  test('switches a Japanese keyboard away and back, so a session from before the load is rebuilt', async () => {
    const gboard = fakeGboard({japanese: true})

    expect(await confirmDictionary(gboard.keyboard, BOOT_ID)).toEqual({
      switch: 'away-and-back',
      marker: MARKER,
      marked: true,
      reloaded: {time: 1793453690.133, text: RELOADED_LINE},
      labels: KANJI_STRIP,
      text: '',
      open: false,
      failure: undefined,
    })
    expect(gboard.actions).toEqual([
      'leave japanese',
      `mark ${MARKER}`,
      'switch to japanese',
      'read capture',
      'type kyou',
      'read strip',
      'delete',
      'read field',
    ])
  })

  test('fails a switch that rebuilt no session, whatever RELOADED line came before it', async () => {
    const gboard = fakeGboard({japanese: true, rebuilds: false})

    expect(await confirmDictionary(gboard.keyboard, BOOT_ID)).toEqual({
      switch: 'away-and-back',
      marker: MARKER,
      marked: true,
      reloaded: undefined,
      labels: ['きょう'],
      text: '',
      open: false,
      failure:
        'no `Mozc engine reload status: RELOADED` line followed the switch to Japanese, kyou brought no kanji candidate, the strip showed ["きょう"]',
    })
  })

  test('fails a switch that rebuilt no session even when kyou brought a kanji candidate', async () => {
    const gboard = fakeGboard({japanese: false, rebuilds: false, kanji: true})

    expect(await confirmDictionary(gboard.keyboard, BOOT_ID)).toEqual({
      switch: 'to-japanese',
      marker: MARKER,
      marked: true,
      reloaded: undefined,
      labels: KANJI_STRIP,
      text: '',
      open: false,
      failure:
        'no `Mozc engine reload status: RELOADED` line followed the switch to Japanese',
    })
  })

  test('fails a field the deletion did not clear', async () => {
    const gboard = fakeGboard({japanese: false, clears: false})

    expect(await confirmDictionary(gboard.keyboard, BOOT_ID)).toEqual({
      switch: 'to-japanese',
      marker: MARKER,
      marked: true,
      reloaded: {time: 1793453690.133, text: RELOADED_LINE},
      labels: KANJI_STRIP,
      text: 'きょう',
      open: true,
      failure:
        'the scratch field holds "きょう" after the deletion, a composition is still open in the scratch field after the deletion',
    })
  })
})

function fixture(name: string): string {
  return readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8')
}

/**
 * A wait source whose host clock starts at `start` and moves 2 seconds per sleep, and whose device clock
 * runs `deviceBehind` seconds behind it. The capture holds no line logged from `loadsAt` on, host time,
 * until the host clock reaches it, as a capture still being written does.
 */
function fakeWaitSource({
  start,
  loadsAt,
  capture: text,
  bootId = BOOT_ID,
  deviceBehind = 0,
}: {
  start: number
  /** Host time from which the capture holds the lines it holds from then on. */
  loadsAt: number
  capture: string
  bootId?: string
  /** How far the device's clock, the one the capture's lines are on, runs behind the host's. */
  deviceBehind?: number
}) {
  let now = start
  const source = {
    bootId,
    readCapture: () =>
      Promise.resolve(
        text
          .split('\n')
          .filter((line) => {
            const time = /^\s*(\d+)\.\d+\s/.exec(line)?.[1]
            return (
              time === undefined ||
              Number(time) + deviceBehind < loadsAt ||
              now >= loadsAt
            )
          })
          .join('\n'),
      ),
    deviceTime: () => Promise.resolve(now - deviceBehind),
    hostTime: () => now,
    gboardVersion: () => Promise.resolve('15.1.08.726012951-preload-x86_64'),
    waiting: () => {},
    sleep: (seconds: number) => {
      now += seconds
      return Promise.resolve()
    },
  }
  return {source, hostTime: () => now}
}

/**
 * The verdict of a wait for a boot that came online at host time 1000 and whose capture holds one load line
 * at device time `load`. The wait's first two host readings are `hostBefore` and `hostAfter`, its first
 * device reading the whole second `deviceSecond`, and every later reading falls past the deadline, so the
 * first read decides.
 */
async function waitOnSampledClock({
  hostBefore,
  deviceSecond,
  hostAfter,
  load,
}: {
  hostBefore: number
  deviceSecond: number
  hostAfter: number
  load: number
}): Promise<'loaded' | 'not-loaded' | 'failed'> {
  const hostReads = [hostBefore, hostAfter]
  const line = `         ${load.toFixed(3)}  1749  5830 I native  : I0000 data_loader.cc:121] New data is loaded: file_path=/data/user/0/com.google.android.inputmethod.latin/files/mozcdata-24.20241006.9.data`
  const outcome = await waitForDictionary(
    {
      bootId: BOOT_ID,
      readCapture: () =>
        Promise.resolve(
          [
            `CAPTURE boot_id=${BOOT_ID} btime=990`,
            'CAPTURE_SEGMENT seed',
            '--------- beginning of main',
            line,
            'CAPTURE_STATS main total=1/1 now=1/1',
          ].join('\n'),
        ),
      deviceTime: () => Promise.resolve(deviceSecond),
      hostTime: () => hostReads.shift() ?? 1500,
      gboardVersion: () => Promise.resolve('15.1.08.726012951-preload-x86_64'),
      waiting: () => {},
      sleep: () => Promise.resolve(),
    },
    1000,
  )
  return outcome.kind
}

function withoutLoad(text: string): string {
  return text
    .split('\n')
    .filter((line) => !line.includes('data_loader.cc:121'))
    .join('\n')
}

/**
 * Gboard as a probe recorded it: the marker is logged at device time 1793453689.900, the switch after it
 * changes the input method to Japanese and logs `RELOADED` when `rebuilds`, and then `kyou` brings the
 * kanji strip when `kanji`, as it does whenever it rebuilt. A `RELOADED` line from an earlier switch sits
 * before the marker. With `clears: false` the deletion leaves the composition in the field.
 */
function fakeGboard({
  japanese,
  rebuilds = true,
  kanji = rebuilds,
  clears = true,
}: {
  japanese: boolean
  rebuilds?: boolean
  kanji?: boolean
  clears?: boolean
}): {keyboard: ScratchKeyboard; actions: string[]} {
  const actions: string[] = []
  const beforeSwitch = capture
    .split('\n')
    .filter(
      (line) =>
        line !== '' && !line.includes('ja-JP') && !line.includes('RELOADED'),
    )
  const earlierReload = RELOADED_LINE.replace(
    '1793453690.133',
    '1793453640.000',
  )
  const japaneseEntry = capture
    .split('\n')
    .find((line) => line.includes('entry: ja-JP'))!
  let lines = [...beforeSwitch, earlierReload]
  let showsJapanese = japanese
  let text = ''
  let typed = false
  return {
    actions,
    keyboard: {
      isJapanese: () => Promise.resolve(showsJapanese),
      leaveJapanese: () => {
        actions.push('leave japanese')
        showsJapanese = false
        return Promise.resolve()
      },
      switchToJapanese: () => {
        actions.push('switch to japanese')
        showsJapanese = true
        lines = [...lines, japaneseEntry, ...(rebuilds ? [RELOADED_LINE] : [])]
        return Promise.resolve()
      },
      markCapture: () => {
        actions.push(`mark ${MARKER}`)
        lines = [
          ...lines,
          `         1793453689.900  4242  4242 I thumbjar: ${MARKER}`,
        ]
        return Promise.resolve(MARKER)
      },
      capture: (): Promise<Capture> => {
        if (actions.at(-1) !== 'read capture') {
          actions.push('read capture')
        }
        return Promise.resolve(parseCapture(lines.join('\n')))
      },
      dump: () => {
        if (!typed) {
          return Promise.resolve(fixture('ja-keyboard.xml'))
        }
        if (actions.at(-1) !== 'read strip') {
          actions.push('read strip')
        }
        return Promise.resolve(
          fixture(kanji ? 'ja-strip-kanji.xml' : 'ja-strip-kana.xml'),
        )
      },
      typeKyou: () => {
        actions.push('type kyou')
        typed = true
        text = 'きょう'
        return Promise.resolve()
      },
      deleteComposition: () => {
        actions.push('delete')
        if (clears) {
          text = ''
        }
        return Promise.resolve()
      },
      field: () => {
        actions.push('read field')
        return Promise.resolve({
          text,
          events: [
            {type: 'compositionstart'},
            {type: 'compositionupdate'},
            ...(clears ? [{type: 'compositionend'}] : []),
          ],
        })
      },
      sleep: () => Promise.resolve(),
    },
  }
}
