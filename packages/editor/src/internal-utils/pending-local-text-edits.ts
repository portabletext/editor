import {TYPE_DEBOUNCE} from '../editor/mutation-batcher'
import {safeStringify} from './safe-json'

/**
 * A local `insert.text`/`remove.text` operation applied to a span, recorded
 * so an incoming remote `diffMatchPatch` for that same span can be placed
 * correctly relative to this editor's own edit, instead of relying on
 * `@sanity/diff-match-patch`'s fuzzy string matching to guess a position in
 * text it was never diffed against.
 *
 * An entry stays useful for as long as a remote peer's own diff might still
 * be computed against text that predates it — which this editor has no
 * direct way to know, since patches don't carry the sender's clock. `time`
 * lets `pruneStaleLocalTextEdits` expire entries after a generous timeout
 * instead of clearing them as soon as they're first used: a single remote
 * edit typically arrives as several patches in sequence (e.g. one per
 * keystroke), each still diffed against that same predates-this-edit base,
 * so the entry needs to survive across all of them. See
 * `getPendingLocalTextEditsKey` for how spans are keyed.
 */
export type PendingLocalTextEdit = {
  type: 'insert.text' | 'remove.text'
  offset: number
  text: string
  time: number
}

/**
 * How long a local edit stays available to reposition incoming remote
 * patches against, well beyond realistic round-trip-plus-debounce latency
 * for the race this exists to resolve, but still bounded so a session with
 * no conflicting edits doesn't grow this forever.
 */
export const PENDING_LOCAL_TEXT_EDIT_MAX_AGE_MS = 10_000

/**
 * Drops entries too old to plausibly still matter, so a long editing
 * session without any conflicting remote edits doesn't grow this
 * unbounded, and so a very late remote patch falls back to matching
 * against live text rather than being repositioned using a local edit that
 * may no longer reflect what the remote side has since seen.
 */
export function pruneStaleLocalTextEdits(
  edits: ReadonlyArray<PendingLocalTextEdit>,
  now: number,
): Array<PendingLocalTextEdit> {
  return edits.filter(
    (edit) => now - edit.time <= PENDING_LOCAL_TEXT_EDIT_MAX_AGE_MS,
  )
}

/**
 * Keys `editor.pendingLocalTextEdits` by the span's own path (JSON-stable
 * since Portable Text paths are keyed, not indexed, at this depth).
 */
export function getPendingLocalTextEditsKey(spanPath: unknown): string {
  return safeStringify(spanPath)
}

/**
 * Undoes `edits` against `liveText`, in reverse order, to reconstruct what
 * the span's text looked like before any of them were applied. This is the
 * text a concurrent remote edit's diff was actually computed against.
 */
export function reconstructTextBeforeLocalEdits(
  liveText: string,
  edits: ReadonlyArray<PendingLocalTextEdit>,
): string {
  let text = liveText
  for (let index = edits.length - 1; index >= 0; index--) {
    const edit = edits[index]!
    if (edit.type === 'insert.text') {
      text =
        text.slice(0, edit.offset) + text.slice(edit.offset + edit.text.length)
    } else {
      text = text.slice(0, edit.offset) + edit.text + text.slice(edit.offset)
    }
  }
  return text
}

/**
 * A burst this fresh (i.e. its most recent edit) is likely still
 * in-progress — `mutation-batcher.ts` wouldn't have flushed it yet either.
 * A remote change landing at the same anchor is treated as having been
 * committed and sent before this local, still-growing edit reached anyone,
 * so it wins the tie (see `mapOffsetThroughLocalEdits`).
 *
 * This has to key off the burst's most recent edit, not each edit's own
 * age: a steady typing cadence (e.g. one keystroke every ~150ms) can push
 * an early keystroke's own age past this threshold well before the user
 * has actually paused.
 */
const ACTIVE_BURST_THRESHOLD_MS = TYPE_DEBOUNCE

/**
 * Maps an offset from the coordinate space of the text before `edits` (see
 * `reconstructTextBeforeLocalEdits`) forward to the live text's coordinate
 * space, by replaying `edits` in their original order and tracking how each
 * one shifts positions after it.
 *
 * Neither side knows the other's real edit time, so ties (a local edit
 * starting exactly at `offset`) are resolved with a proxy: is `edits`
 * still fresh enough to plausibly be an in-progress burst (see
 * `ACTIVE_BURST_THRESHOLD_MS`)? If so, the remote change wins the tie and
 * lands before it — an incoming change is unlikely to be older than an
 * edit this editor is still actively making. Otherwise the burst is
 * treated as already settled, and the remote change is placed after it.
 */
export function mapOffsetThroughLocalEdits(
  offset: number,
  edits: ReadonlyArray<PendingLocalTextEdit>,
  now: number,
): number {
  const mostRecentEditTime = edits.reduce(
    (latest, edit) => Math.max(latest, edit.time),
    -Infinity,
  )
  const burstIsSettled = now - mostRecentEditTime >= ACTIVE_BURST_THRESHOLD_MS

  let mapped = offset
  for (const edit of edits) {
    const isTie = edit.offset === mapped
    if (edit.offset < mapped || (isTie && burstIsSettled)) {
      mapped +=
        edit.type === 'insert.text' ? edit.text.length : -edit.text.length
    }
  }
  return mapped
}
