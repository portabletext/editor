// Reading `out/boot-logcat.txt`, the capture of the device's `main` log buffer `run-on-device.sh` starts at
// the top of the prep, for Gboard's Japanese dictionary load and the Mozc session that picks it up. Both
// lines are in `main`.
//
// The capture opens with a `CAPTURE` header holding the device's boot id and boot time, its clock less its
// uptime, read when the prep truncated the file. Every reader of it, the seed `adb logcat -d` and each
// start of the background `adb logcat`, writes a `CAPTURE_SEGMENT` marker before its lines, and after the
// seed a `CAPTURE_STATS` line gives logd's count of the lines `main` took since boot and of those it still
// holds. Lines are in `-v epoch` format, device time in seconds, and logcat heads each buffer's lines with
// a `--------- beginning of <buffer>` or `--------- switch to <buffer>` line.

import {DICTIONARY_LOAD_SECONDS} from './budget.ts'
import {parseXml} from './hierarchy.ts'

const GBOARD = 'com.google.android.inputmethod.latin'

/** How long the capture may go without a line before it counts as stopped. A booted Android logs every few seconds. */
export const CAPTURE_STALE_SECONDS = 60

export type CaptureLine = {time: number; text: string}

export type Capture = {
  header: {bootId: string; btime: number} | undefined
  /** The `main` lines of each reader in the order they were written, without the markers. */
  segments: CaptureLine[][]
  /** logd's line counts for `main` after the dump of the segment at `segment`. */
  stats: {segment: number; total: number; now: number} | undefined
}

export function parseCapture(text: string): Capture {
  const capture: Capture = {header: undefined, segments: [], stats: undefined}
  let buffer: string | undefined
  for (const line of text.split(/\r?\n/)) {
    const header = /^CAPTURE boot_id=(\S+) btime=(\d+)$/.exec(line)
    if (header) {
      if (capture.header === undefined && capture.segments.length === 0) capture.header = {bootId: header[1]!, btime: Number(header[2])}
      continue
    }
    if (line.startsWith('CAPTURE_SEGMENT')) {
      capture.segments.push([])
      buffer = undefined
      continue
    }
    const stats = /^CAPTURE_STATS main total=\d+\/(\d+) now=\d+\/(\d+)$/.exec(line)
    if (stats) {
      if (capture.stats === undefined) capture.stats = {segment: capture.segments.length - 1, total: Number(stats[1]), now: Number(stats[2])}
      continue
    }
    const marker = /^-+ (?:beginning of|switch to) (\w+)/.exec(line)
    if (marker) {
      buffer = marker[1]
      continue
    }
    const time = /^\s*(\d+\.\d+)\s/.exec(line)
    if (time && buffer === 'main') capture.segments.at(-1)?.push({time: Number(time[1]), text: line})
  }
  return capture
}

/** Gboard's log line for a Japanese dictionary it finished loading, whatever the dictionary's version. */
export function isDictionaryLoadLine(line: string): boolean {
  return line.includes('data_loader.cc') && line.includes('New data is loaded') && /file_path=\S*\/mozcdata-[^/\s]+\.data\b/.test(line)
}

/** Gboard's log line for a change of its input method to Japanese, which a tap on its language key logs. */
export function isJapaneseEntryLine(line: string): boolean {
  return line.includes('onCurrentInputMethodEntryChanged') && line.includes('entry: ja-JP')
}

/** Gboard's log line for a Mozc session it rebuilt on the loaded dictionary. */
export function isReloadedLine(line: string): boolean {
  return line.includes('ensureSession') && line.includes('Mozc engine reload status: RELOADED')
}

/** The lines that tell how Gboard's Japanese dictionary got on: its download, a fallback engine and its loads. */
export function isDictionaryLine(line: string): boolean {
  return (
    /__MOZCPACK_\w+/.test(line) ||
    line.includes('Fallback to minimal engine') ||
    line.includes('data_loader.cc') ||
    line.includes('Mozc engine reload status')
  )
}

/**
 * Why the capture cannot show that a `main` line is missing, or `undefined` when it can: its first dump
 * held every line `main` took since boot, each restarted reader began on a line the capture already held,
 * and the last reader still wrote up to `now`, device time.
 */
export function captureFault(capture: Capture, bootId: string, now: number): string | undefined {
  const header = headerFault(capture, bootId)
  if (header !== undefined) return header
  const first = capture.segments.findIndex((segment) => segment.length > 0)
  if (first === -1) return 'the capture holds no line of the main buffer'
  const {stats} = capture
  if (stats === undefined || stats.segment !== first)
    return "the capture holds no logd statistics for its first dump of the main buffer, so nothing shows that dump held every line from boot"
  // logd counts the lines a buffer took and the lines it holds, so equal counts after the dump mean it
  // had dropped none, and the dump began at the buffer's first line.
  if (stats.now !== stats.total)
    return `the main buffer had dropped ${stats.total - stats.now} of its ${stats.total} lines by the capture's first dump, so the capture may lack lines from boot on`
  const segments = capture.segments.slice(first).filter((segment) => segment.length > 0)
  const read = new Set(segments[0]!.map((line) => line.text))
  for (const segment of segments.slice(1)) {
    // A restarted reader dumps the buffer again from its oldest line, and the buffer holds an unbroken run
    // of lines, so when the capture already holds that oldest line nothing was lost in between.
    if (!read.has(segment[0]!.text))
      return `the capture has a hole before ${segment[0]!.time.toFixed(3)}: a reader restarted on a main buffer whose oldest line the capture had not read`
    for (const line of segment) read.add(line.text)
  }
  const last = latest(segments.flat())
  if (now - last > CAPTURE_STALE_SECONDS) return `the capture's last line is from ${(now - last).toFixed(0)}s ago, so its reader stopped`
  return undefined
}

// A capture holds a hundred thousand lines and more, too many to spread into `Math.max`.
function latest(lines: CaptureLine[]): number {
  return lines.reduce((last, line) => Math.max(last, line.time), -Infinity)
}

function headerFault(capture: Capture, bootId: string): string | undefined {
  if (capture.header === undefined) return 'the capture has no CAPTURE header, so nothing ties it to this boot'
  if (capture.header.bootId !== bootId) return `the capture is of boot ${capture.header.bootId}, the device runs boot ${bootId}`
  return undefined
}

/** This boot's `main` lines in the capture, in the order they were written. A restarted reader repeats lines. */
export function bootLines(capture: Capture, bootId: string): CaptureLine[] {
  if (capture.header === undefined || capture.header.bootId !== bootId) return []
  const btime = capture.header.btime
  return capture.segments.flat().filter((line) => line.time >= btime)
}

/** This boot's lines that tell how Gboard's Japanese dictionary and its keyboard switches got on, each once. */
export function dictionaryLines(capture: Capture, bootId: string): CaptureLine[] {
  const seen = new Set<string>()
  return bootLines(capture, bootId).filter((line) => {
    if (seen.has(line.text) || !(isDictionaryLine(line.text) || line.text.includes('onCurrentInputMethodEntryChanged'))) return false
    seen.add(line.text)
    return true
  })
}

/** The prep's failure when the load line never came: what was missing, the Gboard version and the lines seen. */
export function notLoadedMessage(gboardVersion: string, lines: CaptureLine[]): string {
  return [
    `Gboard ${gboardVersion} never logged its Japanese dictionary load, a \`data_loader.cc\` \`New data is loaded\` line for a \`mozcdata-<version>.data\` file, within ${DICTIONARY_LOAD_SECONDS}s of boot. Dictionary lines seen:`,
    ...(lines.length === 0 ? ['(none)'] : lines.map((line) => line.text.trim())),
  ].join('\n')
}

export type WaitOutcome =
  | {kind: 'loaded'; line: CaptureLine}
  | {kind: 'waiting'}
  | {kind: 'capture-fault'; reason: string}
  | {kind: 'not-loaded'}

/**
 * Whether this boot's capture shows the dictionary loaded. Past the deadline, a capture that could have
 * missed the line is a capture fault, never a missing load.
 */
export function waitOutcome(capture: Capture, {bootId, now, deadlinePassed}: {bootId: string; now: number; deadlinePassed: boolean}): WaitOutcome {
  const header = headerFault(capture, bootId)
  if (header !== undefined) return {kind: 'capture-fault', reason: header}
  const line = bootLines(capture, bootId).find((candidate) => isDictionaryLoadLine(candidate.text))
  if (line !== undefined) return {kind: 'loaded', line}
  if (!deadlinePassed) return {kind: 'waiting'}
  const fault = captureFault(capture, bootId, now)
  return fault === undefined ? {kind: 'not-loaded'} : {kind: 'capture-fault', reason: fault}
}

/**
 * Whether this boot's capture holds the line with `marker`, and the first `RELOADED` line after the first
 * change to Japanese after that line, within one reader's lines. logd hands a reader `main`'s lines in the
 * order it took them, so only such a line was logged after the switch the marker precedes, however close
 * their timestamps.
 */
export function reloadedAfter(capture: Capture, bootId: string, marker: string): {marked: boolean; reloaded: CaptureLine | undefined} {
  const found: {marked: boolean; reloaded: CaptureLine | undefined} = {marked: false, reloaded: undefined}
  if (capture.header === undefined || capture.header.bootId !== bootId) return found
  const btime = capture.header.btime
  for (const segment of capture.segments) {
    const start = segment.findIndex((line) => line.text.includes(marker))
    if (start === -1) continue
    found.marked = true
    const switched = segment.findIndex((line, index) => index > start && isJapaneseEntryLine(line.text))
    if (switched === -1) continue
    found.reloaded = segment.slice(switched + 1).find((line) => line.time >= btime && isReloadedLine(line.text))
    if (found.reloaded !== undefined) return found
  }
  return found
}

/** The device and the scratch page the confirmation drives. `scripts/dictionary.ts` implements it over uiautomator2 and CDP. */
export type ScratchKeyboard = {
  isJapanese(): Promise<boolean>
  /** Tap Gboard's language key until it shows another language. */
  leaveJapanese(): Promise<void>
  /** Tap Gboard's language key until it shows Japanese QWERTY, running `beforeSwitch` immediately before each tap. */
  switchToJapanese(beforeSwitch: () => Promise<void>): Promise<void>
  /** Log a line of its own to `main` and return the text it holds, a marker no other line holds. */
  markCapture(): Promise<string>
  capture(): Promise<Capture>
  /** The accessibility dump with Gboard showing. */
  dump(): Promise<string>
  /** Tap `k`, `y`, `o` and `u`. */
  typeKyou(): Promise<void>
  /** Tap Delete once more than the field holds characters, never a candidate. */
  deleteComposition(): Promise<void>
  field(): Promise<{text: string | null; events: Array<{type: string}>}>
  sleep(seconds: number): Promise<void>
}

export type Confirmation = {
  switch: 'to-japanese' | 'away-and-back'
  /** The marker logged to `main` immediately before the tap that brought Japanese. */
  marker: string
  /** Whether the marker reached the capture. */
  marked: boolean
  reloaded: CaptureLine | undefined
  labels: string[]
  text: string | null
  open: boolean
  failure: string | undefined
}

/** Reads of the capture for the `RELOADED` line, and of the strip for a kanji candidate, half a second apart. */
const RELOADED_READS = 30
const STRIP_READS = 20

/**
 * Switch Gboard to Japanese so it creates a Mozc session on the loaded dictionary, then type `kyou` in the
 * scratch field, read the strip and delete the composition. A Japanese keyboard that is already showing may
 * hold a session created before the load, so it is switched away and back.
 */
export async function confirmDictionary(keyboard: ScratchKeyboard, bootId: string): Promise<Confirmation> {
  let switchKind: Confirmation['switch'] = 'to-japanese'
  if (await keyboard.isJapanese()) {
    switchKind = 'away-and-back'
    await keyboard.leaveJapanese()
  }
  let marker: string | undefined
  await keyboard.switchToJapanese(async () => {
    marker = await keyboard.markCapture()
  })
  if (marker === undefined) throw new Error('Gboard showed Japanese before any tap on its language key, so no marker precedes the switch')
  let found = reloadedAfter(await keyboard.capture(), bootId, marker)
  for (let read = 1; read < RELOADED_READS && found.reloaded === undefined; read++) {
    await keyboard.sleep(0.5)
    found = reloadedAfter(await keyboard.capture(), bootId, marker)
  }
  const {marked, reloaded} = found
  const idle = await keyboard.dump()
  await keyboard.typeKyou()
  let labels: string[] = []
  for (let read = 0; read < STRIP_READS; read++) {
    labels = stripLabels(idle, await keyboard.dump())
    if (kanjiCandidates(labels).length > 0) break
    await keyboard.sleep(0.5)
  }
  await keyboard.deleteComposition()
  const field = await keyboard.field()
  const open = composing(field.events)
  return {
    switch: switchKind,
    marker,
    marked,
    reloaded,
    labels,
    text: field.text,
    open,
    failure: confirmationFailure({marked, reloaded, labels, text: field.text, open}),
  }
}

/** Gboard's labels on the suggestion strip of `xml` that the idle strip of `idleXml` does not show, in strip order. */
export function stripLabels(idleXml: string, xml: string): string[] {
  const idle = new Set(gboardStripNodes(idleXml))
  return [...new Set(gboardStripNodes(xml).filter((label) => !idle.has(label)))]
}

/** The strip labels that hold a CJK ideograph, a conversion the kana reading alone never offers. */
export function kanjiCandidates(labels: string[]): string[] {
  return labels.filter((label) => /\p{Script=Han}/u.test(label))
}

/** Whether a composition is still open after `events`, the plain page's event log. */
export function composing(events: Array<{type: string}>): boolean {
  let open = false
  for (const event of events) {
    if (event.type === 'compositionstart') open = true
    else if (event.type === 'compositionend') open = false
  }
  return open
}

/**
 * Why the uncommitted check after the dictionary load failed, or `undefined` when Gboard rebuilt its Mozc
 * session on the switch, offered a kanji conversion and left the field empty with no composition open.
 */
export function confirmationFailure({
  marked,
  reloaded,
  labels,
  text,
  open,
}: {
  marked: boolean
  reloaded: CaptureLine | undefined
  labels: string[]
  text: string | null
  open: boolean
}): string | undefined {
  const problems: string[] = []
  if (!marked) problems.push('the line marking the switch never reached the capture, so it cannot show what followed the switch')
  else if (reloaded === undefined) problems.push('no `Mozc engine reload status: RELOADED` line followed the switch to Japanese')
  if (kanjiCandidates(labels).length === 0) problems.push(`kyou brought no kanji candidate, the strip showed ${JSON.stringify(labels)}`)
  if (text !== '') problems.push(`the scratch field holds ${JSON.stringify(text)} after the deletion`)
  if (open) problems.push('a composition is still open in the scratch field after the deletion')
  return problems.length === 0 ? undefined : problems.join(', ')
}

// The suggestion strip's labels: Gboard's labelled nodes outside its keys and the system's navigation bar.
// The keys, `疑問符` and `削除` among them, hold ideographs of their own.
function gboardStripNodes(xml: string): string[] {
  return parseXml(xml)
    .filter((node) => node.tag === 'node' && node.attrs.package === GBOARD)
    .filter((node) => {
      const id = node.attrs['resource-id'] ?? ''
      return !id.includes(':id/key_pos_') && !id.startsWith('android:id/')
    })
    .map((node) => node.attrs['content-desc'] || node.attrs.text || '')
    .filter((label) => label !== '')
}
