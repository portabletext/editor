// What Gboard's suggestion strip showed around a Space that commits a word, in a call with an English
// `crash`, kept to explain a Space the page lacks.
//
// While a word is typed, English Gboard's strip offers completions of it, the word itself first. Once
// Gboard commits the word on a Space, the strip offers predictions of the next word instead. A tap in
// Gboard's window that hits no key leaves the completions. A switch never decides the outcome: a dump's
// times bound its request, not the age of the snapshot it returns, so a strip can be older than it looks,
// and Gboard resets its strip when it restarts its input, see `scripts/lib/logcat.ts`. Japanese Gboard's
// strip offers conversions of the reading, never completions of the romaji tapped, so it has no such switch.
//
// The strips come from the dumps the driver takes anyway to find a key before its tap, so a call with a
// Space to check sends the device the same calls between its first and last input as one without.

import {packageKeys, parseXml} from './hierarchy.ts'
import type {Device} from './u2.ts'
import {errorRepr, phase, sleep} from './util.ts'

const GBOARD = 'com.google.android.inputmethod.latin'
const CANDIDATES = `${GBOARD}:id/softkey_holder_fixed_candidates`
const SPACES = /[  　]/

type Keys = Map<string, [number, number]>

/**
 * The dump `gboardKeysWithDump` returned, how many dumps it took, whether it is still partial, and the
 * host's times, in milliseconds, of its request and its answer.
 */
export type KeyDump = {keys: Keys; xml: string; dumps: number; partial: boolean; started: number; ended: number}

/**
 * `gboardKeys` for a call with an English `crash`, which also returns the dump whose keys it returns, how
 * many dumps it took and whether the last was still `partial`. keep-in-sync: the dumps, the retries and
 * the pause between them are `gboardKeys`' in `scripts/lib/typing.ts`, so the device sees the same calls.
 */
export async function gboardKeysWithDump(device: Device, partial: (keys: Keys) => boolean): Promise<KeyDump> {
  let keys: Keys = new Map()
  let xml = ''
  let started = 0
  let ended = 0
  for (let attempt = 0; attempt < 8; attempt++) {
    started = Date.now()
    xml = await device.dumpHierarchy()
    ended = Date.now()
    keys = packageKeys(xml, GBOARD)
    if (!partial(keys)) return {keys, xml, dumps: attempt + 1, partial: false, started, ended}
    phase(`a11y dump incomplete, ${keys.size} Gboard nodes (attempt ${attempt + 1}), retrying`)
    await sleep(1.5)
  }
  return {keys, xml, dumps: 8, partial: true, started, ended}
}

/** A strip's suggestions, or why a dump gives none to compare. */
export type StripRead = {suggestions: string[]} | {unread: string}

/** The strip of `dump`, unread for a dump of no whole keyboard or one that does not parse. Never throws. */
export function readStrip(dump: {xml: string; partial: boolean}): StripRead {
  if (dump.partial) return {unread: 'the dump held no whole keyboard'}
  try {
    return {suggestions: stripSuggestions(dump.xml)}
  } catch (error) {
    return {unread: `the dump does not parse: ${errorRepr(error)}`}
  }
}

/** The labels of the suggestions in Gboard's strip, in screen order, `[]` for a dump without its suggestion holder. */
export function stripSuggestions(xml: string): string[] {
  const nodes = parseXml(xml).filter((node) => node.tag === 'node' && node.attrs.package === GBOARD)
  const holder = nodes.find((node) => node.attrs['resource-id'] === CANDIDATES)
  if (holder === undefined) return []
  const [left, top, right, bottom] = bounds(holder.attrs.bounds!)
  return nodes
    .map((node) => ({label: node.attrs['content-desc'] || node.attrs.text || '', at: bounds(node.attrs.bounds!)}))
    .filter(({label, at}) => label !== '' && at[0] >= left && at[1] >= top && at[2] <= right && at[3] <= bottom)
    .sort((first, second) => first.at[0] - second.at[0])
    .map(({label}) => label)
}

/** Whether `suggestions` complete `letters`: one of them begins with the letters, whatever their case. */
export function completes(suggestions: string[], letters: string): boolean {
  return suggestions.some((suggestion) => suggestion.toLowerCase().startsWith(letters.toLowerCase()))
}

/** Whether the strip held completions of `letters` before the tap, and after it holds suggestions, none a completion. */
export function stripSwitched(before: string[], after: string[], letters: string): boolean {
  return completes(before, letters) && after.length > 0 && !completes(after, letters)
}

/**
 * Whether the page shows the Space after its tap: it logged a `beforeinput` of a space since the read once
 * the word's letters were tapped, `before`, or its text in `after` ends in one.
 */
export function pageGotSpace(
  before: {events: Array<{type: string; data?: unknown}>},
  after: {text: string | null; events: Array<{type: string; data?: unknown}>},
): boolean {
  return (
    after.events.slice(before.events.length).some((event) => event.type === 'beforeinput' && typeof event.data === 'string' && SPACES.test(event.data)) ||
    SPACES.test((after.text ?? '').slice(-1))
  )
}

function bounds(value: string): [number, number, number, number] {
  return value.replaceAll('][', ',').replace(/^[[\]]+|[[\]]+$/g, '').split(',').map(Number) as [number, number, number, number]
}
