import {beforeEach, inject, vi} from 'vitest'
import {frozenLog} from '../../../page/frozen-log.ts'

// `editor.html` for the crash and Enter files on the fake Gboard of `gboard-with-layouts.ts`, its state
// derived from the keys tapped so far. `inject('crashPage')` picks what the page does.
export type CrashPage = {
  /** When the page records the `removeChild` error, or `error` instead. */
  crash?:
    | 'on the last commit'
    | 'before the last commit'
    | 'on the first commit'
  /** An error other than `removeChild`. */
  error?: string
  /** What the page fails to show. */
  missing?:
    | 'composition'
    | 'decoration'
    | 'decoration removal'
    | 'last commit'
    | 'kana range drop'
    | 'dash'
    | 'candidate'
    | 'dispatch'
    | 'deletion'
  /**
   * The last word's render with the new ranges never commits: React supersedes it by a render with the
   * ranges from before the tap, which commits, or abandons it and commits nothing.
   */
  render?: 'superseded' | 'abandoned'
  /** The `delete.text` reaches the page's observer only after the error. */
  deletionAfterError?: true
  /** Only the case that decorates this word records `crash`, as in the run that reproduced it. */
  crashOnlyIn?: 'きょう'
  /** The dash Gboard committed is the full-width `－`, not ASCII `-`. */
  fullWidthDash?: true
  /** Gboard offers no candidate for the first word, so Space commits it as kana when it may. */
  kanaFirstWord?: true
  /**
   * The first attempt's tap back to the letters after Enter hangs until its bound, and the page records
   * its errors only in that attempt, so a retry would type cleanly.
   */
  hungTapBack?: true
  /**
   * The first attempt's screenshot after Enter hangs until the attempt's bound, and the page records its
   * errors only in that attempt, so a retry would type cleanly.
   */
  hungScreenshot?: true
  /** With `hungScreenshot`, the first attempt's state reads hang from then on too. */
  hungRead?: true
  /**
   * The first attempt's Enter tap is rejected, yet still reaches the page after the driver's read once
   * the tap failed, and the page records its errors only in that attempt, so a retry would type cleanly.
   */
  rejectedEnter?: true
}

declare module 'vitest' {
  interface ProvidedContext {
    crashPage: CrashPage
  }
}

// The crash files call the driver on real timers, so its pauses for Gboard are skipped.
vi.mock(import('../../lib/util.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  sleep: async () => {},
}))

const REMOVE_CHILD =
  "NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node."

beforeEach(({task}) => {
  const crashPage = inject('crashPage')
  const lang = task.file.name.includes('/ja.') ? 'ja' : 'en'
  const enter = task.file.name.includes('.enter.')
  const words = /kyou twice/.test(task.name) ? 2 : 1
  const decorate = /きょう/.test(task.name)
    ? 'きょう'
    : /今日/.test(task.name)
      ? '今日'
      : undefined
  globalThis.fakeGboard({
    lang,
    candidate: crashPage.missing === 'candidate' ? '京' : '今日',
    candidateAfterSpace: crashPage.kanaFirstWord ?? false,
    ...(crashPage.hungTapBack ? {hangDumpAfter: 'Enter'} : {}),
    ...(crashPage.hungScreenshot ? {hangScreenshotAfter: 'Enter'} : {}),
    ...(crashPage.hungRead ? {hangReads: true} : {}),
    ...(crashPage.rejectedEnter
      ? {rejectFirst: 'Enter', rejectedLandsLate: true as const}
      : {}),
    page: (taps) => {
      // The retry's page records nothing.
      const page: CrashPage =
        (crashPage.hungTapBack ||
          crashPage.hungScreenshot ||
          crashPage.rejectedEnter) &&
        globalThis.gboardTaps().length > 1
          ? {}
          : crashPage.crashOnlyIn !== undefined &&
              crashPage.crashOnlyIn !== decorate
            ? withoutCrash(crashPage)
            : crashPage
      // A Japanese word is committed by its candidate or as kana by Space, and an Enter word by Enter.
      const kana = enter ? 0 : taps.filter((tap) => tap === 'スペース').length
      const done =
        kana + taps.filter((tap) => tap === (enter ? 'Enter' : '今日')).length
      const composing = lang === 'ja' && taps.at(-1) === 'u'
      const steps = enter
        ? enterSteps(done, page)
        : decorationSteps(decorate, done, kana, composing, words, page)
      // The page's logs, built the way the page builds them, in the order the page saw each step.
      const errors: string[] = []
      const committed = frozenLog<Range[]>(errors)
      const deletions = frozenLog<{at: typeof DASH}>(errors)
      for (const step of steps) {
        if ('error' in step) errors.push(step.error)
        else if ('committed' in step) committed.record(step.committed)
        else deletions.record({at: step.deleted})
      }
      const deleted =
        enter &&
        done === 1 &&
        page.missing !== 'deletion' &&
        page.missing !== 'dispatch' &&
        errors.length === 0
      return {
        text: enter
          ? deleted
            ? ''
            : done === 1
              ? '- \n'
              : page.missing === 'dash'
                ? ' '
                : page.fullWidthDash
                  ? '－ '
                  : '- '
          : 'きょう'.repeat(kana) +
            '今日'.repeat(done - kana) +
            (composing ? 'きょう' : ''),
        blocks: enter && done === 1 && !deleted ? 2 : 1,
        events:
          lang === 'ja' && page.missing !== 'composition'
            ? Array.from({length: done + (composing ? 1 : 0)}, (_, word) => [
                {type: 'compositionstart'},
                ...(word < done ? [{type: 'compositionend'}] : []),
              ]).flat()
            : [],
        errors,
        committed: committed.entries,
        deletions: deletions.entries,
        decorated:
          decorate === undefined || page.missing === 'decoration'
            ? []
            : decorate === 'きょう'
              ? Array.from({length: done + (composing ? 1 : 0)}, (_, word) => ({
                  text: 'きょう',
                  composing: true,
                  live:
                    word === done || word < kana
                      ? 'きょう'
                      : page.missing === 'decoration removal'
                        ? '今日'
                        : null,
                }))
              : Array.from({length: done}, () => ({
                  text: decorate,
                  composing: false,
                  live: decorate,
                })),
      }
    },
  })
})

/** `page` with no `crash`. */
function withoutCrash({crash: _crash, ...page}: CrashPage): CrashPage {
  return page
}

type Range = {text: string; composing: boolean}
type Step = {committed: Range[]} | {deleted: typeof DASH} | {error: string}

// `dissolve-on-break` deletes `- ` from offset 0 to 2 of the block's one span.
const DASH = {
  anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
  focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
}

/**
 * What happened on the page up to `done` words, the first `kana` of them committed as kana by Space, and,
 * while composing, the last word's letters: one commit of ranges when the page loads, one per change, and
 * the error where `page` puts it. `missing` takes the last word's commit after its candidate or the
 * dropped kana range in it, and `render` the commit with the new ranges.
 */
function decorationSteps(
  decorate: string | undefined,
  done: number,
  kana: number,
  composing: boolean,
  words: number,
  page: CrashPage,
): Step[] {
  const error = {error: page.error ?? REMOVE_CHILD}
  const steps: Step[] = []
  const commit = (count: number, open: boolean) => {
    if (decorate !== undefined && page.missing !== 'decoration')
      steps.push({
        committed: Array.from({length: count}, () => ({
          text: decorate,
          composing: open,
        })),
      })
  }
  const decoratesKana = decorate === 'きょう'
  commit(0, false)
  for (let word = 0; word < done + (composing ? 1 : 0); word++) {
    const last = word === words - 1
    // A word committed as kana keeps its range, so each later commit holds one more.
    const kept = Math.min(word, kana)
    commit(decoratesKana ? kept + 1 : word, true)
    if (last && page.crash === 'before the last commit') steps.push(error)
    if (word === done) break
    if (word < kana) {
      commit(decoratesKana ? kept + 1 : word, false)
      continue
    }
    if (last && (page.missing === 'last commit' || page.render === 'abandoned'))
      continue
    if (last && page.render === 'superseded')
      commit(decoratesKana ? kept + 1 : word, false)
    else if (decoratesKana)
      commit(kept + (last && page.missing === 'kana range drop' ? 1 : 0), false)
    else commit(word + 1, false)
    if (word === 0 && page.crash === 'on the first commit') steps.push(error)
  }
  if (done === words && page.crash === 'on the last commit') steps.push(error)
  if (done === words && page.crash === undefined && page.error !== undefined)
    steps.push(error)
  return steps
}

/**
 * What happened on the page before and on Enter: the `delete.text` the Behavior raises, unless `missing`
 * takes it, and the error where `page` puts it, before the deletion with `deletionAfterError`.
 */
function enterSteps(done: number, page: CrashPage): Step[] {
  const error = {error: page.error ?? REMOVE_CHILD}
  const steps: Step[] = []
  if (page.crash === 'before the last commit') steps.push(error)
  if (done === 0) return steps
  const deletion =
    page.missing === 'dispatch' ? [] : [{deleted: DASH} satisfies Step]
  if (page.crash === 'on the last commit' && page.deletionAfterError)
    steps.push(error, ...deletion)
  else if (page.crash === 'on the last commit') steps.push(...deletion, error)
  else steps.push(...deletion)
  if (page.crash === undefined && page.error !== undefined) steps.push(error)
  return steps
}
