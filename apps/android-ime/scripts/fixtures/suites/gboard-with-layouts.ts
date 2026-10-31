import {readFileSync} from 'node:fs'
import {vi} from 'vitest'
import {currentSignal, whenAborted} from '../../lib/util.ts'

// A fake Gboard of recorded dumps: the letter layouts, the English symbol layout, which `Symbol keyboard`
// opens and `Letter keyboard` (`key_pos_back_to_prime`) closes, and on Japanese the ASCII alphabet layout
// `アルファベット入力キーボード` opens, whose `数字キーボード` opens the numeric pad and whose `絵文字キーボード`
// opens the emoji and media panel, closed by `文字キーボード`. The pad's `かな入力キーボード` leads back to
// romaji and its `記号キーボード` on to the rich symbol panel, whose `文字キーボード` leads back to the pad.
// Gboard keeps its layout from one attempt to the next, as on the device.
type Layout =
  | 'letters'
  | 'alphabet'
  | 'symbols'
  | 'emoji'
  | 'numbers'
  | 'richSymbols'
const gboard = vi.hoisted(() => ({
  lang: 'en' as 'en' | 'ja',
  layout: 'letters' as Layout,
  previousLayout: 'letters' as Layout,
  attempt: 0,
  taps: [] as string[][],
  candidate: undefined as string | undefined,
  candidateFrom: 1,
  candidateAfterSpace: false,
  staleDumps: 0,
  staleDumpsPerSwitch: 0,
  staleSuggestion: false,
  partialDumps: 0,
  controlsOnlyDumps: 0,
  noDash: false,
  noDigitsKey: false,
  symbolsOpenEmoji: false,
  partialPadDumps: 0,
  rejectFirst: undefined as string | undefined,
  rejectedLandsLate: false,
  lateTap: undefined as string | undefined,
  texts: [] as string[],
  page: undefined as ((taps: string[]) => Record<string, unknown>) | undefined,
  errorsFrom: undefined as number | undefined,
  errorsAttempt: 1,
  error: '',
  stateReads: 0,
  loseKeyboardAfter: undefined as string | undefined,
  missingKeyboard: false,
  hangDumpAfter: undefined as string | undefined,
  hangingDump: false,
  hangFirstDump: false,
  hangScreenshotAfter: undefined as string | undefined,
  hangingScreenshot: false,
  hangReads: false,
  hung: false,
  dropReadsAfter: undefined as string | undefined,
  droppedReads: false,
  dashArrives: undefined as
    | 'never'
    | {afterReads: number}
    | {onFirstDump: {chromeExits: boolean}}
    | undefined,
  readsSinceDash: undefined as number | undefined,
  dashLanded: false,
  loadingReads: undefined as {count: number; seconds: number} | undefined,
  spaceStrip: undefined as SpaceStrip[] | undefined,
  spaceLog: 'whole' as SpaceLog,
  restarts: [] as Restart[],
  clock: 'answers' as SpaceClock,
  clockError: 0,
  lastDump: 'answers' as
    | 'answers'
    | 'fails'
    | 'hangs'
    | 'partial'
    | 'unparsable',
  slowScreenshot: undefined as ((name: string) => number) | undefined,
  partialStripDumps: [] as number[],
  unparsableStripDumps: [] as number[],
  io: [] as string[],
  restartLines: [] as number[],
  dumpsAfterTap: 0,
  mainFrom: undefined as number | undefined,
  firstTapAt: undefined as number | undefined,
  lastDumpAt: 0,
}))

/**
 * What the strip shows after a Space: the predictions of the next word, the completions still, for
 * `predictions-later` the completions on the first dump after the Space and the predictions from the
 * second on, or for `stale-predictions` the predictions of a snapshot older than the dump, though the
 * Space never reached Gboard.
 */
type SpaceStrip =
  | 'switches'
  | 'stays'
  | 'predictions-later'
  | 'stale-predictions'

/**
 * What the read of `main` returns: every line from `-T` on, a buffer that starts after the call's first
 * tap or ends before the last Space's dump, a read adb fails, rejects or that never answers, or nothing.
 */
type SpaceLog =
  | 'whole'
  | 'truncated-head'
  | 'truncated-tail'
  | 'fails'
  | 'rejects-since'
  | 'hangs'
  | 'empty'

/**
 * When Gboard logs an input restart, on the device's clock: during the `n`th dump after the `tap`th tap of
 * the attempt, counting from 1, or `seconds` before that dump's request or after its answer.
 */
type Restart =
  | {tap: number; dump: number; at: 'during'}
  | {tap: number; dump: number; at: 'before' | 'after'; seconds: number}

/** How the device answers `date +%s.%N`: with its time, with a failure, never, or after a long round trip. */
type SpaceClock = 'answers' | 'fails' | 'hangs' | 'slow'

const fixture = (name: string) =>
  readFileSync(new URL(`../${name}`, import.meta.url), 'utf8')
const letters = {en: fixture('en-keyboard.xml'), ja: fixture('ja-keyboard.xml')}
const symbols = fixture('en-symbols.xml')
const alphabet = fixture('ja-alphabet.xml')
const emoji = fixture('ja-emoji.xml')
const numbers = fixture('ja-numbers.xml')
const richSymbols = fixture('ja-rich-symbols.xml')
const strip = {
  completions: fixture('en-strip-completions.xml'),
  predictions: fixture('en-strip-predictions.xml'),
  stays: fixture('en-strip-after-outside-tap.xml'),
}
/** The device's clock, ahead of the host's by this many seconds. */
const DEVICE_AHEAD_SECONDS = 1_793_480_000

/** How much of `main` before the attempt's first dump the device holds when `clockError` is set. */
const MAIN_HISTORY_SECONDS = 30

/** Each line of `main` but a restart, from the recorded window around a Space the page got, run 41255435645. */
const MAIN_LINES = fixture('en-space-logcat.txt')
  .split('\n')
  .filter((line) => /^\d/.test(line) && !line.includes('ime-driver'))
  .map((line) => line.replace(/^\d+\.\d+/, '').trimEnd())

/** Gboard's input restart, from the recorded window around a tap that closed the keyboard, run 41254392596. */
const RESTART_LINE = fixture('en-input-restart-logcat.txt')
  .split('\n')
  .find((line) => line.includes('GoogleInputMethodService.onStartInput('))!
  .replace(/^\d+\.\d+/, '')
  .trimEnd()

/** What each layout key leads to from the layout it is on. */
const SWITCHES: Record<string, Partial<Record<Layout, Layout>>> = {
  'Symbol keyboard': {letters: 'symbols'},
  'Letter keyboard': {symbols: 'letters'},
  'アルファベット入力キーボード': {letters: 'alphabet'},
  '数字キーボード': {alphabet: 'numbers'},
  '絵文字キーボード': {alphabet: 'emoji'},
  '文字キーボード': {emoji: 'alphabet', richSymbols: 'numbers'},
  '記号キーボード': {numbers: 'richSymbols'},
  'かな入力キーボード': {numbers: 'letters'},
}

/** The key with resource id `id` no longer a key: no id and no label. */
function withoutKey(xml: string, id: string): string {
  return xml.replace(
    new RegExp(
      `resource-id="com\\.google\\.android\\.inputmethod\\.latin:id/${id}"([^>]*)content-desc="[^"]*"`,
    ),
    'resource-id=""$1content-desc=""',
  )
}

/** The keys that commit `-`: English `Dash` and the Japanese rich symbol panel's `ダッシュ`. */
const DASH_KEYS = ['Dash', 'ダッシュ']

const ERROR =
  "NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node."

function dump(layout = gboard.layout): string {
  if (layout === 'symbols')
    return gboard.noDash ? withoutKey(symbols, 'key_pos_1_5') : symbols
  if (layout === 'alphabet')
    return gboard.noDigitsKey
      ? withoutKey(alphabet, 'key_pos_switch_hiragana_alphabet')
      : alphabet
  if (layout === 'emoji') return emoji
  if (layout === 'numbers') return numbers
  if (layout === 'richSymbols')
    return gboard.noDash
      ? richSymbols.replace('content-desc="ダッシュ"', 'content-desc=""')
      : richSymbols
  const xml =
    gboard.spaceStrip === undefined ? letters[gboard.lang] : spaceStripDump()
  if (
    gboard.candidate === undefined ||
    gboard.attempt < gboard.candidateFrom ||
    (gboard.candidateAfterSpace &&
      !(gboard.taps.at(-1) ?? []).includes('スペース'))
  )
    return xml
  return xml.replace(
    '</hierarchy>',
    `<node text="${gboard.candidate}" resource-id="" class="android.widget.TextView" package="com.google.android.inputmethod.latin" content-desc="" bounds="[100,1400][200,1500]" /></hierarchy>`,
  )
}

/**
 * With `spaceStrip`, the English letters as the Space probe dumped them: the strip's completions after a
 * letter, and after the `n`th Space of the attempt the predictions when that Space `switches` it, else the
 * completions still. The probe's dumps hold the keys where `en-keyboard.xml` does, labelled lowercase.
 */
function spaceStripDump(): string {
  const taps = gboard.taps.at(-1) ?? []
  const last = taps.at(-1)
  if (last === undefined) return letters.en
  if (last !== 'Space') return strip.completions
  const spaces = taps.filter((tap) => tap === 'Space').length
  const kind = gboard.spaceStrip![spaces - 1]
  if (kind === 'switches' || kind === 'stale-predictions')
    return strip.predictions
  if (kind === 'predictions-later' && gboard.dumpsAfterTap > 1)
    return strip.predictions
  return strip.stays
}

/** The device's time now, in seconds. */
function deviceNow(): number {
  return Date.now() / 1000 + DEVICE_AHEAD_SECONDS
}

/**
 * `main` as the device logs it: a line of the recorded window every half second from the attempt's first
 * dump on and once the read starts, and each restart `restarts` places.
 */
function mainLines(): Array<{time: number; line: string}> {
  const lines = gboard.restartLines.map((time) => ({time, line: RESTART_LINE}))
  const from =
    (gboard.mainFrom ?? deviceNow()) -
    (gboard.clockError === 0 ? 0 : MAIN_HISTORY_SECONDS)
  for (let time = from; time <= deviceNow(); time += 0.5)
    lines.push({
      time,
      line: MAIN_LINES[Math.round((time - from) * 2) % MAIN_LINES.length]!,
    })
  return lines.sort((first, second) => first.time - second.time)
}

/** `adb logcat -d -v epoch -b main -T <since>`, as `spaceLog` says. */
function spaceLogcat(command: string): LogcatExit | Promise<LogcatExit> {
  gboard.io.push(command)
  const since = Number(/-T (\S+)/.exec(command)![1])
  const kind = gboard.spaceLog
  if (kind === 'fails')
    return {code: 1, stdout: '', stderr: 'logcat: Unable to open log device'}
  if (kind === 'rejects-since')
    return {
      code: 1,
      stdout: '',
      stderr: `logcat: -T '${/-T (\S+)/.exec(command)![1]}' not in time format.`,
    }
  if (kind === 'hangs') return whenAborted(currentSignal()!)
  if (kind === 'empty') return {code: 0, stdout: '', stderr: ''}
  const lines = mainLines().filter(({time}) => time >= since)
  const firstTap = gboard.firstTapAt ?? Number.POSITIVE_INFINITY
  const kept =
    kind === 'truncated-head'
      ? lines.filter(({time}) => time > firstTap + 0.5)
      : kind === 'truncated-tail'
        ? lines.filter(({time}) => time < gboard.lastDumpAt)
        : lines
  return {
    code: 0,
    stdout: [
      '--------- beginning of main',
      ...kept.map(({time, line}) => `${time.toFixed(3)}${line}`),
      '',
    ].join('\n'),
    stderr: '',
  }
}

type LogcatExit = {code: number; stdout: string; stderr: string}

/** `adb shell date +%s.%N`, as `clock` says. */
async function spaceClock(): Promise<string> {
  gboard.io.push('date')
  if (gboard.clock === 'fails')
    throw new Error('adb shell date +%s.%N exited with 1: date: not found')
  if (gboard.clock === 'hangs') return whenAborted(currentSignal()!)
  if (gboard.clock === 'slow')
    await Promise.race([
      new Promise((resolve) => setTimeout(resolve, 3000)),
      whenAborted(currentSignal()!),
    ])
  return `${(deviceNow() + gboard.clockError).toFixed(9)}\n`
}

/**
 * Log each restart `restarts` places at the dump now being taken, `when` it is requested or answered, and
 * note the dump's time.
 */
function restartsAtDump(when: 'request' | 'answer'): void {
  const taps = gboard.taps.at(-1) ?? []
  const now = deviceNow()
  if (when === 'request') {
    gboard.mainFrom ??= now
    gboard.dumpsAfterTap += 1
  } else gboard.lastDumpAt = now
  for (const restart of gboard.restarts) {
    if (restart.tap !== taps.length || restart.dump !== gboard.dumpsAfterTap)
      continue
    if (restart.at === 'during' && when === 'request')
      gboard.restartLines.push(now + 0.001)
    if (restart.at === 'before' && when === 'request')
      gboard.restartLines.push(now - restart.seconds)
    if (restart.at === 'after' && when === 'answer')
      gboard.restartLines.push(now + restart.seconds)
  }
}

/** The symbol layout with every key but Space, Enter, Delete and Dash unlabelled. */
function controlsAndDash(): string {
  return symbols.replace(
    /(resource-id="com\.google\.android\.inputmethod\.latin:id\/key_pos_[^"]*"[^>]*content-desc=")([^"]*)"/g,
    (whole, start: string, label: string) =>
      ['Space', 'Enter', 'Delete', 'Dash'].includes(label)
        ? whole
        : `${start}"`,
  )
}

/** Label of the Gboard key whose center is `x`, `y` on the layout shown. */
function labelAt(x: number, y: number): string | undefined {
  for (const node of dump().matchAll(/<node [^>]*?(?:\/>|>)/g)) {
    const attrs = node[0]
    if (!attrs.includes('package="com.google.android.inputmethod.latin"'))
      continue
    const bounds = /bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(attrs)
    if (!bounds) continue
    const [left, top, right, bottom] = bounds.slice(1).map(Number) as [
      number,
      number,
      number,
      number,
    ]
    if (
      Math.floor((left + right) / 2) !== x ||
      Math.floor((top + bottom) / 2) !== y
    )
      continue
    const label =
      /content-desc="([^"]+)"/.exec(attrs)?.[1] ??
      /content-desc='([^']+)'/.exec(attrs)?.[1] ??
      /text="([^"]+)"/.exec(attrs)?.[1]
    if (label) return label.replaceAll('&quot;', '"').replaceAll('&amp;', '&')
  }
  return undefined
}

vi.mock(import('../../lib/adb.ts'), async (importOriginal) => {
  const original = await importOriginal()
  const {chromeAdb} = await import('./chrome-pids.ts')
  return {
    ...original,
    adb: async (args: string[]) => {
      const command = args.join(' ')
      if (command === 'shell date +%s.%N') return spaceClock()
      return (
        chromeAdb(args, original) ??
        (args.includes('input_method') ? 'mInputShown=true' : '')
      )
    },
    adbExit: async (args: string[]) => {
      const command = args.join(' ')
      if (command.startsWith('logcat -d -v epoch -b main'))
        return spaceLogcat(command)
      throw new Error(`the fake device runs no adb ${command}`)
    },
  }
})

vi.mock(import('../../lib/cdp.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  targets: async () => [],
  cdpEval: async (expression: string) => {
    if (expression === 'document.readyState') {
      if (
        gboard.loadingReads !== undefined &&
        gboard.loadingReads.count > 0 &&
        globalThis.chromeCalls().includes('force-stop')
      ) {
        gboard.loadingReads.count -= 1
        const {seconds} = gboard.loadingReads
        await Promise.race([
          new Promise((resolve) => setTimeout(resolve, seconds * 1000)),
          whenAborted(currentSignal()!),
        ])
        return 'loading'
      }
      return 'complete'
    }
    if (expression === 'typeof window.__state') return 'function'
    if (expression === 'location.href')
      return 'http://localhost:8765/editor.html'
    if (expression.startsWith('document.activeElement')) return true
    if (expression === 'window.__state()') {
      if (gboard.hangReads && gboard.hung && gboard.attempt === 1)
        return whenAborted(currentSignal()!)
      if (gboard.droppedReads && gboard.attempt === 1)
        throw new Error('cdp connection dropped')
      gboard.stateReads += 1
      gboard.io.push('read')
      const taps = gboard.taps.at(-1) ?? []
      const dashed = dashReached(taps)
      return {
        text: dashed ? (gboard.texts[gboard.attempt - 1] ?? '') : '',
        // The page logs a `beforeinput` for each dash that reached it, as Gboard's dash keys commit `-`.
        events: taps
          .filter((tap) => DASH_KEYS.includes(tap) && dashed)
          .map(() => ({
            type: 'beforeinput',
            inputType: 'insertText',
            data: '-',
          })),
        errors:
          gboard.attempt === gboard.errorsAttempt &&
          gboard.errorsFrom !== undefined &&
          gboard.stateReads >= gboard.errorsFrom
            ? [gboard.error]
            : [],
        blocks: 1,
        ...(dashed ? gboard.page?.(taps) : {}),
      }
    }
    if (expression.includes('getBoundingClientRect')) {
      gboard.attempt += 1
      gboard.stateReads = 0
      gboard.missingKeyboard = false
      gboard.hangingDump = gboard.hangFirstDump && gboard.attempt === 1
      gboard.taps.push([])
      return {
        x: 100,
        y: 100,
        devicePixelRatio: 1,
        innerHeight: 800,
        screenHeight: 800,
      }
    }
    return undefined
  },
}))

vi.mock(import('../../lib/u2.ts'), async (importOriginal) => {
  const original = await importOriginal()
  const device = {
    waitTimeout: 20,
    info: async () => ({productName: 'fake'}),
    windowSize: async () => [1080, 2400] as [number, number],
    appCurrent: async () => ({
      package: 'com.android.chrome',
      activity: 'Main',
      pid: 1,
    }),
    screenshot: async (name: string) => {
      gboard.io.push(`screenshot ${name.replace(/^.*-/, '')}`)
      const seconds = gboard.slowScreenshot?.(name) ?? 0
      if (seconds > 0)
        await Promise.race([
          new Promise((resolve) => setTimeout(resolve, seconds * 1000)),
          whenAborted(currentSignal()!),
        ])
      landLateTap()
      if (gboard.hangingScreenshot) {
        gboard.hangingScreenshot = false
        gboard.hung = true
        return whenAborted(currentSignal()!)
      }
    },
    dumpHierarchy: async () => {
      landLateTap()
      landLateDash()
      gboard.io.push('dump')
      restartsAtDump('request')
      try {
        return await fakeDump()
      } finally {
        restartsAtDump('answer')
      }
    },
    click: async (x: number, y: number) => {
      const label = labelAt(x, y)
      gboard.io.push(`tap ${label ?? `${x},${y}`}`)
      if (label === undefined) return
      if (label === gboard.rejectFirst) {
        gboard.rejectFirst = undefined
        if (gboard.rejectedLandsLate) gboard.lateTap = label
        throw new original.TapNotInjectedError(
          `tap at ${x},${y} was not injected`,
        )
      }
      gboard.taps.at(-1)?.push(label)
      gboard.dumpsAfterTap = 0
      gboard.firstTapAt ??= deviceNow()
      if (gboard.attempt === 1 && gboard.loseKeyboardAfter === label)
        gboard.missingKeyboard = true
      if (
        gboard.attempt === 1 &&
        gboard.hangDumpAfter === label &&
        gboard.layout !== 'letters'
      )
        gboard.hangingDump = true
      if (gboard.attempt === 1 && gboard.hangScreenshotAfter === label)
        gboard.hangingScreenshot = true
      if (gboard.attempt === 1 && gboard.dropReadsAfter === label)
        gboard.droppedReads = true
      const next =
        gboard.symbolsOpenEmoji && label === '記号キーボード'
          ? SWITCHES['絵文字キーボード']!.alphabet
          : SWITCHES[label]?.[gboard.layout]
      if (next !== undefined) {
        gboard.previousLayout = gboard.layout
        gboard.layout = next
        // Gboard's tree shows the old layout for a while after the switch.
        gboard.staleDumps = gboard.staleDumpsPerSwitch
      }
    },
    swipe: async () => {},
    close: async () => {},
    find: () => ({
      exists: async () => false,
      click: async () => {},
      getText: async () => '',
    }),
  }
  return {
    ...original,
    Device: {connect: async () => device} as never,
  }
})

async function fakeDump(): Promise<string> {
  if (gboard.hangingDump) {
    gboard.hangingDump = false
    return whenAborted(currentSignal()!)
  }
  if (gboard.staleDumps > 0) {
    gboard.staleDumps -= 1
    const stale = dump(gboard.previousLayout)
    // Each stale dump shows another suggestion, so only its keys tell it is the old layout.
    return gboard.staleSuggestion
      ? stale.replace(
          '</hierarchy>',
          `<node text="suggestion ${gboard.staleDumps}" resource-id="" class="android.widget.TextView" package="com.google.android.inputmethod.latin" content-desc="" bounds="[300,1400][400,1500]" /></hierarchy>`,
        )
      : stale
  }
  if (gboard.partialDumps > 0 && gboard.layout === 'symbols') {
    gboard.partialDumps -= 1
    return dump()
      .replace('content-desc="Space"', 'content-desc=""')
      .replace('content-desc="Delete"', 'content-desc=""')
  }
  if (gboard.partialPadDumps > 0 && gboard.layout === 'numbers') {
    gboard.partialPadDumps -= 1
    return withoutKey(dump(), 'key_pos_ja_12keys_5')
  }
  if (gboard.controlsOnlyDumps > 0 && gboard.layout === 'symbols') {
    gboard.controlsOnlyDumps -= 1
    return controlsAndDash()
  }
  if (gboard.missingKeyboard && gboard.layout === 'letters')
    return dump().replaceAll(
      'package="com.google.android.inputmethod.latin"',
      'package="com.android.systemui"',
    )
  // A dump with the Space key unlabelled is partial to the driver, which dumps again. Its strip shows the
  // predictions, which a strip read from it would take for a switch that never came.
  if (
    gboard.partialStripDumps.includes(gboard.dumpsAfterTap) &&
    lastIsSpaceOrLetter()
  )
    return strip.predictions.replace('content-desc="Space"', 'content-desc=""')
  if (
    gboard.unparsableStripDumps.includes(gboard.dumpsAfterTap) &&
    lastIsSpaceOrLetter()
  )
    return dump().replace('</hierarchy>', '<node')
  if (afterLastSpace()) {
    if (gboard.lastDump === 'fails')
      throw new Error('RemoteDisconnected: the server closed the connection')
    if (gboard.lastDump === 'hangs') return whenAborted(currentSignal()!)
    if (gboard.lastDump === 'partial')
      return dump().replace('content-desc="Space"', 'content-desc=""')
    if (gboard.lastDump === 'unparsable')
      return dump().replace('</hierarchy>', '<node')
  }
  return dump()
}

/** Whether the attempt's last tap was a Space or a letter of the English letters with `spaceStrip`. */
function lastIsSpaceOrLetter(): boolean {
  return (
    gboard.spaceStrip !== undefined && (gboard.taps.at(-1) ?? []).length > 0
  )
}

/** Whether this dump comes after the attempt's last Space, the last of `spaceStrip`, with no tap after it. */
function afterLastSpace(): boolean {
  const taps = gboard.taps.at(-1) ?? []
  return (
    gboard.spaceStrip !== undefined &&
    taps.at(-1) === 'Space' &&
    taps.filter((tap) => tap === 'Space').length === gboard.spaceStrip.length
  )
}

/**
 * Whether the first attempt's dash reached the page by this state read, counted from the first read after
 * its tap, as `dashArrives` says. Before it, the page shows the empty block it started with.
 */
function dashReached(taps: string[]): boolean {
  if (gboard.dashArrives === undefined || gboard.attempt > 1) return true
  if (!taps.some((tap) => DASH_KEYS.includes(tap))) return true
  if (
    typeof gboard.dashArrives === 'object' &&
    'onFirstDump' in gboard.dashArrives
  )
    return gboard.dashLanded
  gboard.readsSinceDash = (gboard.readsSinceDash ?? 0) + 1
  return (
    gboard.dashArrives !== 'never' &&
    gboard.readsSinceDash > gboard.dashArrives.afterReads
  )
}

/**
 * A first attempt's dash that `dashArrives` holds until the first dump after its tap lands there, and the page
 * records the error from then on, before the driver reads it again.
 */
function landLateDash(): void {
  if (
    typeof gboard.dashArrives !== 'object' ||
    !('onFirstDump' in gboard.dashArrives)
  )
    return
  if (
    gboard.attempt !== 1 ||
    gboard.dashLanded ||
    !(gboard.taps.at(-1) ?? []).some((tap) => DASH_KEYS.includes(tap))
  )
    return
  gboard.dashLanded = true
  gboard.errorsFrom = 0
  if (gboard.dashArrives.onFirstDump.chromeExits)
    globalThis.fakeChrome({notRunning: true})
}

/** A rejected tap that still reaches Gboard lands on the next device call after it, here a dump or a screenshot. */
function landLateTap(): void {
  if (gboard.lateTap === undefined) return
  gboard.taps.at(-1)?.push(gboard.lateTap)
  gboard.lateTap = undefined
}

declare global {
  /** Set up the fake Gboard for the next `typeOnDevice` call. */
  var fakeGboard: (options: {
    lang: 'en' | 'ja'
    /** The page's text after each attempt. */
    texts?: string[]
    /** The page's state after the taps of the current attempt, over the one `texts` and `errorsFrom` give. */
    page?: (taps: string[]) => Record<string, unknown>
    /** A candidate Gboard offers from attempt `candidateFrom` on. */
    candidate?: string
    candidateFrom?: number
    /** Gboard offers `candidate` only once Space was tapped in the attempt, so not for its first word. */
    candidateAfterSpace?: boolean
    /** Dumps of the letters still shown after each layout switch, as before Gboard redraws. */
    staleDumpsPerSwitch?: number
    /** Each of those dumps shows a suggestion of its own above the keys. */
    staleSuggestion?: boolean
    /** Dumps of the symbol layout without its space and Delete keys, as taken mid-redraw. */
    partialDumps?: number
    /** Dumps of the symbol layout in which only its Space, Enter, Delete and Dash keys are labelled. */
    controlsOnlyDumps?: number
    /** The symbol layout has no Dash key, nor the rich symbol panel its `ダッシュ` cell. */
    noDash?: boolean
    /** Dumps of the Japanese numeric pad with its `5` key unlabelled, as taken mid-redraw. */
    partialPadDumps?: number
    /** The Japanese alphabet layout has no `数字キーボード` key, so its emoji key is its only other switch. */
    noDigitsKey?: boolean
    /** The pad's `記号キーボード` opens the emoji and media panel. */
    symbolsOpenEmoji?: boolean
    /** A key whose first tap the system rejects. */
    rejectFirst?: string
    /**
     * That rejected tap still reaches Gboard and the page, on the next dump or screenshot, after the read
     * the driver takes once the tap failed.
     */
    rejectedLandsLate?: true
    /** The page records an error from its `n`th state read of attempt `errorsAttempt` on. */
    errorsFrom?: number
    /** The attempt `errorsFrom` counts in, the first by default. */
    errorsAttempt?: number
    /** The error the page records, the `removeChild` one by default. */
    error?: string
    /** After the first attempt's tap on this key, the letter layout's dumps hold no Gboard node. */
    loseKeyboardAfter?: string
    /**
     * After the first attempt's tap on this key off the letter layout, the next dump never answers until
     * its call is aborted.
     */
    hangDumpAfter?: string
    /** The first attempt's first dump never answers until its call is aborted, before any key is tapped. */
    hangFirstDump?: true
    /** After the first attempt's tap on this key, the next screenshot never answers until its call is aborted. */
    hangScreenshotAfter?: string
    /** Once that screenshot hangs, no state read of the first attempt answers until its call is aborted. */
    hangReads?: true
    /** After the first attempt's tap on this key, every state read of that attempt fails as a dropped CDP connection. */
    dropReadsAfter?: string
    /**
     * The first attempt's dash never reaches the page, or only after this many state reads after its tap, or
     * only on the first dump after its tap, the tap back to the letters after a fault, where the page then
     * records the error and Chrome, with `chromeExits`, stops running. Until it does, the page shows an empty
     * block and no event.
     */
    dashArrives?:
      | 'never'
      | {afterReads: number}
      | {onFirstDump: {chromeExits: boolean}}
    /**
     * Once Chrome was force-stopped, the page answers this many reads of `document.readyState` with
     * `loading`, each after `seconds`, as a page that loads slowly in the retry's Chrome.
     */
    loadingReads?: {count: number; seconds: number}
    /** English Gboard shows the Space probe's strips, and what each Space of an attempt does to the strip. */
    spaceStrip?: SpaceStrip[]
    /** What the read of `main` returns, every line from `-T` on by default. */
    spaceLog?: SpaceLog
    /** Gboard's input restarts. */
    restarts?: Restart[]
    /** How the device answers a read of its clock. */
    clock?: SpaceClock
    /**
     * How many seconds `date` reads off from the clock `main` logs on, as after a clock that moved before
     * the read. `main` then holds lines from `MAIN_HISTORY_SECONDS` before the attempt's first dump.
     */
    clockError?: number
    /** How each dump after the attempt's last Space answers. */
    lastDump?: 'answers' | 'fails' | 'hangs' | 'partial' | 'unparsable'
    /** How many seconds the screenshot of this name takes to answer. */
    slowScreenshot?: (name: string) => number
    /** The dumps after each tap, counting from 1, whose Space key is unlabelled, as taken mid-redraw. */
    partialStripDumps?: number[]
    /** The dumps after each tap, counting from 1, that are cut off and do not parse. */
    unparsableStripDumps?: number[]
  }) => void
  /** The labels of the keys tapped in each attempt. */
  var gboardTaps: () => string[][]
  /** Whether a dash `dashArrives` held until the first dump after its tap landed there, with the error. */
  var lateDashLanded: () => boolean
  /** The device and page calls of the call, in order: dumps, taps, screenshots, reads, clock reads and logcat. */
  var deviceIO: () => string[]
}
globalThis.fakeGboard = (options) => {
  globalThis.fakeChrome()
  Object.assign(gboard, {
    lang: options.lang,
    layout: 'letters',
    previousLayout: 'letters',
    attempt: 0,
    taps: [],
    candidate: options.candidate,
    candidateFrom: options.candidateFrom ?? 1,
    candidateAfterSpace: options.candidateAfterSpace ?? false,
    staleDumps: 0,
    staleDumpsPerSwitch: options.staleDumpsPerSwitch ?? 0,
    staleSuggestion: options.staleSuggestion ?? false,
    partialDumps: options.partialDumps ?? 0,
    controlsOnlyDumps: options.controlsOnlyDumps ?? 0,
    noDash: options.noDash ?? false,
    noDigitsKey: options.noDigitsKey ?? false,
    symbolsOpenEmoji: options.symbolsOpenEmoji ?? false,
    partialPadDumps: options.partialPadDumps ?? 0,
    rejectFirst: options.rejectFirst,
    rejectedLandsLate: options.rejectedLandsLate ?? false,
    lateTap: undefined,
    texts: options.texts ?? [],
    page: options.page,
    errorsFrom: options.errorsFrom,
    errorsAttempt: options.errorsAttempt ?? 1,
    error: options.error ?? ERROR,
    stateReads: 0,
    loseKeyboardAfter: options.loseKeyboardAfter,
    missingKeyboard: false,
    hangDumpAfter: options.hangDumpAfter,
    hangingDump: false,
    hangFirstDump: options.hangFirstDump ?? false,
    hangScreenshotAfter: options.hangScreenshotAfter,
    hangingScreenshot: false,
    hangReads: options.hangReads ?? false,
    hung: false,
    dropReadsAfter: options.dropReadsAfter,
    droppedReads: false,
    dashArrives: options.dashArrives,
    readsSinceDash: undefined,
    dashLanded: false,
    loadingReads:
      options.loadingReads === undefined
        ? undefined
        : {...options.loadingReads},
    spaceStrip: options.spaceStrip,
    spaceLog: options.spaceLog ?? 'whole',
    restarts: options.restarts ?? [],
    clock: options.clock ?? 'answers',
    clockError: options.clockError ?? 0,
    lastDump: options.lastDump ?? 'answers',
    slowScreenshot: options.slowScreenshot,
    partialStripDumps: options.partialStripDumps ?? [],
    unparsableStripDumps: options.unparsableStripDumps ?? [],
    io: [],
    restartLines: [],
    dumpsAfterTap: 0,
    mainFrom: undefined,
    firstTapAt: undefined,
    lastDumpAt: 0,
  })
}
globalThis.gboardTaps = () => gboard.taps
globalThis.lateDashLanded = () => gboard.dashLanded
globalThis.deviceIO = () => gboard.io
