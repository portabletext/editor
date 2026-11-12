// One attempt on the device: open the page in Chrome, raise Gboard, drive each step on its keys, and read
// the page's text, selection and events back over CDP.

import {writeFileSync} from 'node:fs'
import {
  adb,
  adbExit,
  adbLostDevice,
  ProcessNotStoppedError,
  shellQuote,
  thrownValue,
  throwIfStrictLoss,
  unstoppedProcesses,
  type AdbLoss,
} from '../device/adb.ts'
import {
  CHROME_ADB_SECONDS,
  CHROME_PID_SECONDS,
  DEVICE_STATE_SECONDS,
} from '../device/budget.ts'
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
  currentSignal,
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
import {LAYOUTS, TEXT_SYMBOLS, typeSymbols} from './symbols.ts'

export {adbLostDevice, type AdbLoss} from '../device/adb.ts'

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

export class MistapError extends Error {}

/** The keys the driver tapped in one step and the events the page recorded during it. */
export type StepTaps = {keys: string[]; events: PageEvent[]}

/**
 * What one `runOnDevice` attempt shares with the call around it. `typeOnDevice` passes none, so its
 * attempts keep their Space fallback and read nothing after a fault.
 */
export type AttemptHooks = {
  /**
   * Set immediately before the attempt's first tap on a key that types is issued, a letter, a symbol, a
   * candidate, Space, Enter or Delete, so a tap whose reply failed or never came counts as sent. The taps
   * that focus the field and switch Gboard's layout type nothing and leave it unset.
   */
  inputSent: boolean
  /** The pids of the Chrome the restart before this attempt stopped, so the attempt types only in a new one. */
  previousChrome?: string[]
  /**
   * Read the page into the record of the step that failed, set once the attempt's page loaded. The call
   * runs it after the attempt's deadline settled, under a bound of its own.
   */
  readAfterFault?: () => Promise<void>
}

/** Open the page in Chrome, type `words` on Gboard and read back what the page holds. */
export async function typeInChrome(
  name: string,
  {url: pageUrl, keyboard, prefix, words}: TypeOnDeviceOptions,
  connect: () => Promise<Device>,
  onTaps?: (taps: StepTaps[]) => void,
): Promise<Typed> {
  const result: Record<string, unknown> = {url: pageUrl, prefix, words}
  const device = await openKeyboard(
    name,
    {url: pageUrl, keyboard, prefix},
    connect,
    result,
  )
  const {picked, stepEnds, text, events, taps} = await runSteps(
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
      onTaps,
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
  result.taps = taps
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
 * With `hooks`, a candidate Gboard does not offer fails its step, the attempt marks its input sent, checks
 * Chrome is new after a restart, and leaves the read of the page after a failed step to `hooks`, which
 * writes the records again once it filled them.
 */
export async function runInChrome(
  name: string,
  {url: pageUrl, keyboard, prefix, steps}: RunOnDeviceOptions,
  connect: () => Promise<Device>,
  onStepFailure?: (error: unknown, records: StepRecord[]) => void,
  hooks?: AttemptHooks,
  onTaps?: (taps: StepTaps[]) => void,
): Promise<Run> {
  const result: Record<string, unknown> = {url: pageUrl, prefix, steps}
  const records: StepRecord[] = []
  const writeRecords = () => {
    result.records = records
    // Serializing runs the steps' getters and `toJSON`, so a failure to write the artifact never replaces
    // the step's error or decides whether it is retried.
    try {
      writeFileSync(`${outDir()}/${name}.json`, JSON.stringify(result, null, 2))
    } catch (artifactError) {
      phase(`failure artifact not written: ${describeError(artifactError)}`)
    }
  }
  let run: Run
  try {
    const device = await openKeyboard(
      name,
      {url: pageUrl, keyboard, prefix},
      connect,
      result,
      hooks?.previousChrome,
    )
    const {text, selection, events} = await runSteps(
      device,
      name,
      result,
      steps,
      {
        toStep: (step) => step,
        records,
        boundaries: true,
        keyboard,
        hooks,
        onTaps,
      },
    )
    run = {steps: records, text, selection, events}
  } catch (error) {
    if (records.length > 0) {
      onStepFailure?.(error, records)
      writeRecords()
      const failed = records.find((record) => record.status === 'failed')
      if (hooks !== undefined && failed !== undefined) {
        hooks.readAfterFault = async () => {
          const {state, selection, focused} = await readBoundary()
          failed.textAfter = state.text
          failed.selectionAfter = selection
          failed.focusedAfter = focused
          phase(
            `page after the fault: text ${pyRepr(state.text)}, focused ${pyRepr(focused)}`,
          )
          writeRecords()
        }
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
  for (const record of records) {
    throwOnSymbolMistap(record, keyboard)
  }
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
      `  ${index + 1}. ${field(() => String(record.type))}: ${field(() => String(record.status))}${field(() => (record.reason === undefined ? '' : ` (${String(record.reason)})`), ` (${UNPRINTABLE_ERROR})`)}, textAfter ${field(() => pyRepr(record.textAfter))}${field(() => (record.keys === undefined ? '' : `, keys ${record.keys.length > 0 ? record.keys.join(' ') : 'none'}`))}`,
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
export async function openKeyboard(
  name: string,
  {
    url: pageUrl,
    keyboard,
    prefix,
  }: Pick<RunOnDeviceOptions, 'url' | 'keyboard' | 'prefix'>,
  connect: () => Promise<Device>,
  result: Record<string, unknown>,
  previousChrome?: string[],
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
      throwIfStrictLoss(error)
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
  if (previousChrome !== undefined) {
    await checkFreshChrome(previousChrome)
  }

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
  const field = (await evalOnField(FIELD_RECT)) as {
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
  await evalOnField(FOCUS_FIELD)
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
    keyboard,
    hooks,
    onTaps,
  }: {
    toStep: (input: Input) => Step
    records?: StepRecord[]
    boundaries: boolean
    keyboard?: RunOnDeviceOptions['keyboard']
    hooks?: AttemptHooks | undefined
    /** Called with the list of steps once the first begins. Each step's keys are added as they are tapped and its events once it is read, so the list holds the steps so far when one throws. */
    onTaps?: ((taps: StepTaps[]) => void) | undefined
  },
): Promise<{
  /** How each `compose` step was committed: its candidate or `space`, `undefined` for any other step. */
  picked: Array<string | undefined>
  /** The page's event count after each step. */
  stepEnds: number[]
  text: string | null
  selection: GraphemeSelection | null
  events: PageEvent[]
  taps: StepTaps[]
}> {
  const picked: Array<string | undefined> = []
  const stepEnds: number[] = []
  const taps: StepTaps[] = []
  let last = boundaries ? await readBoundary() : undefined
  const firstEnd = last?.state.events.length ?? 0
  let eventsBefore = firstEnd
  for (const [index, input] of inputs.entries()) {
    const step = toStep(input)
    const position = index + 1
    const entry: StepTaps = {keys: [], events: []}
    taps.push(entry)
    if (taps.length === 1) {
      onTaps?.(taps)
    }
    let after: PageState
    try {
      picked.push(
        await runStep(
          device,
          name,
          result,
          step,
          position,
          keyboard,
          hooks,
          entry.keys,
        ),
      )
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
                reason: guardedErrorRepr(thrownValue(error)),
                textAfter: null,
                selectionAfter: null,
                focusedAfter: null,
                events: [],
                keys: [...entry.keys],
              },
              ...Array.from(
                inputs.slice(index + 1),
                (skipped): StepRecord => ({
                  type: toStep(skipped).type,
                  status: 'skipped',
                  reason: `step ${position} failed`,
                  textAfter: null,
                  selectionAfter: null,
                  focusedAfter: null,
                  events: [],
                  keys: [],
                }),
              ),
            ),
          undefined,
        )
      }
      throw error
    }
    stepEnds.push(after.events.length)
    entry.events = after.events.slice(eventsBefore)
    records?.push({
      type: step.type,
      status: 'done',
      textAfter: after.text,
      selectionAfter: last?.selection ?? null,
      focusedAfter: last?.focused ?? null,
      events: entry.events,
      keys: [...entry.keys],
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
      taps,
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
    taps,
  }
}

/**
 * The page's state, the field's selection in grapheme clusters and whether the field has focus, from one
 * `FIELD_BOUNDARY` evaluation. Focus is `null` when the reply does not say.
 */
async function readBoundary(): Promise<{
  state: PageState
  selection: GraphemeSelection | null
  focused: boolean | null
}> {
  const {state, selection, focused} = (await cdpEval(FIELD_BOUNDARY)) as {
    state: PageState
    selection: unknown
    focused: unknown
  }
  return {
    state,
    selection: graphemeSelection(selection),
    focused: typeof focused === 'boolean' ? focused : null,
  }
}

/**
 * Drive one step on Gboard. Returns what committed a `compose` step. With `hooks`, the step marks the
 * attempt's input sent before each tap that types, and a candidate Gboard does not offer fails it.
 */
async function runStep(
  device: Device,
  name: string,
  result: Record<string, unknown>,
  step: Step,
  position: number,
  keyboard: RunOnDeviceOptions['keyboard'] | undefined,
  hooks: AttemptHooks | undefined,
  sent: string[],
): Promise<string | undefined> {
  const tap = (label: string, center: [number, number]) => {
    sent.push(label)
    if (hooks !== undefined) {
      hooks.inputSent = true
    }
    return device.click(...center)
  }
  switch (step.type) {
    case 'compose':
      return compose(device, name, result, {
        letters: step.letters ?? step.text,
        literal: step.text !== undefined && keyboard !== undefined,
        keyboard,
        commit: step.commit ?? 'space',
        candidateRequired: hooks !== undefined,
        position,
        tap,
      })
    case 'enter':
      await tapRole(device, 'enter', tap)
      await settle(device, name, position)
      return undefined
    case 'backspace':
      for (let press = 0; press < (step.times ?? 1); press++) {
        await tapRole(device, 'delete', tap)
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
    throw new MistapError(
      `mistap: digit ${digit} in typed text ${pyRepr(text)} that neither the prefix nor the letters hold`,
    )
  }
}

function throwOnSymbolMistap(
  record: StepRecord,
  keyboard: RunOnDeviceOptions['keyboard'],
): void {
  const keys = record.keys ?? []
  const beforeinputs = record.events.filter(
    (event) => event.type === 'beforeinput',
  )
  if (
    keys.length !== beforeinputs.length ||
    beforeinputs.some(
      (event) =>
        event.inputType !== 'insertText' ||
        typeof event.data !== 'string' ||
        [...event.data].length !== 1,
    )
  ) {
    return
  }
  const pairs = keys.map((key, index) => {
    const entry = Object.values(LAYOUTS[keyboard])
      .flatMap((layout) => Object.entries(layout.keys))
      .find(([character]) => character === key)?.[1]
    return {key, entry, data: beforeinputs[index]!.data}
  })
  if (
    pairs.some(
      ({key, entry, data}) =>
        typeof data !== 'string' ||
        (data !== key && !entry?.popup?.includes(data)),
    )
  ) {
    return
  }
  for (const {key, entry, data} of pairs) {
    if (
      typeof data === 'string' &&
      data !== key &&
      entry?.popup?.includes(data)
    ) {
      throw new MistapError(
        `mistap: key ${pyRepr(entry.label)} typed ${pyRepr(data)} instead of ${pyRepr(key)}`,
      )
    }
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

/**
 * Force-stop Chrome. It throws when the attempt is cancelled or an adb process outlived SIGKILL, and in a
 * `runOnDevice` call on adb's own error for a lost device, and logs any other failure.
 */
export async function closeChrome(): Promise<void> {
  await adb(['shell', 'am', 'force-stop', CHROME], CHROME_ADB_SECONDS).catch(
    (error: unknown) => {
      throwIfAborted()
      if (isInstance(error, ProcessNotStoppedError)) {
        throw error
      }
      throwIfStrictLoss(error)
      phase(`force-stop chrome failed: ${describeError(error)}`)
    },
  )
}

/**
 * Stop Chrome for the retry of a `runOnDevice` call and wait for its old process to go: read its pid,
 * force-stop it and read the pid again until the old one is gone, reading no later than
 * `CHROME_ADB_SECONDS` after the force-stop. Returns the old pids, `[]` when no Chrome ran, for the retry's
 * `checkFreshChrome`. A force-stop that fails is only logged, since the reads after it decide whether
 * Chrome stopped, unless it failed on adb's own error for a lost device, which `closeChrome` throws in a
 * `runOnDevice` call before any later pid read, so the call never retries on a device adb lost. Throws `ChromeNotRestarted` when the old
 * process outlives the reads or a pid cannot be read.
 */
export async function stopChromeForRetry(): Promise<string[]> {
  const old = await chromePids('before the restart', undefined)
  await closeChrome()
  const stopped = Date.now()
  for (;;) {
    const now = await chromePids('after the force-stop', old)
    if (!now.some((pid) => old.includes(pid))) {
      return old
    }
    if (
      Date.now() - stopped + PID_POLL_SECONDS * 1000 >
      CHROME_ADB_SECONDS * 1000
    ) {
      throw new ChromeNotRestarted(
        `the old Chrome still ran ${CHROME_ADB_SECONDS}s after the force-stop`,
        old,
        now,
      )
    }
    await sleep(PID_POLL_SECONDS)
  }
}

const PID_POLL_SECONDS = 0.5

/** Throw `ChromeNotRestarted` unless Chrome runs in a process that is not one of `old`. */
async function checkFreshChrome(old: string[]): Promise<void> {
  const now = await chromePids('after the relaunch', old)
  if (now.length === 0) {
    throw new ChromeNotRestarted(
      'no Chrome process ran after the relaunch',
      old,
      now,
    )
  }
  if (now.some((pid) => old.includes(pid))) {
    throw new ChromeNotRestarted(
      'the relaunched Chrome runs in the old process',
      old,
      now,
    )
  }
  phase(
    `fresh chrome for the retry: old pid ${pidList(old)}, new pid ${pidList(now)}`,
  )
}

/**
 * Chrome's main process ids, `[]` when none runs. `pidof` exits 1 when no process matches, so the device
 * shell prints its exit status and exits 0, and only an adb that failed exits otherwise. A read without
 * that status is no read.
 */
async function chromePids(
  when: string,
  old: string[] | undefined,
): Promise<string[]> {
  let output: string
  try {
    output = await adb(
      ['shell', `pidof ${CHROME}; echo pidof exit $?`],
      CHROME_PID_SECONDS,
    )
  } catch (error) {
    throwIfAborted()
    if (isInstance(error, ProcessNotStoppedError)) {
      throw error
    }
    const lost = adbLostDevice(error)
    throw new ChromeNotRestarted(
      lost === 'timeout'
        ? `adb timed out during the Chrome restart: adb shell pidof ${CHROME} ran past ${CHROME_PID_SECONDS}s ${when}`
        : `adb shell pidof ${CHROME} failed ${when}: ${describeError(error)}`,
      old,
      undefined,
      lost,
    )
  }
  const read = /^([\d\s]*)pidof exit ([01])\s*$/.exec(output)
  if (read === null) {
    throw new ChromeNotRestarted(
      `adb shell pidof ${CHROME} gave no pid ${when}: ${pyRepr(output)}`,
      old,
      undefined,
    )
  }
  return read[1]!.trim().split(/\s+/).filter(Boolean)
}

function pidList(pids: string[] | undefined): string {
  if (pids === undefined) {
    return 'unread'
  }
  return pids.length === 0 ? 'none' : pids.join(' ')
}

/**
 * The restart between the attempts did not show a fresh Chrome: the old process may still hold the first
 * attempt's page, where input that attempt sent can still land, so the retry must not type.
 */
export class ChromeNotRestarted extends Error {
  override name = 'ChromeNotRestarted'
  /** How a pid read failed when adb may have lost the device, see `adbLostDevice`. */
  readonly lost: AdbLoss | undefined
  constructor(
    reason: string,
    old: string[] | undefined,
    now: string[] | undefined,
    lost?: AdbLoss,
  ) {
    super(`${reason}, old pid ${pidList(old)}, new pid ${pidList(now)}`)
    this.lost = lost
  }
}

/**
 * The device's state from one `adb get-state`, under `DEVICE_STATE_SECONDS`: its stdout, `device` or
 * `offline` for instance, when it exited 0, its stderr, which names adb's error, when it failed, and
 * `undefined` when it was stopped or skipped. stdout alone names the state, since adb that starts its server
 * says so on stderr. It is skipped after the test timed out or next to a process that outlived SIGKILL. A
 * process of its own that outlives SIGKILL still throws.
 */
export async function readDeviceState(): Promise<string | undefined> {
  if (currentSignal()?.aborted || unstoppedProcesses().length > 0) {
    phase(
      'adb get-state skipped after the test timed out or next to a process that outlived SIGKILL',
    )
    return undefined
  }
  try {
    const {code, stdout, stderr} = await adbExit(
      ['get-state'],
      DEVICE_STATE_SECONDS,
    )
    const state = (code === 0 ? stdout : stderr || stdout).trim()
    phase(`adb get-state: exit ${code}, ${pyRepr(state)}`)
    return state
  } catch (error) {
    if (isInstance(error, ProcessNotStoppedError)) {
      throw error
    }
    phase(`adb get-state stopped: ${describeError(error)}`)
    return undefined
  }
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
  let fieldMissing = false
  for (let attempt = 0; attempt < 20; attempt++) {
    fieldMissing = false
    try {
      if (
        (await cdpEval('document.readyState')) === 'complete' &&
        (await cdpEval('typeof window.__state')) === 'function'
      ) {
        if (
          (await cdpEval(
            "typeof window.__field === 'function' && window.__field() !== null",
          )) === true
        ) {
          return
        }
        fieldMissing = true
      }
    } catch (error) {
      throwIfAborted()
      if (isInstance(error, PageExceptionError)) {
        throw error
      }
      throwIfStrictLoss(error)
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
        throwIfStrictLoss(targetsError)
        phase(`targets unavailable: ${describeError(targetsError)}`)
      }
    }
    await sleep(1)
  }
  if (fieldMissing) {
    throw new Error(FIELD_MISSING)
  }
  throw new Error(
    `page never loaded over CDP: ${lastError === undefined ? 'None' : describeError(lastError)}`,
  )
}

/** Evaluate a field expression from `field.ts` until it finds the field instead of returning `null`. */
async function evalOnField(expression: string): Promise<unknown> {
  for (let check = 0; check < 20; check++) {
    const result = await cdpEval(expression)
    if (result !== null) {
      return result
    }
    await sleep(1)
  }
  throw new Error(FIELD_MISSING)
}

const FIELD_MISSING =
  'page never rendered its field: `window.__field()` found no `textarea`, text `input` or `[contenteditable]`'

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
export async function dismissAnr(device: Device): Promise<number> {
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
export async function gboardKeys(device: Device): Promise<Keys> {
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

async function tapKey(
  device: Device,
  label: string,
  tap: (label: string, center: [number, number]) => Promise<void> = (
    _label,
    center,
  ) => device.click(...center),
): Promise<void> {
  const keys = await gboardKeys(device)
  for (const candidate of [label, label.toUpperCase()]) {
    const center = keys.get(candidate)
    if (center) {
      await tap(candidate, center)
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
export async function ensureJapanese(
  device: Device,
  name: string,
): Promise<void> {
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
 * Tap `letters`, then commit them: tap the candidate when Gboard offers it, otherwise Space or, when the
 * candidate is required, fail, or leave the composition open. A `literal` run of `TEXT_SYMBOLS` is typed
 * off the letter layout. Each tap that types goes through `tap`. Returns the candidate or `space` that
 * committed them, `undefined` for `none`.
 */
async function compose(
  device: Device,
  name: string,
  result: Record<string, unknown>,
  {
    letters,
    literal,
    keyboard,
    commit,
    candidateRequired,
    position,
    tap,
  }: {
    letters: string
    literal: boolean
    keyboard: RunOnDeviceOptions['keyboard'] | undefined
    commit: Commit
    candidateRequired: boolean
    position: number
    tap: (label: string, center: [number, number]) => Promise<void>
  },
): Promise<string | undefined> {
  // A run of symbols is typed in one trip off the letter layout, so Space between them is the symbol
  // layout's.
  for (const run of literal ? symbolRuns(letters) : [letters]) {
    if (literal && TEXT_SYMBOLS.includes(run[0]!)) {
      await typeSymbols(device, keyboard!, run, tap)
      continue
    }
    for (const key of run) {
      await tapKey(device, key, tap)
    }
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
    await tap(wanted!, candidate)
    picked = wanted!
  } else if (wanted !== undefined && candidateRequired) {
    throw new Error(
      `Gboard did not offer the candidate ${pyRepr(wanted)} in step ${position}, candidates ${pyRepr(result[`candidates${position}`])}`,
    )
  } else {
    keys = await gboardKeys(device)
    // The Japanese layout labels its space key スペース.
    await tapKey(device, keys.has('スペース') ? 'スペース' : 'Space', tap)
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

async function tapRole(
  device: Device,
  role: KeyRole,
  tap: (label: string, center: [number, number]) => Promise<void>,
): Promise<void> {
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
  await tap(key.label, key.center)
  // Paces taps at a typist's speed, as `tapKey` does.
  await sleep(0.4)
}

// The selection in the field the driver types into, in UTF-16 offsets of the field's text. `null` when
// it is outside the field.
const FIELD_SELECTION = `(() => { const field = typeof window.__field === 'function' ? window.__field() : null; if (!field) return null; if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) { const backward = field.selectionDirection === 'backward'; return {text: field.value, anchor: backward ? field.selectionEnd : field.selectionStart, focus: backward ? field.selectionStart : field.selectionEnd}; } const selection = getSelection(); if (!selection || !selection.rangeCount || !field.contains(selection.anchorNode) || !field.contains(selection.focusNode)) return null; const offset = (node, nodeOffset) => { const range = document.createRange(); range.setStart(field, 0); range.setEnd(node, nodeOffset); return range.toString().length; }; return {text: field.textContent, anchor: offset(selection.anchorNode, selection.anchorOffset), focus: offset(selection.focusNode, selection.focusOffset)}; })()`

// The page's `window.__state()`, the field's selection and whether it has focus from one evaluation, so no
// event can land between them.
const FIELD_BOUNDARY = `({state: window.__state(), selection: ${FIELD_SELECTION}, focused: ${FIELD_FOCUSED}})`

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

/** `text` split into runs of `TEXT_SYMBOLS` and runs of other characters, in order. */
function symbolRuns(text: string): string[] {
  const runs: string[] = []
  for (const character of text) {
    const last = runs.at(-1)
    if (
      last !== undefined &&
      TEXT_SYMBOLS.includes(last[0]!) === TEXT_SYMBOLS.includes(character)
    ) {
      runs[runs.length - 1] = last + character
    } else {
      runs.push(character)
    }
  }
  return runs
}

function isAscii(value: string): boolean {
  return /^\p{ASCII}*$/u.test(value)
}
