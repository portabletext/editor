import {
  defineSchema,
  type PortableTextSpan,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {server, userEvent} from 'vitest/browser'
import {createTestEditor} from '../src/test/vitest'

const TEXT = 'helo world'

/**
 * Boots a one-block "helo world" editor and reproduces how Grammarly's
 * generic (non-fingerprinted) replacement services locate their target:
 * park focus with a real click + keyboard event first (this is what puts
 * the editor's own selection state and the DOM selection in lockstep via
 * the DOM->editor path), then move the DOM selection with a raw Range onto
 * the word to replace, the same way an extension does it from outside
 * React's control, and act on it synchronously (no intervening tick for the
 * browser's own `selectionchange` to reach the engine, matching a scripted
 * extension rather than a real user gesture).
 */
async function setup() {
  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanKey = keyGenerator()

  const initialValue: Array<PortableTextTextBlock<PortableTextSpan>> = [
    {
      _type: 'block',
      _key: blockKey,
      children: [{_type: 'span', _key: spanKey, text: TEXT, marks: []}],
      markDefs: [],
      style: 'normal',
    },
  ]

  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({}),
    initialValue,
  })

  await userEvent.click(locator)
  await userEvent.keyboard('{Home}')

  const editableElement = locator.element()
  const textNode = editableElement.querySelector('[data-pt-text]')?.firstChild

  if (!textNode) {
    throw new Error('Could not find the editable text node')
  }

  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection?.anchor?.offset).toBe(0)
    const domSelection = window.getSelection()
    expect(domSelection?.anchorNode).toBe(textNode)
    expect(domSelection?.anchorOffset).toBe(0)
  })

  const domSelection = window.getSelection()
  const range = document.createRange()
  range.setStart(textNode, 0)
  range.setEnd(textNode, 4)
  domSelection?.removeAllRanges()
  domSelection?.addRange(range)

  const patches: Array<unknown> = []
  editor.on('patch', (event) => patches.push(event.patch))

  return {
    editor,
    locator,
    editableElement,
    textNode,
    patches,
    initialValue,
  }
}

function replacementDataTransfer() {
  const dataTransfer = new DataTransfer()
  dataTransfer.setData('text/plain', 'hello')
  dataTransfer.setData('text/html', 'hello')
  return dataTransfer
}

/**
 * `TextString` reconciles its DOM text node against the model on every
 * render, unconditionally (`string.tsx`), so it wins back any DOM text a
 * browser wrote without the engine's knowledge, the next time the tree
 * actually re-renders. What does *not* count as "the tree re-renders" here:
 * neither React Testing Library's own `rerender()` with unchanged props nor
 * `editor.send({type: 'select', ...})` with an unchanged selection reaches
 * `TextString`, because nothing upstream produced a new editor snapshot for
 * `useSyncExternalStore` to hand down. The one thing that reliably does is a
 * genuine value transition through the engine: a remote `update value` to a
 * value that actually differs from what the engine currently holds
 * (`isEqualValues` gates it), then back to the original. This is the same
 * round trip Studio's own autosave/refetch cycle produces.
 */
function forceRerender(
  editor: {send: (event: any) => void},
  initialValue: Array<PortableTextTextBlock<PortableTextSpan>>,
) {
  const interimValue = initialValue.map((block) => ({
    ...block,
    children: block.children.map((span) => ({
      ...span,
      text: `${span.text} `,
    })),
  }))
  editor.send({type: 'update value', value: interimValue})
  editor.send({type: 'update value', value: initialValue})
}

/**
 * Flushes microtasks/macrotasks/animation frames without anchoring on any
 * particular assertion. Every other wait in this suite is a `vi.waitFor`
 * around a real assertion; this one exists only to prove a *negative*
 * (nothing further happens) for the strategies that turn out not to touch
 * the engine at all, where there is no future truth to poll for.
 */
async function flush() {
  await new Promise((resolve) => requestAnimationFrame(resolve))
  await new Promise((resolve) => setTimeout(resolve, 0))
  await Promise.resolve()
}

describe('grammarly generic replacement matrix', () => {
  test('Scenario 1: synthetic ClipboardEvent paste (text/plain + text/html)', async () => {
    const {editor, editableElement, locator, patches} = await setup()

    editableElement.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData: replacementDataTransfer(),
        bubbles: true,
        cancelable: true,
      }),
    )

    if (server.browser === 'firefox') {
      // Firefox returns an empty string from `getData` on a `clipboardData`
      // attached to a script-constructed `ClipboardEvent`, regardless of
      // what was set on the `DataTransfer` beforehand: reading synthetic
      // clipboard data back out is a trusted-event-only capability there. A
      // real, browser-dispatched paste carries readable `clipboardData` on
      // Firefox; this is a limitation of constructing the event from a
      // script, not a codepath difference.
      await flush()
      expect(getTersePt(editor.getSnapshot().context)).toEqual([TEXT])
      expect(patches.length).toBe(0)
      expect(locator.element().textContent).toBe(TEXT)
      return
    }

    // React's `onPaste` always runs for a native `paste` event (it doesn't
    // gate on `beforeinput` support or MIME types the way the low-level DOM
    // listener does), and inserts at the engine's own tracked selection,
    // never the live DOM `Selection`/`Range`. Our raw Range mutation above
    // only moved `window.getSelection()`; the engine's selection is still
    // the collapsed caret from the `{Home}` keypress (offset 0), so the
    // paste lands there instead of replacing "helo": the model *does*
    // change, but not the way Grammarly intended.
    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'hellohelo world',
      ])
    })

    // (b) patches: a real, engine-tracked edit, so patches are emitted.
    expect(patches.length).toBeGreaterThan(0)

    // (c) DOM/model agreement: this went through the normal engine path
    // (edit -> operation -> re-render), so the DOM was never out of step
    // with the model, even though the model change was not what was
    // intended (insert, not replace, at the wrong offset).
    await vi.waitFor(() => {
      expect(locator.element().textContent).toBe('hellohelo world')
    })
  })

  test('Scenario 2: synthetic beforeinput insertReplacementText, no target ranges', async () => {
    const {editor, editableElement, locator, patches} = await setup()

    editableElement.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'insertReplacementText',
        dataTransfer: replacementDataTransfer(),
        bubbles: true,
        cancelable: true,
      }),
    )

    if (server.browser === 'webkit') {
      // WebKit's `InputEvent` constructor drops the `dataTransfer` init dict
      // member entirely, so a synthetic event built this way carries no
      // payload, and nothing about the input is eligible to apply. A
      // trusted, browser-dispatched `beforeinput` for this channel does
      // carry `dataTransfer` on WebKit; this is a limitation of
      // constructing the event from a script, not a codepath difference.
      await flush()
      expect(getTersePt(editor.getSnapshot().context)).toEqual([TEXT])
      expect(patches.length).toBe(0)
      expect(locator.element().textContent).toBe(TEXT)
      return
    }

    // (a) model: this is the one path with an explicit DOM-selection
    // fallback (event.input.replacement-text.test.tsx), so it applies at
    // the live DOM `Range` we set, not the stale engine selection.
    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['hello world'])
    })

    // (b) patches
    expect(patches.length).toBeGreaterThan(0)

    // (c) DOM/model agreement: normal engine path, always in step.
    await vi.waitFor(() => {
      expect(locator.element().textContent).toBe('hello world')
    })
  })

  test('Scenario 3: document.execCommand("insertText")', async () => {
    const {editor, editableElement, locator, patches} = await setup()

    editableElement.focus()
    document.execCommand('insertText', false, 'hello')

    // (a) model: execCommand's insertText fires no cancelable `beforeinput`
    // on Chromium (only a non-cancelable `input`), but the engine adopts the
    // already-applied DOM mutation from that `input`, diffing it against the
    // model and replaying it through the behavior pipeline.
    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['hello world'])
    })

    // (b) patches: the adopted diff is a real, patch-emitting edit.
    expect(patches.length).toBeGreaterThan(0)

    // (c) DOM/model agreement: the adopted edit went through the normal
    // behavior pipeline, so the DOM never runs ahead of the model.
    await vi.waitFor(() => {
      expect(locator.element().textContent).toBe('hello world')
    })
  })

  test('Scenario 4: direct DOM mutation of the text node', async () => {
    const {editor, textNode, locator, patches, initialValue} = await setup()

    textNode.nodeValue = 'hello world'

    await flush()

    // (a) model: no event was dispatched at all, so the engine has no
    // opportunity to observe the change.
    expect(getTersePt(editor.getSnapshot().context)).toEqual([TEXT])

    // (b) patches
    expect(patches.length).toBe(0)

    // (c) DOM/model agreement: diverges until the next re-render reverts it.
    expect(locator.element().textContent).toBe('hello world')

    forceRerender(editor, initialValue)
    await flush()
    expect(locator.element().textContent).toBe(TEXT)
  })
})
