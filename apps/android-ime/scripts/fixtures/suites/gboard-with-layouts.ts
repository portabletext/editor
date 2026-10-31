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
}))

const fixture = (name: string) =>
  readFileSync(new URL(`../${name}`, import.meta.url), 'utf8')
const letters = {en: fixture('en-keyboard.xml'), ja: fixture('ja-keyboard.xml')}
const symbols = fixture('en-symbols.xml')
const alphabet = fixture('ja-alphabet.xml')
const emoji = fixture('ja-emoji.xml')
const numbers = fixture('ja-numbers.xml')
const richSymbols = fixture('ja-rich-symbols.xml')

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
  const xml = letters[gboard.lang]
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

vi.mock(import('../../lib/adb.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  adb: async (args: string[]) =>
    args.includes('input_method') ? 'mInputShown=true' : '',
}))

vi.mock(import('../../lib/cdp.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  targets: async () => [],
  cdpEval: async (expression: string) => {
    if (expression === 'document.readyState') return 'complete'
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
      return {
        text: gboard.texts[gboard.attempt - 1] ?? '',
        events: [],
        errors:
          gboard.attempt === gboard.errorsAttempt &&
          gboard.errorsFrom !== undefined &&
          gboard.stateReads >= gboard.errorsFrom
            ? [gboard.error]
            : [],
        blocks: 1,
        ...gboard.page?.(gboard.taps.at(-1) ?? []),
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
    screenshot: async () => {
      landLateTap()
      if (gboard.hangingScreenshot) {
        gboard.hangingScreenshot = false
        gboard.hung = true
        return whenAborted(currentSignal()!)
      }
    },
    dumpHierarchy: async () => {
      landLateTap()
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
      return dump()
    },
    click: async (x: number, y: number) => {
      const label = labelAt(x, y)
      if (label === undefined) return
      if (label === gboard.rejectFirst) {
        gboard.rejectFirst = undefined
        if (gboard.rejectedLandsLate) gboard.lateTap = label
        throw new original.TapNotInjectedError(
          `tap at ${x},${y} was not injected`,
        )
      }
      gboard.taps.at(-1)?.push(label)
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
  }) => void
  /** The labels of the keys tapped in each attempt. */
  var gboardTaps: () => string[][]
}
globalThis.fakeGboard = (options) => {
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
  })
}
globalThis.gboardTaps = () => gboard.taps
