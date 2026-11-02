import {EventEmitter} from 'node:events'
import {mkdtempSync, readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {PassThrough} from 'node:stream'
import {vi} from 'vitest'
import {PageExceptionError} from '../../device/cdp.ts'
import {currentSignal} from '../../device/util.ts'
import {FIELD_FOCUSED, FIELD_RECT} from '../../gboard/field.ts'
import {packageNodes, parseXml} from '../../gboard/hierarchy.ts'

// A fake device the real driver runs on: Gboard shows the recorded dumps of its layouts, a tap on a key
// edits the page's field the way Chrome does, Chrome runs in a process whose pid the device shell reports,
// and every `adb` call runs the real `adb` module on a fake process that writes its stdout and its stderr
// apart, so a scripted failure or timeout is the error adb's own would be.
//
// The English letters open the symbols with `Symbol keyboard`, closed by `Letter keyboard`. Japanese
// QWERTY opens the ASCII alphabet layout with `アルファベット入力キーボード`, whose `数字キーボード` opens the
// numeric pad. The pad's `記号キーボード` opens the rich symbol panel, whose `文字キーボード` leads back to
// the pad, and its `かな入力キーボード` leads back to romaji. Japanese letters compose, and Space, Enter or
// the candidate the strip offers commits them. The fake converts no romaji.

type Layout = 'letters' | 'symbols' | 'alphabet' | 'numbers' | 'richSymbols'

/**
 * How an adb process answers: what it writes on each stream and its exit code, never until it is sent
 * SIGTERM, or never at all, outliving SIGKILL.
 */
type ProcessAnswer =
  | {stdout: string; stderr: string; code: number}
  | 'hangs'
  | 'outlives SIGKILL'

const device = vi.hoisted(() => {
  const initial = () => ({
    keyboard: 'en' as 'en' | 'ja',
    layout: 'letters' as Layout,
    text: '',
    composing: '',
    focused: true,
    /** The candidate the strip offers once letters are composing, none when `undefined`. */
    candidate: undefined as string | undefined,
    /** Chrome's pid, `0` while it does not run. */
    chromePid: 100,
    /** The pid the next Chrome starts in. */
    nextPid: 101,
    /** Whether `am force-stop` stops Chrome. */
    forceStopStops: true,
    /** Whether the dump right after a layout key's tap is still the previous layout's, once per tap. */
    laggingLayoutDump: false,
    /** The layout the next dump shows instead of the current one, `undefined` when it is not lagging. */
    staleLayout: undefined as Layout | undefined,
    attempt: 0,
    taps: 0,
    /** The tap of each attempt, the field's being the first, that the device rejects. */
    rejectedTaps: [] as Array<number | undefined>,
    /** Whether a rejected tap still reaches Gboard. */
    rejectedTapLands: false,
    /** What a rejected tap rejects with, `injected tap <n> was rejected` unless set. */
    rejectedTapError: undefined as unknown,
    /** The tap of each attempt that reaches Gboard and is never answered. */
    hungTaps: [] as Array<number | undefined>,
    /** The tap of each attempt after which the field loses focus. */
    blurringTaps: [] as Array<number | undefined>,
    /** The read of the page's state, counting from 1, from which on every read of each attempt fails. */
    lostReads: [] as Array<number | undefined>,
    /** The read of the page's state, counting from 1, from which on no read of each attempt answers. */
    hungReads: [] as Array<number | undefined>,
    /** The read of the page's state of each attempt, counting from 1, that throws an exception in the page. */
    pageExceptionReads: [] as Array<number | undefined>,
    /** The tap of each attempt after which no accessibility dump answers, the failure dump's included. */
    hungDumpsAfterTap: [] as Array<number | undefined>,
    /** The accessibility dump of each attempt, counting from 1, from which on every dump rejects. */
    rejectedDumpsFrom: [] as Array<number | undefined>,
    dumps: 0,
    /** What uiautomator2's `info` rejects with while it is not ready, once per entry. */
    infoErrors: [] as unknown[],
    /** What the page's readiness check over CDP rejects with while it is not ready, once per entry. */
    pageLoadErrors: [] as unknown[],
    reads: 0,
    /**
     * Answers for the `adb` calls whose arguments match, each used once, in order. `device` leaves the call
     * to the fake device.
     */
    adbAnswers: [] as Array<{match: RegExp; answer: ProcessAnswer | 'device'}>,
    getState: {stdout: 'device\n', stderr: '', code: 0} as ProcessAnswer,
    /**
     * The attempts, Chrome's starts and stops, its pid reads, `adb get-state`, every scripted `adb` call and
     * every tap, in order.
     */
    calls: [] as string[],
    /** Each page evaluation of the attempt once the field is focused: `focused`, `boundary` or `state`. */
    evaluations: [] as string[],
  })
  return Object.assign(initial(), {
    reset() {
      Object.assign(this, initial())
    },
  })
})

const fixture = (name: string) =>
  readFileSync(new URL(`../${name}`, import.meta.url), 'utf8')
const dumps = {
  en: {
    letters: fixture('en-keyboard.xml'),
    symbols: fixture('en-symbols.xml'),
  },
  ja: {
    letters: fixture('ja-keyboard.xml'),
    alphabet: fixture('ja-alphabet.xml'),
    numbers: fixture('ja-numbers.xml'),
    richSymbols: fixture('ja-rich-symbols.xml'),
  },
}
const kanaStrip = fixture('ja-strip-kana.xml')
const kanjiStrip = fixture('ja-strip-kanji.xml')

const GBOARD = 'com.google.android.inputmethod.latin'

/** The layout a tap on each layout key opens. */
const LAYOUT_KEYS: Record<string, Layout> = {
  'Symbol keyboard': 'symbols',
  'Letter keyboard': 'letters',
  'アルファベット入力キーボード': 'alphabet',
  '数字キーボード': 'numbers',
  '記号キーボード': 'richSymbols',
  'かな入力キーボード': 'letters',
  '文字キーボード': 'numbers',
}

/** What a tap on a key types, for a key not labelled with what it types. */
const TYPED: Record<string, string> = {
  Dash: '-',
  ダッシュ: '-',
}

vi.mock(import('node:child_process'), async (importOriginal) => ({
  ...(await importOriginal()),
  spawn: ((_file: string, args: string[]) => {
    const answer = adbAnswer(args)
    const stdout = new PassThrough()
    const stderr = new PassThrough()
    const child = Object.assign(new EventEmitter(), {
      pid: 4343,
      stdout,
      stderr,
      kill: () => {
        if (answer === 'hangs') {
          setImmediate(() => child.emit('close', null))
        }
        return true
      },
    })
    if (typeof answer === 'object') {
      stdout.end(answer.stdout)
      stderr.end(answer.stderr)
      // A process closes once its streams delivered what it wrote.
      setImmediate(() => child.emit('close', answer.code))
    }
    return child
  }) as never,
}))

vi.mock(import('../../device/cdp.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  targets: () => Promise.resolve([]),
  cdpEval: (expression: string) => {
    try {
      const reply = pageReply(expression)
      return reply === HANGS ? untilAborted() : Promise.resolve(reply)
    } catch (error) {
      return Promise.reject(error)
    }
  },
}))

vi.mock(import('../../device/u2.ts'), async (importOriginal) => {
  const connected = {
    waitTimeout: 20,
    info: () => {
      const error = device.infoErrors.shift()
      if (error !== undefined) {
        device.calls.push('uiautomator2 info rejected')
        return Promise.reject(error)
      }
      return Promise.resolve({productName: 'fake'})
    },
    windowSize: () => Promise.resolve<[number, number]>([1080, 2400]),
    appCurrent: () =>
      Promise.resolve({
        package: 'com.android.chrome',
        activity: 'Main',
        pid: device.chromePid,
      }),
    screenshot: async () => {},
    dumpHierarchy: () => {
      device.dumps += 1
      const rejectedFrom = device.rejectedDumpsFrom[device.attempt - 1]
      if (rejectedFrom !== undefined && device.dumps >= rejectedFrom) {
        return Promise.reject(new Error('injected dump was rejected'))
      }
      const after = device.hungDumpsAfterTap[device.attempt - 1]
      const dump =
        after !== undefined && device.taps >= after
          ? untilAborted()
          : Promise.resolve(currentDump(device.staleLayout ?? device.layout))
      device.staleLayout = undefined
      return dump
    },
    click: (xCoordinate: number, yCoordinate: number) => {
      device.taps += 1
      const tap = device.taps
      const rejected = device.rejectedTaps[device.attempt - 1] === tap
      const hung = device.hungTaps[device.attempt - 1] === tap
      device.calls.push(
        `tap ${keyLabel(xCoordinate, yCoordinate)}${rejected ? ' rejected' : ''}${hung ? ' never answered' : ''}`,
      )
      if (!rejected || device.rejectedTapLands) {
        press(xCoordinate, yCoordinate)
      }
      if (device.blurringTaps[device.attempt - 1] === tap) {
        device.focused = false
      }
      if (hung) {
        return untilAborted()
      }
      return rejected
        ? Promise.reject(
            device.rejectedTapError ??
              new Error(`injected tap ${tap} was rejected`),
          )
        : Promise.resolve()
    },
    swipe: async () => {},
    close: async () => {},
    find: () => ({
      exists: () => Promise.resolve(false),
      click: async () => {},
      getText: () => Promise.resolve(''),
    }),
  }
  return {
    ...(await importOriginal()),
    Device: {connect: () => Promise.resolve(connected)} as never,
  }
})

/** How the adb process for `args` answers. */
function adbAnswer(args: string[]): ProcessAnswer {
  const command = args.join(' ')
  const call = callName(args)
  if (command === 'get-state') {
    device.calls.push('get-state')
    return device.getState
  }
  const scripted = device.adbAnswers.findIndex(({match}) => match.test(command))
  const answer =
    scripted === -1
      ? 'device'
      : device.adbAnswers.splice(scripted, 1)[0]!.answer
  if (call !== command || answer !== 'device') {
    device.calls.push(call)
  }
  return answer === 'device' ? deviceAnswer(args) : answer
}

/** How the fake device answers `args`, and what the call does to it. */
function deviceAnswer(args: string[]): ProcessAnswer {
  const command = args.join(' ')
  const call = callName(args)
  const output = (stdout: string) => ({stdout, stderr: '', code: 0})
  if (args.includes('input_method')) {
    return output('mInputShown=true')
  }
  if (call === 'pidof chrome') {
    const pids = device.chromePid === 0 ? '' : `${device.chromePid}\n`
    if (command.includes('echo')) {
      // The device shell runs the whole command. `pidof` exits 1 when no process matches.
      return output(`${pids}pidof exit ${device.chromePid === 0 ? 1 : 0}\n`)
    }
    return {stdout: pids, stderr: '', code: device.chromePid === 0 ? 1 : 0}
  }
  if (call === 'force-stop chrome' && device.forceStopStops) {
    device.chromePid = 0
  }
  if (call === 'open chrome') {
    // The page seeds its field with the URL's `prefix` each time it loads.
    const url = /https?:\/\/[^\s']+/.exec(command)?.[0]
    device.text =
      url === undefined ? '' : (new URL(url).searchParams.get('prefix') ?? '')
    device.composing = ''
    device.focused = true
    if (device.chromePid === 0) {
      device.chromePid = device.nextPid
      device.nextPid += 1
    }
  }
  return output('')
}

/** A short name for the adb calls the tests follow, the arguments themselves for any other. */
function callName(args: string[]): string {
  const command = args.join(' ')
  if (args[0] === 'shell' && command.includes('pidof com.android.chrome')) {
    return 'pidof chrome'
  }
  if (command === 'shell am force-stop com.android.chrome') {
    return 'force-stop chrome'
  }
  if (args[0] === 'shell' && args[1]?.startsWith('am start')) {
    return 'open chrome'
  }
  return command
}

function currentDump(layout: Layout = device.layout): string {
  if (device.keyboard === 'en') {
    return layout === 'symbols' ? dumps.en.symbols : dumps.en.letters
  }
  if (layout === 'letters' || layout === 'symbols') {
    if (device.composing === '') {
      return dumps.ja.letters
    }
    return device.candidate === undefined ? kanaStrip : kanjiStrip
  }
  return dumps.ja[layout]
}

/** The device hits the key whose bounds contain a tap, so a tap off a key's center still lands on a key. */
function keyAt(xCoordinate: number, yCoordinate: number) {
  const nodes = packageNodes(currentDump(), GBOARD)
  const centered = nodes.find(
    (node) => node.center[0] === xCoordinate && node.center[1] === yCoordinate,
  )
  if (centered !== undefined) {
    return centered
  }
  const hit = parseXml(currentDump()).find((node) => {
    const [left, top, right, bottom] = (node.attrs.bounds ?? '')
      .split(/\D+/)
      .filter(Boolean)
      .map(Number) as [number, number, number, number]
    return (
      node.attrs.package === GBOARD &&
      Boolean(node.attrs['content-desc'] || node.attrs.text) &&
      xCoordinate >= left &&
      xCoordinate < right &&
      yCoordinate >= top &&
      yCoordinate < bottom
    )
  })
  return nodes.find(
    (node) =>
      node.label === (hit?.attrs['content-desc'] || hit?.attrs.text) &&
      node.id ===
        (hit?.attrs['resource-id'] ?? '').replace(`${GBOARD}:id/`, ''),
  )
}

/** The label of the key at `xCoordinate`, `yCoordinate`, `field` for the page's field. */
function keyLabel(xCoordinate: number, yCoordinate: number): string {
  if (xCoordinate === 100 && yCoordinate === 100) {
    return 'field'
  }
  return (
    keyAt(xCoordinate, yCoordinate)?.label ?? `${xCoordinate},${yCoordinate}`
  )
}

function press(xCoordinate: number, yCoordinate: number): void {
  const key = keyAt(xCoordinate, yCoordinate)
  if (key === undefined) {
    return
  }
  const opened = LAYOUT_KEYS[key.label]
  if (opened !== undefined) {
    device.staleLayout = device.laggingLayoutDump ? device.layout : undefined
    device.layout = opened
    return
  }
  if (key.id === 'key_pos_del') {
    if (device.composing === '') {
      device.text = device.text.slice(0, -1)
    } else {
      device.composing = device.composing.slice(0, -1)
    }
    return
  }
  if (key.id === 'key_pos_ime_action' || key.id === 'key_pos_space') {
    const separator = key.id === 'key_pos_space' ? ' ' : '\n'
    device.text += device.composing === '' ? separator : device.composing
    device.composing = ''
    if (
      key.id === 'key_pos_space' &&
      device.keyboard === 'en' &&
      device.layout === 'symbols'
    ) {
      // English Gboard leaves the symbol layout for the letters after Space, as its recorded dump shows.
      device.staleLayout = device.laggingLayoutDump ? device.layout : undefined
      device.layout = 'letters'
    }
    return
  }
  if (device.composing !== '' && key.label === device.candidate) {
    device.text += device.candidate
    device.composing = ''
    return
  }
  const typed = TYPED[key.label] ?? (key.label.length === 1 ? key.label : '')
  if (device.keyboard === 'ja' && device.layout === 'letters') {
    device.composing += typed.toLowerCase()
    return
  }
  device.text += device.layout === 'letters' ? typed.toLowerCase() : typed
}

const HANGS = Symbol('hangs')

/** A device call that never answers, and rejects with the attempt's abort reason as the real ones do. */
function untilAborted(): Promise<never> {
  const signal = currentSignal()
  return new Promise((_, reject) => {
    signal?.addEventListener('abort', () => reject(signal.reason), {
      once: true,
    })
  })
}

function pageReply(expression: string): unknown {
  if (expression === 'document.readyState') {
    const error = device.pageLoadErrors.shift()
    if (error !== undefined) {
      device.calls.push('page readiness rejected')
      throw error
    }
    return 'complete'
  }
  if (expression === 'typeof window.__state') {
    return 'function'
  }
  if (
    expression ===
    "typeof window.__field === 'function' && window.__field() !== null"
  ) {
    return true
  }
  if (expression === 'location.href') {
    return 'http://localhost:8765/editor.html'
  }
  if (expression === FIELD_RECT) {
    device.attempt += 1
    device.taps = 0
    device.reads = 0
    device.dumps = 0
    device.evaluations = []
    device.calls.push(`attempt ${device.attempt}`)
    return {
      x: 100,
      y: 100,
      devicePixelRatio: 1,
      innerHeight: 800,
      screenHeight: 800,
    }
  }
  if (expression === FIELD_FOCUSED) {
    device.evaluations.push('focused')
    return device.focused
  }
  if (
    expression.startsWith('({state: window.__state()') ||
    expression === 'window.__state()'
  ) {
    device.evaluations.push(
      expression === 'window.__state()' ? 'state' : 'boundary',
    )
    device.reads += 1
    const hungFrom = device.hungReads[device.attempt - 1]
    if (hungFrom !== undefined && device.reads >= hungFrom) {
      return HANGS
    }
    if (device.pageExceptionReads[device.attempt - 1] === device.reads) {
      throw new PageExceptionError(
        'Uncaught in `window.__state()`: Error: getSnapshot failed',
      )
    }
    const lostFrom = device.lostReads[device.attempt - 1]
    if (lostFrom !== undefined && device.reads >= lostFrom) {
      throw new Error(`read ${device.reads} of the page failed`)
    }
    const text = device.text + device.composing
    const state = {text, events: []}
    if (expression === 'window.__state()') {
      return state
    }
    const selection = {text, anchor: text.length, focus: text.length}
    // Only an evaluation that reads the active element can answer whether the field has focus.
    return expression.includes('document.activeElement')
      ? {state, selection, focused: device.focused}
      : {state, selection}
  }
  return undefined
}

declare global {
  /** The fake device. Each test resets it and sets it up before it calls the driver. */
  var gboardDevice: typeof device
}
globalThis.gboardDevice = device
process.env.THUMBJAR_OUT_DIR = mkdtempSync(join(tmpdir(), 'thumbjar-device-'))
