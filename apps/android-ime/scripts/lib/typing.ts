// One typing attempt on the device: open the page in Chrome, raise Gboard, tap each word's keys and its
// candidate, and read the page's text and events back over CDP.

import {writeFileSync} from 'node:fs'
import {adb, ProcessNotStoppedError} from './adb.ts'
import {CHROME_ADB_SECONDS} from './budget.ts'
import {cdpEval, CDP_PORT, PageExceptionError, setCurrentUrl, targets} from './cdp.ts'
import {packageKeys} from './hierarchy.ts'
import type {Device} from './u2.ts'
import {errorRepr, phase, pyLen, pyRepr, pySorted, pyStr, sleep, throwIfAborted} from './util.ts'

export const OUT = 'out'

const GBOARD = 'com.google.android.inputmethod.latin'
const CHROME = 'com.android.chrome'
const PORT = 8765

type Keys = Map<string, [number, number]>
type PageEvent = {type: string; [key: string]: unknown}
type PageState = {
  text: string | null
  events: PageEvent[]
  [key: string]: unknown
}

export type Word = {
  /** The keys to tap, one character each. */
  letters: string
  /** The conversion candidate to tap after the letters. Space commits the word when Gboard does not offer it. */
  candidate?: string
}

export type TypeOnDeviceOptions = {
  /** `ja` switches Gboard to its Japanese QWERTY layout before typing. */
  lang: 'ja' | 'en'
  page: 'plain.html' | 'editor.html'
  /** Text the block holds before typing, `''` for an empty block. */
  prefix: string
  words: Word[]
}

export type Typed = {
  /** The text after typing, from `window.__state()`. */
  text: string | null
  /** How each word was committed: its candidate or `space`. */
  picked: string[]
  compositionstart: number
  /** `compositionstart` events that arrived while an earlier composition was still open. */
  nested: number
  /** `compositionstart` events while each word was typed and committed. */
  compositionstartPerWord: number[]
}

/** Open the page in Chrome, type `words` on Gboard and read back what the page holds. */
export async function typeInChrome(
  name: string,
  {lang, page, prefix, words}: TypeOnDeviceOptions,
  connect: () => Promise<Device>,
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

  const url = `http://localhost:${PORT}/${page}?prefix=${encodeURIComponent(prefix)}`
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

  const wordEnds: number[] = []
  const picked: string[] = []
  for (const [index, word] of words.entries()) {
    picked.push(await typeWord(device, name, result, word, index + 1))
    const after = (await cdpEval('window.__state()')) as PageState
    result[`after${index + 1}`] = after
    wordEnds.push(after.events.length)
  }
  const state = (await cdpEval('window.__state()')) as PageState
  result.state = state
  const typed: Typed = {
    text: state.text,
    picked,
    compositionstart: state.events.filter((event) => event.type === 'compositionstart').length,
    // The first-character bug's signal: a compositionstart that arrives while an earlier composition is still open.
    nested: nestedCompositionstart(state.events),
    compositionstartPerWord: compositionstartPerWord(state.events, wordEnds),
  }
  result.typed = typed
  writeFileSync(`${OUT}/${name}.json`, JSON.stringify(result, null, 2))
  phase(`typed ${pyRepr(state.text)} picked=${picked.join('/')}`)
  // The one place the driver reads the page's text to classify a fault. A digit neither the prefix nor
  // the letters hold can only come from a tap that landed as a long press on a key's number hint. An
  // editor that produced one every time would fault twice and fail the test, so a retry can only hide an
  // editor that produces it intermittently.
  const digit = unexpectedDigit(state.text, prefix + words.map((word) => word.letters).join(''))
  if (digit !== undefined) throw new Error(`mistap: digit ${digit} in typed text ${pyRepr(state.text)} that neither the prefix nor the letters hold`)
  return typed
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

/** `compositionstart` counts between consecutive event log lengths, one per word. */
export function compositionstartPerWord(events: PageEvent[], wordEnds: number[]): number[] {
  return wordEnds.map(
    (end, index) =>
      events.slice(index === 0 ? 0 : wordEnds[index - 1], end).filter((event) => event.type === 'compositionstart').length,
  )
}

/** The first digit in `text`, ASCII or full width, that `inputs` does not hold. */
export function unexpectedDigit(text: string | null, inputs: string): string | undefined {
  return [...(text ?? '')].find((character) => /[0-9０-９]/.test(character) && !inputs.includes(character))
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

async function openInChrome(url: string): Promise<void> {
  await adb(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url, CHROME])
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

async function dismissChromeScreens(device: Device): Promise<void> {
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
async function gboardKeys(device: Device): Promise<Keys> {
  let keys: Keys = new Map()
  for (let attempt = 0; attempt < 8; attempt++) {
    keys = packageKeys(await device.dumpHierarchy(), GBOARD)
    if (keyboardState(keys) !== 'partial') return keys
    phase(`a11y dump incomplete, ${keys.size} Gboard nodes (attempt ${attempt + 1}), retrying`)
    await sleep(1.5)
  }
  return keys
}

/** Wait until Gboard shows `wanted` after a tap that switches its layout. `ensureJapanese` checks the result. */
async function waitForKeyboardState(device: Device, wanted: KeyboardState): Promise<void> {
  for (let check = 0; check < 10; check++) {
    if (keyboardState(await gboardKeys(device)) === wanted) return
    await sleep(0.5)
  }
}

async function tapKey(device: Device, label: string): Promise<void> {
  const keys = await gboardKeys(device)
  for (const candidate of [label, label.toUpperCase()]) {
    const center = keys.get(candidate)
    if (center) {
      await device.click(...center)
      // Paces taps at a typist's speed. Gboard gives no signal that it has handled a tap, and the page only
      // sees the taps that produce text.
      await sleep(0.4)
      return
    }
  }
  throw new Error(`no Gboard node labelled ${pyRepr(label)}, labels: ${pyRepr(pySorted(keys.keys()).slice(0, 80))}`)
}

/** Gboard opens on English. Tap its language key until the Japanese layout shows. */
async function ensureJapanese(device: Device, name: string): Promise<void> {
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
      await device.click(...keys.get(languageKeys[0]!)!)
    } else {
      // The space bar cycles languages on a long swipe, and long-press opens the picker.
      const space = keys.get('Space') ?? keys.get('space')
      if (!space) break
      await device.swipe(space[0] - 150, space[1], space[0] + 150, space[1], 0.3)
    }
    await waitForKeyboardState(device, 'japanese-qwerty')
  }
  throw new Error('could not switch Gboard to Japanese')
}

/** Tap `word`'s letters, then its candidate when Gboard offers it, otherwise Space. Returns what committed it. */
async function typeWord(device: Device, name: string, result: Record<string, unknown>, word: Word, position: number): Promise<string> {
  for (const key of word.letters) await tapKey(device, key)
  phase(`typed ${word.letters} (${position})`)
  await device.screenshot(`${OUT}/${name}-composing${position}`)
  result[`composing${position}`] = await cdpEval('window.__state()')
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
  let picked: string
  const candidate = word.candidate === undefined ? undefined : keys.get(word.candidate)
  if (candidate) {
    await device.click(...candidate)
    picked = word.candidate!
  } else {
    keys = await gboardKeys(device)
    // The Japanese layout labels its space key スペース.
    await tapKey(device, keys.has('スペース') ? 'スペース' : 'Space')
    picked = 'space'
  }
  result[`picked${position}`] = picked
  // Gboard commits the word and resets its suggestion strip asynchronously, and neither the page nor the
  // accessibility tree signals when it is ready for the next word.
  await sleep(1.5)
  await device.screenshot(`${OUT}/${name}-after${position}`)
  return picked
}

function isAscii(value: string): boolean {
  return /^[\x00-\x7f]*$/.test(value)
}
