import {readFileSync} from 'node:fs'
import {describe, expect, test} from 'vitest'
import {
  captureFault,
  confirmationFailure,
  confirmDictionary,
  dictionaryLines,
  isDictionaryLoadLine,
  isReloadedLine,
  notLoadedMessage,
  parseCapture,
  reloadedAfter,
  stripLabels,
  waitOutcome,
  type Capture,
  type ScratchKeyboard,
} from './dictionary.ts'

// A boot from the probe's 18, captured by the spike from boot: its lines are real, the header is this
// capture's.
const BOOT_ID = '5f0c4c2e-9a1b-4c0e-8d3f-2b7a6e1d9c40'
const capture = fixture('boot-logcat.txt')
const LOAD_LINE = capture.split('\n').find((line) => line.includes('data_loader.cc:121'))!
const RELOADED_LINE = capture.split('\n').find((line) => line.includes('RELOADED'))!
const MARKER = 'ime-prep-switch-0b6a3e2c-1d4f-4a8e-9c7b-5e2d1f0a3b4c'

describe(isDictionaryLoadLine.name, () => {
  test('matches the load line of the recorded boot', () => {
    expect(isDictionaryLoadLine(LOAD_LINE)).toEqual(true)
  })

  test('matches the load line of another dictionary version', () => {
    expect(isDictionaryLoadLine(LOAD_LINE.replace('mozcdata-24.20241006.9.data', 'mozcdata-25.20250712.3.data'))).toEqual(true)
  })

  test('does not match the other `data_loader.cc` lines of the same load', () => {
    expect(
      capture
        .split('\n')
        .filter((line) => line.includes('data_loader.cc'))
        .map((line) => isDictionaryLoadLine(line)),
    ).toEqual([false, false, true])
  })

  test('does not match a load line for a file that is not a mozcdata dictionary', () => {
    expect(isDictionaryLoadLine(LOAD_LINE.replace('mozcdata-24.20241006.9.data', 'emoji-24.20241006.9.data'))).toEqual(false)
  })
})

describe(isReloadedLine.name, () => {
  test('matches the session rebuild of the recorded boot', () => {
    expect(isReloadedLine(RELOADED_LINE)).toEqual(true)
  })

  test('does not match another reload status', () => {
    expect(isReloadedLine(RELOADED_LINE.replace('RELOADED', 'NOT_CHANGED'))).toEqual(false)
  })
})

describe(waitOutcome.name, () => {
  test('finds the load line in this boot', () => {
    expect(waitOutcome(parseCapture(capture), {bootId: BOOT_ID, now: 1793453700, deadlinePassed: false})).toEqual({
      kind: 'loaded',
      line: {time: 1793453688.106, text: LOAD_LINE},
    })
  })

  test('ignores a load line from before this boot', () => {
    const text = capture.replace('btime=1793453503', 'btime=1793453690')

    expect(waitOutcome(parseCapture(text), {bootId: BOOT_ID, now: 1793453700, deadlinePassed: false})).toEqual({kind: 'waiting'})
  })

  test('fails a capture from another boot at once, load line and all', () => {
    expect(waitOutcome(parseCapture(capture), {bootId: 'a0d6c1b9-0000-4000-8000-000000000000', now: 1793453700, deadlinePassed: false})).toEqual({
      kind: 'capture-fault',
      reason: `the capture is of boot ${BOOT_ID}, the device runs boot a0d6c1b9-0000-4000-8000-000000000000`,
    })
  })

  test('fails a capture without the header at once', () => {
    expect(waitOutcome(parseCapture(withoutHeader(capture)), {bootId: BOOT_ID, now: 1793453700, deadlinePassed: false})).toEqual({
      kind: 'capture-fault',
      reason: 'the capture has no CAPTURE header, so nothing ties it to this boot',
    })
  })

  test('keeps waiting before the deadline', () => {
    expect(waitOutcome(parseCapture(withoutLoad(capture)), {bootId: BOOT_ID, now: 1793453700, deadlinePassed: false})).toEqual({kind: 'waiting'})
  })

  test('reports a dictionary that never loaded once the deadline passed on a whole capture', () => {
    expect(waitOutcome(parseCapture(withoutLoad(capture)), {bootId: BOOT_ID, now: 1793453700, deadlinePassed: true})).toEqual({kind: 'not-loaded'})
  })

  test('reports a capture fault, never a missing load, when the capture has a hole', () => {
    const text = withoutLoad(capture).replace(/(CAPTURE_SEGMENT start 1793453549\n--------- beginning of main\n)[^\n]*\n[^\n]*\n/, '$1')

    expect(waitOutcome(parseCapture(text), {bootId: BOOT_ID, now: 1793453700, deadlinePassed: true})).toEqual({
      kind: 'capture-fault',
      reason: 'the capture has a hole before 1793453657.613: a reader restarted on a main buffer whose oldest line the capture had not read',
    })
  })

  test('reports a capture fault, never a missing load, when the main buffer had dropped lines from boot by the first dump', () => {
    const text = withoutLoad(capture)
      .replace('CAPTURE_STATS main total=2/2 now=2/2', 'CAPTURE_STATS main total=2/9 now=2/2')
      .replaceAll('1793453504.000', '1793453534.912')

    expect(waitOutcome(parseCapture(text), {bootId: BOOT_ID, now: 1793453700, deadlinePassed: true})).toEqual({
      kind: 'capture-fault',
      reason: 'the main buffer had dropped 7 of its 9 lines by the capture\'s first dump, so the capture may lack lines from boot on, its oldest kept line is from 31.9s after boot, so a load before then would not show',
    })
  })

  test('reports a capture fault, never a missing load, when the capture holds no logd statistics for its first dump', () => {
    const text = withoutLoad(capture).replace('CAPTURE_STATS main total=2/2 now=2/2\n', '')

    expect(waitOutcome(parseCapture(text), {bootId: BOOT_ID, now: 1793453700, deadlinePassed: true})).toEqual({
      kind: 'capture-fault',
      reason: 'the capture holds no logd statistics for its first dump of the main buffer, so nothing shows that dump held every line from boot',
    })
  })

  test('reports a capture fault, never a missing load, when a restarted reader begins on an older line of another buffer but on a main line the capture never read', () => {
    const text = [
      `CAPTURE boot_id=${BOOT_ID} btime=1793453503`,
      'CAPTURE_SEGMENT seed',
      '--------- beginning of main',
      '         1793453504.000   237   237 I vold    : Vold 3.0 (the awakening) firing up',
      '         1793453553.000   237   237 D vold    : Detected support for: ext4 f2fs vfat',
      'CAPTURE_STATS main total=2/2 now=2/2',
      'CAPTURE_SEGMENT start 1793453560',
      '--------- beginning of system',
      '         1793453543.000   673   736 I system_server: AssetManager2 locale list changing from [] to [en-US]',
      '--------- beginning of main',
      '         1793453853.000  1749  1749 I SystemSubtypesReportModule: entry: en-US, source: UNSPECIFIED',
      '         1793453863.000  1749  2108 E DownloadManager: error downloading __KLP_manifest_delight__en-US',
      '',
    ].join('\n')

    expect(waitOutcome(parseCapture(text), {bootId: BOOT_ID, now: 1793453870, deadlinePassed: true})).toEqual({
      kind: 'capture-fault',
      reason: 'the capture has a hole before 1793453853.000: a reader restarted on a main buffer whose oldest line the capture had not read',
    })
  })

  test('reports a capture fault when the reader stopped', () => {
    expect(waitOutcome(parseCapture(withoutLoad(capture)), {bootId: BOOT_ID, now: 1793453800, deadlinePassed: true})).toEqual({
      kind: 'capture-fault',
      reason: "the capture's last line is from 110s ago, so its reader stopped",
    })
  })
})

describe(captureFault.name, () => {
  test('accepts the recorded boot, whose reader restarted and dumped the buffer again', () => {
    expect(captureFault(parseCapture(capture), BOOT_ID, 1793453700)).toEqual(undefined)
  })

  test('faults a capture whose readers wrote no line', () => {
    expect(captureFault(parseCapture(`CAPTURE boot_id=${BOOT_ID} btime=1793453503\nCAPTURE_SEGMENT seed\n- waiting for device -\n`), BOOT_ID, 1793453700)).toEqual(
      'the capture holds no line of the main buffer',
    )
  })

  test('reads only the main buffer, so a capture of other buffers alone holds no line', () => {
    const text = capture.replaceAll('--------- beginning of main', '--------- beginning of system')

    expect(captureFault(parseCapture(text), BOOT_ID, 1793453700)).toEqual('the capture holds no line of the main buffer')
  })

  test('takes the first header only, so a header appended by a later prep does not adopt the file', () => {
    const text = `${capture}CAPTURE boot_id=a0d6c1b9-0000-4000-8000-000000000000 btime=1793453800\n`

    expect(captureFault(parseCapture(text), 'a0d6c1b9-0000-4000-8000-000000000000', 1793453700)).toEqual(
      `the capture is of boot ${BOOT_ID}, the device runs boot a0d6c1b9-0000-4000-8000-000000000000`,
    )
  })
})

describe(notLoadedMessage.name, () => {
  test('names the missing line, the Gboard version and the dictionary lines of the boot', () => {
    const parsed = parseCapture(withoutLoad(capture))

    expect(notLoadedMessage('15.1.08.726012951-preload-x86_64', dictionaryLines(parsed, BOOT_ID)).split('\n')).toEqual([
      'Gboard 15.1.08.726012951-preload-x86_64 never logged its Japanese dictionary load, a `data_loader.cc` `New data is loaded` line for a `mozcdata-<version>.data` file, within 360s of boot. Dictionary lines seen:',
      '1793453620.349  1749  4776 E native  : E0000 00:00:1793453620.349674    4776 mozcjni.cc:114] j_data_file_path is null.  Fallback to minimal engine.',
      '1793453620.775  1749  2181 I DownloadManager: DownloadManager.downloadInternal():412 Download for __MOZCPACK_mozcmain_ja_JP scheduled with params DownloadParams{allowMetered=true, requireCharging=false, foreground=true, immediately=true, priority=0}',
      '1793453651.042  1749  2004 I DownloadManager: DownloadManager$4.onFailure():573 download for __MOZCPACK_mozcmain_ja_JP is cancelled',
      '1793453651.470  1749  1749 I SystemSubtypesReportModule: SystemSubtypesReportModule$3.onCurrentInputMethodEntryChanged():149 entry: en-US, source: UNSPECIFIED',
      '1793453688.038  1749  4776 I native  : I0000 00:00:1793453688.036280    4776 data_loader.cc:89] New request is registered: id=8162791524001069179 priority=10 sequence_id=1 file_path=/data/user/0/com.google.android.inputmethod.latin/files/datadownload/shared/public/datadownloadfile_1793453548902/mozcdata-24.20241006.9.data',
      '1793453688.051  1749  5830 I native  : I0000 00:00:1793453688.051561    5830 data_loader.cc:186] Building a new module: id=8162791524001069179 priority=10 sequence_id=1 file_path=/data/user/0/com.google.android.inputmethod.latin/files/datadownload/shared/public/datadownloadfile_1793453548902/mozcdata-24.20241006.9.data',
      '1793453689.294  1749  1749 I SystemSubtypesReportModule: SystemSubtypesReportModule$3.onCurrentInputMethodEntryChanged():149 entry: ja-JP, source: GLOBE_KEY',
      '1793453690.133  1749  4776 I SessionExecutor: SessionExecutor$ExecutorMainCallback.ensureSession():515 Mozc engine reload status: RELOADED',
    ])
  })
})

describe(stripLabels.name, () => {
  test('reads the kanji conversions kyou brought on a loaded dictionary', () => {
    expect(stripLabels(fixture('ja-keyboard.xml'), fixture('ja-strip-kanji.xml'))).toEqual([
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
    ])
  })

  test('reads only the reading before the dictionary loaded', () => {
    expect(stripLabels(fixture('ja-keyboard.xml'), fixture('ja-strip-kana.xml'))).toEqual(['きょう'])
  })
})

describe(confirmationFailure.name, () => {
  const reloaded = {time: 1793453690.133, text: RELOADED_LINE}

  test('passes a rebuilt session that offered kanji and left the field empty', () => {
    expect(confirmationFailure({marked: true, reloaded, labels: ['今日', 'きょう'], text: '', open: false})).toEqual(undefined)
  })

  test('fails a switch that rebuilt no session', () => {
    expect(confirmationFailure({marked: true, reloaded: undefined, labels: ['今日', 'きょう'], text: '', open: false})).toEqual(
      'no `Mozc engine reload status: RELOADED` line followed the switch to Japanese',
    )
  })

  test('fails a switch whose marker never reached the capture', () => {
    expect(confirmationFailure({marked: false, reloaded: undefined, labels: ['今日', 'きょう'], text: '', open: false})).toEqual(
      'the line marking the switch never reached the capture, so it cannot show what followed the switch',
    )
  })

  test('fails a strip with only kana', () => {
    expect(confirmationFailure({marked: true, reloaded, labels: ['きょう'], text: '', open: false})).toEqual('kyou brought no kanji candidate, the strip showed ["きょう"]')
  })

  test('fails a field the deletion did not empty or whose composition is open', () => {
    expect(confirmationFailure({marked: true, reloaded, labels: ['今日'], text: 'き', open: true})).toEqual(
      'the scratch field holds "き" after the deletion, a composition is still open in the scratch field after the deletion',
    )
  })
})

describe(reloadedAfter.name, () => {
  const marker = `         1793453689.900  4242  4242 I ime-prep: ${MARKER}`
  const reload = (time: string) => RELOADED_LINE.replace('1793453690.133', time)
  const japaneseEntry = capture.split('\n').find((line) => line.includes('entry: ja-JP'))!

  test('does not count a RELOADED line after the marker but before the change to Japanese', () => {
    expect(reloadedAfter(parseCapture(withSegment([marker, reload('1793453689.950'), japaneseEntry])), BOOT_ID, MARKER)).toEqual({marked: true, reloaded: undefined})
  })

  test('counts a RELOADED line after the change to Japanese that follows the marker', () => {
    expect(reloadedAfter(parseCapture(withSegment([marker, japaneseEntry, RELOADED_LINE])), BOOT_ID, MARKER)).toEqual({
      marked: true,
      reloaded: {time: 1793453690.133, text: RELOADED_LINE},
    })
  })
})

describe(confirmDictionary.name, () => {
  test('switches an English keyboard to Japanese once and reads RELOADED after that switch', async () => {
    const gboard = fakeGboard({japanese: false})

    expect(await confirmDictionary(gboard.keyboard, BOOT_ID)).toEqual({
      switch: 'to-japanese',
      marker: MARKER,
      marked: true,
      reloaded: {time: 1793453690.133, text: RELOADED_LINE},
      labels: ['今日。コンゲツ ノ コン，イマ。ニチヨウビ ノ ニチ，ヒ', '今日', 'きょう。ヒラガナ きょう', 'きょう', '教。キョウカショ ノ キョウ，オシエル', '教', '2026/10/31。今日の日付', '2026/10/31', '2026-10-31。今日の日付', '2026-10-31'],
      text: '',
      open: false,
      failure: undefined,
    })
    expect(gboard.actions).toEqual(['switch to japanese', `mark ${MARKER}`, 'tap language key', 'type kyou', 'delete'])
  })

  test('switches a Japanese keyboard away and back, so a session from before the load is rebuilt', async () => {
    const gboard = fakeGboard({japanese: true})

    expect(await confirmDictionary(gboard.keyboard, BOOT_ID)).toEqual({
      switch: 'away-and-back',
      marker: MARKER,
      marked: true,
      reloaded: {time: 1793453690.133, text: RELOADED_LINE},
      labels: ['今日。コンゲツ ノ コン，イマ。ニチヨウビ ノ ニチ，ヒ', '今日', 'きょう。ヒラガナ きょう', 'きょう', '教。キョウカショ ノ キョウ，オシエル', '教', '2026/10/31。今日の日付', '2026/10/31', '2026-10-31。今日の日付', '2026-10-31'],
      text: '',
      open: false,
      failure: undefined,
    })
    expect(gboard.actions).toEqual(['leave japanese', 'switch to japanese', `mark ${MARKER}`, 'tap language key', 'type kyou', 'delete'])
  })

  test('does not count a RELOADED line from before the switch', async () => {
    const gboard = fakeGboard({japanese: true, rebuilds: false})

    expect(await confirmDictionary(gboard.keyboard, BOOT_ID)).toEqual({
      switch: 'away-and-back',
      marker: MARKER,
      marked: true,
      reloaded: undefined,
      labels: ['きょう'],
      text: '',
      open: false,
      failure: 'no `Mozc engine reload status: RELOADED` line followed the switch to Japanese, kyou brought no kanji candidate, the strip showed ["きょう"]',
    })
  })

  test('does not count a RELOADED line from before the switch in the same second', async () => {
    const gboard = fakeGboard({japanese: true, rebuilds: false, earlierReloadAt: '1793453689.100'})

    expect(await confirmDictionary(gboard.keyboard, BOOT_ID)).toEqual({
      switch: 'away-and-back',
      marker: MARKER,
      marked: true,
      reloaded: undefined,
      labels: ['きょう'],
      text: '',
      open: false,
      failure: 'no `Mozc engine reload status: RELOADED` line followed the switch to Japanese, kyou brought no kanji candidate, the strip showed ["きょう"]',
    })
  })

  test('does not count a RELOADED line logged while the switch reads the keyboard, before its tap', async () => {
    const gboard = fakeGboard({japanese: false, rebuilds: false, pendingReload: true, earlierReloadAt: '1793453689.850'})

    expect(await confirmDictionary(gboard.keyboard, BOOT_ID)).toEqual({
      switch: 'to-japanese',
      marker: MARKER,
      marked: true,
      reloaded: undefined,
      labels: ['きょう'],
      text: '',
      open: false,
      failure: 'no `Mozc engine reload status: RELOADED` line followed the switch to Japanese, kyou brought no kanji candidate, the strip showed ["きょう"]',
    })
    expect(gboard.actions).toEqual(['switch to japanese', `mark ${MARKER}`, 'tap language key', 'type kyou', 'delete'])
  })

  test('marks the capture again before each tap and reads RELOADED after the tap that brought Japanese', async () => {
    const gboard = fakeGboard({japanese: false, taps: 2})

    expect(await confirmDictionary(gboard.keyboard, BOOT_ID)).toEqual({
      switch: 'to-japanese',
      marker: MARKER,
      marked: true,
      reloaded: {time: 1793453690.133, text: RELOADED_LINE},
      labels: ['今日。コンゲツ ノ コン，イマ。ニチヨウビ ノ ニチ，ヒ', '今日', 'きょう。ヒラガナ きょう', 'きょう', '教。キョウカショ ノ キョウ，オシエル', '教', '2026/10/31。今日の日付', '2026/10/31', '2026-10-31。今日の日付', '2026-10-31'],
      text: '',
      open: false,
      failure: undefined,
    })
    expect(gboard.actions).toEqual([
      'switch to japanese',
      'mark ime-prep-switch-1',
      'tap language key',
      `mark ${MARKER}`,
      'tap language key',
      'type kyou',
      'delete',
    ])
  })

  test('fails when Gboard shows Japanese before any tap, so no marker precedes the switch', async () => {
    const gboard = fakeGboard({japanese: false, taps: 0})

    await expect(confirmDictionary(gboard.keyboard, BOOT_ID)).rejects.toThrow('Gboard showed Japanese before any tap on its language key, so no marker precedes the switch')
    expect(gboard.actions).toEqual(['switch to japanese'])
  })

  test('fails when the marker never reached the capture, even with a RELOADED line after the switch', async () => {
    const gboard = fakeGboard({japanese: false, marks: false})

    expect(await confirmDictionary(gboard.keyboard, BOOT_ID)).toEqual({
      switch: 'to-japanese',
      marker: MARKER,
      marked: false,
      reloaded: undefined,
      labels: ['今日。コンゲツ ノ コン，イマ。ニチヨウビ ノ ニチ，ヒ', '今日', 'きょう。ヒラガナ きょう', 'きょう', '教。キョウカショ ノ キョウ，オシエル', '教', '2026/10/31。今日の日付', '2026/10/31', '2026-10-31。今日の日付', '2026-10-31'],
      text: '',
      open: false,
      failure: 'the line marking the switch never reached the capture, so it cannot show what followed the switch',
    })
  })
})

function fixture(name: string): string {
  return readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8')
}

/** The recorded capture's header and a reader that holds only `lines`. */
function withSegment(lines: string[]): string {
  return [capture.split('\n')[0], 'CAPTURE_SEGMENT seed', '--------- beginning of main', ...lines].join('\n')
}

function withoutHeader(text: string): string {
  return text.replace(/^CAPTURE boot_id=.*\n/, '')
}

function withoutLoad(text: string): string {
  return text
    .split('\n')
    .filter((line) => !line.includes('data_loader.cc:121'))
    .join('\n')
}

/**
 * Gboard as the probe recorded it: the marker is logged at device time 1793453689.900 when `marks`, the
 * tap after it changes the input method to Japanese and logs `RELOADED` when `rebuilds`, and then `kyou`
 * brings the kanji strip. A `RELOADED` line from an earlier switch, at `earlierReloadAt`, sits before the
 * marker, or, with `pendingReload`, is logged while the switch reads the keyboard, before its tap. With
 * `taps: 2` the first tap lands on English and only the second on Japanese, each after a marker of its own,
 * and with `taps: 0` Gboard shows Japanese by the time the switch reads it, with no tap.
 */
function fakeGboard({
  japanese,
  rebuilds = true,
  marks = true,
  earlierReloadAt = '1793453640.000',
  pendingReload = false,
  taps = 1,
}: {
  japanese: boolean
  rebuilds?: boolean
  marks?: boolean
  earlierReloadAt?: string
  pendingReload?: boolean
  taps?: 0 | 1 | 2
}): {keyboard: ScratchKeyboard; actions: string[]} {
  const actions: string[] = []
  const beforeSwitch = capture.split('\n').filter((line) => line !== '' && !line.includes('ja-JP') && !line.includes('RELOADED'))
  const earlierReload = RELOADED_LINE.replace('1793453690.133', earlierReloadAt)
  const japaneseEntry = capture.split('\n').find((line) => line.includes('entry: ja-JP'))!
  let lines = pendingReload ? beforeSwitch : [...beforeSwitch, earlierReload]
  let showsJapanese = japanese
  let text = ''
  let marked = 0
  return {
    actions,
    keyboard: {
      isJapanese: async () => showsJapanese,
      leaveJapanese: async () => {
        actions.push('leave japanese')
        showsJapanese = false
      },
      switchToJapanese: async (beforeTap) => {
        actions.push('switch to japanese')
        if (pendingReload) lines = [...lines, earlierReload]
        if (taps === 2) {
          await beforeTap()
          actions.push('tap language key')
          lines = [...lines, japaneseEntry.replace('ja-JP', 'en-US')]
        }
        if (taps > 0) {
          await beforeTap()
          actions.push('tap language key')
        }
        showsJapanese = true
        lines = [...lines, japaneseEntry, ...(rebuilds ? [RELOADED_LINE] : [])]
      },
      markCapture: async () => {
        marked += 1
        const marker = marked === taps ? MARKER : `ime-prep-switch-${marked}`
        actions.push(`mark ${marker}`)
        if (marks) lines = [...lines, `         1793453689.900  4242  4242 I ime-prep: ${marker}`]
        return marker
      },
      capture: async (): Promise<Capture> => parseCapture(lines.join('\n')),
      dump: async () => (text === '' ? fixture('ja-keyboard.xml') : fixture(rebuilds ? 'ja-strip-kanji.xml' : 'ja-strip-kana.xml')),
      typeKyou: async () => {
        actions.push('type kyou')
        text = 'きょう'
      },
      deleteComposition: async () => {
        actions.push('delete')
        text = ''
      },
      field: async () => ({
        text,
        events: [
          {type: 'compositionstart'},
          {type: 'compositionupdate'},
          {type: 'compositionend'},
        ],
      }),
      sleep: async () => {},
    },
  }
}
