// Wait for Gboard's Japanese dictionary and check that Gboard converts with it, for the Japanese device prep.
//
// Gboard downloads the dictionary after the Japanese layout is added and logs its load from 80 to 176
// seconds after boot. A Mozc session created before that line never converts, `kyou` only ever offers
// きょう, and the switch to Japanese after it rebuilds the session, logging `RELOADED`.
//
// Usage:
//   node scripts/dictionary.ts wait <outdir> <booted>   wait for the load line until `DICTIONARY_LOAD_SECONDS` after `booted`, epoch seconds
//   node scripts/dictionary.ts check <outdir>           switch to Japanese, type `kyou` in `plain.html` and delete it, never committing
// Both read `<outdir>/boot-logcat.txt` and exit non-zero with the reason when the dictionary is not ready.

import {randomUUID} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {adb, adbOutput} from './lib/adb.ts'
import {DICTIONARY_LOAD_SECONDS} from './lib/budget.ts'
import {cdpEval, CDP_PORT, setCurrentUrl} from './lib/cdp.ts'
import {
  bootLines,
  captureFault,
  composing,
  confirmDictionary,
  dictionaryLines,
  notLoadedMessage,
  parseCapture,
  waitOutcome,
  type Capture,
  type ScratchKeyboard,
} from './lib/dictionary.ts'
import {
  clearChromeTabs,
  closeChrome,
  dismissChromeScreens,
  ensureJapanese,
  gboardKeys,
  isJapanese,
  openInChrome,
  pageUrl,
  raiseKeyboard,
} from './lib/typing.ts'
import {Device} from './lib/u2.ts'
import {errorRepr, pyRepr, sleep} from './lib/util.ts'

const GBOARD = 'com.google.android.inputmethod.latin'
const PAGE_PORT = 8765
// Each adb call of the wait, so its last read, the version query included, ends within `DICTIONARY_WAIT_TAIL_SECONDS`.
const ADB_SECONDS = 10
const LANGUAGE_KEY = /^(次の言語|next language|switch to|globe)/i

async function main(): Promise<void> {
  const [mode, out, booted] = process.argv.slice(2)
  if (
    mode === 'wait' &&
    out !== undefined &&
    booted !== undefined &&
    /^\d+$/.test(booted)
  )
    return wait(out, Number(booted))
  if (mode === 'check' && out !== undefined) return check(out)
  throw new Error(
    'usage: node scripts/dictionary.ts wait <outdir> <booted> | check <outdir>',
  )
}

async function wait(out: string, booted: number): Promise<void> {
  const bootId = await deviceBootId()
  const deadline = booted + DICTIONARY_LOAD_SECONDS
  console.log(
    `DICTIONARY waiting for the load line until ${DICTIONARY_LOAD_SECONDS}s after boot, now ${secondsSince(booted)}s`,
  )
  let logged = Date.now() / 1000
  for (let read = 0; ; read++) {
    const deadlinePassed = Date.now() / 1000 >= deadline
    const text = readFileSync(`${out}/boot-logcat.txt`, 'utf8')
    // The capture grows to tens of MB, so parse it only for its header, once the load could be in it, and
    // for the verdict.
    if (read === 0 || text.includes('New data is loaded') || deadlinePassed) {
      const capture = parseCapture(text)
      const outcome = waitOutcome(capture, {
        bootId,
        now: await deviceTime(),
        deadlinePassed,
      })
      if (outcome.kind === 'loaded') {
        console.log(
          `DICTIONARY loaded ${(outcome.line.time - booted).toFixed(1)}s after boot: ${outcome.line.text.trim()}`,
        )
        return
      }
      if (outcome.kind === 'capture-fault')
        throw new Error(
          `the boot capture cannot show whether Gboard loaded its Japanese dictionary: ${outcome.reason}`,
        )
      if (outcome.kind === 'not-loaded')
        throw new Error(
          notLoadedMessage(
            await gboardVersion(),
            dictionaryLines(capture, bootId),
            outcome.captureFault,
          ),
        )
    }
    if (Date.now() / 1000 - logged >= 30) {
      logged = Date.now() / 1000
      console.log(
        `DICTIONARY still waiting ${secondsSince(booted)}s after boot`,
      )
    }
    await sleep(2)
  }
}

async function check(out: string): Promise<void> {
  const bootId = await deviceBootId()
  const device = await Device.connect()
  try {
    await adb(['reverse', `tcp:${PAGE_PORT}`, `tcp:${PAGE_PORT}`])
    await adb([
      'forward',
      `tcp:${CDP_PORT}`,
      'localabstract:chrome_devtools_remote',
    ])
    const url = pageUrl('plain.html', '')
    setCurrentUrl(url)
    await openInChrome(url)
    // Chrome draws a first-run or promo screen some time after its activity starts, and nothing signals
    // that none is coming.
    await sleep(4)
    await dismissChromeScreens(device)
    await waitForPage()
    await raiseKeyboard(device, 'dictionary', 'en', url, {})
    const confirmation = await confirmDictionary(
      scratchKeyboard(device, out),
      bootId,
    )
    console.log(
      `DICTIONARY switch ${confirmation.switch}, strip ${pyRepr(confirmation.labels)}, field ${pyRepr(confirmation.text)} composing=${confirmation.open}`,
    )
    if (confirmation.reloaded !== undefined)
      console.log(
        `DICTIONARY session rebuilt: ${confirmation.reloaded.text.trim()}`,
      )
    if (confirmation.failure !== undefined) {
      const capture = readCapture(out)
      const fault = captureFault(capture, bootId, await deviceTime())
      const marked =
        bootLines(capture, bootId).find((line) =>
          line.text.includes(confirmation.marker),
        )?.time ?? -Infinity
      const excerpt = dictionaryLines(capture, bootId)
        .filter(
          (line) =>
            line.time >= marked - 60 ||
            line.text.includes('ensureSession') ||
            line.text.includes('onCurrentInputMethodEntryChanged'),
        )
        .map((line) => line.text.trim())
      throw new Error(
        `Gboard did not convert with its Japanese dictionary after the switch: ${confirmation.failure}.${fault === undefined ? '' : ` The boot capture is incomplete: ${fault}.`}\nLog excerpt:\n${excerpt.join('\n') || '(no dictionary line)'}`,
      )
    }
  } finally {
    await closeChrome()
    await clearChromeTabs()
    await device.close().catch(() => {})
  }
}

function scratchKeyboard(device: Device, out: string): ScratchKeyboard {
  return {
    isJapanese: async () => isJapanese((await gboardKeys(device)).keys()),
    leaveJapanese: async () => {
      const keys = await gboardKeys(device)
      const key = [...keys.keys()].find((label) => LANGUAGE_KEY.test(label))
      if (key === undefined)
        throw new Error(
          `no language key on the Japanese layout, labels ${pyRepr([...keys.keys()].slice(0, 60))}`,
        )
      await device.click(...keys.get(key)!)
      for (let check = 0; check < 10; check++) {
        if (!isJapanese((await gboardKeys(device)).keys())) return
        await sleep(0.5)
      }
      throw new Error(
        'Gboard stayed on Japanese after a tap on its language key',
      )
    },
    switchToJapanese: (beforeSwitch) =>
      ensureJapanese(device, 'dictionary', beforeSwitch),
    markCapture: async () => {
      const marker = `ime-prep-switch-${randomUUID()}`
      await adb(['shell', 'log', '-t', 'ime-prep', marker], ADB_SECONDS)
      return marker
    },
    capture: async () => readCapture(out),
    dump: () => device.dumpHierarchy(),
    typeKyou: async () => {
      const keys = await gboardKeys(device)
      for (const letter of 'kyou') {
        const center = keys.get(letter) ?? keys.get(letter.toUpperCase())
        if (center === undefined)
          throw new Error(`no Gboard key ${pyRepr(letter)}`)
        await device.click(...center)
        await sleep(0.4)
      }
    },
    deleteComposition: async () => {
      for (let tap = 0; tap < 8; tap++) {
        const field = await scratchField()
        if (field.text === '' && !composing(field.events)) return
        const keys = await gboardKeys(device)
        const center = keys.get('削除') ?? keys.get('Delete')
        if (center === undefined)
          throw new Error(
            `no Gboard delete key, labels ${pyRepr([...keys.keys()].slice(0, 60))}`,
          )
        await device.click(...center)
        await sleep(0.4)
      }
    },
    field: scratchField,
    sleep,
  }
}

async function scratchField(): Promise<{
  text: string | null
  events: Array<{type: string}>
}> {
  return (await cdpEval('window.__state()')) as {
    text: string | null
    events: Array<{type: string}>
  }
}

async function waitForPage(): Promise<void> {
  let lastError: unknown
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      if (
        (await cdpEval('document.readyState')) === 'complete' &&
        (await cdpEval('typeof window.__state')) === 'function'
      )
        return
    } catch (error) {
      lastError = error
    }
    await sleep(1)
  }
  throw new Error(
    `the scratch page never loaded over CDP: ${lastError === undefined ? 'None' : errorRepr(lastError)}`,
  )
}

function readCapture(out: string): Capture {
  return parseCapture(readFileSync(`${out}/boot-logcat.txt`, 'utf8'))
}

async function deviceBootId(): Promise<string> {
  const bootId = (
    await adb(['shell', 'cat', '/proc/sys/kernel/random/boot_id'], ADB_SECONDS)
  ).trim()
  if (bootId === '') throw new Error('the device gave no boot id')
  return bootId
}

async function deviceTime(): Promise<number> {
  return Number((await adb(['shell', 'date', '+%s'], ADB_SECONDS)).trim())
}

async function gboardVersion(): Promise<string> {
  try {
    return (
      /versionName=(\S+)/.exec(
        await adbOutput(['shell', 'dumpsys', 'package', GBOARD], ADB_SECONDS),
      )?.[1] ?? 'of unknown version'
    )
  } catch (error) {
    return `of unknown version (${errorRepr(error)})`
  }
}

function secondsSince(booted: number): string {
  return (Date.now() / 1000 - booted).toFixed(0)
}

if (import.meta.main) {
  main().then(
    () => process.exit(0),
    (error: unknown) => {
      console.error(
        `DICTIONARY FAILED: ${error instanceof Error ? error.message : String(error)}`,
      )
      process.exit(1)
    },
  )
}
