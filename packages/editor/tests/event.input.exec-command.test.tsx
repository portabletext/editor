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

  test('(h) execCommand across two differently-marked spans does not adopt', async () => {
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

    if (server.browser === 'webkit') {
      // WebKit, unlike Chromium and Firefox, fires a real cancelable
      // `beforeinput` for `execCommand('insertText'|'delete')` (with precise
      // target ranges), so this edit takes the ordinary behavior pipeline
      // there and never reaches unannounced-input adoption at all; the
      // result is the same one a real keystroke over this selection
      // produces.
      await vi.waitFor(() => {
        expect(getTersePt(editor.getSnapshot().context)).toEqual(['hX, world'])
      })
      expect(patches.length).toBeGreaterThan(0)
      return
    }

    await new Promise((resolve) => requestAnimationFrame(resolve))
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(getTersePt(editor.getSnapshot().context)).toEqual(['hel,lo world'])
    expect(patches.length).toBe(0)
  })

  test('(i) a synthetic `input` refuses to adopt a mutation spread across two differently-marked spans, on every browser', async () => {
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

    setDomRange(firstTextNode, 1, secondTextNode, 2)
    ;(firstTextNode as Text).data = 'hX'
    ;(secondTextNode as Text).data = ' world'
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

    expect(getTersePt(editor.getSnapshot().context)).toEqual(['hel,lo world'])
    expect(patches.length).toBe(0)
  })

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
})
