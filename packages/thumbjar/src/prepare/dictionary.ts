// Wait for Gboard's Japanese dictionary and check that Gboard converts with it, for the Japanese prep.
//
// Gboard downloads the dictionary after the Japanese layout is added and logs its load from 80 to 176
// seconds after boot. A Mozc session created before that line never converts, `kyou` only ever offers
// きょう, and the switch to Japanese after it rebuilds the session, logging `RELOADED`.
//
// Usage, run by `thumbjar prepare --keyboard ja`:
//   node dist/prepare/dictionary.js wait <outdir> <booted>     wait for the load line until `DICTIONARY_LOAD_SECONDS` after `booted`, host epoch seconds
//   node dist/prepare/dictionary.js check <outdir> <page url>  switch to Japanese, type `kyou` in the page's field and delete it, never committing
// Both read `<outdir>/boot-logcat.txt`, and exit non-zero with a `DICTIONARY FAILED:` line when the
// dictionary is not ready.

import {readFileSync} from 'node:fs'
import {adb, adbOutput} from '../device/adb.ts'
import {Device} from '../device/u2.ts'
import {errorRepr, pyRepr, sleep} from '../device/util.ts'
import {
  bootLines,
  captureFault,
  confirmDictionary,
  dictionaryLines,
  parseCapture,
  waitForDictionary,
  type Capture,
} from '../gboard/dictionary.ts'
import {
  openScratchKeyboard,
  scratchKeyboard,
} from '../gboard/scratch-keyboard.ts'
import {clearChromeTabs, closeChrome} from '../gboard/typing.ts'

const GBOARD = 'com.google.android.inputmethod.latin'
// Each adb call of the wait, so its last read, the version query included, ends within `DICTIONARY_WAIT_TAIL_SECONDS`.
const ADB_SECONDS = 10

function main(): Promise<void> {
  const [mode, out, argument] = process.argv.slice(2)
  if (
    mode === 'wait' &&
    out !== undefined &&
    argument !== undefined &&
    /^\d+$/.test(argument)
  ) {
    return wait(out, Number(argument))
  }
  if (mode === 'check' && out !== undefined && argument !== undefined) {
    return check(out, argument)
  }
  // A rejection, not a throw, so the usage error goes out as a `DICTIONARY FAILED:` line too.
  return Promise.reject(
    new Error(
      'usage: node dist/prepare/dictionary.js wait <outdir> <booted> | check <outdir> <page url>',
    ),
  )
}

async function wait(out: string, booted: number): Promise<void> {
  const bootId = await deviceBootId()
  log(
    `DICTIONARY waiting for the load line until 360s after the emulator came online, now ${secondsSince(booted)}s`,
  )
  const outcome = await waitForDictionary(
    {
      bootId,
      readCapture: () =>
        Promise.resolve(readFileSync(`${out}/boot-logcat.txt`, 'utf8')),
      deviceTime,
      hostTime: () => Date.now() / 1000,
      gboardVersion,
      waiting: (seconds) =>
        log(`DICTIONARY still waiting ${seconds.toFixed(0)}s after boot`),
      sleep,
    },
    booted,
  )
  if (outcome.kind === 'failed') {
    throw new Error(outcome.reason)
  }
  log(
    `DICTIONARY loaded ${(outcome.line.time - booted).toFixed(1)}s after the emulator came online: ${outcome.line.text.trim()}`,
  )
}

async function check(out: string, pageUrl: string): Promise<void> {
  const bootId = await deviceBootId()
  let device: Device | undefined
  try {
    device = await openScratchKeyboard(pageUrl, () => Device.connect())
    const confirmation = await confirmDictionary(
      scratchKeyboard(device, out),
      bootId,
    )
    log(
      `DICTIONARY switch ${confirmation.switch}, strip ${pyRepr(confirmation.labels)}, field ${pyRepr(confirmation.text)} composing=${confirmation.open}`,
    )
    if (confirmation.reloaded !== undefined) {
      log(`DICTIONARY session rebuilt: ${confirmation.reloaded.text.trim()}`)
    }
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
    await device?.close().catch(() => {})
  }
}

function readCapture(out: string): Capture {
  return parseCapture(readFileSync(`${out}/boot-logcat.txt`, 'utf8'))
}

async function deviceBootId(): Promise<string> {
  const bootId = (
    await adb(['shell', 'cat', '/proc/sys/kernel/random/boot_id'], ADB_SECONDS)
  ).trim()
  if (bootId === '') {
    throw new Error('the device gave no boot id')
  }
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

function log(line: string): void {
  process.stdout.write(`${line}\n`)
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    // The first line is the reason `prepare.sh` quotes in its PREP FAILED line.
    console.error(
      `DICTIONARY FAILED: ${error instanceof Error ? error.message : String(error)}`,
    )
    process.exit(1)
  },
)
