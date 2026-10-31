// One typing attempt on the device: open the page in Chrome, raise Gboard, tap each word's keys and its
// candidate, and read the page's text and events back over CDP.

import {writeFileSync} from 'node:fs'
import {adb, ProcessNotStoppedError, unstoppedProcesses} from './adb.ts'
import {CHROME_ADB_SECONDS} from './budget.ts'
import {cdpEval, CDP_PORT, PageExceptionError, setCurrentUrl, targets} from './cdp.ts'
import {packageKeys, parseXml} from './hierarchy.ts'
import type {Device} from './u2.ts'
import {currentSignal, errorRepr, phase, pyLen, pyRepr, pySorted, pyStr, sleep, throwIfAborted} from './util.ts'

export const OUT = 'out'

const GBOARD = 'com.google.android.inputmethod.latin'
const CHROME = 'com.android.chrome'
const PORT = 8765

type Keys = Map<string, [number, number]>
type PageEvent = {type: string; [key: string]: unknown}
/** A decoration that mounted: its text then, whether a composition was open, and its text now, `null` once it unmounted. */
type Decorated = {text: string; composing: boolean; live: string | null}
/** One decoration range the page handed the editor: the text it covers and whether a composition was open. */
type CommittedRange = {text: string; composing: boolean}
/** A selection point as the editor gives it. */
type SelectionPoint = {path: unknown[]; offset: number}
type PageState = {
  text: string | null
  events: PageEvent[]
  errors?: string[]
  blocks?: number | null
  decorated?: Decorated[]
  /**
   * The decoration ranges of each React commit that handed the editor new ones, logged in that commit
   * before its DOM mutations, never for a render React abandoned or superseded, up to the page's first
   * error.
   */
  committed?: CommittedRange[][]
  /** Each `delete.text` the editor performed, logged before the deletion, up to the page's first error. */
  deletions?: Array<{at: {anchor: SelectionPoint; focus: SelectionPoint}}>
  [key: string]: unknown
}

export type Word = {
  /**
   * The keys to tap, one character each. A character the starting layout has no key for, `-` for
   * instance, is tapped on the Gboard layout that has a key labelled with it, and ` ` taps the space key.
   * A word ending in ` ` is committed by that space. `''` with `enter` taps only Enter.
   */
  letters: string
  /** Tap Enter after the word is committed. */
  enter?: true
  /**
   * What the page must show for the word to reach the case's mechanism. A word that does not show it ends
   * the attempt on a driver fault. Without a `crash` that fault is retried like any other. In a call with a
   * `crash` that already sent input it ends the call inconclusive, or on a fault with the page's errors
   * when the page recorded any by then, and is never retried. Before any input, as for the prefilled
   * text checked before Enter, it is retried after a clean read of the page. A call that names its `crash` needs it on
   * every word.
   */
  expect?: Evidence
} & (
  | {
      /** The conversion candidate to tap after the letters. Space commits the word when Gboard does not offer it. */
      candidate?: string
      required?: never
    }
  | {
      candidate: string
      /** Gboard must offer `candidate`. When it does not, the attempt ends on a driver fault instead of tapping Space. */
      required: true
    }
)

/**
 * A word's evidence, read from the page's state once its letters are tapped and once it is committed.
 * Every log the page keeps ends at its first error. The committed decoration ranges are logged in the
 * commit that hands them to the editor, before that commit's DOM mutations and before the editor changes
 * the DOM for them, and a `delete.text` before the editor deletes, so both logs hold a crash's trigger.
 */
export type Evidence = {
  /**
   * The one step of the call whose page reaction the case is about: `letters` while the letters are
   * tapped, `commit` while the candidate, Space or Enter commits the word. Only an error that first shows
   * after this step counts as the case's crash, and only with this step's evidence from the committed
   * ranges and the deletions met. An error at any other step is a fault that is never retried.
   */
  trigger?: 'letters' | 'commit'
  /** The block's text once the letters are tapped. */
  text?: string
  /** A composition is open once the letters are tapped. */
  composing?: true
  /**
   * A commit while the letters were tapped handed the editor one more range over this text than the last
   * commit before the word, inside the composition with `composing`.
   */
  committed?: string
  /** A decoration over this text mounted while the letters were tapped, inside the composition with `composing`. */
  decorated?: string
  /**
   * A commit after the read once the letters were tapped handed the editor new ranges, and the last
   * commit's ranges, the last before an error, hold one more range over this text than the last commit
   * before that read.
   */
  committedOnCommit?: string
  /**
   * A commit after the read once the letters were tapped handed the editor new ranges, and the last
   * commit's ranges, the last before an error, hold no more ranges over this text than the last commit
   * before the word.
   */
  droppedOnCommit?: string
  /**
   * After the read once the letters were tapped, the editor performed a `delete.text` from offset 0 to
   * this text's length in one span, which with `text` equal to it is the whole text.
   */
  deletedOnCommit?: string
  /** Without an error, a decoration over this text mounted by the read after the commit. */
  decoratedOnCommit?: string
  /**
   * Without an error, after the commit no more decorations that mounted over `decorated` are still mounted
   * than the last commit holds ranges over it, which are those of earlier words committed as kana, and no
   * mounted decoration wraps the word's `candidate`.
   */
  removedOnCommit?: true
  /** Without an error, the block's text after the commit. */
  textOnCommit?: string
  /** Without an error, the number of blocks after the commit. */
  blocksOnCommit?: number
}

/** The lengths of the page's logs at one read. */
export type LogLengths = {decorated: number; committed: number; deletions: number}

export type TypeOnDeviceOptions = {
  /** `ja` switches Gboard to its Japanese QWERTY layout before typing. */
  lang: 'ja' | 'en'
  /** `editor.html` can carry query parameters, for example `editor.html?decorate=you`. */
  page: 'plain.html' | 'editor.html' | `editor.html?${string}`
  /** Text the block holds before typing, `''` for an empty block. */
  prefix: string
  words: Word[]
  /**
   * The page error the case is about. Any other error the page records ends the call on a fault that is
   * never retried, so it cannot pass for the case's crash.
   */
  crash?: RegExp
}

export type Typed = {
  /** The text after typing, from `window.__state()`. */
  text: string | null
  /** How each word was committed: its candidate or `space`. */
  picked: string[]
  compositionstart: number
  /** The number of `compositionupdate` events. Always set, like `errors`. */
  compositionupdate?: number
  /** `compositionstart` events that arrived while an earlier composition was still open. */
  nested: number
  /** `compositionstart` events while each word was typed and committed. */
  compositionstartPerWord: number[]
  /**
   * Errors the page recorded, `[]` when it records none. Optional only so that fake results written
   * before the field existed still type-check: `typeInChrome` always sets it.
   */
  errors?: string[]
  /** The number of blocks, `null` when the page does not report it. Always set, like `errors`. */
  blocks?: number | null
  /**
   * The page's text and blocks once each word's letters were tapped, before its candidate, Space or Enter.
   * Always set, like `errors`.
   */
  beforeCommit?: Array<{text: string | null; blocks: number | null}>
  /**
   * The decorations that mounted while each word was typed and committed, with their text and whether a
   * composition was open, `[]` for a page that records none. Always set, like `errors`.
   */
  decoratedPerWord?: Decorated[][]
  /**
   * The decoration ranges the page's commits handed the editor, in order, a commit that handed the same
   * ranges as the one before it left out, up to the page's first error. `[]` for a page that logs none.
   * Always set, like `errors`.
   */
  committedRanges?: CommittedRange[][]
}

/**
 * The page errors one `typeOnDevice` call has seen, kept outside its attempts. A read that shows errors
 * writes them here before any other device call, so no later fault, timeout or retry can drop them.
 */
export type PageErrorRecord = {
  errors: string[]
  /** The result or fault the attempt classified from those errors, once it has one. */
  outcome?: {typed: Typed} | {error: FaultWithPageErrors}
}

/** What a `typeOnDevice` call has sent towards the page, kept outside its attempts. */
export type CallInput = {
  /**
   * Set immediately before the call's first tap on a key that types, a character, a candidate, Space or
   * Enter, is issued, so a tap whose transport failed counts as sent. The taps that focus the field and
   * switch Gboard's language or layout before the first character type nothing and leave it unset.
   */
  inputSent: boolean
}

/** What the attempt leaves to run after its outcome, outside its own time bound. */
export type AttemptCleanup = {
  /**
   * Read the page once after the attempt failed with `fault`, set once its page loaded. Returns the result
   * the read shows, throws the fault the read classifies, or throws `fault` itself when the page recorded
   * no error. Any other rejection means the page could not be read.
   */
  readAfterFault?: (fault: unknown) => Promise<Typed>
  /** Tap Gboard back to the layout typing started on, set once the attempt has a device. */
  returnToStart?: () => Promise<void>
}

/** Open the page in Chrome, type `words` on Gboard and read back what the page holds. */
export async function typeInChrome(
  name: string,
  {lang, page, prefix, words, crash}: TypeOnDeviceOptions,
  connect: () => Promise<Device>,
  pageErrors: PageErrorRecord,
  cleanup: AttemptCleanup,
  input: CallInput,
): Promise<Typed> {
  const result: Record<string, unknown> = {page, prefix, words}
  await adb(['reverse', `tcp:${PORT}`, `tcp:${PORT}`])
  await adb(['forward', `tcp:${CDP_PORT}`, 'localabstract:chrome_devtools_remote'])
  phase('adb reverse/forward set')

  let device = await connect()
  device.waitTimeout = 10
  // Each attempt starts a fresh UiAutomator server, and its first call can land before it listens.
  let info: Record<string, unknown> | undefined
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      info = await device.info()
      break
    } catch (error) {
      throwIfAborted()
      phase(`uiautomator2 not ready (${attempt + 1}): ${errorRepr(error)}`)
      await sleep(2)
      device = await connect()
    }
  }
  info ??= await device.info()
  phase(`uiautomator2 up: ${pyStr(info.productName)} ${pyRepr(await device.windowSize()).replace(/^\[(.*)\]$/, '($1)')}`)

  const url = pageUrl(page, prefix)
  setCurrentUrl(url)
  await openInChrome(url)
  phase('chrome launched')
  // Chrome draws a first-run or promo screen some time after its activity starts, and nothing signals
  // that none is coming.
  await sleep(4)
  await dismissChromeScreens(device)
  phase(`foreground: ${pyRepr(await device.appCurrent())}`)

  let lastError: unknown
  let loaded = false
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      if ((await cdpEval('document.readyState')) === 'complete' && (await cdpEval('typeof window.__state')) === 'function') {
        loaded = true
        break
      }
    } catch (error) {
      throwIfAborted()
      if (error instanceof PageExceptionError) throw error
      lastError = error
      phase(`cdp not ready: ${errorRepr(error)}`)
      try {
        const pageTargets = await targets(5)
        phase('targets: ' + pageTargets.map((target) => `${pyStr(target.type)} ${pyStr(target.url)} attached=${pyRepr(target.attached)}`).join('; '))
      } catch (targetsError) {
        throwIfAborted()
        phase(`targets unavailable: ${errorRepr(targetsError)}`)
      }
    }
    await sleep(1)
  }
  if (!loaded) throw new Error(`page never loaded over CDP: ${lastError === undefined ? 'None' : errorRepr(lastError)}`)
  phase(`page loaded: ${pyStr(await cdpEval('location.href'))}`)

  const progress: Progress = {picked: [], beforeCommit: [], wordEnds: [], decoratedEnds: [], logEnds: [], started: 0, pageErrors, input, stopOnErrors: crash !== undefined, unread: undefined}
  const layout: Layout = {lang, home: true}
  const typingDevice = device
  cleanup.returnToStart = () => returnToStart(typingDevice, layout)
  const outcome = (state: PageState, fault: unknown): Typed => {
    result.state = state
    // A word typing stopped in ends at the read that showed the page's errors.
    const wordEnds = progress.started > progress.wordEnds.length ? [...progress.wordEnds, state.events.length] : progress.wordEnds
    const decorated = state.decorated ?? []
    const decoratedEnds =
      progress.started > progress.decoratedEnds.length ? [...progress.decoratedEnds, decorated.length] : progress.decoratedEnds
    const typed: Typed = {
      text: state.text,
      picked: progress.picked,
      compositionstart: state.events.filter((event) => event.type === 'compositionstart').length,
      compositionupdate: state.events.filter((event) => event.type === 'compositionupdate').length,
      // The first-character bug's signal: a compositionstart that arrives while an earlier composition is still open.
      nested: nestedCompositionstart(state.events),
      compositionstartPerWord: compositionstartPerWord(state.events, wordEnds),
      errors: state.errors ?? [],
      blocks: state.blocks ?? null,
      beforeCommit: progress.beforeCommit,
      decoratedPerWord: decoratedPerWord(decorated, decoratedEnds),
      committedRanges: distinctRanges(state.committed ?? []),
    }
    result.typed = typed
    if (fault !== undefined) result.fault = errorRepr(fault)
    writeFileSync(`${OUT}/${name}.json`, JSON.stringify(result, null, 2))
    phase(`typed ${pyRepr(state.text)} picked=${progress.picked.join('/')}`)
    if (fault !== undefined) throw classified(pageErrors, new FaultWithPageErrors(fault, typed.errors!))
    const otherErrors = crash === undefined ? [] : typed.errors!.filter((error) => !crash.test(error))
    if (otherErrors.length > 0)
      throw classified(pageErrors, new FaultWithPageErrors(new Error(`no error but the case's crash ${crash} was expected`), typed.errors!))
    // An error the page recorded is a crash case's result, so no fault classified from the text may retry it.
    if (crash !== undefined && typed.errors!.length > 0) {
      pageErrors.outcome = {typed}
      return typed
    }
    // Besides a word's opt-in `expect`, the one place the driver reads the page's text to classify a fault.
    // A digit neither the prefix nor the letters hold can only come from a tap that landed as a long press
    // on a key's number hint. An editor that produced one every time would fault twice and fail the test, so
    // a retry can only hide an editor that produces it intermittently.
    const digit = unexpectedDigit(state.text, prefix + words.map((word) => word.letters).join(''))
    if (digit !== undefined) throw new Error(`mistap: digit ${digit} in typed text ${pyRepr(state.text)} that neither the prefix nor the letters hold`)
    return typed
  }
  cleanup.readAfterFault = async (fault) => {
    const unread = progress.unread
    const state = await readState(result, 'afterFault', pageErrors)
    if ((state.errors ?? []).length === 0) throw fault
    phase(`the page recorded errors by the read after the fault: ${errorRepr(fault)}`)
    // The read stands in for the one the step in progress was due to take after its last tap. The page's
    // logs end at its first error, so they read now as they would have then.
    if (unread === undefined) return outcome(state, fault)
    if (unread.stage === 'commit' && progress.picked.length < unread.position) progress.picked.push(unread.picked)
    const unmet = unmetEvidence(unread.word, unread.stage, state, unread.marks)
    if (unmet !== undefined) return outcome(state, new Error(`word ${unread.position} did not reach the case's mechanism: ${unmet}`))
    result.fault = errorRepr(fault)
    return outcome(state, undefined)
  }
  let state: PageState
  try {
    await raiseKeyboard(device, name, lang, url, result)
    state = await typeWords(device, name, result, layout, words, progress)
  } catch (error) {
    if (!(error instanceof PageRecordedErrors)) throw error
    state = error.state
  }
  return outcome(state, undefined)
}

function classified(pageErrors: PageErrorRecord, error: FaultWithPageErrors): FaultWithPageErrors {
  pageErrors.outcome = {error}
  return error
}

/** Save the screen and its accessibility dump after a failed attempt, over a fresh uiautomator2 connection. */
export async function dumpFailure(name: string, connect: () => Promise<Device>): Promise<void> {
  phase('FAILED, dumping screen')
  // `typeInChrome` never hands its device back on failure.
  let device: Device
  try {
    device = await connect()
  } catch (error) {
    throwIfAborted()
    console.log(`u2 connect for dump failed: ${errorRepr(error)}`)
    return
  }
  try {
    writeFileSync(`${OUT}/${name}-fail.xml`, await device.dumpHierarchy())
    await device.screenshot(`${OUT}/${name}-fail`)
  } catch (error) {
    throwIfAborted()
    console.log(`dump failed: ${errorRepr(error)}`)
  }
}

export async function closeChrome(): Promise<void> {
  await adb(['shell', 'am', 'force-stop', CHROME], CHROME_ADB_SECONDS).catch((error: unknown) => {
    throwIfAborted()
    if (error instanceof ProcessNotStoppedError) throw error
    phase(`force-stop chrome failed: ${errorRepr(error)}`)
  })
}

/** Delete Chrome's saved tabs, so the next test's Chrome does not restore this test's page. */
export async function clearChromeTabs(): Promise<void> {
  await adb(['shell', 'rm', '-rf', '/data/data/com.android.chrome/app_tabs'], CHROME_ADB_SECONDS).catch((error: unknown) => {
    throwIfAborted()
    if (error instanceof ProcessNotStoppedError) throw error
    phase(`clearing chrome tabs failed: ${errorRepr(error)}`)
  })
}

/** Count compositionstart events that arrive while an earlier composition is still open. */
export function nestedCompositionstart(events: PageEvent[]): number {
  let nested = 0
  let open = false
  for (const event of events) {
    if (event.type === 'compositionstart') {
      if (open) nested += 1
      open = true
    } else if (event.type === 'compositionend') {
      open = false
    }
  }
  return nested
}

export function decoratedPerWord(decorated: Decorated[], wordEnds: number[]): Decorated[][] {
  return wordEnds.map((end, index) => decorated.slice(index === 0 ? 0 : wordEnds[index - 1], end))
}

/** `committed` without each entry that repeats the one before it. */
export function distinctRanges(committed: CommittedRange[][]): CommittedRange[][] {
  return committed.filter((ranges, index) => index === 0 || JSON.stringify(ranges) !== JSON.stringify(committed[index - 1]))
}

/**
 * Throw a configuration error for a word the driver cannot type as asked: a symbol needs a label from a
 * recorded dump, and a required candidate needs letters that compose and no Space after them. A call that names its `crash` gives every word an
 * `expect` and exactly one of them a `trigger`, so an error at any other step is a fault.
 */
export function checkWords(words: Word[], crash?: RegExp): void {
  if (crash !== undefined) {
    if (words.some((word) => word.expect === undefined)) throw new Error('a case with a `crash` gives every word an `expect`')
    const triggers = words.filter((word) => word.expect?.trigger !== undefined).length
    if (triggers !== 1) throw new Error(`a case with a \`crash\` names exactly one \`trigger\`, not ${triggers}`)
  }
  for (const [index, word] of words.entries()) {
    if (word.letters === '' && !word.enter) throw new Error(`word ${index + 1} has no letters and no enter`)
    const unknown = [...word.letters].find((character) => !/^[a-z ]$/i.test(character) && symbolLabels(character) === undefined)
    if (unknown !== undefined) throw new Error(`word ${index + 1} has ${pyRepr(unknown)}, whose Gboard label no recorded dump shows`)
    if (word.required && (word.letters === '' || word.letters.endsWith(' ')))
      throw new Error(
        `word ${index + 1} requires candidate ${pyRepr(word.candidate)}, but ${word.letters === '' ? 'has no letters' : 'its letters end in a space, which commits it first'}`,
      )
  }
}

/** `compositionstart` counts between consecutive event log lengths, one per word. */
export function compositionstartPerWord(events: PageEvent[], wordEnds: number[]): number[] {
  return wordEnds.map(
    (end, index) =>
      events.slice(index === 0 ? 0 : wordEnds[index - 1], end).filter((event) => event.type === 'compositionstart').length,
  )
}

/**
 * The served page's URL with `prefix` added to its query. The CDP target is found by its exact URL, so it
 * is encoded the way Chrome reports it, non-ASCII query parameters included.
 */
export function pageUrl(page: TypeOnDeviceOptions['page'], prefix: string): string {
  const url = new URL(page, `http://localhost:${PORT}/`)
  url.searchParams.set('prefix', prefix)
  return url.href
}

export function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`
}

/**
 * The first digit in `text`, ASCII or full width, that `inputs` does not hold. A digit tapped on a symbol
 * layout can come out full width on the Japanese layout, so `７` counts as held when `inputs` holds `7`.
 */
export function unexpectedDigit(text: string | null, inputs: string): string | undefined {
  const held = inputs.normalize('NFKC')
  return [...(text ?? '')].find((character) => /[0-9０-９]/.test(character) && !held.includes(character.normalize('NFKC')))
}

const JA_HINTS = ['あ', 'かな', '変換', '空白', '確定', 'ABC', '記号']

export function isJapanese(keys: Iterable<string>): boolean {
  for (const key of keys) if (JA_HINTS.some((hint) => key.includes(hint))) return true
  return false
}

export type KeyboardState = 'japanese-qwerty' | 'banner' | 'other' | 'partial'

const LETTERS = [...'abcdefghijklmnopqrstuvwxyz']
const SPACE_KEYS = ['Space', 'space', 'スペース']

/**
 * What a Gboard dump shows. A whole layout has every letter key and a space key, and anything less is a
 * dump taken mid-redraw. The new-language banner covers the keyboard, so it counts as shown on its own.
 */
export function keyboardState(keys: Keys): KeyboardState {
  if ([...keys.keys()].some((label) => label.toLowerCase().startsWith('close the new language'))) return 'banner'
  const whole = LETTERS.every((letter) => keys.has(letter) || keys.has(letter.toUpperCase())) && SPACE_KEYS.some((label) => keys.has(label))
  if (!whole) return 'partial'
  return isJapanese(keys.keys()) ? 'japanese-qwerty' : 'other'
}

export async function openInChrome(url: string): Promise<void> {
  // `adb shell` joins its arguments into one device shell command, where an unquoted `&` between query
  // parameters would end the command.
  await adb(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', shellQuote(url), CHROME])
}

async function waitForChrome(device: Device): Promise<void> {
  for (let check = 0; check < 20; check++) {
    if ((await device.appCurrent()).package === CHROME) return
    await sleep(0.5)
  }
}

/** Wait for the tap to focus the field. A tap that misses it is followed by the forced focus anyway. */
async function waitForFieldFocus(): Promise<void> {
  for (let check = 0; check < 12; check++) {
    if ((await cdpEval('document.activeElement && document.activeElement.isContentEditable')) === true) return
    await sleep(0.25)
  }
}

// Chrome's first-run and promo screens, in case the command-line flags are ignored on this build.
const FRE_BUTTONS = ['Use without an account', 'Accept & continue', 'No thanks', 'No, thanks', 'Got it', 'Continue', 'Skip']

export async function dismissChromeScreens(device: Device): Promise<void> {
  for (let screen = 0; screen < 6; screen++) {
    let hit: string | undefined
    for (const button of FRE_BUTTONS) {
      if (await device.find({packageName: CHROME, text: button}).exists()) {
        hit = button
        break
      }
    }
    if (!hit) return
    phase(`chrome screen: tapping ${pyRepr(hit)}`)
    await device.find({packageName: CHROME, text: hit}).click()
    await waitUntilGone(device, {packageName: CHROME, text: hit})
  }
}

/** Tap Wait on any "isn't responding" dialog. It steals window focus, so the keyboard never shows. */
async function dismissAnr(device: Device): Promise<number> {
  let dismissed = 0
  for (let dialog = 0; dialog < 5; dialog++) {
    if (!(await device.find({textContains: "isn't responding"}).exists())) break
    const title = await device.find({textContains: "isn't responding"}).getText()
    await device.find({text: 'Wait'}).click()
    dismissed += 1
    phase(`dismissed ANR dialog: ${pyStr(title)}`)
    await waitUntilGone(device, {text: 'Wait'})
  }
  return dismissed
}

async function waitUntilGone(device: Device, fields: Parameters<Device['find']>[0]): Promise<void> {
  for (let check = 0; check < 10; check++) {
    if (!(await device.find(fields).exists())) return
    await sleep(0.5)
  }
}

/**
 * Map of content-desc/text -> bounds center for every node in Gboard's window.
 *
 * A dump taken mid-redraw can hold only part of the keyboard, or no Gboard nodes at all, so dump again
 * until it holds a whole layout or the new-language banner. After eight dumps, return the last one.
 */
export async function gboardKeys(device: Device): Promise<Keys> {
  return (await gboardDump(device, (keys) => keyboardState(keys) !== 'partial')).keys
}

const DUMPS = 8

/**
 * Like `gboardKeys`, with `whole` deciding when a dump holds a whole layout. Returns the dump with its keys
 * and whether `whole` accepted it.
 */
async function gboardDump(device: Device, whole: (keys: Keys, xml: string) => boolean): Promise<{xml: string; keys: Keys; accepted: boolean}> {
  let xml = ''
  let keys: Keys = new Map()
  for (let attempt = 0; attempt < DUMPS; attempt++) {
    xml = await device.dumpHierarchy()
    keys = packageKeys(xml, GBOARD)
    if (whole(keys, xml)) return {xml, keys, accepted: true}
    phase(`a11y dump incomplete, ${keys.size} Gboard nodes (attempt ${attempt + 1}), retrying`)
    await sleep(1.5)
  }
  return {xml, keys, accepted: false}
}

/** Wait until Gboard shows `wanted` after a tap that switches its layout. `ensureJapanese` checks the result. */
async function waitForKeyboardState(device: Device, wanted: KeyboardState): Promise<void> {
  for (let check = 0; check < 10; check++) {
    if (keyboardState(await gboardKeys(device)) === wanted) return
    await sleep(0.5)
  }
}

async function tapKey(device: Device, label: string, input: CallInput): Promise<void> {
  const keys = await gboardKeys(device)
  for (const candidate of [label, label.toUpperCase()]) {
    const center = keys.get(candidate)
    if (center) {
      await tapInput(device, input, center)
      // Paces taps at a typist's speed. Gboard gives no signal that it has handled a tap, and the page only
      // sees the taps that produce text.
      await sleep(0.4)
      return
    }
  }
  throw new Error(`no Gboard node labelled ${pyRepr(label)}, labels: ${pyRepr(pySorted(keys.keys()).slice(0, 80))}`)
}

/**
 * Gboard opens on English. Tap its language key until the Japanese layout shows. `beforeSwitch` runs
 * immediately before each tap or swipe that switches the language, after the reads that decided on it.
 */
export async function ensureJapanese(device: Device, name: string, beforeSwitch?: () => Promise<void>): Promise<void> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const keys = await gboardKeys(device)
    if (isJapanese(keys.keys())) {
      if (!keys.has('k') && !keys.has('K')) throw new Error(`japanese layout is not romaji QWERTY, labels ${pyRepr(pySorted(keys.keys()).slice(0, 60))}`)
      phase(`japanese layout active after ${attempt} switches`)
      return
    }
    writeFileSync(`${OUT}/${name}-lang-${attempt}.xml`, await device.dumpHierarchy())
    // Gboard v15 shows a "Japanese is now installed" banner over the keyboard. Its text mentions the
    // globe key, so close it first and only ever tap the language key itself.
    const banner = [...keys.keys()].filter((label) => label.toLowerCase().startsWith('close the new language'))
    if (banner.length) {
      phase('closing the new language banner')
      await device.click(...keys.get(banner[0]!)!)
      await waitForKeyboardState(device, 'other')
      continue
    }
    const languageKeys = [...keys.keys()].filter((label) => /^(next language|switch to|globe)/i.test(label))
    phase(`not japanese yet, language keys ${pyRepr(languageKeys)}, labels ${pyRepr(pySorted(keys.keys()).slice(0, 60))}`)
    if (languageKeys.length) {
      if (beforeSwitch) await beforeSwitch()
      await device.click(...keys.get(languageKeys[0]!)!)
    } else {
      // The space bar cycles languages on a long swipe, and long-press opens the picker.
      const space = keys.get('Space') ?? keys.get('space')
      if (!space) break
      if (beforeSwitch) await beforeSwitch()
      await device.swipe(space[0] - 150, space[1], space[0] + 150, space[1], 0.3)
    }
    await waitForKeyboardState(device, 'japanese-qwerty')
  }
  throw new Error('could not switch Gboard to Japanese')
}

/** Tap the page's field until Gboard shows, and switch it to Japanese for `ja`. */
export async function raiseKeyboard(
  device: Device,
  name: string,
  lang: TypeOnDeviceOptions['lang'],
  url: string,
  result: Record<string, unknown>,
): Promise<void> {
  await dismissAnr(device)
  phase(`before field lookup: ${pyRepr(await device.appCurrent())}`)
  await device.screenshot(`${OUT}/${name}-loaded`)
  if ((await device.appCurrent()).package !== CHROME) {
    await openInChrome(url)
    await waitForChrome(device)
    phase(`re-foregrounded: ${pyRepr(await device.appCurrent())}`)
  }
  // Chrome exposes the contenteditable as an EditText. Tapping it focuses it and raises Gboard.
  // Web content is not reliably in the UiAutomator tree, so locate the field through the page and tap it on screen.
  const field = (await cdpEval(
    "(() => { const field = document.querySelector('[contenteditable]'); field.style.minHeight = '50vh'; const rect = field.getBoundingClientRect(); return {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, devicePixelRatio, innerHeight, screenHeight: screen.height}; })()",
  )) as {x: number; y: number; devicePixelRatio: number; innerHeight: number; screenHeight: number}
  const [screenWidth, screenHeight] = await device.windowSize()
  // Chrome's content area starts below the status bar and toolbar, so derive its offset from the screen/viewport difference.
  const offset = (field.screenHeight - field.innerHeight) * field.devicePixelRatio
  const tapX = Math.trunc(field.x * field.devicePixelRatio)
  const tapY = Math.trunc(field.y * field.devicePixelRatio + offset)
  phase(`field rect ${pyRepr(field)}, tapping ${tapX},${tapY} on ${screenWidth}x${screenHeight}`)
  await device.click(tapX, tapY)
  await waitForFieldFocus()
  await cdpEval(
    "(() => { const field = document.querySelector('[contenteditable]'); field.focus(); const range = document.createRange(); range.selectNodeContents(field); range.collapse(false); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); })()",
  )
  phase(`field focused: activeElement=${pyRepr(await cdpEval('document.activeElement && document.activeElement.isContentEditable'))}`)
  let shown = false
  let inputMethodDump = ''
  for (let tap = 0; tap < 4; tap++) {
    for (let check = 0; check < 6; check++) {
      inputMethodDump = await adb(['shell', 'dumpsys', 'input_method'])
      shown = inputMethodDump.includes('mInputShown=true') || inputMethodDump.includes('mIsInputViewShown=true')
      if (shown) break
      await sleep(1)
    }
    if (shown) break
    phase(`keyboard not shown after tap ${tap + 1}, foreground ${pyRepr(await device.appCurrent())}, tapping again`)
    await dismissAnr(device)
    if ((await device.appCurrent()).package !== CHROME) {
      await openInChrome(url)
      await waitForChrome(device)
    }
    await device.click(tapX, tapY)
  }
  const focus = (await adb(['shell', 'dumpsys', 'window']))
    .split(/\r?\n/)
    .filter((line) => line.includes('mCurrentFocus') || line.includes('mInputMethodWindow'))
    .map((line) => line.trim())
  phase(`ime shown=${pyRepr(shown)}, windows: ${pyRepr(focus)}`)
  phase(
    `gboard in a11y tree: ${pyRepr(await device.find({packageName: GBOARD}).exists())}, chrome in a11y tree: ${pyRepr(await device.find({packageName: CHROME}).exists())}`,
  )
  if (!shown) {
    writeFileSync(`${OUT}/${name}-ims.txt`, inputMethodDump)
    throw new Error('Gboard window did not appear')
  }
  phase('keyboard visible')
  // The input method window shows before Gboard has drawn its keys.
  await gboardKeys(device)

  writeFileSync(`${OUT}/${name}-keyboard.xml`, await device.dumpHierarchy())
  await device.screenshot(`${OUT}/${name}-keyboard`)
  if (lang === 'ja') await ensureJapanese(device, name)
  const labels = pySorted((await gboardKeys(device)).keys())
  result.gboard_labels = labels
  phase(`keys found: ${labels.length} labels, sample ${pyRepr(labels.slice(0, 40))}`)
}

/** What `typeWords` got through, kept when an error or a fault stops it. */
type Progress = {
  picked: string[]
  beforeCommit: Array<{text: string | null; blocks: number | null}>
  /** The page's event log length after each committed word. */
  wordEnds: number[]
  /** The page's `decorated` log length after each committed word. */
  decoratedEnds: number[]
  /** The lengths of the page's logs after each committed word. */
  logEnds: LogLengths[]
  /** The words typing started on. */
  started: number
  pageErrors: PageErrorRecord
  input: CallInput
  /**
   * Whether an error the page records stops typing, in a case with a `crash`. Any other call types every
   * word and returns the errors with its result.
   */
  stopOnErrors: boolean
  /** The step whose last tap was sent and whose read of the page has not returned yet. */
  unread:
    | {word: Word; position: number; stage: 'letters'; marks: EvidenceMarks}
    | {word: Word; position: number; stage: 'commit'; marks: EvidenceMarks; picked: string}
    | undefined
}

/** Type every word and return the page's state after the last. In a case with a `crash`, a state that holds errors stops it. */
async function typeWords(
  device: Device,
  name: string,
  result: Record<string, unknown>,
  layout: Layout,
  words: Word[],
  progress: Progress,
): Promise<PageState> {
  let marks: EvidenceMarks | undefined
  for (const [index, word] of words.entries()) {
    progress.started = index + 1
    const typed = await typeWord(device, name, result, layout, word, index + 1, progress)
    progress.picked.push(typed.picked)
    marks = typed.marks
    const after = await readState(result, `after${index + 1}`, progress.pageErrors)
    progress.unread = undefined
    progress.wordEnds.push(after.events.length)
    progress.decoratedEnds.push((after.decorated ?? []).length)
    progress.logEnds.push(logLengths(after))
    throwOnUnmetEvidence(word, 'commit', after, marks, index + 1)
    if (progress.stopOnErrors) throwOnErrors(after)
  }
  const state = await readState(result, 'state', progress.pageErrors)
  // Nothing is tapped after the last word's commit, so an error this read shows first came with it.
  const last = words.at(-1)
  if (last !== undefined && marks !== undefined) throwOnUnmetEvidence(last, 'commit', state, marks, words.length)
  if (progress.stopOnErrors) throwOnErrors(state)
  return state
}

function logLengths(state: PageState): LogLengths {
  return {
    decorated: (state.decorated ?? []).length,
    committed: (state.committed ?? []).length,
    deletions: (state.deletions ?? []).length,
  }
}

async function readState(result: Record<string, unknown>, key: string, pageErrors: PageErrorRecord): Promise<PageState> {
  const state = recordErrors(pageErrors, (await cdpEval('window.__state()')) as PageState)
  result[key] = state
  return state
}

function recordErrors(pageErrors: PageErrorRecord, state: PageState): PageState {
  if ((state.errors ?? []).length > 0) pageErrors.errors = state.errors!
  return state
}

function throwOnErrors(state: PageState): void {
  if ((state.errors ?? []).length === 0) return
  phase(`the page recorded errors, typing stops: ${pyRepr(state.errors)}`)
  throw new PageRecordedErrors(state)
}

function throwOnUnmetEvidence(word: Word, stage: 'letters' | 'commit', state: PageState, marks: EvidenceMarks, position: number): void {
  const unmet = unmetEvidence(word, stage, state, marks)
  if (unmet === undefined) return
  throw new Error(`word ${position} did not reach the case's mechanism: ${unmet}`)
}

/**
 * The lengths of the page's logs when a word's letters started, and once they were tapped, before the
 * candidate, Space or Enter. `beforeCommit` is unused at the `letters` stage.
 */
export type EvidenceMarks = {start: LogLengths; beforeCommit: LogLengths}

/**
 * What `word.expect` asks of the page at `stage` and `state` does not show, `undefined` when it shows all
 * of it. An error is only the case's crash at the word's `trigger`, and there only the committed ranges
 * and the deletions count. Both logs end at the page's first error, so their last entries are the last
 * before it. The text, the event log and the mounted decorations after an error say nothing, and a crash
 * can stop a decoration from mounting or unmounting, so they count only without an error.
 */
export function unmetEvidence(word: Word, stage: 'letters' | 'commit', state: PageState, marks: EvidenceMarks): string | undefined {
  const evidence = word.expect
  if (evidence === undefined) return undefined
  const errors = state.errors ?? []
  if (errors.length > 0 && evidence.trigger !== stage)
    return `the page recorded errors at the ${stage === 'letters' ? 'letters' : 'commit'}, which is not the case's trigger: ${pyRepr(errors)}`
  const decorated = state.decorated ?? []
  const committed = state.committed ?? []
  const mounted = decorated.slice(marks.start.decorated)
  const rangesBefore = (text: string, length: number) => rangesOver(committed[length - 1] ?? [], text, false)
  if (stage === 'letters') {
    if (errors.length === 0 && evidence.text !== undefined && state.text !== evidence.text)
      return `the block read ${pyRepr(state.text)}, not ${pyRepr(evidence.text)}${codePointsApart(state.text, evidence.text)}`
    if (errors.length === 0 && evidence.composing && !compositionOpen(state.events)) return 'no composition was open'
    if (
      evidence.committed !== undefined &&
      !committed
        .slice(marks.start.committed)
        .some(
          (ranges) =>
            rangesOver(ranges, evidence.committed!, Boolean(evidence.composing)) > rangesBefore(evidence.committed!, marks.start.committed),
        )
    )
      return `no commit added a decoration range over ${pyRepr(evidence.committed)}${evidence.composing ? ' inside the composition' : ''}`
    if (
      errors.length === 0 &&
      evidence.decorated !== undefined &&
      !mounted.some((decoration) => decoration.text === evidence.decorated && (!evidence.composing || decoration.composing))
    )
      return `no decoration over ${pyRepr(evidence.decorated)} mounted${evidence.composing ? ' inside the composition' : ''}`
    return undefined
  }
  const last = committed.length > marks.beforeCommit.committed ? committed.at(-1) : undefined
  if (evidence.committedOnCommit !== undefined) {
    if (last === undefined) return "no commit handed the editor decoration ranges after the commit's tap"
    if (rangesOver(last, evidence.committedOnCommit, false) <= rangesBefore(evidence.committedOnCommit, marks.beforeCommit.committed))
      return `the last commit after the commit's tap added no decoration range over ${pyRepr(evidence.committedOnCommit)}`
  }
  if (evidence.droppedOnCommit !== undefined) {
    if (last === undefined) return "no commit handed the editor decoration ranges after the commit's tap"
    if (rangesOver(last, evidence.droppedOnCommit, false) > rangesBefore(evidence.droppedOnCommit, marks.start.committed))
      return `the last commit after the commit's tap still handed the editor a range over ${pyRepr(evidence.droppedOnCommit)}`
  }
  if (
    evidence.deletedOnCommit !== undefined &&
    !(state.deletions ?? []).slice(marks.beforeCommit.deletions).some(({at}) => coversText(at, evidence.deletedOnCommit!))
  )
    return `the editor performed no delete.text over ${pyRepr(evidence.deletedOnCommit)} after the commit's tap`
  if (errors.length > 0) return undefined
  if (evidence.decoratedOnCommit !== undefined && !mounted.some((decoration) => decoration.text === evidence.decoratedOnCommit))
    return `no decoration over ${pyRepr(evidence.decoratedOnCommit)} mounted by the commit`
  if (
    evidence.removedOnCommit &&
    (decorated.some((decoration) => decoration.live !== null && decoration.live === word.candidate) ||
      decorated.filter((decoration) => decoration.live !== null && decoration.text === evidence.decorated).length >
        rangesOver(committed.at(-1) ?? [], evidence.decorated ?? '', false))
  )
    return `a decoration over ${pyRepr(evidence.decorated)} was still mounted after the commit`
  if (evidence.textOnCommit !== undefined && state.text !== evidence.textOnCommit)
    return `the block read ${pyRepr(state.text)} after the commit, not ${pyRepr(evidence.textOnCommit)}${codePointsApart(state.text, evidence.textOnCommit)}`
  if (evidence.blocksOnCommit !== undefined && state.blocks !== evidence.blocksOnCommit)
    return `the page held ${pyRepr(state.blocks ?? null)} blocks after the commit, not ${evidence.blocksOnCommit}`
  return undefined
}

/**
 * For a text of as many characters as `expected`, both as code points: a full-width `－` or `　` that Gboard
 * committed reads much like `-` or ` `.
 */
function codePointsApart(text: string | null, expected: string): string {
  if (text === null || [...text].length !== [...expected].length) return ''
  const codePoints = (value: string) => [...value].map((character) => `U+${character.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`).join(' ')
  return `, code points ${codePoints(text)} for ${codePoints(expected)}`
}

/** Whether `at` runs from offset 0 to the length of `text` within one span, in either direction. */
function coversText(at: {anchor: SelectionPoint; focus: SelectionPoint}, text: string): boolean {
  const offsets = [at.anchor.offset, at.focus.offset].sort((left, right) => left - right)
  return JSON.stringify(at.anchor.path) === JSON.stringify(at.focus.path) && offsets[0] === 0 && offsets[1] === text.length
}

/** How many of `ranges` cover exactly `text`, inside a composition with `composing`. */
function rangesOver(ranges: CommittedRange[], text: string, composing: boolean): number {
  return ranges.filter((range) => range.text === text && (!composing || range.composing)).length
}

function compositionOpen(events: PageEvent[]): boolean {
  const last = events.findLast((event) => event.type === 'compositionstart' || event.type === 'compositionend')
  return last?.type === 'compositionstart'
}

/** The page recorded an error. It ends typing with `state` as the attempt's result, never as a fault. */
class PageRecordedErrors extends Error {
  readonly state: PageState
  constructor(state: PageState) {
    super(`the page recorded errors: ${pyRepr(state.errors)}`)
    this.state = state
  }
}

/**
 * A driver fault in a case with a `crash` after which nothing shows whether the page recorded an error:
 * the page could not be read after it, or the case had sent input that may still reach the page after a
 * read that showed none. A retry could type past an error, and a flaky device is no proof of one either,
 * so the message says it is neither.
 */
export class InconclusiveAttempt extends Error {
  override name = 'InconclusiveAttempt'
  constructor(fault: unknown, inputSent: boolean, reason: string) {
    super(
      `Inconclusive: the driver faulted ${inputSent ? 'after typing started' : 'once the page loaded'}, so this run cannot tell whether the editor crashed. This is not a crash reproduction and not an editor failure. Rerun the job. The fault: ${errorRepr(fault)}, ${reason}`,
    )
  }
}

/**
 * A driver fault after which the page showed errors. Neither the fault nor the errors are a result: a
 * retry could type past the editor's failure, and a flaky device is no proof of one.
 */
export class FaultWithPageErrors extends Error {
  override name = 'FaultWithPageErrors'
  readonly errors: string[]
  constructor(fault: unknown, errors: string[]) {
    super(`${errorRepr(fault)}, and the page recorded errors: ${pyRepr(errors)}`)
    this.errors = errors
  }
}

/**
 * Tap `word`'s letters, then its candidate when Gboard offers it, otherwise Space, then Enter when the word
 * asks for it. Returns what committed it, `enter` for a word of no letters. A required candidate that
 * Gboard does not offer ends the attempt on a driver fault.
 */
async function typeWord(
  device: Device,
  name: string,
  result: Record<string, unknown>,
  layout: Layout,
  word: Word,
  position: number,
  progress: Progress,
): Promise<{picked: string; marks: EvidenceMarks}> {
  for (const key of word.letters) await typeCharacter(device, name, layout, key, progress.input)
  phase(`typed ${word.letters} (${position})`)
  const start = progress.logEnds.at(-1) ?? {decorated: 0, committed: 0, deletions: 0}
  progress.unread = {word, position, stage: 'letters', marks: {start, beforeCommit: start}}
  await device.screenshot(`${OUT}/${name}-composing${position}`)
  const composing = await readState(result, `composing${position}`, progress.pageErrors)
  progress.unread = undefined
  progress.beforeCommit.push({text: composing.text, blocks: composing.blocks ?? null})
  const marks = {start, beforeCommit: logLengths(composing)}
  throwOnUnmetEvidence(word, 'letters', composing, marks, position)
  if (progress.stopOnErrors) throwOnErrors(composing)
  if (word.letters === '') {
    await tapEnter(device, name, result, layout, position, progress.input, () => (progress.unread = {word, position, stage: 'commit', marks, picked: 'enter'}))
    return {picked: 'enter', marks}
  }
  let picked: string
  if (word.letters.endsWith(' ')) {
    picked = 'space'
  } else {
    let keys = await gboardKeys(device)
    if (word.candidate !== undefined) {
      // Gboard v15 sometimes shows only the kana candidate first and adds the kanji a moment later.
      for (let check = 0; check < 6; check++) {
        if (keys.has(word.candidate)) break
        await sleep(0.5)
        keys = await gboardKeys(device)
      }
    }
    result[`candidates${position}`] = [...keys.keys()].filter((label) => pyLen(label) <= 6 && !isAscii(label)).slice(0, 30)
    const candidate = word.candidate === undefined ? undefined : keys.get(word.candidate)
    if (candidate) {
      progress.unread = {word, position, stage: 'commit', marks, picked: word.candidate!}
      await tapInput(device, progress.input, candidate)
      picked = word.candidate!
    } else if (word.required) {
      writeFileSync(`${OUT}/${name}.json`, JSON.stringify(result, null, 2))
      throw new Error(
        `required candidate ${pyRepr(word.candidate)} not offered for word ${position}, candidates ${pyRepr(result[`candidates${position}`])}`,
      )
    } else {
      progress.unread = {word, position, stage: 'commit', marks, picked: 'space'}
      await typeCharacter(device, name, layout, ' ', progress.input)
      picked = 'space'
    }
  }
  result[`picked${position}`] = picked
  // A word's own space committed it before the read once its letters were tapped.
  if (!word.enter) progress.unread ??= {word, position, stage: 'commit', marks, picked}
  // Gboard commits the word and resets its suggestion strip asynchronously, and neither the page nor the
  // accessibility tree signals when it is ready for the next word.
  await sleep(1.5)
  if (word.enter) {
    await tapEnter(device, name, result, layout, position, progress.input, () => (progress.unread = {word, position, stage: 'commit', marks, picked}))
    return {picked, marks}
  }
  await device.screenshot(`${OUT}/${name}-after${position}`)
  return {picked, marks}
}

/**
 * Tap Gboard's action key, labelled `Enter` on both the English and the Japanese layout, and call `tapped`
 * once the tap was sent.
 */
async function tapEnter(
  device: Device,
  name: string,
  result: Record<string, unknown>,
  layout: Layout,
  position: number,
  input: CallInput,
  tapped: () => void,
): Promise<void> {
  if (layout.home) await tapKey(device, 'Enter', input)
  else await tapOnAnyLayout(device, name, layout, ['Enter'], () => true, input)
  tapped()
  phase(`tapped Enter (${position})`)
  result[`enter${position}`] = true
  // Like a committed word, the page's reaction to Enter has no signal to wait on.
  await sleep(1.5)
  await device.screenshot(`${OUT}/${name}-after${position}`)
}

/**
 * Which layout the attempt types on, in Gboard's language `lang`. `home` is true while Gboard may still
 * show the layout it started on. `homeState` and `homeSwitch`, that layout's `keyboardState` and layout
 * key label, tell it apart once a symbol took the attempt to another layout.
 */
type Layout = {lang: TypeOnDeviceOptions['lang']; home: boolean; homeState?: KeyboardState; homeSwitch?: string | undefined}

/**
 * Tap one character of a word. While the attempt is on its starting layout, a letter and ` ` are tapped
 * the way letter-only words always were. Any other character is tapped on the layout that has a key
 * labelled with it, and once the attempt left its starting layout, a letter waits for that layout again.
 */
async function typeCharacter(device: Device, name: string, layout: Layout, character: string, input: CallInput): Promise<void> {
  if (layout.home && /^[a-z]$/i.test(character)) {
    await tapKey(device, character, input)
    return
  }
  if (layout.home && character === ' ') {
    const keys = await gboardKeys(device)
    // The Japanese layout labels its space key スペース.
    await tapKey(device, keys.has('スペース') ? 'スペース' : 'Space', input)
    return
  }
  if (character === ' ') {
    await tapOnAnyLayout(device, name, layout, SPACE_KEYS, () => true, input)
    return
  }
  if (/^[a-z]$/i.test(character)) {
    // Japanese has a layout of ASCII letters next to romaji, so a letter only counts on the starting layout.
    await tapOnAnyLayout(device, name, layout, [character, character.toUpperCase()], (keys, xml) => isHome(layout, keys, xml), input)
    return
  }
  await tapOnAnyLayout(device, name, layout, symbolLabels(character, layout.lang)!, () => true, input)
}

/** Tap a key that types, marking the call's input sent before the tap is issued. */
async function tapInput(device: Device, input: CallInput, [x, y]: [number, number]): Promise<void> {
  input.inputSent = true
  await device.click(x, y)
}

/**
 * The label of each symbol's key on Gboard's English symbol layout, as a recorded dump of that layout
 * gives it. The driver types no other symbol, since a label no dump shows would be a guess. The Japanese
 * numeric pad labels each key with its character, so `-` is also looked for as itself, never as the
 * full-width `－`, and on Japanese as `ダッシュ`, see `JAPANESE_SYMBOL_LABELS`. No label says whether its key
 * commits ASCII `-`, U+002D, so that is for the word's `expect` to check once it is tapped.
 */
const SYMBOL_LABELS: Record<string, string[]> = {
  ...Object.fromEntries([...'0123456789@#$&*",.'].map((symbol) => [symbol, [symbol]])),
  '-': ['Dash', '-'],
  _: ['underline'],
  '+': ['Plus'],
  '(': ['Left parenthesis'],
  ')': ['Right parenthesis'],
  '/': ['slash'],
  "'": ['Apostrophe'],
  ':': ['Colon'],
  ';': ['Semicolon'],
  '!': ['Exclamation'],
  '?': ['Question mark'],
}

/**
 * Labels Japanese Gboard gives a symbol's key past the English ones, from the recorded rich symbol panel
 * `記号キーボード` opens, whose dash cell is `ダッシュ`.
 */
const JAPANESE_SYMBOL_LABELS: Record<string, string[]> = {'-': ['ダッシュ']}

/**
 * The labels of the key that types `character` on a Gboard layout without letters in `lang`, `undefined`
 * for a symbol no dump shows.
 */
export function symbolLabels(character: string, lang: TypeOnDeviceOptions['lang'] = 'en'): string[] | undefined {
  const labels = SYMBOL_LABELS[character]
  if (labels === undefined || lang === 'en') return labels
  return [...labels, ...(JAPANESE_SYMBOL_LABELS[character] ?? [])]
}

const MAX_LAYOUTS = 5

/**
 * Tap the key labelled with one of `labels` on the first layout `accept` allows that shows it, tapping
 * Gboard's layout key until one does, or for a symbol on the Japanese numeric pad its `記号キーボード`.
 * Each dump is retried until it holds a whole letter layout, every letter and a space key, or passes
 * `isWholeOtherLayout`, and its `key_pos_` keys differ from the layout before the tap. A layout never
 * dumped so in eight dumps, or a label no layout shows, is a driver fault, never a stand-in key.
 */
async function tapOnAnyLayout(
  device: Device,
  name: string,
  layout: Layout,
  labels: string[],
  accept: (keys: Keys, xml: string) => boolean,
  input: CallInput,
): Promise<void> {
  const seen: string[] = []
  const symbol = labels.every((label) => !/^[a-z]$/i.test(label) && !SPACE_KEYS.includes(label) && label !== 'Enter')
  let openedBy: LayoutKey | undefined
  for (let index = 0; index < MAX_LAYOUTS; index++) {
    // After a tap on the layout key, a dump whose keys are still the last layout's was taken before Gboard
    // redrew it. Its suggestion strip and toolbar can change meanwhile, so only `key_pos_` keys count.
    const {xml, keys, accepted} = await gboardDump(
      device,
      (keys, xml) => (keyboardState(keys) !== 'partial' || isWholeOtherLayout(xml)) && seen.at(-1) !== layoutSignature(xml),
    )
    if (!accepted) {
      writeFileSync(`${OUT}/${name}-layout-${index}.xml`, xml)
      const labelsSeen = openedBy?.label === SYMBOLS_KEY ? `, its labels ${pyRepr([...symbolKeys(xml).keys()])}` : ''
      throw new Error(`Gboard showed no whole new layout in ${DUMPS} dumps${labelsSeen}, see ${OUT}/${name}-layout-${index}.xml`)
    }
    // The layout key cycles, so a layout seen before means every layout it reaches was looked at.
    if (seen.includes(layoutSignature(xml))) break
    if (layout.home) {
      layout.homeState = keyboardState(keys)
      layout.homeSwitch = layoutSwitchKey(xml)?.label
    }
    // Only keys count: a letter key's number hint is a node of its own, labelled with its digit.
    const keyCenters = symbol && keyboardState(keys) === 'partial' ? symbolKeys(xml) : layoutKeys(xml)
    const label = accept(keys, xml) ? labels.find((candidate) => keyCenters.has(candidate)) : undefined
    if (label !== undefined) {
      layout.home = isHome(layout, keys, xml)
      if (index > 0) writeFileSync(`${OUT}/${name}-layout-${index}.xml`, xml)
      await tapInput(device, input, keyCenters.get(label)!)
      await sleep(0.4)
      return
    }
    writeFileSync(`${OUT}/${name}-layout-${index}.xml`, xml)
    if (symbol && openedBy?.label === SYMBOLS_KEY)
      throw new Error(
        `no Gboard key labelled ${labels.map((label) => pyRepr(label)).join(' or ')} on the layout ${pyRepr(SYMBOLS_KEY)} opens, its labels ${pyRepr([...keyCenters.keys()])}, see ${OUT}/${name}-layout-${index}.xml`,
      )
    seen.push(layoutSignature(xml))
    const switchKey = (symbol ? symbolsKey(xml) : undefined) ?? layoutSwitchKey(xml)
    if (switchKey === undefined) break
    phase(`no key ${pyRepr(labels[0])} on this layout, tapping ${pyRepr(switchKey.label)}`)
    await device.click(...switchKey.center)
    openedBy = switchKey
    layout.home = false
  }
  const dumps = seen.map((_, index) => `${OUT}/${name}-layout-${index}.xml`)
  throw new Error(
    `no Gboard key labelled ${labels.map((label) => pyRepr(label)).join(' or ')} on any of ${seen.length} layouts, see ${dumps.join(', ')}`,
  )
}

/**
 * Tap Gboard's way back, `key_pos_back_to_prime` or else its layout key, until the layout typing started
 * on shows again. Gboard keeps its layout when Chrome restarts, so the retry or the next test would start
 * on a symbol, alphabet or emoji layout, where `ensureJapanese` finds no way to Japanese.
 */
async function returnToStart(device: Device, layout: Layout): Promise<void> {
  // A read would touch the device after the test's timeout, or next to a process that outlived SIGKILL.
  if (layout.home || currentSignal()?.aborted || unstoppedProcesses().length > 0) return
  await tapBackToStart(device, layout)
}

async function tapBackToStart(device: Device, layout: Layout): Promise<void> {
  let previous: string | undefined
  for (let index = 0; index < MAX_LAYOUTS; index++) {
    const {xml, keys, accepted} = await gboardDump(
      device,
      (keys, xml) => layoutSignature(xml) !== previous && (keyboardState(keys) !== 'partial' || layoutSwitchKey(xml) !== undefined),
    )
    if (!accepted) break
    if (isHome(layout, keys, xml)) {
      layout.home = true
      phase('Gboard is back on the layout typing started on')
      return
    }
    const wayBack = gboardKeyById(xml, 'key_pos_back_to_prime') ?? layoutSwitchKey(xml)
    if (wayBack === undefined) break
    phase(`returning to the layout typing started on, tapping ${pyRepr(wayBack.label)}`)
    previous = layoutSignature(xml)
    await device.click(...wayBack.center)
  }
  phase('Gboard did not return to the layout typing started on')
}

/**
 * Gboard's layout key: of the keys whose resource id is `key_pos_back_to_prime`,
 * `key_pos_switch_hiragana_alphabet` or starts with `key_pos_switch_to_`, the leftmost on the bottom row,
 * so a key one row up is never taken for it. It is `Symbol keyboard` on the English letters,
 * `Letter keyboard` (`back_to_prime`) on the English symbols, `アルファベット入力キーボード` on Japanese
 * QWERTY, `数字キーボード` (`switch_hiragana_alphabet`) on the Japanese alphabet layout and `かな入力キーボード`
 * (`switch_hiragana_alphabet`) on the Japanese numeric pad, all in recorded dumps. An emoji key is never one: the English `key_pos_switch_to_next_language`, `Emoji button`, and
 * the Japanese alphabet layout's `key_pos_switch_to_symbol`, `絵文字キーボード`, which opens the emoji and
 * media panel, whose category keys are `key_pos_non_prime_category_<n>`.
 */
export function layoutSwitchKey(xml: string): LayoutKey | undefined {
  let found: (LayoutKey & {left: number; bottom: number}) | undefined
  for (const node of parseXml(xml)) {
    if (node.tag !== 'node' || node.attrs.package !== GBOARD) continue
    const id = node.attrs['resource-id'] ?? ''
    const label = node.attrs['content-desc'] || node.attrs.text || ''
    if (!LAYOUT_KEY.test(id) || id.endsWith('_next_language') || EMOJI_KEYS.includes(label)) continue
    const [left, , , bottom] = boundsEdges(node.attrs.bounds ?? '')
    if (found !== undefined && (bottom < found.bottom || (bottom === found.bottom && left >= found.left))) continue
    found = {id: id.slice(id.indexOf(':id/') + 4), label, center: boundsCenter(node.attrs.bounds ?? ''), left, bottom}
  }
  return found === undefined ? undefined : {id: found.id, label: found.label, center: found.center}
}

const LAYOUT_KEY = /:id\/key_pos_(switch_to_\w+|back_to_prime|switch_hiragana_alphabet)$/
const EMOJI_KEYS = ['絵文字キーボード', 'Emoji button']

/** A Gboard key: its resource id without the package, its label and its center. */
type LayoutKey = {id: string; label: string; center: [number, number]}

/**
 * The Japanese numeric pad's `key_pos_switch_to_symbol`, `記号キーボード`, its way on to symbols, while its
 * layout key, `かな入力キーボード`, leads back to romaji.
 */
function symbolsKey(xml: string): LayoutKey | undefined {
  const key = gboardKeyById(xml, 'key_pos_switch_to_symbol')
  return key?.label === SYMBOLS_KEY ? key : undefined
}

const SYMBOLS_KEY = '記号キーボード'

/** The Gboard key whose resource id ends in `id`. */
function gboardKeyById(xml: string, id: string): LayoutKey | undefined {
  const node = parseXml(xml).find((node) => node.tag === 'node' && node.attrs.package === GBOARD && node.attrs['resource-id']?.endsWith(`:id/${id}`))
  return node === undefined ? undefined : {id, label: node.attrs['content-desc'] || node.attrs.text || '', center: boundsCenter(node.attrs.bounds ?? '')}
}

/** Label to center of every Gboard key, the nodes whose resource id starts with `key_pos_`. */
export function layoutKeys(xml: string): Keys {
  const keys: Keys = new Map()
  for (const node of parseXml(xml)) {
    if (node.tag !== 'node' || node.attrs.package !== GBOARD || !/:id\/key_pos_/.test(node.attrs['resource-id'] ?? '')) continue
    const label = node.attrs['content-desc'] || node.attrs.text
    if (!label || keys.has(label)) continue
    keys.set(label, boundsCenter(node.attrs.bounds ?? ''))
  }
  return keys
}

/**
 * `layoutKeys` without a panel's category keys, `key_pos_non_prime_category_<n>`, which switch the panel
 * and type nothing, and on the rich symbol panel `isRichSymbolPanel` accepts, with its cells. Only a symbol
 * is looked for among them, and only off the letter layouts.
 */
export function symbolKeys(xml: string): Keys {
  const keys: Keys = new Map([...layoutKeys(xml)].filter(([label]) => !categoryKeys(xml).some((category) => category.label === label)))
  if (isRichSymbolPanel(xml)) for (const cell of panelCells(xml)) if (!keys.has(cell.label)) keys.set(cell.label, cell.center)
  return keys
}

/** A panel's category keys, `key_pos_non_prime_category_<n>`, with their labels and whether each is selected. */
function categoryKeys(xml: string): Array<{label: string; selected: boolean}> {
  return parseXml(xml)
    .filter((node) => node.tag === 'node' && node.attrs.package === GBOARD && /:id\/key_pos_non_prime_category_/.test(node.attrs['resource-id'] ?? ''))
    .map((node) => ({label: node.attrs['content-desc'] || node.attrs.text || '', selected: node.attrs.selected === 'true'}))
}

/** The fewest content keys a row of a whole layout holds: `ZXCVBNM`, the shortest row of the recorded dumps. */
export const MIN_ROW_KEYS = 7

/** The keys of Gboard's Japanese numeric pad, `key_pos_ja_12keys_1` to `_12`, in its recorded dump. */
export const PAD_KEYS = 12

/** The fewest rows of cells a whole rich symbol panel shows, each of at least `MIN_ROW_KEYS` cells. */
export const MIN_PANEL_ROWS = 3

/**
 * Whether a dump of a layout without the letters is whole. Its `key_pos_` keys must hold the layout key
 * `layoutSwitchKey` finds and Delete, and then one of the three shapes of the recorded dumps:
 *
 * 1. Rows of keys: a space key, Enter, and at least `MIN_ROW_KEYS` content keys,
 *    `key_pos_<row>_<column>`, in one row, as the recorded English symbol layout's digits, a row of ten.
 * 2. The numeric pad: a space key, Enter, `かな入力キーボード`, `記号キーボード` and all `PAD_KEYS` of
 *    `key_pos_ja_12keys_<n>` labelled, as the recorded Japanese numeric pad, a grid of three keys a row.
 * 3. The rich symbol panel `記号キーボード` opens, identified by its selected category, see
 *    `isRichSymbolPanel`.
 *
 * A dump taken mid-redraw lacks some of these. Any other layout, the emoji and media panel included, is
 * never whole, so the driver faults on it before any input and saves its dump.
 */
export function isWholeOtherLayout(xml: string): boolean {
  const keys = layoutKeys(xml)
  if (layoutSwitchKey(xml) === undefined || !(keys.has('Delete') || keys.has('削除'))) return false
  const spaceAndEnter = SPACE_KEYS.some((label) => keys.has(label)) && keys.has('Enter')
  return (
    (spaceAndEnter && Math.max(0, ...contentRows(xml).values()) >= MIN_ROW_KEYS) ||
    (spaceAndEnter && keys.has('かな入力キーボード') && symbolsKey(xml) !== undefined && padKeys(xml) === PAD_KEYS) ||
    isRichSymbolPanel(xml)
  )
}

/**
 * Whether the dump is the rich symbol panel of the recorded dump of what `記号キーボード` opens: of its
 * category keys exactly one is selected, labelled exactly `リッチ記号キーボード`, and its heading's hide
 * control names that category too, its `key_pos_` keys hold `文字キーボード` and `削除`, and its cells form
 * at least `MIN_PANEL_ROWS` rows of `MIN_ROW_KEYS`. The emoji and media panel shares its category keys and
 * draws rows of cells too, so only this allowlist tells them apart, never a list of media categories.
 */
function isRichSymbolPanel(xml: string): boolean {
  const selected = categoryKeys(xml).filter((category) => category.selected)
  const keys = layoutKeys(xml)
  return (
    selected.length === 1 &&
    selected[0]!.label === RICH_SYMBOLS &&
    parseXml(xml).some((node) => node.tag === 'node' && node.attrs.package === GBOARD && node.attrs['content-desc'] === `${RICH_SYMBOLS} を非表示にする`) &&
    keys.has('文字キーボード') &&
    keys.has('削除') &&
    new Set(panelCells(xml).map((cell) => cell.top)).size >= MIN_PANEL_ROWS
  )
}

const RICH_SYMBOLS = 'リッチ記号キーボード'

/**
 * A panel's cells: its labelled, clickable Gboard nodes without a `key_pos_` id, in rows of at least
 * `MIN_ROW_KEYS`. The heading's lone labelled control is in no such row.
 */
function panelCells(xml: string): Array<{label: string; center: [number, number]; top: number}> {
  const cells: Array<{label: string; center: [number, number]; top: number}> = []
  for (const node of parseXml(xml)) {
    if (node.tag !== 'node' || node.attrs.package !== GBOARD || node.attrs.clickable !== 'true') continue
    if (/:id\/key_pos_/.test(node.attrs['resource-id'] ?? '')) continue
    const label = node.attrs['content-desc'] || node.attrs.text
    if (!label) continue
    cells.push({label, center: boundsCenter(node.attrs.bounds ?? ''), top: boundsEdges(node.attrs.bounds ?? '')[1]})
  }
  const rowSizes = new Map<number, number>()
  for (const cell of cells) rowSizes.set(cell.top, (rowSizes.get(cell.top) ?? 0) + 1)
  return cells.filter((cell) => rowSizes.get(cell.top)! >= MIN_ROW_KEYS)
}

/** The number of labelled keys of the Japanese numeric pad, `key_pos_ja_12keys_<n>`, each counted once. */
function padKeys(xml: string): number {
  const pad = new Set<string>()
  for (const node of parseXml(xml)) {
    if (node.tag !== 'node' || node.attrs.package !== GBOARD || !(node.attrs['content-desc'] || node.attrs.text)) continue
    const key = /:id\/key_pos_ja_12keys_(\d+)$/.exec(node.attrs['resource-id'] ?? '')?.[1]
    if (key !== undefined) pad.add(key)
  }
  return pad.size
}

/** The number of labelled Gboard keys in each content row, from their `key_pos_<row>_<column>` resource ids. */
function contentRows(xml: string): Map<string, number> {
  const rows = new Map<string, number>()
  for (const node of parseXml(xml)) {
    if (node.tag !== 'node' || node.attrs.package !== GBOARD || !(node.attrs['content-desc'] || node.attrs.text)) continue
    const row = /:id\/key_pos_(\d+)_\d+$/.exec(node.attrs['resource-id'] ?? '')?.[1]
    if (row !== undefined) rows.set(row, (rows.get(row) ?? 0) + 1)
  }
  return rows
}

/** A layout's identity: its `key_pos_` keys' labels, without the suggestion strip or the toolbar. */
function layoutSignature(xml: string): string {
  return pySorted(layoutKeys(xml).keys()).join('\n')
}

function boundsEdges(bounds: string): [number, number, number, number] {
  const edges = bounds.match(/-?\d+/g)?.map(Number) ?? []
  if (edges.length !== 4) throw new Error(`invalid bounds ${bounds}`)
  return edges as [number, number, number, number]
}

function boundsCenter(bounds: string): [number, number] {
  const [left, top, right, bottom] = boundsEdges(bounds)
  return [Math.floor((left + right) / 2), Math.floor((top + bottom) / 2)]
}

function isHome(layout: Layout, keys: Keys, xml: string): boolean {
  return keyboardState(keys) === layout.homeState && layoutSwitchKey(xml)?.label === layout.homeSwitch
}

function isAscii(value: string): boolean {
  return /^[\x00-\x7f]*$/.test(value)
}
