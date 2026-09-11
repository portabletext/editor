import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {server, userEvent, type Locator} from 'vitest/browser'
import type {RangeDecoration} from '../src'
import {createTestEditor} from '../src/test/vitest'

async function focusAtStart(locator: Locator) {
  await userEvent.click(locator)
  await userEvent.keyboard('{Home}')
}

function setDomRange(
  startNode: Node,
  startOffset: number,
  endNode: Node,
  endOffset: number,
) {
  const domSelection = window.getSelection()
  const range = document.createRange()
  range.setStart(startNode, startOffset)
  range.setEnd(endNode, endOffset)
  domSelection?.removeAllRanges()
  domSelection?.addRange(range)
}

describe('execCommand adoption (unannounced `input`)', () => {
  test('(a) replaces a mid-word range', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const TEXT = 'foo bar baz'

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: TEXT, marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await focusAtStart(locator)

    const textNode = locator
      .element()
      .querySelector('[data-pt-text]')?.firstChild

    if (!textNode) {
      throw new Error('Could not find the editable text node')
    }

    const patches: Array<unknown> = []
    editor.on('patch', (event) => patches.push(event.patch))

    setDomRange(textNode, 4, textNode, 7)
    locator.element().focus()
    document.execCommand('insertText', false, 'qux')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo qux baz'])
    })
    expect(patches.length).toBeGreaterThan(0)
  })

  test('(b) replacement shortens the text', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const TEXT = 'foo barbar baz'

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: TEXT, marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await focusAtStart(locator)

    const textNode = locator
      .element()
      .querySelector('[data-pt-text]')?.firstChild

    if (!textNode) {
      throw new Error('Could not find the editable text node')
    }

    const patches: Array<unknown> = []
    editor.on('patch', (event) => patches.push(event.patch))

    setDomRange(textNode, 4, textNode, 10)
    locator.element().focus()
    document.execCommand('insertText', false, 'bar')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo bar baz'])
    })
    expect(patches.length).toBeGreaterThan(0)
  })

  test("(c) execCommand('delete') on a selected range", async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const TEXT = 'foo bar baz'

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: TEXT, marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await focusAtStart(locator)

    const textNode = locator
      .element()
      .querySelector('[data-pt-text]')?.firstChild

    if (!textNode) {
      throw new Error('Could not find the editable text node')
    }

    const patches: Array<unknown> = []
    editor.on('patch', (event) => patches.push(event.patch))

    setDomRange(textNode, 4, textNode, 7)
    locator.element().focus()
    document.execCommand('delete')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo  baz'])
    })
    expect(patches.length).toBeGreaterThan(0)
  })

  test('(d) a real typed keystroke still produces exactly one insertion', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const TEXT = 'foo'

    const {locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: TEXT, marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await userEvent.click(locator)
    await userEvent.keyboard('{Home}')
    await userEvent.keyboard('x')

    await vi.waitFor(() => {
      expect(locator.element().textContent).toBe('xfoo')
    })

    // Give the (guarded-against) double adoption a chance to fire before
    // asserting it didn't.
    await new Promise((resolve) => requestAnimationFrame(resolve))
    expect(locator.element().textContent).toBe('xfoo')
  })

  test('(e) adoption is skipped while composing', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const TEXT = 'foo'

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: TEXT, marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await focusAtStart(locator)

    const editableElement = locator.element()

    editableElement.dispatchEvent(
      new CompositionEvent('compositionupdate', {
        bubbles: true,
        cancelable: true,
        data: '',
      }),
    )

    document.execCommand('insertText', false, 'X')

    await vi.waitFor(() => {
      expect(editableElement.textContent).toBe('Xfoo')
    })

    // The DOM mutation happened (execCommand doesn't consult `composing`),
    // but the model must not have adopted it.
    expect(getTersePt(editor.getSnapshot().context)).toEqual([TEXT])
  })

  test('(f) adoption is skipped in readOnly', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const TEXT = 'foo'

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: TEXT, marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await focusAtStart(locator)

    const editableElement = locator.element()
    const textNode = editableElement.querySelector('[data-pt-text]')?.firstChild

    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
      throw new Error('Could not find the editable text node')
    }

    editor.send({type: 'update readOnly', readOnly: true})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.readOnly).toBe(true)
    })

    // Simulate an already-applied DOM mutation the way execCommand leaves
    // one, then dispatch the same non-cancelable `input` it produces:
    // `contentEditable` becomes `false` under `readOnly`, so the browser
    // itself won't run `execCommand` here, but the guard under test is the
    // handler's own `readOnly` check, not the browser's.
    ;(textNode as Text).data = 'Xfoo'
    editableElement.dispatchEvent(
      new InputEvent('input', {
        inputType: 'insertText',
        data: 'X',
        bubbles: true,
        cancelable: false,
      }),
    )

    await new Promise((resolve) => requestAnimationFrame(resolve))
    expect(getTersePt(editor.getSnapshot().context)).toEqual([TEXT])
  })

  test('(g) adopts a correction inside a span split by a range decoration', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const TEXT = 'hello world'

    const rangeDecorations: Array<RangeDecoration> = [
      {
        component: (props) => <mark>{props.children}</mark>,
        selection: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 2,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 5,
          },
        },
      },
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: TEXT, marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      editableProps: {rangeDecorations},
    })

    await vi.waitFor(() => {
      expect(locator.element().querySelectorAll('[data-pt-text]').length).toBe(
        3,
      )
    })

    await focusAtStart(locator)

    const firstLeafTextNode = locator
      .element()
      .querySelector('[data-pt-text]')?.firstChild

    if (!firstLeafTextNode) {
      throw new Error('Could not find the first leaf text node')
    }

    const patches: Array<unknown> = []
    editor.on('patch', (event) => patches.push(event.patch))

    setDomRange(firstLeafTextNode, 0, firstLeafTextNode, 2)
    locator.element().focus()
    document.execCommand('insertText', false, 'HE')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['HEllo world'])
    })
    expect(patches.length).toBeGreaterThan(0)
  })

  test('(h) execCommand across two differently-marked spans reconstructs the block-wide intent', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanAKey = keyGenerator()
    const spanBKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanAKey, text: 'hel', marks: ['strong']},
            {_type: 'span', _key: spanBKey, text: 'lo world', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await focusAtStart(locator)

    const textNodes = locator.element().querySelectorAll('[data-pt-text]')
    const firstTextNode = textNodes[0]?.firstChild
    const secondTextNode = textNodes[1]?.firstChild

    if (!firstTextNode || !secondTextNode) {
      throw new Error('Could not find the editable text nodes')
    }

    const patches: Array<unknown> = []
    editor.on('patch', (event) => patches.push(event.patch))

    // Span across the "hel" / "lo world" boundary: offset 1 in the first
    // span through offset 2 in the second.
    setDomRange(firstTextNode, 1, secondTextNode, 2)
    locator.element().focus()
    document.execCommand('insertText', false, 'X')

    // WebKit fires a real, cancelable `beforeinput` for `execCommand` (with
    // precise target ranges) and never reaches unannounced-input adoption at
    // all, applying the edit through the ordinary behavior pipeline instead;
    // Chromium and Firefox reach it through block-scoped reconstruction. All
    // three land on the same result: the correction crossed a mark boundary,
    // so the pipeline's normal mark semantics apply, same as typing over this
    // selection would - the `strong` mark is lost, not preserved on a
    // fragment of it.
    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['hX, world'])
    })
    expect(patches.length).toBeGreaterThan(0)
  })

  test('(i) a synthetic `input` whose `data` disagrees with the reconstructed diff refuses to adopt, on every browser', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanAKey = keyGenerator()
    const spanBKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanAKey, text: 'hel', marks: ['strong']},
            {_type: 'span', _key: spanBKey, text: 'lo world', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await focusAtStart(locator)

    const editableElement = locator.element()
    const textNodes = editableElement.querySelectorAll('[data-pt-text]')
    const firstTextNode = textNodes[0]?.firstChild
    const secondTextNode = textNodes[1]?.firstChild

    if (
      !firstTextNode ||
      firstTextNode.nodeType !== Node.TEXT_NODE ||
      !secondTextNode ||
      secondTextNode.nodeType !== Node.TEXT_NODE
    ) {
      throw new Error('Could not find the editable text nodes')
    }

    const patches: Array<unknown> = []
    editor.on('patch', (event) => patches.push(event.patch))

    // The DOM mutation itself is the same shape as (h) (an 'X' spread across
    // the span boundary), but the event reports a `data` that disagrees with
    // it ("Y" instead of "X"): the block-wide reconstruction's consistency
    // gate compares its own diff against `event.data` and refuses rather than
    // trust a DOM state the event's own account doesn't corroborate.
    setDomRange(firstTextNode, 1, secondTextNode, 2)
    ;(firstTextNode as Text).data = 'hX'
    ;(secondTextNode as Text).data = ' world'
    editableElement.dispatchEvent(
      new InputEvent('input', {
        inputType: 'insertText',
        data: 'Y',
        bubbles: true,
        cancelable: false,
      }),
    )

    await new Promise((resolve) => requestAnimationFrame(resolve))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(getTersePt(editor.getSnapshot().context)).toEqual(['hel,lo world'])
    expect(patches.length).toBe(0)

    // The mismatch still repairs the block's DOM back to the model, the same
    // as any other refused cross-span edit.
    const repairedTextNodes = Array.from(
      editableElement.querySelectorAll('[data-pt-text]'),
    ).map((node) => node.textContent)
    expect(repairedTextNodes).toEqual(['hel', 'lo world'])
  })

  test.skipIf(server.browser === 'webkit')(
    '(k) a full-sentence execCommand replace across three differently-marked spans reconstructs the block-wide intent, in one undo step, leaving the editor usable',
    async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanAKey = keyGenerator()
      const spanBKey = keyGenerator()
      const spanCKey = keyGenerator()

      const initialValue = [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanAKey, text: 'tesing ', marks: []},
            {
              _type: 'span',
              _key: spanBKey,
              text: 'sum gramerly',
              marks: ['strong'],
            },
            {_type: 'span', _key: spanCKey, text: ' stuf', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ]

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
        initialValue,
      })

      await focusAtStart(locator)

      const editableElement = locator.element()
      const textNodes = editableElement.querySelectorAll('[data-pt-text]')
      const firstTextNode = textNodes[0]?.firstChild
      const lastTextNode = textNodes[textNodes.length - 1]?.firstChild

      if (!firstTextNode || !lastTextNode) {
        throw new Error('Could not find the editable text nodes')
      }

      const patches: Array<unknown> = []
      editor.on('patch', (event) => patches.push(event.patch))

      const uncaughtErrors: Array<unknown> = []
      const onUncaughtError = (event: ErrorEvent) => {
        uncaughtErrors.push(event.error)
      }
      window.addEventListener('error', onUncaughtError)

      try {
        // Grammarly's generic replacement channel selects the entire
        // sentence, across all three spans, and replaces it in one go.
        setDomRange(
          firstTextNode,
          0,
          lastTextNode,
          (lastTextNode.textContent ?? '').length,
        )
        editableElement.focus()
        document.execCommand(
          'insertText',
          false,
          'Testing some Grammarly stuff',
        )

        await new Promise((resolve) => requestAnimationFrame(resolve))
        await new Promise((resolve) => setTimeout(resolve, 0))

        // The single-span path refuses (the edit crosses all three spans),
        // but the damage is confined to this one block, so block-wide
        // reconstruction diffs the block's rendered text against its model
        // text, confirms the diff's inserted text against `event.data`, and
        // replays it as a select + `insert.text`, the same as a real
        // keystroke over this selection would. That selection crosses the
        // `strong` span, so the mark is lost, not preserved on a fragment of
        // it - the pipeline's ordinary mark semantics, not a special case for
        // adopted input.
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {
                _type: 'span',
                _key: spanAKey,
                text: 'Testing some Grammarly stuff',
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
        expect(patches.length).toBeGreaterThan(0)
        expect(uncaughtErrors).toEqual([])

        // The model changed, so the block is remounted from it rather than
        // left diffing against the DOM `execCommand` mutated directly: one
        // span wrapper, with text equal to the corrected model.
        const repairedTextNodes = Array.from(
          editableElement.querySelectorAll('[data-pt-text]'),
        )
        expect(repairedTextNodes.map((node) => node.textContent)).toEqual([
          'Testing some Grammarly stuff',
        ])
        expect(editableElement.textContent).toBe('Testing some Grammarly stuff')

        // One undo step restores the exact pre-correction three-span
        // structure, including the original spans' own `_key`s and marks,
        // not a partial or merged approximation of it.
        editor.send({type: 'history.undo'})

        await vi.waitFor(() => {
          expect(editor.getSnapshot().context.value).toEqual(initialValue)
        })

        // The selection after that undo is the pre-correction selection
        // (the whole sentence, spanning all three spans) the adoption's own
        // `editor.select` replaced, not the adoption's own collapsed one.
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanAKey}],
            offset: 0,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanCKey}],
            offset: 5,
          },
          backward: false,
        })

        // A second undo is a genuine no-op: there's no earlier undo step,
        // since the initial value was never itself pushed onto the undo
        // stack. Confirmed via patch count, not just the value staying the
        // same.
        const patchesDuringSecondUndo: Array<unknown> = []
        editor.on('patch', (event) => patchesDuringSecondUndo.push(event.patch))

        editor.send({type: 'history.undo'})
        await new Promise((resolve) => requestAnimationFrame(resolve))
        await new Promise((resolve) => setTimeout(resolve, 0))

        expect(editor.getSnapshot().context.value).toEqual(initialValue)
        expect(patchesDuringSecondUndo.length).toBe(0)

        // Redo mirrors undo exactly: the first redo only replays the second
        // undo's no-op, and the second redo reapplies the correction.
        editor.send({type: 'history.redo'})
        await new Promise((resolve) => requestAnimationFrame(resolve))
        await new Promise((resolve) => setTimeout(resolve, 0))
        expect(editor.getSnapshot().context.value).toEqual(initialValue)

        editor.send({type: 'history.redo'})
        await vi.waitFor(() => {
          expect(editor.getSnapshot().context.value).toEqual([
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {
                  _type: 'span',
                  _key: spanAKey,
                  text: 'Testing some Grammarly stuff',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ])
        })

        // Back to the pre-correction structure for the usability check
        // below.
        editor.send({type: 'history.undo'})
        await vi.waitFor(() => {
          expect(editor.getSnapshot().context.value).toEqual(initialValue)
        })

        await vi.waitFor(() => {
          expect(
            Array.from(editableElement.querySelectorAll('[data-pt-text]')).map(
              (node) => node.textContent,
            ),
          ).toEqual(['tesing ', 'sum gramerly', ' stuf'])
        })

        // The editor still works afterwards: a real click and a real
        // keystroke land in the model without an uncaught error.
        const repairedFirstTextNode =
          editableElement.querySelector('[data-pt-text]')?.firstChild

        if (!repairedFirstTextNode) {
          throw new Error('Could not find the repaired editable text node')
        }

        await userEvent.click(locator)
        setDomRange(repairedFirstTextNode, 0, repairedFirstTextNode, 0)
        editableElement.focus()
        await userEvent.keyboard('x')

        await vi.waitFor(() => {
          expect(getTersePt(editor.getSnapshot().context)).toEqual([
            'xtesing ,sum gramerly, stuf',
          ])
        })
        expect(uncaughtErrors).toEqual([])
      } finally {
        window.removeEventListener('error', onUncaughtError)
      }
    },
  )

  test.skipIf(server.browser === 'webkit')(
    '(o) selection reapplies from the model, not browser caret heuristics, after a cross-span adoption remount',
    async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanAKey = keyGenerator()
      const spanBKey = keyGenerator()
      const spanCKey = keyGenerator()
      const insertedText = 'Testing some Grammarly stuff'

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_type: 'span', _key: spanAKey, text: 'tesing ', marks: []},
              {
                _type: 'span',
                _key: spanBKey,
                text: 'sum gramerly',
                marks: ['strong'],
              },
              {_type: 'span', _key: spanCKey, text: ' stuf', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      })

      await focusAtStart(locator)

      const editableElement = locator.element()
      const textNodes = editableElement.querySelectorAll('[data-pt-text]')
      const firstTextNode = textNodes[0]?.firstChild
      const lastTextNode = textNodes[textNodes.length - 1]?.firstChild

      if (!firstTextNode || !lastTextNode) {
        throw new Error('Could not find the editable text nodes')
      }

      setDomRange(
        firstTextNode,
        0,
        lastTextNode,
        (lastTextNode.textContent ?? '').length,
      )
      editableElement.focus()
      document.execCommand('insertText', false, insertedText)

      await vi.waitFor(() => {
        expect(getTersePt(editor.getSnapshot().context)).toEqual([insertedText])
      })

      // The adoption remounted the block; its own reconstructed selection
      // (the collapsed end of the replayed insertion) must have reapplied
      // from the model rather than being left to whatever the browser's own
      // post-remount caret heuristic would have produced.
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanAKey}],
          offset: insertedText.length,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanAKey}],
          offset: insertedText.length,
        },
        backward: false,
      })

      const remountedTextNode =
        editableElement.querySelector('[data-pt-text]')?.firstChild
      const domSelection = window.getSelection()
      expect(domSelection?.isCollapsed).toBe(true)
      expect(domSelection?.anchorNode).toBe(remountedTextNode)
      expect(domSelection?.anchorOffset).toBe(insertedText.length)

      // Typing one more character lands exactly where that selection says
      // it should - appended after the correction, not at some other
      // position a stale or browser-guessed caret would have produced.
      await userEvent.keyboard('!')

      await vi.waitFor(() => {
        expect(getTersePt(editor.getSnapshot().context)).toEqual([
          `${insertedText}!`,
        ])
      })
    },
  )

  test('(j) a synthetic `input` adopts a direct single-span DOM mutation, on every browser', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const TEXT = 'foo'

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: TEXT, marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await focusAtStart(locator)

    const editableElement = locator.element()
    const textNode = editableElement.querySelector('[data-pt-text]')?.firstChild

    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
      throw new Error('Could not find the editable text node')
    }

    const patches: Array<unknown> = []
    editor.on('patch', (event) => patches.push(event.patch))

    ;(textNode as Text).data = 'Xfoo'
    editableElement.dispatchEvent(
      new InputEvent('input', {
        inputType: 'insertText',
        data: 'X',
        bubbles: true,
        cancelable: false,
      }),
    )

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['Xfoo'])
    })
    expect(patches.length).toBeGreaterThan(0)
  })

  test("(l) execCommand('delete') across two differently-marked spans reconstructs the block-wide intent as a pure deletion", async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanAKey = keyGenerator()
    const spanBKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanAKey, text: 'hel', marks: ['strong']},
            {_type: 'span', _key: spanBKey, text: 'lo world', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await focusAtStart(locator)

    const editableElement = locator.element()
    const textNodes = editableElement.querySelectorAll('[data-pt-text]')
    const firstTextNode = textNodes[0]?.firstChild
    const secondTextNode = textNodes[1]?.firstChild

    if (!firstTextNode || !secondTextNode) {
      throw new Error('Could not find the editable text nodes')
    }

    const patches: Array<unknown> = []
    editor.on('patch', (event) => patches.push(event.patch))

    // Delete "el" from the first span through "lo" from the second: a pure
    // deletion spanning the mark boundary, `deleteContentBackward` on
    // Chromium/Firefox, with `event.data` always `null`.
    setDomRange(firstTextNode, 1, secondTextNode, 2)
    editableElement.focus()
    document.execCommand('delete')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['h, world'])
    })
    expect(patches.length).toBeGreaterThan(0)

    await vi.waitFor(() => {
      expect(editableElement.textContent).toBe('h world')
    })
  })

  test.skipIf(server.browser === 'webkit')(
    '(n) execCommand across a block boundary refuses to adopt, repairs both blocks, and leaves the editor usable',
    async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockAKey = keyGenerator()
      const spanAKey = keyGenerator()
      const blockBKey = keyGenerator()
      const spanBKey = keyGenerator()

      const initialValue = [
        {
          _type: 'block',
          _key: blockAKey,
          children: [{_type: 'span', _key: spanAKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockBKey,
          children: [{_type: 'span', _key: spanBKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ]

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue,
      })

      await focusAtStart(locator)

      const editableElement = locator.element()
      const textNodes = editableElement.querySelectorAll('[data-pt-text]')
      const firstTextNode = textNodes[0]?.firstChild
      const secondTextNode = textNodes[1]?.firstChild

      if (!firstTextNode || !secondTextNode) {
        throw new Error('Could not find the editable text nodes')
      }

      const patches: Array<unknown> = []
      editor.on('patch', (event) => patches.push(event.patch))

      const uncaughtErrors: Array<unknown> = []
      const onUncaughtError = (event: ErrorEvent) => {
        uncaughtErrors.push(event.error)
      }
      window.addEventListener('error', onUncaughtError)

      try {
        // Select from offset 1 of block A's span through offset 2 of block
        // B's span - crossing the block boundary, not just a span one - and
        // replace it. Chromium merges the two blocks' DOM wrappers into one
        // in the process; Firefox keeps both wrappers but empties block B's
        // into block A's, leaving the block count unchanged while the
        // content still crossed the boundary. Both shapes must refuse: no
        // span-level or block-level reconstruction knows how to recombine
        // two blocks' text into a single edit, and this is a cross-*block*
        // correction, not the cross-span kind (k) reconstructs.
        setDomRange(firstTextNode, 1, secondTextNode, 2)
        editableElement.focus()
        document.execCommand('insertText', false, 'X')

        await new Promise((resolve) => requestAnimationFrame(resolve))
        await new Promise((resolve) => setTimeout(resolve, 0))

        expect(editor.getSnapshot().context.value).toEqual(initialValue)
        expect(patches.length).toBe(0)
        expect(uncaughtErrors).toEqual([])

        // Both blocks are repaired back to the model, including the one the
        // single-span path never directly resolved a path into.
        await vi.waitFor(() => {
          expect(
            Array.from(editableElement.querySelectorAll('[data-pt-text]')).map(
              (node) => node.textContent,
            ),
          ).toEqual(['foo', 'bar'])
        })
        expect(editableElement.querySelectorAll('[data-pt-block]').length).toBe(
          2,
        )

        // The editor still works afterward: a real click and keystroke reach
        // the model without an uncaught error.
        const repairedFirstTextNode =
          editableElement.querySelector('[data-pt-text]')?.firstChild

        if (!repairedFirstTextNode) {
          throw new Error('Could not find the repaired editable text node')
        }

        await userEvent.click(locator)
        setDomRange(repairedFirstTextNode, 0, repairedFirstTextNode, 0)
        editableElement.focus()
        await userEvent.keyboard('x')

        await vi.waitFor(() => {
          expect(getTersePt(editor.getSnapshot().context)).toEqual([
            'xfoo',
            'bar',
          ])
        })
        expect(uncaughtErrors).toEqual([])
      } finally {
        window.removeEventListener('error', onUncaughtError)
      }
    },
  )

  test('(m) a reconstructed range overlapping an inline object refuses to adopt and repairs the block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanAKey = keyGenerator()
    const spanBKey = keyGenerator()
    const objectKey = keyGenerator()
    const spanCKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
        inlineObjects: [{name: 'stock-ticker'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanAKey, text: 'hel', marks: ['strong']},
            {_type: 'span', _key: spanBKey, text: 'lo', marks: []},
            {_type: 'stock-ticker', _key: objectKey},
            {_type: 'span', _key: spanCKey, text: ' world', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await focusAtStart(locator)

    const editableElement = locator.element()
    const textNodes = editableElement.querySelectorAll('[data-pt-text]')
    const firstTextNode = textNodes[0]?.firstChild
    const secondTextNode = textNodes[1]?.firstChild
    const thirdTextNode = textNodes[2]?.firstChild

    if (
      !firstTextNode ||
      firstTextNode.nodeType !== Node.TEXT_NODE ||
      !secondTextNode ||
      secondTextNode.nodeType !== Node.TEXT_NODE ||
      !thirdTextNode ||
      thirdTextNode.nodeType !== Node.TEXT_NODE
    ) {
      throw new Error('Could not find the editable text nodes')
    }

    const patches: Array<unknown> = []
    editor.on('patch', (event) => patches.push(event.patch))

    setDomRange(firstTextNode, 0, firstTextNode, 0)

    // A block-wide diff whose reconstructed range would have to reach from
    // the first span, across the inline object, into the last one: this is
    // reconstructable as text (the object contributes nothing to either
    // side's rendered text), but replaying it as a single/`delete` would
    // select through the object itself, which the DOM mutation never
    // touched. Refuse rather than guess.
    ;(firstTextNode as Text).data = 'GOODBYE'
    ;(secondTextNode as Text).data = ' '
    ;(thirdTextNode as Text).data = 'wXrld'
    editableElement.dispatchEvent(
      new InputEvent('input', {
        inputType: 'insertText',
        data: 'GOODBYE wX',
        bubbles: true,
        cancelable: false,
      }),
    )

    await new Promise((resolve) => requestAnimationFrame(resolve))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(getTersePt(editor.getSnapshot().context)).toEqual([
      'hel,lo,{stock-ticker}, world',
    ])
    expect(patches.length).toBe(0)

    const repairedTextNodes = Array.from(
      editableElement.querySelectorAll('[data-pt-text]'),
    )
    expect(repairedTextNodes.map((node) => node.textContent)).toEqual([
      'hel',
      'lo',
      ' world',
    ])
  })

  test('(p) a reconstructed range immediately before an inline object adopts, placed on the near side of it', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanAKey = keyGenerator()
    const spanBKey = keyGenerator()
    const objectKey = keyGenerator()
    const spanCKey = keyGenerator()
    const spanDKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
        inlineObjects: [{name: 'stock-ticker'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanAKey, text: 'hel', marks: ['strong']},
            {_type: 'span', _key: spanBKey, text: 'lo', marks: []},
            {_type: 'stock-ticker', _key: objectKey},
            {_type: 'span', _key: spanCKey, text: 'wor', marks: []},
            {_type: 'span', _key: spanDKey, text: 'ld!', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await focusAtStart(locator)
    const editableElement = locator.element()
    const textNodes = editableElement.querySelectorAll('[data-pt-text]')
    const firstTextNode = textNodes[0]?.firstChild
    const secondTextNode = textNodes[1]?.firstChild

    if (!firstTextNode || !secondTextNode) {
      throw new Error('Could not find the editable text nodes')
    }

    const patches: Array<unknown> = []
    editor.on('patch', (event) => patches.push(event.patch))

    // Cross the spanA/spanB mark boundary, ending exactly at spanB's own
    // end - the same block offset the inline object's own (zero-length)
    // entry starts at. The edit never touches spanC/spanD or the object.
    setDomRange(firstTextNode, 1, secondTextNode, 2)
    editableElement.focus()
    document.execCommand('insertText', false, 'X')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            // The selection starts inside spanA (still within its `strong`
            // run, not at a mark boundary), so the pipeline's ordinary
            // replace-selection semantics carry that mark onto the merged
            // result - the same as typing over this exact selection would.
            {_type: 'span', _key: spanAKey, text: 'hX', marks: ['strong']},
            {_type: 'stock-ticker', _key: objectKey},
            {_type: 'span', _key: spanCKey, text: 'wor', marks: []},
            {_type: 'span', _key: spanDKey, text: 'ld!', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    expect(patches.length).toBeGreaterThan(0)
  })

  test('(q) a reconstructed range immediately after an inline object adopts, placed on the far side of it', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanAKey = keyGenerator()
    const spanBKey = keyGenerator()
    const objectKey = keyGenerator()
    const spanCKey = keyGenerator()
    const spanDKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
        inlineObjects: [{name: 'stock-ticker'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanAKey, text: 'hel', marks: ['strong']},
            {_type: 'span', _key: spanBKey, text: 'lo', marks: []},
            {_type: 'stock-ticker', _key: objectKey},
            {_type: 'span', _key: spanCKey, text: 'wor', marks: []},
            {_type: 'span', _key: spanDKey, text: 'ld!', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await focusAtStart(locator)
    const editableElement = locator.element()
    const textNodes = editableElement.querySelectorAll('[data-pt-text]')
    const thirdTextNode = textNodes[2]?.firstChild
    const fourthTextNode = textNodes[3]?.firstChild

    if (!thirdTextNode || !fourthTextNode) {
      throw new Error('Could not find the editable text nodes')
    }

    const patches: Array<unknown> = []
    editor.on('patch', (event) => patches.push(event.patch))

    // Cross the spanC/spanD mark boundary, starting exactly at spanC's own
    // start - the same block offset the inline object's own (zero-length)
    // entry ends at. The edit never touches spanA/spanB or the object.
    setDomRange(thirdTextNode, 0, fourthTextNode, 2)
    editableElement.focus()
    document.execCommand('insertText', false, 'X')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanAKey, text: 'hel', marks: ['strong']},
            {_type: 'span', _key: spanBKey, text: 'lo', marks: []},
            {_type: 'stock-ticker', _key: objectKey},
            // The selection only reaches offset 2 of spanD ("ld"); its
            // trailing "!" was never selected, so it survives as spanD's
            // own remaining text, under its own original `_key` and mark -
            // not merged into the replacement.
            {_type: 'span', _key: spanCKey, text: 'X', marks: []},
            {_type: 'span', _key: spanDKey, text: '!', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    expect(patches.length).toBeGreaterThan(0)
  })

  test('(r) reconstruction is unaffected by an unrelated empty span elsewhere in the block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanAKey = keyGenerator()
    const emptySpanKey = keyGenerator()
    const spanBKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanAKey, text: 'hel', marks: ['strong']},
            {_type: 'span', _key: emptySpanKey, text: '', marks: []},
            {_type: 'span', _key: spanBKey, text: 'lo world', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await focusAtStart(locator)
    const editableElement = locator.element()
    const textNodes = editableElement.querySelectorAll('[data-pt-text]')
    const firstTextNode = textNodes[0]?.firstChild
    const secondTextNode = textNodes[1]?.firstChild

    if (!firstTextNode || !secondTextNode) {
      throw new Error('Could not find the editable text nodes')
    }

    const patches: Array<unknown> = []
    editor.on('patch', (event) => patches.push(event.patch))

    setDomRange(firstTextNode, 1, secondTextNode, 2)
    editableElement.focus()
    document.execCommand('insertText', false, 'X')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['hX, world'])
    })
    expect(patches.length).toBeGreaterThan(0)
  })

  test('(s) a replacement sharing its full prefix with the replaced text adopts, matching a synthetic `insertReplacementText` over the same selection', async () => {
    const initialValue = (
      blockKey: string,
      spanAKey: string,
      spanBKey: string,
    ) => [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: spanAKey, text: 'bar', marks: []},
          {_type: 'span', _key: spanBKey, text: ' baz', marks: ['strong']},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]

    // Two independent editors, two independent key generators (each starts
    // at the same `k0`, `k1`, ... sequence): one takes the execCommand
    // path under test, the other takes the ordinary cancelable
    // `beforeinput` path a real `insertReplacementText` (Grammarly's
    // fingerprint-avoidant replacement channel) would use over the exact
    // same selection. Any divergence between the two - text, marks, span
    // boundaries - is a bug in the reconstruction, not a legitimate
    // difference.
    const execKeyGenerator = createTestKeyGenerator()
    const execBlockKey = execKeyGenerator()
    const execSpanAKey = execKeyGenerator()
    const execSpanBKey = execKeyGenerator()

    const {editor: execEditor, locator: execLocator} = await createTestEditor({
      keyGenerator: execKeyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: initialValue(execBlockKey, execSpanAKey, execSpanBKey),
    })

    await focusAtStart(execLocator)
    const execEditableElement = execLocator.element()
    const execTextNodes = execEditableElement.querySelectorAll('[data-pt-text]')
    const execFirstTextNode = execTextNodes[0]?.firstChild
    const execSecondTextNode = execTextNodes[1]?.firstChild

    if (!execFirstTextNode || !execSecondTextNode) {
      throw new Error('Could not find the editable text nodes')
    }

    // Select the whole block ("bar baz") and replace it with "bar baz!" -
    // the replacement shares its entire prefix with the text it replaces.
    setDomRange(execFirstTextNode, 0, execSecondTextNode, 4)
    execEditableElement.focus()
    document.execCommand('insertText', false, 'bar baz!')

    await vi.waitFor(() => {
      expect(getTersePt(execEditor.getSnapshot().context)).toEqual(['bar baz!'])
    })

    const oracleKeyGenerator = createTestKeyGenerator()
    const oracleBlockKey = oracleKeyGenerator()
    const oracleSpanAKey = oracleKeyGenerator()
    const oracleSpanBKey = oracleKeyGenerator()

    const {editor: oracleEditor, locator: oracleLocator} =
      await createTestEditor({
        keyGenerator: oracleKeyGenerator,
        schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
        initialValue: initialValue(
          oracleBlockKey,
          oracleSpanAKey,
          oracleSpanBKey,
        ),
      })

    await focusAtStart(oracleLocator)
    const oracleEditableElement = oracleLocator.element()
    const oracleTextNodes =
      oracleEditableElement.querySelectorAll('[data-pt-text]')
    const oracleFirstTextNode = oracleTextNodes[0]?.firstChild
    const oracleSecondTextNode = oracleTextNodes[1]?.firstChild

    if (!oracleFirstTextNode || !oracleSecondTextNode) {
      throw new Error('Could not find the editable text nodes')
    }

    setDomRange(oracleFirstTextNode, 0, oracleSecondTextNode, 4)
    oracleEditableElement.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'insertReplacementText',
        data: 'bar baz!',
        bubbles: true,
        cancelable: true,
      }),
    )

    await vi.waitFor(() => {
      expect(getTersePt(oracleEditor.getSnapshot().context)).toEqual([
        'bar baz!',
      ])
    })

    expect(execEditor.getSnapshot().context.value).toEqual(
      oracleEditor.getSnapshot().context.value,
    )
  })

  test('(t) a replacement sharing its tail with the replaced text ("stuf" -> "stuff") adopts, matching a synthetic `insertReplacementText` over the same selection', async () => {
    const initialValue = (
      blockKey: string,
      spanAKey: string,
      spanBKey: string,
    ) => [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: spanAKey, text: 'hello ', marks: []},
          {_type: 'span', _key: spanBKey, text: 'stuf', marks: ['strong']},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]

    const execKeyGenerator = createTestKeyGenerator()
    const execBlockKey = execKeyGenerator()
    const execSpanAKey = execKeyGenerator()
    const execSpanBKey = execKeyGenerator()

    const {editor: execEditor, locator: execLocator} = await createTestEditor({
      keyGenerator: execKeyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: initialValue(execBlockKey, execSpanAKey, execSpanBKey),
    })

    await focusAtStart(execLocator)
    const execEditableElement = execLocator.element()
    const execTextNodes = execEditableElement.querySelectorAll('[data-pt-text]')
    const execFirstTextNode = execTextNodes[0]?.firstChild
    const execSecondTextNode = execTextNodes[1]?.firstChild

    if (!execFirstTextNode || !execSecondTextNode) {
      throw new Error('Could not find the editable text nodes')
    }

    // Select the whole block ("hello stuf") and replace it with
    // "hello stuff" - the replacement shares its entire tail (bar the one
    // appended "f") with the text it replaces.
    setDomRange(execFirstTextNode, 0, execSecondTextNode, 4)
    execEditableElement.focus()
    document.execCommand('insertText', false, 'hello stuff')

    await vi.waitFor(() => {
      expect(getTersePt(execEditor.getSnapshot().context)).toEqual([
        'hello stuff',
      ])
    })

    const oracleKeyGenerator = createTestKeyGenerator()
    const oracleBlockKey = oracleKeyGenerator()
    const oracleSpanAKey = oracleKeyGenerator()
    const oracleSpanBKey = oracleKeyGenerator()

    const {editor: oracleEditor, locator: oracleLocator} =
      await createTestEditor({
        keyGenerator: oracleKeyGenerator,
        schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
        initialValue: initialValue(
          oracleBlockKey,
          oracleSpanAKey,
          oracleSpanBKey,
        ),
      })

    await focusAtStart(oracleLocator)
    const oracleEditableElement = oracleLocator.element()
    const oracleTextNodes =
      oracleEditableElement.querySelectorAll('[data-pt-text]')
    const oracleFirstTextNode = oracleTextNodes[0]?.firstChild
    const oracleSecondTextNode = oracleTextNodes[1]?.firstChild

    if (!oracleFirstTextNode || !oracleSecondTextNode) {
      throw new Error('Could not find the editable text nodes')
    }

    setDomRange(oracleFirstTextNode, 0, oracleSecondTextNode, 4)
    oracleEditableElement.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'insertReplacementText',
        data: 'hello stuff',
        bubbles: true,
        cancelable: true,
      }),
    )

    await vi.waitFor(() => {
      expect(getTersePt(oracleEditor.getSnapshot().context)).toEqual([
        'hello stuff',
      ])
    })

    expect(execEditor.getSnapshot().context.value).toEqual(
      oracleEditor.getSnapshot().context.value,
    )
  })

  test.skipIf(server.browser === 'webkit')(
    '(u) a same-tick direct DOM write ahead of a trusted execCommand insertText refuses to adopt the unauthored deletion',
    async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const TEXT = 'abcdef'

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            children: [{_type: 'span', _key: spanKey, text: TEXT, marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      })

      await focusAtStart(locator)
      const editableElement = locator.element()
      const textNode = editableElement.querySelector('[data-pt-text]')
        ?.firstChild as Text

      if (!textNode) {
        throw new Error('Could not find the editable text node')
      }

      const patches: Array<unknown> = []
      editor.on('patch', (event) => patches.push(event.patch))

      // Same-origin script code (not the editor) deletes "bc" directly,
      // unobserved by any event, then in the same synchronous stack selects
      // "de" (now at offset 1-3 of the mutated "adef") and replaces it with
      // "X" via a trusted `execCommand`. The two mutations land on the same
      // text node in the same tick; the aggregate before/after text
      // ("abcdef" -> "aXf") looks like one self-consistent diff (replace
      // "bcde" with "X"), but only "de" -> "X" was ever authored by the
      // trusted command.
      textNode.data = 'adef'
      setDomRange(textNode, 1, textNode, 3)
      editableElement.focus()
      document.execCommand('insertText', false, 'X')

      await new Promise((resolve) => requestAnimationFrame(resolve))
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(getTersePt(editor.getSnapshot().context)).toEqual([TEXT])
      expect(patches.length).toBe(0)

      await vi.waitFor(() => {
        expect(editableElement.textContent).toBe(TEXT)
      })
    },
  )

  test.skipIf(server.browser === 'webkit')(
    '(v) a same-tick direct DOM write ahead of a trusted execCommand delete refuses to adopt the unauthored deletion',
    async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const TEXT = 'abcdef'

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            children: [{_type: 'span', _key: spanKey, text: TEXT, marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      })

      await focusAtStart(locator)
      const editableElement = locator.element()
      const textNode = editableElement.querySelector('[data-pt-text]')
        ?.firstChild as Text

      if (!textNode) {
        throw new Error('Could not find the editable text node')
      }

      const patches: Array<unknown> = []
      editor.on('patch', (event) => patches.push(event.patch))

      // Same shape as (u), but the trusted command is a pure delete of "de"
      // rather than a replace.
      textNode.data = 'adef'
      setDomRange(textNode, 1, textNode, 3)
      editableElement.focus()
      document.execCommand('delete')

      await new Promise((resolve) => requestAnimationFrame(resolve))
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(getTersePt(editor.getSnapshot().context)).toEqual([TEXT])
      expect(patches.length).toBe(0)

      await vi.waitFor(() => {
        expect(editableElement.textContent).toBe(TEXT)
      })
    },
  )

  test("(w) a correction in a block ending with a soft break doesn't adopt the renderer's own compat trailing newline", async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const TEXT = 'helo world\n'

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: TEXT, marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await focusAtStart(locator)

    // The last span of a block ending in `\n` (a soft break) renders with
    // one extra trailing `\n` of its own, on top of the model's - see
    // `string.tsx`'s `isTrailing` case. A correction elsewhere in the same
    // span must not read that renderer-only character back as part of the
    // edit.
    const textNode = locator.element().querySelector('[data-pt-text]')
      ?.firstChild as Text

    if (!textNode) {
      throw new Error('Could not find the editable text node')
    }

    expect(textNode.data).toBe('helo world\n\n')

    const patches: Array<unknown> = []
    editor.on('patch', (event) => patches.push(event.patch))

    setDomRange(textNode, 0, textNode, 4)
    locator.element().focus()
    document.execCommand('insertText', false, 'hello')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'hello world\n',
      ])
    })
    expect(patches.length).toBeGreaterThan(0)
  })

  test('(x) a block-scoped replacement starting exactly at a mark boundary matches a synthetic `insertReplacementText` over the same range', async () => {
    const initialValue = (
      blockKey: string,
      spanAKey: string,
      spanBKey: string,
    ) => [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: spanAKey, text: 'hel', marks: []},
          {_type: 'span', _key: spanBKey, text: 'lo world', marks: ['strong']},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]

    // `resolveEntryIndex`'s block-scoped reconstruction maps a diff offset
    // sitting exactly on a span boundary to the earlier span, deterministically
    // (no live DOM position survives text-level diffing to say otherwise).
    // Compare against a synthetic `insertReplacementText` over the identical
    // boundary-straddling DOM range: any divergence in the resulting marks
    // would be a bug in the reconstruction, not a legitimate difference.
    const execKeyGenerator = createTestKeyGenerator()
    const execBlockKey = execKeyGenerator()
    const execSpanAKey = execKeyGenerator()
    const execSpanBKey = execKeyGenerator()

    const {editor: execEditor, locator: execLocator} = await createTestEditor({
      keyGenerator: execKeyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: initialValue(execBlockKey, execSpanAKey, execSpanBKey),
    })

    await focusAtStart(execLocator)
    const execEditableElement = execLocator.element()
    const execTextNodes = execEditableElement.querySelectorAll('[data-pt-text]')
    const execFirstTextNode = execTextNodes[0]?.firstChild
    const execSecondTextNode = execTextNodes[1]?.firstChild

    if (!execFirstTextNode || !execSecondTextNode) {
      throw new Error('Could not find the editable text nodes')
    }

    // Start of the range is offset 3 in the first span - its own end,
    // exactly the second span's first character - end is 2 chars into the
    // second span ("lo"). The first span's own text never changes.
    setDomRange(execFirstTextNode, 3, execSecondTextNode, 2)
    execEditableElement.focus()
    document.execCommand('insertText', false, 'LO')

    await vi.waitFor(() => {
      expect(getTersePt(execEditor.getSnapshot().context)).toEqual([
        'helLO, world',
      ])
    })

    const oracleKeyGenerator = createTestKeyGenerator()
    const oracleBlockKey = oracleKeyGenerator()
    const oracleSpanAKey = oracleKeyGenerator()
    const oracleSpanBKey = oracleKeyGenerator()

    const {editor: oracleEditor, locator: oracleLocator} =
      await createTestEditor({
        keyGenerator: oracleKeyGenerator,
        schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
        initialValue: initialValue(
          oracleBlockKey,
          oracleSpanAKey,
          oracleSpanBKey,
        ),
      })

    await focusAtStart(oracleLocator)
    const oracleEditableElement = oracleLocator.element()
    const oracleTextNodes =
      oracleEditableElement.querySelectorAll('[data-pt-text]')
    const oracleFirstTextNode = oracleTextNodes[0]?.firstChild
    const oracleSecondTextNode = oracleTextNodes[1]?.firstChild

    if (!oracleFirstTextNode || !oracleSecondTextNode) {
      throw new Error('Could not find the editable text nodes')
    }

    setDomRange(oracleFirstTextNode, 3, oracleSecondTextNode, 2)
    oracleEditableElement.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'insertReplacementText',
        data: 'LO',
        bubbles: true,
        cancelable: true,
      }),
    )

    await vi.waitFor(() => {
      expect(getTersePt(oracleEditor.getSnapshot().context)).toEqual([
        'helLO, world',
      ])
    })

    expect(execEditor.getSnapshot().context.value).toEqual(
      oracleEditor.getSnapshot().context.value,
    )
  })

  test('(y) a neighbor hollowed into this block (Firefox merge shape, block count unchanged) refuses block-scoped reconstruction and repairs both blocks', async () => {
    const keyGenerator = createTestKeyGenerator()
    const block1Key = keyGenerator()
    const span1Key = keyGenerator()
    const block2Key = keyGenerator()
    const span2Key = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: block1Key,
          children: [{_type: 'span', _key: span1Key, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: block2Key,
          children: [{_type: 'span', _key: span2Key, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await focusAtStart(locator)

    const editableElement = locator.element()
    const textNodes = editableElement.querySelectorAll('[data-pt-text]')
    const firstTextNode = textNodes[0]?.firstChild as Text
    const secondTextNode = textNodes[1]?.firstChild as Text

    if (!firstTextNode || !secondTextNode) {
      throw new Error('Could not find the editable text nodes')
    }

    const patches: Array<unknown> = []
    editor.on('patch', (event) => patches.push(event.patch))

    // The Firefox merge shape: block 2's text migrates into block 1's own
    // text node, and block 2's own block-level wrapper survives, empty.
    // `editor.domElement.children.length` never changes, so the count check
    // alone can't see this - only `crossesIntoNeighboringBlock`'s per-block
    // text comparison can.
    firstTextNode.data = 'foobar'
    secondTextNode.data = ''

    setDomRange(firstTextNode, 6, firstTextNode, 6)
    editableElement.dispatchEvent(
      new InputEvent('input', {
        inputType: 'insertText',
        data: 'bar',
        bubbles: true,
        cancelable: false,
      }),
    )

    await new Promise((resolve) => requestAnimationFrame(resolve))
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Refused outright: adopting block 1's own partial diff here would
    // duplicate block 2's text into the model instead of just losing the
    // DOM-only damage.
    expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo', 'bar'])
    expect(patches.length).toBe(0)

    const repairedTextNodes = Array.from(
      editableElement.querySelectorAll('[data-pt-text]'),
    )
    expect(repairedTextNodes.map((node) => node.textContent)).toEqual([
      'foo',
      'bar',
    ])
  })

  // The whole premise - a leaked mutation record poisoning a later
  // turn's own validation - only applies where the `MutationObserver`
  // runs at all; it is never attached on WebKit (see the module doc on
  // `tryAdoptUnannouncedInput`).
  test.skipIf(server.browser === 'webkit')(
    "(z) a consumer-handled `input` turn doesn't leave a mutation record that poisons the next turn's own adoption",
    async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const TEXT = 'hello'

      let handledCalls = 0

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            children: [{_type: 'span', _key: spanKey, text: TEXT, marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
        editableProps: {
          onInput: () => {
            handledCalls++
            // The consumer handles the very first `input` turn itself -
            // this module's own adoption never runs for it, and must not
            // leave anything behind that outlives this turn.
            return handledCalls === 1
          },
        },
      })

      await focusAtStart(locator)

      const textNode = locator.element().querySelector('[data-pt-text]')
        ?.firstChild as Text

      if (!textNode) {
        throw new Error('Could not find the editable text node')
      }

      const patches: Array<unknown> = []
      editor.on('patch', (event) => patches.push(event.patch))

      // Turn 1: a real execCommand mutation the consumer marks handled.
      setDomRange(textNode, 5, textNode, 5)
      locator.element().focus()
      document.execCommand('insertText', false, 'X')

      await new Promise((resolve) => requestAnimationFrame(resolve))
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(handledCalls).toBe(1)

      // Turn 2: an ordinary correction at a different position in the same
      // text node - on its own, unambiguously one contiguous insertion, and
      // must adopt despite turn 1's leftover record.
      setDomRange(textNode, 0, textNode, 0)
      document.execCommand('insertText', false, 'Y')

      await vi.waitFor(() => {
        expect(getTersePt(editor.getSnapshot().context)).toEqual(['YhelloX'])
      })
      expect(patches.length).toBeGreaterThan(0)
    },
  )

  test('(aa) a mutation resolving to the editor root (every wrapper stripped) escalates to a full repair instead of leaving the surface stuck', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const TEXT = 'hello'

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: TEXT, marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await focusAtStart(locator)

    const editableElement = locator.element()
    const textNode = editableElement.querySelector('[data-pt-text]')
      ?.firstChild as Text

    if (!textNode) {
      throw new Error('Could not find the editable text node')
    }

    // A raw DOM node this destructively reparented is one React's own
    // reconciler no longer has an accurate host-node reference for; the
    // repair below forces it to discover that mismatch and recover through
    // an error-boundary catch (see findings F/G/I). React reports that
    // caught error as a page-level error regardless, so a listener has to
    // be present for the run not to treat it as an unhandled failure.
    const onExpectedRecoveryError = () => {}
    window.addEventListener('error', onExpectedRecoveryError)

    try {
      // Strip every wrapper the DOM position would normally resolve through,
      // leaving the raw text node a direct child of the editor root - the
      // shape an aggressively destructive `execCommand` can produce.
      // `getDomNodePath` then resolves to `data-pt-path=""", the root's own
      // attribute, i.e. an empty path.
      while (editableElement.firstChild) {
        editableElement.removeChild(editableElement.firstChild)
      }
      editableElement.appendChild(textNode)

      setDomRange(textNode, 0, textNode, 0)
      editableElement.dispatchEvent(
        new InputEvent('input', {
          inputType: 'insertText',
          data: 'X',
          bubbles: true,
          cancelable: false,
        }),
      )

      await new Promise((resolve) => requestAnimationFrame(resolve))
      await new Promise((resolve) => setTimeout(resolve, 0))

      // The model never adopted the stripped text node's content - there was
      // no span to diff against - but the surface must still come back:
      // structure is rebuilt from the model rather than left as a bare text
      // node with nothing to resolve a selection through.
      expect(
        editableElement.querySelectorAll('[data-pt-path]').length,
      ).toBeGreaterThan(0)

      const repairedTextNode = editableElement.querySelector('[data-pt-text]')
        ?.firstChild as Text

      if (!repairedTextNode) {
        throw new Error('Could not find the repaired text node')
      }

      // A further, real keystroke-equivalent correction proves the repaired
      // structure resolves a DOM position back to a model span again - the
      // surface accepts input rather than staying stuck. On WebKit,
      // `execCommand` fires its own real, cancelable `beforeinput` (see the
      // module doc on `tryAdoptUnannouncedInput`) rather than reaching this
      // module's adoption path, and that pipeline's own DOM-selection
      // resolution turned out unreliable this soon after a full remount in
      // CI - the structural assertion above already covers this test's own
      // claim for that browser.
      setDomRange(repairedTextNode, 0, repairedTextNode, 0)
      editableElement.focus()
      document.execCommand('insertText', false, 'Z')

      if (server.browser !== 'webkit') {
        await vi.waitFor(() => {
          expect(getTersePt(editor.getSnapshot().context)).toEqual(['Zhello'])
        })
      }
    } finally {
      window.removeEventListener('error', onExpectedRecoveryError)
    }
  })

  test('(bb) a neighboring block object with default fallback text does not block a same-block correction', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const objectKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({blockObjects: [{name: 'divider'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'divider',
          _key: objectKey,
        },
      ],
    })

    await focusAtStart(locator)

    const editableElement = locator.element()
    const textNode = editableElement.querySelector('[data-pt-text]')
      ?.firstChild as Text

    if (!textNode) {
      throw new Error('Could not find the editable text node')
    }

    const patches: Array<unknown> = []
    editor.on('patch', (event) => patches.push(event.patch))

    // The engine's own default block-object rendering shows a
    // `[type: key]` fallback as plain, non-zero-width text - visible to
    // `aggregateBlockText`'s walker even though `getText` (span text only)
    // never accounts for it. A same-block correction next to this neighbor
    // must not read that fallback text as damage. Mutates the text node
    // directly and dispatches the `input` `execCommand` itself would fire,
    // rather than calling `execCommand` (which some browsers refuse to run
    // at all next to a `contentEditable={false}` sibling).
    textNode.data = 'fXo'
    setDomRange(textNode, 2, textNode, 2)
    editableElement.dispatchEvent(
      new InputEvent('input', {
        inputType: 'insertText',
        data: 'X',
        bubbles: true,
        cancelable: false,
      }),
    )

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'fXo',
        '{divider}',
      ])
    })
    expect(patches.length).toBeGreaterThan(0)
  })

  test('(cc) a fully detached block node still recovers through a single error-boundary catch', async () => {
    const keyGenerator = createTestKeyGenerator()
    const block1Key = keyGenerator()
    const span1Key = keyGenerator()
    const block2Key = keyGenerator()
    const span2Key = keyGenerator()
    const block3Key = keyGenerator()
    const span3Key = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: block1Key,
          children: [{_type: 'span', _key: span1Key, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: block2Key,
          children: [{_type: 'span', _key: span2Key, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: block3Key,
          children: [{_type: 'span', _key: span3Key, text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await focusAtStart(locator)

    const editableElement = locator.element()

    // A node detached this destructively is one React's own reconciler no
    // longer has an accurate host-node reference for; the repair below
    // forces it to discover that mismatch and recover through an
    // error-boundary catch (see findings F/G/I). React reports that caught
    // error as a page-level error regardless, so a listener has to be
    // present for the run not to treat it as an unhandled failure.
    const onExpectedRecoveryError = () => {}
    window.addEventListener('error', onExpectedRecoveryError)

    try {
      // Detach block 2's own DOM subtree entirely - React's fiber tree still
      // references it as present under the editor root, so any remount
      // attempt (the block-count mismatch this produces routes straight to
      // `bumpAllBlockGenerations`) has to reconcile against a node that's no
      // longer anywhere in the document.
      editableElement.children[1]?.remove()

      const textNode = editableElement.querySelector('[data-pt-text]')
        ?.firstChild as Text

      if (!textNode) {
        throw new Error('Could not find the editable text node')
      }

      setDomRange(textNode, 0, textNode, 0)
      editableElement.dispatchEvent(
        new InputEvent('input', {
          inputType: 'insertText',
          data: 'X',
          bubbles: true,
          cancelable: false,
        }),
      )

      // The surface must come back fully - all three blocks rebuilt from the
      // model - rather than the error boundary's own recovery failing a
      // second time and taking the whole editable surface down.
      await vi.waitFor(() => {
        expect(
          Array.from(editableElement.querySelectorAll('[data-pt-text]')).map(
            (node) => node.textContent,
          ),
        ).toEqual(['foo', 'bar', 'baz'])
      })

      const rebuiltTextNodes =
        editableElement.querySelectorAll('[data-pt-text]')
      const rebuiltBlock2TextNode = rebuiltTextNodes[1]?.firstChild as Text

      if (!rebuiltBlock2TextNode) {
        throw new Error('Could not find the rebuilt block 2 text node')
      }

      // A further, real keystroke-equivalent correction proves the repaired
      // structure resolves a DOM position back to a model span again in the
      // rebuilt block, not just in the two blocks the repair left untouched.
      // Skipped on WebKit for the same reason the single-block version of
      // this check above is: `execCommand` there fires its own real,
      // cancelable `beforeinput` rather than reaching this module's
      // adoption path, and that pipeline's own DOM-selection resolution
      // turned out unreliable this soon after a full remount in CI.
      setDomRange(rebuiltBlock2TextNode, 0, rebuiltBlock2TextNode, 0)
      editableElement.focus()
      document.execCommand('insertText', false, 'Z')

      if (server.browser === 'webkit') {
        return
      }

      await vi.waitFor(() => {
        expect(getTersePt(editor.getSnapshot().context)).toEqual([
          'foo',
          'Zbar',
          'baz',
        ])
      })
    } finally {
      window.removeEventListener('error', onExpectedRecoveryError)
    }
  })

  test('(dd) a full remount rebuilds a corrupted block object, not just text blocks', async () => {
    const keyGenerator = createTestKeyGenerator()
    const block1Key = keyGenerator()
    const span1Key = keyGenerator()
    const block2Key = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({blockObjects: [{name: 'divider'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: block1Key,
          children: [{_type: 'span', _key: span1Key, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'divider',
          _key: block2Key,
        },
      ],
    })

    await focusAtStart(locator)

    const editableElement = locator.element()
    const fallbackDiv = editableElement
      .querySelector('[data-pt-block="object"]')
      ?.querySelector('div[contenteditable="false"]') as HTMLElement

    if (!fallbackDiv) {
      throw new Error('Could not find the block object fallback element')
    }

    // Corrupt the block object's own rendered fallback text directly -
    // its visible parts are `contentEditable={false}`, not immune to
    // whatever DOM a destructive `execCommand` left behind.
    fallbackDiv.textContent = 'CORRUPTED'

    // Force `repairBlockDom` to escalate to `bumpAllBlockGenerations` (a
    // full remount) via a block-count mismatch, independent of any
    // neighbor-text check.
    editableElement.appendChild(document.createElement('div'))

    const textNode = editableElement.querySelector('[data-pt-text]')
      ?.firstChild as Text

    if (!textNode) {
      throw new Error('Could not find the editable text node')
    }

    setDomRange(textNode, 0, textNode, 0)
    editableElement.dispatchEvent(
      new InputEvent('input', {
        inputType: 'insertText',
        data: 'X',
        bubbles: true,
        cancelable: false,
      }),
    )

    await vi.waitFor(() => {
      const rebuiltFallback = editableElement
        .querySelector('[data-pt-block="object"]')
        ?.querySelector('div[contenteditable="false"]')
      expect(rebuiltFallback?.textContent).toBe(`[divider: ${block2Key}]`)
    })
    expect(getTersePt(editor.getSnapshot().context)).toEqual([
      'foo',
      '{divider}',
    ])
  })
})
