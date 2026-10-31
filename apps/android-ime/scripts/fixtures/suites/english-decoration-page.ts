import {beforeEach, inject, vi} from 'vitest'

// `editor.html?decorate=you` for `tests/en.crashes.test.ts` on the fake Gboard of
// `gboard-with-layouts.ts`, its state derived from the keys tapped so far. Like the page, it logs the
// decoration ranges on load and again on each change of the value, the same ranges included, and a
// decoration that mounts for each `you` the editor is handed.
// `inject('englishPage')` picks what the page does.
export type EnglishPage = {
  /** The page decorates nothing, as without `decorate`. */
  undecorated?: true
  /**
   * The page logs the ranges it computes but never hands them to the editor, as without the editable's
   * `rangeDecorations`, so no decoration mounts.
   */
  undelivered?: true
  /** Gboard opens a composition for each word and closes it on Space, which English Gboard never does. */
  composes?: true
}

declare module 'vitest' {
  interface ProvidedContext {
    englishPage: EnglishPage
  }
}

// The file calls the driver on real timers, so its pauses for Gboard are skipped.
vi.mock(import('../../lib/util.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  sleep: async () => {},
}))

beforeEach(({task}) => {
  const page = inject('englishPage')
  const prefix = /after yo/.test(task.name) ? 'yo' : ''
  globalThis.fakeGboard({
    lang: 'en',
    page: (taps) => {
      const texts = [{text: prefix, composing: false}]
      const events: Array<{type: string}> = []
      let open = false
      for (const tap of taps) {
        const {text} = texts.at(-1)!
        if (tap === 'Space') {
          if (open) events.push({type: 'compositionend'})
          open = false
          texts.push({text: `${text} `, composing: false})
          continue
        }
        if (!/^[A-Z]$/.test(tap)) continue
        if (page.composes && !open) events.push({type: 'compositionstart'})
        if (page.composes) events.push({type: 'compositionupdate'})
        open = page.composes === true
        // Gboard capitalizes the first letter of a block.
        texts.push({
          text: text + (text === '' ? tap : tap.toLowerCase()),
          composing: open,
        })
      }
      const committed = page.undecorated
        ? []
        : texts.map(({text, composing}) =>
            Array.from({length: text.split('you').length - 1}, () => ({
              text: 'you',
              composing,
            })),
          )
      const decorated = page.undelivered
        ? []
        : committed.flatMap((ranges, index) =>
            ranges.slice((committed[index - 1] ?? []).length),
          )
      return {
        text: texts.at(-1)!.text,
        blocks: 1,
        events,
        errors: [],
        decorated: decorated.map(({text, composing}) => ({
          text,
          composing,
          live: text,
        })),
        deletions: [],
        committed,
      }
    },
  })
})
