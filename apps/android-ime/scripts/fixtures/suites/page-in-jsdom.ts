import {JSDOM, ResourceLoader} from 'jsdom'
import {createElement} from 'react'
import {beforeEach, expect, inject, vi} from 'vitest'
import {populateGlobal} from 'vitest/runtime'
import type {TypeOnDeviceOptions, Typed} from '../../driver.ts'
import {
  compositionstartPerWord,
  decoratedPerWord,
  distinctRanges,
  nestedCompositionstart,
  pageUrl,
  unmetEvidence,
  type LogLengths,
} from '../../lib/typing.ts'

// Types the crash and Enter cases' words into the real `editor.html` in jsdom instead of on a device, so
// the cases run against the page's own decorations, Behaviors and `__state()`. Each word's `expect` and
// the case's `crash` are checked where the driver checks them. jsdom has no input method: a Japanese word
// is a `compositionstart`, its kana inserted as text, the candidate inserted over them and a
// `compositionend`, an English word is its letters and a space, each inserted as text, and Enter is an
// `insertParagraph` `beforeinput`.
//
// The user agent is desktop Chrome's, not Android's. With Android's, the editor's Android input manager
// handles the input, and it applies text from the DOM mutations Chrome makes for the input method, which
// this simulation does not make, so nothing typed reaches the editor's value. The cases here therefore
// run the desktop Chrome input path, never the Android one the device runs. Desktop Chrome inserts a
// `compositionend`'s data, which this simulation already inserted, so its `compositionend` carries none.

declare module 'vitest' {
  interface ProvidedContext {
    /** Load the page with an empty `behavior` query, so it registers no Behavior and stays a crash page. */
    jsdomPageWithoutBehavior?: boolean
    /** Load the page with an empty `behavior` query instead of `decorate`, so it decorates nothing and stays a crash page. */
    jsdomPageWithoutDecorations?: boolean
    /**
     * Load the page with its `decorate` query but drop the `rangeDecorations` it passes `PortableTextEditable`,
     * so it still logs the ranges it computes and no decoration reaches the editor.
     */
    jsdomEditableWithoutRangeDecorations?: boolean
    /** Open a composition around each English word's letters, as English Gboard never does. */
    jsdomEnglishComposes?: boolean
  }
}

type PageState = {
  text: string | null
  dom: string | null | undefined
  focused: boolean
  blocks: number | null
  events: Array<{type: string}>
  errors: string[]
  decorated: Array<{text: string; composing: boolean; live: string | null}>
  committed: Array<Array<{text: string; composing: boolean}>>
  deletions: Array<{
    at: {
      anchor: {path: unknown[]; offset: number}
      focus: {path: unknown[]; offset: number}
    }
  }>
}

const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

// A path in a variable, so the driver's TypeScript project, which has no JSX, leaves the page to its own.
const PAGE = '../../../page/editor.tsx'

vi.mock(import('../../driver.ts'), () => ({
  typeOnDevice: typeInJsdom,
}))

// A case marked `test.fails` for a crash on Android's input path runs here as an ordinary test, since
// the desktop path never reaches that crash and the case must still reach its mechanism.
beforeEach(({task}) => {
  Object.assign(task, {fails: false})
})

async function typeInJsdom(options: TypeOnDeviceOptions): Promise<Typed> {
  const url = new URL(pageUrl(options.page, options.prefix))
  if (inject('jsdomPageWithoutBehavior')) url.searchParams.set('behavior', '')
  if (inject('jsdomPageWithoutDecorations')) {
    url.searchParams.delete('decorate')
    url.searchParams.set('behavior', '')
  }
  const dom = new JSDOM('<div id="root"></div><pre id="log"></pre>', {
    url: url.href,
    resources: new ResourceLoader({userAgent: USER_AGENT}),
    pretendToBeVisual: true,
  })
  // The page assigns `window.__state`, which `populateGlobal` aliases to `globalThis`, after the keys it
  // returns were collected.
  const stateDescriptor = Object.getOwnPropertyDescriptor(globalThis, '__state')
  const {keys, originals} = populateGlobal(globalThis, dom.window, {
    bindFunctions: true,
  })
  let root: {unmount: () => void} | undefined
  try {
    expect(navigator.userAgent).toEqual(USER_AGENT)
    addMissingDomApis(dom.window)
    vi.resetModules()
    if (inject('jsdomEditableWithoutRangeDecorations'))
      vi.doMock(import('@portabletext/editor'), async (importOriginal) => {
        const editor = await importOriginal()
        return {
          ...editor,
          PortableTextEditable: (({rangeDecorations: _, ...props}) =>
            createElement(
              editor.PortableTextEditable,
              props,
            )) as typeof editor.PortableTextEditable,
        }
      })
    else vi.doUnmock('@portabletext/editor')
    root = ((await import(PAGE)) as {root: {unmount: () => void}}).root
    return await typeWords(dom, options)
  } finally {
    root?.unmount()
    // React's scheduler runs the unmount's passive effects on the next macrotask, which reads `window`.
    await new Promise((resolve) => setImmediate(resolve))
    dom.window.close()
    for (const key of keys) delete (globalThis as Record<string, unknown>)[key]
    for (const [key, descriptor] of originals)
      Object.defineProperty(globalThis, key, descriptor)
    if (stateDescriptor === undefined)
      delete (globalThis as Record<string, unknown>).__state
    else Object.defineProperty(globalThis, '__state', stateDescriptor)
  }
}

async function typeWords(
  dom: JSDOM,
  {lang, prefix, words, crash}: TypeOnDeviceOptions,
): Promise<Typed> {
  const state = () =>
    (globalThis as unknown as {__state: () => PageState}).__state()
  await vi.waitFor(() => expect(state().text).toEqual(prefix))
  const editable =
    dom.window.document.querySelector<HTMLElement>('[contenteditable]')!
  expect(state().focused).toEqual(false)
  editable.focus()
  expect(state().focused).toEqual(true)

  const picked: string[] = []
  const beforeCommit: NonNullable<Typed['beforeCommit']> = []
  const wordEnds: number[] = []
  const decoratedEnds: number[] = []
  let text = prefix
  let start: LogLengths = {decorated: 0, committed: 0, deletions: 0}
  let marks = {start, beforeCommit: start}
  const check = (word: (typeof words)[number], stage: 'letters' | 'commit') => {
    const unmet = unmetEvidence(word, stage, state(), marks)
    if (unmet !== undefined) throw new Error(unmet)
  }
  for (const word of words) {
    if (word.enter) {
      for (const character of word.letters) await insertText(character)
    } else if (lang === 'ja') {
      editable.dispatchEvent(
        new dom.window.CompositionEvent('compositionstart', {
          bubbles: true,
          data: '',
        }),
      )
      await insertText('きょう')
    } else {
      const composes = inject('jsdomEnglishComposes')
      if (composes)
        editable.dispatchEvent(
          new dom.window.CompositionEvent('compositionstart', {
            bubbles: true,
            data: '',
          }),
        )
      // Gboard capitalizes the first letter of a block.
      for (const letter of word.letters)
        await insertText(text === '' ? letter.toUpperCase() : letter)
      if (composes)
        editable.dispatchEvent(
          new dom.window.CompositionEvent('compositionend', {
            bubbles: true,
            data: '',
          }),
        )
    }
    beforeCommit.push({text: state().text, blocks: state().blocks})
    marks = {start, beforeCommit: logLengths(state())}
    check(word, 'letters')
    if (word.enter) {
      await pressEnter()
      picked.push(word.letters === '' ? 'enter' : 'space')
    } else if (lang === 'ja') {
      await insertText(word.candidate!, 'きょう'.length)
      editable.dispatchEvent(
        new dom.window.CompositionEvent('compositionend', {
          bubbles: true,
          data: '',
        }),
      )
      picked.push(word.candidate!)
    } else {
      await insertText(' ')
      picked.push('space')
    }
    wordEnds.push(state().events.length)
    decoratedEnds.push(state().decorated.length)
    check(word, 'commit')
    start = logLengths(state())
  }
  const final = state()
  const otherErrors = final.errors.filter((error) => !crash?.test(error))
  if (otherErrors.length > 0)
    throw new Error(`errors other than the case's crash: ${otherErrors}`)
  return {
    text: final.text,
    picked,
    compositionstart: final.events.filter(
      (event) => event.type === 'compositionstart',
    ).length,
    compositionupdate: final.events.filter(
      (event) => event.type === 'compositionupdate',
    ).length,
    nested: nestedCompositionstart(final.events),
    compositionstartPerWord: compositionstartPerWord(final.events, wordEnds),
    errors: final.errors,
    blocks: final.blocks,
    beforeCommit,
    decoratedPerWord: decoratedPerWord(final.decorated, decoratedEnds),
    committedRanges: distinctRanges(final.committed),
  }

  /** Press Enter the way desktop Chrome does, and wait for the page to change. */
  async function pressEnter(): Promise<void> {
    const before = {text: state().text, blocks: state().blocks}
    editable.dispatchEvent(
      new dom.window.InputEvent('beforeinput', {
        inputType: 'insertParagraph',
        bubbles: true,
        cancelable: true,
      }),
    )
    await vi.waitFor(() =>
      expect({text: state().text, blocks: state().blocks}).not.toEqual(before),
    )
  }

  /**
   * Insert `data` over the block's last `replace` characters the way Chrome does: the editor handles the
   * `beforeinput` itself, or lets the browser insert the text and reads it back on `input`.
   */
  async function insertText(data: string, replace = 0): Promise<void> {
    const leaves = editable.querySelectorAll(
      '[data-pt-text], [data-pt-zero-width]',
    )
    const leaf = leaves[leaves.length - 1]!
    const node = leaf.firstChild as Text
    const offset = leaf.hasAttribute('data-pt-zero-width')
      ? 0
      : node.data.length
    const range = dom.window.document.createRange()
    range.setStart(node, offset - replace)
    range.setEnd(node, offset)
    dom.window.getSelection()!.removeAllRanges()
    dom.window.getSelection()!.addRange(range)
    dom.window.document.dispatchEvent(new dom.window.Event('selectionchange'))
    const beforeinput = new dom.window.InputEvent('beforeinput', {
      inputType: 'insertText',
      data,
      bubbles: true,
      cancelable: true,
    })
    editable.dispatchEvent(beforeinput)
    if (!beforeinput.defaultPrevented) {
      node.insertData(offset, data)
      editable.dispatchEvent(
        new dom.window.InputEvent('input', {
          inputType: 'insertText',
          data,
          bubbles: true,
        }),
      )
    }
    text = text.slice(0, text.length - replace) + data
    await vi.waitFor(() =>
      expect({text: state().text, dom: state().dom}).toEqual({text, dom: text}),
    )
  }
}

function logLengths(state: PageState): LogLengths {
  return {
    decorated: state.decorated.length,
    committed: state.committed.length,
    deletions: state.deletions.length,
  }
}

/** The DOM APIs Chrome has and jsdom lacks that the editor relies on. */
function addMissingDomApis(window: JSDOM['window']): void {
  // The editor handles `beforeinput` only where `getTargetRanges` exists.
  Object.assign(window.InputEvent.prototype, {getTargetRanges: () => []})
  Object.assign(window, {
    CSS: {escape: (value: string) => value.replace(/["\\]/g, '\\$&')},
  })
  Object.defineProperty(window.HTMLElement.prototype, 'isContentEditable', {
    get(this: HTMLElement) {
      const host = this.closest('[contenteditable]')
      return host !== null && host.getAttribute('contenteditable') !== 'false'
    },
  })
}
