// A case is data: a list of steps that `runOnDevice` drives on the keyboard, and one record per step of
// what the page held after it.

/** One event `recordInput` recorded in the page. */
export type PageEvent = {type: string; [key: string]: unknown}

/**
 * Where the selection sat in the field, in grapheme clusters from the start of the field's text: its
 * `value` for a `textarea` or an `input` and its text content otherwise.
 */
export type GraphemeSelection = {anchor: number; focus: number}

/**
 * How a `compose` step ends: tap the conversion `candidate`, or Space when Gboard does not offer it, tap
 * Space, or leave the composition open for the next step.
 */
export type Commit = {candidate: string} | 'space' | 'none'

/**
 * Tap keys on the keyboard and commit what they composed. `letters` names the keys to tap, one character
 * each, for example the romaji `kyou` on Japanese QWERTY. `text` names the text to compose, which a
 * backend maps to its keys: Gboard's English layout drives lowercase a to z, and Japanese QWERTY none,
 * since it composes kana from romaji. `commit` defaults to `'space'`.
 *
 * `letters` names keys, not the text they type. Gboard names a letter key by its lowercase letter a to z
 * on both layouts, and a case with any other character is unsupported, a capital included: whether a
 * key types a capital is Gboard's to decide, by auto-capitalisation or its Shift state, which
 * `runOnDevice` does not drive yet. `letters: 'k'` taps the K key whether Gboard shows it as `k` or `K`.
 */
export type ComposeStep =
  | {type: 'compose'; letters: string; text?: never; commit?: Commit}
  | {type: 'compose'; text: string; letters?: never; commit?: Commit}

/** Tap Enter. */
export type EnterStep = {type: 'enter'}

/** Tap Backspace `times` times, once by default. */
export type BackspaceStep = {type: 'backspace'; times?: number}

export type Step = ComposeStep | EnterStep | BackspaceStep

/**
 * `done` when the step ran, `failed` when it threw, which ends the attempt, and `skipped` for a step that
 * never ran because an earlier one failed.
 */
export type StepStatus = 'done' | 'failed' | 'skipped'

/**
 * What one step did. Every step type has this shape.
 *
 * A step that ran is bounded by two boundaries, each one page evaluation that returns the page's text,
 * the selection and its event count together. The first boundary is read after the field is focused,
 * right before the first step, and one more after every step, which is the next step's boundary before
 * it. The step's `events` are the events between its boundary before and its boundary after, so an
 * event the page recorded before the first boundary, while loading or focusing the field, is in no
 * record, and every other event is in exactly one.
 */
export type StepRecord = {
  type: Step['type']
  status: StepStatus
  /** Why the step is not `done`. */
  reason?: string
  /** The page's text at the boundary after the step, `null` for a step that did not run. */
  textAfter: string | null
  /**
   * The selection in the field at the boundary after the step, `null` when it is outside the field or the
   * step did not run.
   */
  selectionAfter: GraphemeSelection | null
  /** The events the page recorded between the boundary before the step and the boundary after it. */
  events: PageEvent[]
}

/** What `runOnDevice` opens and drives. */
export type RunOnDeviceOptions = {
  /**
   * The page to type into, served on the host. A `localhost` port is reversed to the device with
   * `adb reverse`. The driver sets `prefix` as its `prefix` search parameter, and the page installs
   * `window.__state` with `recordInput` from `thumbjar/page`.
   */
  url: string
  /** `ja` switches Gboard to its Japanese QWERTY layout first, `en` leaves it on English. */
  keyboard: 'ja' | 'en'
  /** Text the field holds before the first step, `''` for an empty field. */
  prefix: string
  steps: Step[]
}

/** One record per step and the page's state at the boundary after the last one. */
export type Run = {
  steps: StepRecord[]
  /** The text at the last boundary. */
  text: string | null
  /**
   * The selection at the last boundary, `null` when it is outside the field. A case with no steps reads
   * one boundary, so its selection is the field's selection at that boundary.
   */
  selection: GraphemeSelection | null
  /**
   * The events from the first boundary to the last, the steps' `events` in order. An event the page
   * recorded before the first step's boundary is not in it.
   */
  events: PageEvent[]
}
