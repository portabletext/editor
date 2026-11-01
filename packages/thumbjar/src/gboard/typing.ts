// One attempt on the device: open the page in Chrome, raise Gboard, drive each step on its keys, and read
// the page's text, selection and events back over CDP.

import {writeFileSync} from 'node:fs'
import {adb, ProcessNotStoppedError, shellQuote} from '../device/adb.ts'
import {CHROME_ADB_SECONDS} from '../device/budget.ts'
import {
  cdpEval,
  CDP_PORT,
  PageExceptionError,
  setCurrentUrl,
  targets,
} from '../device/cdp.ts'
import {localhostPort, prefixedPageUrl} from '../device/page-url.ts'
import type {Device} from '../device/u2.ts'
import {
  currentInspection,
  describeError,
  guardedErrorMessage,
  guardedErrorRepr,
  isInstance,
  phase,
  pyLen,
  pyRepr,
  pySorted,
  pyStr,
  sleep,
  throwIfAborted,
  UNPRINTABLE_ERROR,
} from '../device/util.ts'
import type {
  Commit,
  GraphemeSelection,
  PageEvent,
  Run,
  RunOnDeviceOptions,
  Step,
  StepRecord,
} from '../steps.ts'
import {FIELD_FOCUSED, FIELD_RECT, FOCUS_FIELD} from './field.ts'
import {packageKeys, packageNodes, type PackageNode} from './hierarchy.ts'
import {LETTERS} from './support.ts'

const GBOARD = 'com.google.android.inputmethod.latin'
const CHROME = 'com.android.chrome'

type Keys = Map<string, [number, number]>
type PageState = {
  text: string | null
  events: PageEvent[]
  [key: string]: unknown
}

/** One word to type on Gboard. */
export type Word = {
  /** The keys to tap, one character each. */
  letters: string
  /** The conversion candidate to tap after the letters. Space commits the word when Gboard does not offer it. */
  candidate?: string
}

/** What `typeOnDevice` opens and types. */
export type TypeOnDeviceOptions = {
  /**
   * The page to type into, served on the host. A `localhost` port is reversed to the device with
   * `adb reverse`. The driver sets `prefix` as its `prefix` search parameter, and the page installs
   * `window.__state` with `recordInput` from `thumbjar/page`.
   */
  url: string
  /** `ja` switches Gboard to its Japanese QWERTY layout before typing, `en` leaves it on English. */
  keyboard: 'ja' | 'en'
  /** Text the field holds before typing, `''` for an empty field. */
  prefix: string
  words: Word[]
}

/** What the page held after typing, and how Gboard composed it. */
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
  {url: pageUrl, keyboard, prefix, words}: TypeOnDeviceOptions,
  connect: () => Promise<Device>,
): Promise<Typed> {
  const result: Record<string, unknown> = {url: pageUrl, prefix, words}
  const device = await openKeyboard(
    name,
    {url: pageUrl, keyboard, prefix},
    connect,
    result,
  )
  const {picked, stepEnds, text, events} = await runSteps(
    device,
    name,
    result,
    words,
    {
      // A word is read only when the loop reaches it, so a malformed word throws after the words before it are typed.
      toStep: (word): Step => ({
        type: 'compose',
        letters: word.letters,
        commit:
          word.candidate === undefined ? 'space' : {candidate: word.candidate},
      }),
      boundaries: false,
    },
  )
  const typed: Typed = {
    text,
    picked: picked.map((commit) => commit ?? 'space'),
    compositionstart: events.filter(
      (event) => event.type === 'compositionstart',
    ).length,
    // The first-character bug's signal: a compositionstart that arrives while an earlier composition is still open.
    nested: nestedCompositionstart(events),
    compositionstartPerWord: compositionstartPerWord(events, stepEnds),
  }
  result.typed = typed
  writeFileSync(`${outDir()}/${name}.json`, JSON.stringify(result, null, 2))
  phase(`typed ${pyRepr(text)} picked=${typed.picked.join('/')}`)
  throwOnUnexpectedDigit(
    text,
    prefix + words.map((word) => word.letters).join(''),
  )
  return typed
}

/**
 * Open the page in Chrome, drive `steps` on Gboard and read back a record of each. A step that throws is
 * recorded as `failed`, the steps after it as `skipped`, and the attempt throws its error as a driver
 * fault, after passing it with the records to `onStepFailure` and writing the records to `<name>.json`.
 */
export async function runInChrome(
  name: string,
  {url: pageUrl, keyboard, prefix, steps}: RunOnDeviceOptions,
  connect: () => Promise<Device>,
  onStepFailure?: (error: unknown, records: StepRecord[]) => void,
): Promise<Run> {
  const result: Record<string, unknown> = {url: pageUrl, prefix, steps}
  const records: StepRecord[] = []
  let run: Run
  try {
    const device = await openKeyboard(
      name,
      {url: pageUrl, keyboard, prefix},
      connect,
      result,
    )
    const {text, selection, events} = await runSteps(
      device,
      name,
      result,
      steps,
      {toStep: (step) => step, records, boundaries: true},
    )
    run = {steps: records, text, selection, events}
  } catch (error) {
    if (records.length > 0) {
      onStepFailure?.(error, records)
      result.records = records
      // Serializing runs the steps' getters and `toJSON`, so a failure to write the artifact never replaces
      // the step's error or decides whether it is retried.
      try {
        writeFileSync(
          `${outDir()}/${name}.json`,
          JSON.stringify(result, null, 2),
        )
      } catch (artifactError) {
        phase(`failure artifact not written: ${describeError(artifactError)}`)
      }
    }
    throw error
  }
  result.run = run
  writeFileSync(`${outDir()}/${name}.json`, JSON.stringify(result, null, 2))
  phase(
    `ran ${pyRepr(run.text)} steps=${records.map((record) => `${record.type}:${record.status}`).join('/')}`,
  )
  throwOnUnexpectedDigit(
    run.text,
    prefix +
      steps
        .map((step) =>
          step.type === 'compose' ? (step.letters ?? step.text) : '',
        )
        .join(''),
  )
  return run
}

/**
 * A new error whose message is `error`'s, or `error` as a string when it is not an `Error`, followed by
 * one line per step of `records`, with `error` as its `cause`. When reading or converting that message
 * throws, the message starts with `UNPRINTABLE_ERROR` instead.
 */
export function withStepRecords(error: unknown, records: StepRecord[]): Error {
  const lines = records.map(
    (record, index) =>
      `  ${index + 1}. ${field(() => String(record.type))}: ${field(() => String(record.status))}${field(() => (record.reason === undefined ? '' : ` (${String(record.reason)})`), ` (${UNPRINTABLE_ERROR})`)}, textAfter ${field(() => pyRepr(record.textAfter))}`,
  )
  return new Error(
    `${guardedErrorMessage(error)}\nSteps:\n${lines.join('\n')}`,
    {cause: error},
  )
}

// Each field of a step line is converted on its own, so a field that cannot be shown never replaces the
// error or the other fields.
function field(convert: () => string, fallback = UNPRINTABLE_ERROR): string {
  try {
    return convert()
  } catch {
    return fallback
  }
}

/** Open the page in Chrome, tap its field and wait until Gboard shows the keyboard's layout. */
async function openKeyboard(
  name: string,
  {
    url: pageUrl,
    keyboard,
    prefix,
  }: Pick<RunOnDeviceOptions, 'url' | 'keyboard' | 'prefix'>,
  connect: () => Promise<Device>,
  result: Record<string, unknown>,
): Promise<Device> {
  const port = localhostPort(pageUrl)
  if (port !== undefined) {
    await adb(['reverse', `tcp:${port}`, `tcp:${port}`])
  }
  await adb([
    'forward',
    `tcp:${CDP_PORT}`,
    'localabstract:chrome_devtools_remote',
  ])
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
      phase(`uiautomator2 not ready (${attempt + 1}): ${describeError(error)}`)
      await sleep(2)
      device = await connect()
    }
  }
  info ??= await device.info()
  phase(
    `uiautomator2 up: ${pyStr(info.productName)} ${pyRepr(await device.windowSize()).replace(/^\[(.*)\]$/, '($1)')}`,
  )

  const url = prefixedPageUrl(pageUrl, prefix)
  setCurrentUrl(url)
  await openInChrome(url)
  phase('chrome launched')
  // Chrome draws a first-run or promo screen some time after its activity starts, and nothing signals
  // that none is coming.
  await sleep(4)
  await dismissChromeScreens(device)
  phase(`foreground: ${pyRepr(await device.appCurrent())}`)

  await waitForPage()
  phase(`page loaded: ${pyStr(await cdpEval('location.href'))}`)

  await dismissAnr(device)
  phase(`before field lookup: ${pyRepr(await device.appCurrent())}`)
  await device.screenshot(`${outDir()}/${name}-loaded`)
  if ((await device.appCurrent()).package !== CHROME) {
    await openInChrome(url)
    await waitForChrome(device)
    phase(`re-foregrounded: ${pyRepr(await device.appCurrent())}`)
    // The reopened document may not have run `recordInput` yet, and the field expressions cannot see a
    // field the page names until it has.
    await waitForPage()
  }
  // Chrome exposes the field as an EditText. Tapping it focuses it and raises Gboard.
  // Web content is not reliably in the UiAutomator tree, so locate the field through the page and tap it on screen.
  const field = (await cdpEval(FIELD_RECT)) as {
    x: number
    y: number
    devicePixelRatio: number
    innerHeight: number
    screenHeight: number
  }
  const [screenWidth, screenHeight] = await device.windowSize()
  // Chrome's content area starts below the status bar and toolbar, so derive its offset from the screen/viewport difference.
  const offset =
    (field.screenHeight - field.innerHeight) * field.devicePixelRatio
  const tapX = Math.trunc(field.x * field.devicePixelRatio)
  const tapY = Math.trunc(field.y * field.devicePixelRatio + offset)
  phase(
    `field rect ${pyRepr(field)}, tapping ${tapX},${tapY} on ${screenWidth}x${screenHeight}`,
  )
  await device.click(tapX, tapY)
  await waitForFieldFocus()
  await cdpEval(FOCUS_FIELD)
  phase(`field focused: activeElement=${pyRepr(await cdpEval(FIELD_FOCUSED))}`)
  let shown = false
  let inputMethodDump = ''
  for (let tap = 0; tap < 4; tap++) {
    for (let check = 0; check < 6; check++) {
      inputMethodDump = await adb(['shell', 'dumpsys', 'input_method'])
      shown =
        inputMethodDump.includes('mInputShown=true') ||
        inputMethodDump.includes('mIsInputViewShown=true')
      if (shown) {
        break
      }
      await sleep(1)
    }
    if (shown) {
      break
    }
    phase(
      `keyboard not shown after tap ${tap + 1}, foreground ${pyRepr(await device.appCurrent())}, tapping again`,
    )
    await dismissAnr(device)
    if ((await device.appCurrent()).package !== CHROME) {
      await openInChrome(url)
      await waitForChrome(device)
    }
    await device.click(tapX, tapY)
  }
  const focus = (await adb(['shell', 'dumpsys', 'window']))
    .split(/\r?\n/)
    .filter(
      (line) =>
        line.includes('mCurrentFocus') || line.includes('mInputMethodWindow'),
    )
    .map((line) => line.trim())
  phase(`ime shown=${pyRepr(shown)}, windows: ${pyRepr(focus)}`)
  phase(
    `gboard in a11y tree: ${pyRepr(await device.find({packageName: GBOARD}).exists())}, chrome in a11y tree: ${pyRepr(await device.find({packageName: CHROME}).exists())}`,
  )
  if (!shown) {
    writeFileSync(`${outDir()}/${name}-ims.txt`, inputMethodDump)
    throw new Error('Gboard window did not appear')
  }
  phase('keyboard visible')
  // The input method window shows before Gboard has drawn its keys.
  await gboardKeys(device)

  writeFileSync(
    `${outDir()}/${name}-keyboard.xml`,
    await device.dumpHierarchy(),
  )
  await device.screenshot(`${outDir()}/${name}-keyboard`)
  if (keyboard === 'ja') {
    await ensureJapanese(device, name)
  }
  const labels = pySorted((await gboardKeys(device)).keys())
  result.gboard_labels = labels
  phase(
    `keys found: ${labels.length} labels, sample ${pyRepr(labels.slice(0, 40))}`,
  )

  return device
}

/**
 * Drive `inputs` in order, each converted with `toStep` when the loop reaches it, and push a record of
 * each to `records`. A step that throws is recorded as `failed` and every step after it as `skipped`,
 * and its error is thrown.
 *
 * With `boundaries`, a step's record spans the boundary before it and the boundary after it, each one
 * `FIELD_BOUNDARY` evaluation, and the first is read after the field is focused, before the first step.
 * Without them, the page sees only the `window.__state()` calls `typeOnDevice` made: one after each step
 * and one after the last, the records hold no selection, and `events` holds every event the page recorded.
 */
async function runSteps<Input>(
  device: Device,
  name: string,
  result: Record<string, unknown>,
  inputs: Input[],
  {
    toStep,
    records,
    boundaries,
  }: {
    toStep: (input: Input) => Step
    records?: StepRecord[]
    boundaries: boolean
  },
): Promise<{
  /** How each `compose` step was committed: its candidate or `space`, `undefined` for any other step. */
  picked: Array<string | undefined>
  /** The page's event count after each step. */
  stepEnds: number[]
  text: string | null
  selection: GraphemeSelection | null
  events: PageEvent[]
}> {
  const picked: Array<string | undefined> = []
  const stepEnds: number[] = []
  let last = boundaries ? await readBoundary() : undefined
  const firstEnd = last?.state.events.length ?? 0
  let eventsBefore = firstEnd
  for (const [index, input] of inputs.entries()) {
    const step = toStep(input)
    const position = index + 1
    let after: PageState
    try {
      picked.push(await runStep(device, name, result, step, position))
      if (boundaries) {
        last = await readBoundary()
        after = last.state
      } else {
        after = (await cdpEval('window.__state()')) as PageState
      }
      result[`after${position}`] = after
    } catch (error) {
      if (records !== undefined) {
        // `typeOnDevice` keeps no records, so it never reads the words after the one that threw.
        // A step whose `type` throws when read again leaves the records of the steps before it, so the
        // step's error still propagates.
        currentInspection().guard(
          () =>
            records.push(
              {
                type: step.type,
                status: 'failed',
                reason: guardedErrorRepr(error),
                textAfter: null,
                selectionAfter: null,
                events: [],
              },
              ...Array.from(
                inputs.slice(index + 1),
                (skipped): StepRecord => ({
                  type: toStep(skipped).type,
                  status: 'skipped',
                  reason: `step ${position} failed`,
                  textAfter: null,
                  selectionAfter: null,
                  events: [],
                }),
              ),
            ),
          undefined,
        )
      }
      throw error
    }
    stepEnds.push(after.events.length)
    records?.push({
      type: step.type,
      status: 'done',
      textAfter: after.text,
      selectionAfter: last?.selection ?? null,
      events: after.events.slice(eventsBefore),
    })
    eventsBefore = after.events.length
  }
  if (last) {
    result.state = last.state
    return {
      picked,
      stepEnds,
      text: last.state.text,
      selection: last.selection,
      events: last.state.events.slice(firstEnd),
    }
  }
  const state = (await cdpEval('window.__state()')) as PageState
  result.state = state
  return {
    picked,
    stepEnds,
    text: state.text,
    selection: null,
    events: state.events,
  }
}

/** The page's state and the field's selection in grapheme clusters, from one `FIELD_BOUNDARY` evaluation. */
async function readBoundary(): Promise<{
  state: PageState
  selection: GraphemeSelection | null
}> {
  const {state, selection} = (await cdpEval(FIELD_BOUNDARY)) as {
    state: PageState
    selection: unknown
  }
  return {state, selection: graphemeSelection(selection)}
}

/** Drive one step on Gboard. Returns what committed a `compose` step. */
async function runStep(
  device: Device,
  name: string,
  result: Record<string, unknown>,
  step: Step,
  position: number,
): Promise<string | undefined> {
  switch (step.type) {
    case 'compose':
      return compose(
        device,
        name,
        result,
        step.letters ?? step.text,
        step.commit ?? 'space',
        position,
      )
    case 'enter':
      await tapRole(device, 'enter')
      await settle(device, name, position)
      return undefined
    case 'backspace':
      for (let tap = 0; tap < (step.times ?? 1); tap++) {
        await tapRole(device, 'delete')
      }
      await settle(device, name, position)
      return undefined
  }
}

/**
 * Throw a driver fault for a digit in `text` that `inputs` does not hold.
 *
 * The one place the driver reads the page's text to classify a fault. A digit neither the prefix nor
 * the letters hold can only come from a tap that landed as a long press on a key's number hint. An
 * editor that produced one every time would fault twice and fail the test, so a retry can only hide an
 * editor that produces it intermittently.
 */
function throwOnUnexpectedDigit(text: string | null, inputs: string): void {
  const digit = unexpectedDigit(text, inputs)
  if (digit !== undefined) {
    throw new Error(
      `mistap: digit ${digit} in typed text ${pyRepr(text)} that neither the prefix nor the letters hold`,
    )
  }
}

/** Save the screen and its accessibility dump after a failed attempt, over a fresh uiautomator2 connection. */
export async function dumpFailure(
  name: string,
  connect: () => Promise<Device>,
): Promise<void> {
  phase('FAILED, dumping screen')
  // `typeInChrome` never hands its device back on failure.
  let device: Device
  try {
    device = await connect()
  } catch (error) {
    throwIfAborted()
    console.warn(`u2 connect for dump failed: ${describeError(error)}`)
    return
  }
  try {
    writeFileSync(`${outDir()}/${name}-fail.xml`, await device.dumpHierarchy())
    await device.screenshot(`${outDir()}/${name}-fail`)
  } catch (error) {
    throwIfAborted()
    console.warn(`dump failed: ${describeError(error)}`)
  }
}

/** Force-stop Chrome. It throws when the attempt is cancelled or an adb process outlived SIGKILL, and logs any other failure. */
export async function closeChrome(): Promise<void> {
  await adb(['shell', 'am', 'force-stop', CHROME], CHROME_ADB_SECONDS).catch(
    (error: unknown) => {
      throwIfAborted()
      if (isInstance(error, ProcessNotStoppedError)) {
        throw error
      }
      phase(`force-stop chrome failed: ${describeError(error)}`)
    },
  )
}

/** Delete Chrome's saved tabs, so the next test's Chrome does not restore this test's page. */
export async function clearChromeTabs(): Promise<void> {
  await adb(
    ['shell', 'rm', '-rf', '/data/data/com.android.chrome/app_tabs'],
    CHROME_ADB_SECONDS,
  ).catch((error: unknown) => {
    throwIfAborted()
    if (isInstance(error, ProcessNotStoppedError)) {
      throw error
    }
    phase(`clearing chrome tabs failed: ${describeError(error)}`)
  })
}

/** Count compositionstart events that arrive while an earlier composition is still open. */
export function nestedCompositionstart(events: PageEvent[]): number {
  let nested = 0
  let open = false
  for (const event of events) {
    if (event.type === 'compositionstart') {
      if (open) {
        nested += 1
      }
      open = true
    } else if (event.type === 'compositionend') {
      open = false
    }
  }
  return nested
}

/** `compositionstart` counts between consecutive event log lengths, one per word. */
export function compositionstartPerWord(
  events: PageEvent[],
  wordEnds: number[],
): number[] {
  return wordEnds.map(
    (end, index) =>
      events
        .slice(index === 0 ? 0 : wordEnds[index - 1], end)
        .filter((event) => event.type === 'compositionstart').length,
  )
}

/** The first digit in `text`, ASCII or full width, that `inputs` does not hold. */
export function unexpectedDigit(
  text: string | null,
  inputs: string,
): string | undefined {
  return [...(text ?? '')].find(
    (character) => /[0-9０-９]/.test(character) && !inputs.includes(character),
  )
}

const JA_HINTS = ['あ', 'かな', '変換', '空白', '確定', 'ABC', '記号']

/** Whether a Gboard dump's labels hold one of the Japanese layout's keys. */
export function isJapanese(keys: Iterable<string>): boolean {
  for (const key of keys) {
    if (JA_HINTS.some((hint) => key.includes(hint))) {
      return true
    }
  }
  return false
}

export type KeyboardState = 'japanese-qwerty' | 'banner' | 'other' | 'partial'

const SPACE_KEYS = ['Space', 'space', 'スペース']

/**
 * What a Gboard dump shows. A whole layout has every letter key and a space key, and anything less is a
 * dump taken mid-redraw. The new-language banner covers the keyboard, so it counts as shown on its own.
 */
export function keyboardState(keys: Keys): KeyboardState {
  if (
    [...keys.keys()].some((label) =>
      label.toLowerCase().startsWith('close the new language'),
    )
  ) {
    return 'banner'
  }
  const whole =
    LETTERS.every(
      (letter) => keys.has(letter) || keys.has(letter.toUpperCase()),
    ) && SPACE_KEYS.some((label) => keys.has(label))
  if (!whole) {
    return 'partial'
  }
  return isJapanese(keys.keys()) ? 'japanese-qwerty' : 'other'
}

/**
 * Where artifacts go: `THUMBJAR_OUT_DIR`, which `deviceProject` sets from its `outDir`, or `out` in the
 * working directory.
 */
export function outDir(): string {
  return process.env.THUMBJAR_OUT_DIR ?? 'out'
}

export async function openInChrome(url: string): Promise<void> {
  await adb([
    'shell',
    shellQuote([
      'am',
      'start',
      '-a',
      'android.intent.action.VIEW',
      '-d',
      url,
      CHROME,
    ]),
  ])
}

async function waitForPage(): Promise<void> {
  let lastError: unknown
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      if (
        (await cdpEval('document.readyState')) === 'complete' &&
        (await cdpEval('typeof window.__state')) === 'function'
      ) {
        return
      }
    } catch (error) {
      throwIfAborted()
      if (isInstance(error, PageExceptionError)) {
        throw error
      }
      lastError = error
      phase(`cdp not ready: ${describeError(error)}`)
      try {
        const pageTargets = await targets(5)
        const described = pageTargets
          .map(
            (target) =>
              `${pyStr(target.type)} ${pyStr(target.url)} attached=${pyRepr(target.attached)}`,
          )
          .join('; ')
        phase(`targets: ${described}`)
      } catch (targetsError) {
        throwIfAborted()
        phase(`targets unavailable: ${describeError(targetsError)}`)
      }
    }
    await sleep(1)
  }
  throw new Error(
    `page never loaded over CDP: ${lastError === undefined ? 'None' : describeError(lastError)}`,
  )
}

async function waitForChrome(device: Device): Promise<void> {
  for (let check = 0; check < 20; check++) {
    if ((await device.appCurrent()).package === CHROME) {
      return
    }
    await sleep(0.5)
  }
}

/** Wait for the tap to focus the field. A tap that misses it is followed by the forced focus anyway. */
async function waitForFieldFocus(): Promise<void> {
  for (let check = 0; check < 12; check++) {
    if ((await cdpEval(FIELD_FOCUSED)) === true) {
      return
    }
    await sleep(0.25)
  }
}

// Chrome's first-run and promo screens, in case the command-line flags are ignored on this build.
const FRE_BUTTONS = [
  'Use without an account',
  'Accept & continue',
  'No thanks',
  'No, thanks',
  'Got it',
  'Continue',
  'Skip',
]

async function dismissChromeScreens(device: Device): Promise<void> {
  for (let screen = 0; screen < 6; screen++) {
    let hit: string | undefined
    for (const button of FRE_BUTTONS) {
      if (await device.find({packageName: CHROME, text: button}).exists()) {
        hit = button
        break
      }
    }
    if (!hit) {
      return
    }
    phase(`chrome screen: tapping ${pyRepr(hit)}`)
    await device.find({packageName: CHROME, text: hit}).click()
    await waitUntilGone(device, {packageName: CHROME, text: hit})
  }
}

/** Tap Wait on any "isn't responding" dialog. It steals window focus, so the keyboard never shows. */
async function dismissAnr(device: Device): Promise<number> {
  let dismissed = 0
  for (let dialog = 0; dialog < 5; dialog++) {
    if (!(await device.find({textContains: "isn't responding"}).exists())) {
      break
    }
    const title = await device
      .find({textContains: "isn't responding"})
      .getText()
    await device.find({text: 'Wait'}).click()
    dismissed += 1
    phase(`dismissed ANR dialog: ${pyStr(title)}`)
    await waitUntilGone(device, {text: 'Wait'})
  }
  return dismissed
}

async function waitUntilGone(
  device: Device,
  fields: Parameters<Device['find']>[0],
): Promise<void> {
  for (let check = 0; check < 10; check++) {
    if (!(await device.find(fields).exists())) {
      return
    }
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
    if (keyboardState(keys) !== 'partial') {
      return keys
    }
    phase(
      `a11y dump incomplete, ${keys.size} Gboard nodes (attempt ${attempt + 1}), retrying`,
    )
    await sleep(1.5)
  }
  return keys
}

/** Wait until Gboard shows `wanted` after a tap that switches its layout. `ensureJapanese` checks the result. */
async function waitForKeyboardState(
  device: Device,
  wanted: KeyboardState,
): Promise<void> {
  for (let check = 0; check < 10; check++) {
    if (keyboardState(await gboardKeys(device)) === wanted) {
      return
    }
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
  throw new Error(
    `no Gboard node labelled ${pyRepr(label)}, labels: ${pyRepr(pySorted(keys.keys()).slice(0, 80))}`,
  )
}

/** Gboard opens on English. Tap its language key until the Japanese layout shows. */
async function ensureJapanese(device: Device, name: string): Promise<void> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const keys = await gboardKeys(device)
    if (isJapanese(keys.keys())) {
      if (!keys.has('k') && !keys.has('K')) {
        throw new Error(
          `japanese layout is not romaji QWERTY, labels ${pyRepr(pySorted(keys.keys()).slice(0, 60))}`,
        )
      }
      phase(`japanese layout active after ${attempt} switches`)
      return
    }
    writeFileSync(
      `${outDir()}/${name}-lang-${attempt}.xml`,
      await device.dumpHierarchy(),
    )
    // Gboard v15 shows a "Japanese is now installed" banner over the keyboard. Its text mentions the
    // globe key, so close it first and only ever tap the language key itself.
    const banner = [...keys.keys()].filter((label) =>
      label.toLowerCase().startsWith('close the new language'),
    )
    if (banner.length) {
      phase('closing the new language banner')
      await device.click(...keys.get(banner[0]!)!)
      await waitForKeyboardState(device, 'other')
      continue
    }
    const languageKeys = [...keys.keys()].filter((label) =>
      /^(next language|switch to|globe)/i.test(label),
    )
    phase(
      `not japanese yet, language keys ${pyRepr(languageKeys)}, labels ${pyRepr(pySorted(keys.keys()).slice(0, 60))}`,
    )
    if (languageKeys.length) {
      await device.click(...keys.get(languageKeys[0]!)!)
    } else {
      // The space bar cycles languages on a long swipe, and long-press opens the picker.
      const space = keys.get('Space') ?? keys.get('space')
      if (!space) {
        break
      }
      await device.swipe(
        space[0] - 150,
        space[1],
        space[0] + 150,
        space[1],
        0.3,
      )
    }
    await waitForKeyboardState(device, 'japanese-qwerty')
  }
  throw new Error('could not switch Gboard to Japanese')
}

/**
 * Tap `letters`, then commit them: tap the candidate when Gboard offers it, otherwise Space, or leave the
 * composition open. Returns the candidate or `space` that committed them, `undefined` for `none`.
 */
async function compose(
  device: Device,
  name: string,
  result: Record<string, unknown>,
  letters: string,
  commit: Commit,
  position: number,
): Promise<string | undefined> {
  for (const key of letters) {
    await tapKey(device, key)
  }
  phase(`typed ${letters} (${position})`)
  await device.screenshot(`${outDir()}/${name}-composing${position}`)
  result[`composing${position}`] = await cdpEval('window.__state()')
  if (commit === 'none') {
    result[`picked${position}`] = 'none'
    await settle(device, name, position)
    return undefined
  }
  const wanted = commit === 'space' ? undefined : commit.candidate
  let keys = await gboardKeys(device)
  if (wanted !== undefined) {
    // Gboard v15 sometimes shows only the kana candidate first and adds the kanji a moment later.
    for (let check = 0; check < 6; check++) {
      if (keys.has(wanted)) {
        break
      }
      await sleep(0.5)
      keys = await gboardKeys(device)
    }
  }
  result[`candidates${position}`] = [...keys.keys()]
    .filter((label) => pyLen(label) <= 6 && !isAscii(label))
    .slice(0, 30)
  let picked: string
  const candidate = wanted === undefined ? undefined : keys.get(wanted)
  if (candidate) {
    await device.click(...candidate)
    picked = wanted!
  } else {
    keys = await gboardKeys(device)
    // The Japanese layout labels its space key スペース.
    await tapKey(device, keys.has('スペース') ? 'スペース' : 'Space')
    picked = 'space'
  }
  result[`picked${position}`] = picked
  await settle(device, name, position)
  return picked
}

/** Wait for Gboard to settle after a step's last tap, and save the screen. */
async function settle(
  device: Device,
  name: string,
  position: number,
): Promise<void> {
  // Gboard commits the word and resets its suggestion strip asynchronously, and neither the page nor the
  // accessibility tree signals when it is ready for the next word.
  await sleep(1.5)
  await device.screenshot(`${outDir()}/${name}-after${position}`)
}

/** A Gboard key that plays the same role on every layout, whatever its label says there. */
export type KeyRole = 'enter' | 'delete'

const ROLE_IDS: Record<KeyRole, string> = {
  enter: 'key_pos_ime_action',
  delete: 'key_pos_del',
}

// The action key's label follows the field's `enterkeyhint`, and the delete key's the layout's language.
const ROLE_LABELS: Record<KeyRole, RegExp> = {
  enter: /^(enter|done|go|search|next|send|return)$/i,
  delete: /^(delete|backspace|削除)$/i,
}

/** The Gboard node that plays `role`, by resource id first and label second. */
export function roleKey(
  nodes: PackageNode[],
  role: KeyRole,
): PackageNode | undefined {
  return (
    nodes.find((node) => node.id === ROLE_IDS[role]) ??
    nodes.find((node) => ROLE_LABELS[role].test(node.label))
  )
}

async function tapRole(device: Device, role: KeyRole): Promise<void> {
  // Waits for a whole layout first, so a dump taken mid-redraw does not read as a missing key.
  await gboardKeys(device)
  const nodes = packageNodes(await device.dumpHierarchy(), GBOARD)
  const key = roleKey(nodes, role)
  if (!key) {
    throw new Error(
      `no Gboard ${role} key, labels: ${pyRepr(
        pySorted(nodes.map((node) => node.label)).slice(0, 80),
      )}`,
    )
  }
  await device.click(...key.center)
  // Paces taps at a typist's speed, as `tapKey` does.
  await sleep(0.4)
}

// The selection in the field the driver types into, in UTF-16 offsets of the field's text. `null` when
// it is outside the field.
const FIELD_SELECTION = `(() => { const field = typeof window.__field === 'function' ? window.__field() : null; if (!field) return null; if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) { const backward = field.selectionDirection === 'backward'; return {text: field.value, anchor: backward ? field.selectionEnd : field.selectionStart, focus: backward ? field.selectionStart : field.selectionEnd}; } const selection = getSelection(); if (!selection || !selection.rangeCount || !field.contains(selection.anchorNode) || !field.contains(selection.focusNode)) return null; const offset = (node, nodeOffset) => { const range = document.createRange(); range.setStart(field, 0); range.setEnd(node, nodeOffset); return range.toString().length; }; return {text: field.textContent, anchor: offset(selection.anchorNode, selection.anchorOffset), focus: offset(selection.focusNode, selection.focusOffset)}; })()`

// The page's `window.__state()` and the field's selection from one evaluation, so no event can land
// between them.
const FIELD_BOUNDARY = `({state: window.__state(), selection: ${FIELD_SELECTION}})`

/** A `FIELD_SELECTION` reply in grapheme clusters. */
export function graphemeSelection(reply: unknown): GraphemeSelection | null {
  if (reply === null || typeof reply !== 'object') {
    return null
  }
  const {text, anchor, focus} = reply as {
    text: string | null
    anchor: number
    focus: number
  }
  return {
    anchor: graphemeOffset(text ?? '', anchor),
    focus: graphemeOffset(text ?? '', focus),
  }
}

const GRAPHEMES = new Intl.Segmenter(undefined, {granularity: 'grapheme'})

/** The number of grapheme clusters in `text` that start before the UTF-16 `offset`. */
export function graphemeOffset(text: string, offset: number): number {
  let clusters = 0
  for (const {index} of GRAPHEMES.segment(text)) {
    if (index >= offset) {
      break
    }
    clusters += 1
  }
  return clusters
}

function isAscii(value: string): boolean {
  return /^\p{ASCII}*$/u.test(value)
}
