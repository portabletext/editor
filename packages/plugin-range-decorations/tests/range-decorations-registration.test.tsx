import {
  EditorProvider,
  PortableTextEditable,
  type RangeDecorationRenderProps,
  type RegistrableRangeDecoration,
} from '@portabletext/editor'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {diffMatchPatch} from '@portabletext/patches'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import {StrictMode, useEffect} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {server, userEvent} from 'vitest/browser'
import {
  createRangeDecorationLayer,
  defineRangeDecoration,
  RangeDecorationPlugin,
  RangeDecorationWidget,
  useRangeDecorationLayer,
  useRangeDecorations,
  type RangeDecorationEvent,
  type RangeDecorationLayer,
} from '../src'

function getEditorHtml() {
  const editorElement = document.querySelector('[data-pt-editor]')
  expect(editorElement).not.toEqual(null)
  return editorElement!.innerHTML
}

describe('defineRangeDecoration', () => {
  test('Scenario: defineRangeDecoration returns its argument unchanged', () => {
    const decoration: RegistrableRangeDecoration = {
      id: 'a',
      range: {
        anchor: {
          path: [{_key: 'block'}, 'children', {_key: 'span'}],
          offset: 0,
        },
        focus: {path: [{_key: 'block'}, 'children', {_key: 'span'}], offset: 1},
      },
      render: (props) => <span>{props.children}</span>,
    }

    expect(defineRangeDecoration(decoration)).toBe(decoration)
  })
})

describe('createRangeDecorationLayer: registration and errors', () => {
  test('Scenario: a RangeDecorationPlugin re-rendered with a new inline `on` identity keeps its stacking position and delivers only to the latest handler', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const range = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }

    const renderA = (props: RangeDecorationRenderProps) => (
      <span data-testid="decoration-a">{props.children}</span>
    )
    const renderB = (props: RangeDecorationRenderProps) => (
      <span data-testid="decoration-b">{props.children}</span>
    )
    const rangeDecorationsA = [{id: 'a', render: renderA, range}]
    const rangeDecorationsB = [{id: 'b', render: renderB, range}]

    const onFirstOn = vi.fn()
    const onSecondOn = vi.fn()

    const initialValue: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
      },
    ]

    const {editor, locator, rerender} = await createTestEditor({
      keyGenerator,
      initialValue,
      children: (
        <>
          <RangeDecorationPlugin
            rangeDecorations={rangeDecorationsA}
            on={onFirstOn}
          />
          <RangeDecorationPlugin rangeDecorations={rangeDecorationsB} />
        </>
      ),
    })

    const nestedDecorationsHtml = [
      `<div data-pt-path="[_key==&quot;${blockKey}&quot;]" data-pt-block="text">`,
      '<div>',
      `<span data-pt-path="[_key==&quot;${blockKey}&quot;].children[_key==&quot;${spanKey}&quot;]" data-pt-inline="span">`,
      '<span data-testid="decoration-a">',
      '<span data-testid="decoration-b">',
      '<span data-pt-marks="true"><span data-pt-text="true">foo</span></span>',
      '</span>',
      '</span>',
      '</span>',
      '</div>',
      '</div>',
    ].join('')

    await vi.waitFor(() => {
      expect(getEditorHtml()).toEqual(nestedDecorationsHtml)
    })

    // A fresh inline `on` closure, same `rangeDecorations` reference: `on`
    // is fixed at registration and never re-registers on its own change.
    await rerender({
      keyGenerator,
      initialValue,
      children: (
        <>
          <RangeDecorationPlugin
            rangeDecorations={rangeDecorationsA}
            on={onSecondOn}
          />
          <RangeDecorationPlugin rangeDecorations={rangeDecorationsB} />
        </>
      ),
    })

    // Re-registering would move `a`'s layer to the end, nesting it inside
    // `b` instead of around it.
    expect(getEditorHtml()).toEqual(nestedDecorationsHtml)

    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 0},
        focus: {path: spanPath, offset: 0},
      },
    })
    await userEvent.type(locator, 'x')

    await vi.waitFor(() => {
      expect(onSecondOn).toHaveBeenCalledTimes(1)
    })

    expect(onFirstOn).not.toHaveBeenCalled()
  })
})

describe('createRangeDecorationLayer: events', () => {
  test("Scenario: typing before a decorated range delivers a single-element batch of 'moved' only", async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const on = vi.fn()
    const render = (props: RangeDecorationRenderProps) => (
      <span>{props.children}</span>
    )
    const range = {
      anchor: {path: spanPath, offset: 1},
      focus: {path: spanPath, offset: 3},
    }

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    })

    const registeredDecoration = {id: 'trackable', render, range}

    createRangeDecorationLayer(editor, {
      rangeDecorations: [registeredDecoration],
      on,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 0},
        focus: {path: spanPath, offset: 0},
      },
    })

    await userEvent.type(locator, 'x')

    await vi.waitFor(() => {
      expect(on).toHaveBeenCalledTimes(1)
    })

    expect(on.mock.calls[0]?.[0]).toEqual([
      {
        type: 'moved',
        previousRange: range,
        newRange: {
          anchor: {path: spanPath, offset: 2},
          focus: {path: spanPath, offset: 4},
        },
        rangeDecoration: registeredDecoration,
        origin: 'local',
      },
    ])
  })

  test("Scenario: typing inside a decorated range delivers one batch of ['moved', 'content-changed'], in that order", async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const on = vi.fn()
    const render = (props: RangeDecorationRenderProps) => (
      <span>{props.children}</span>
    )
    const range = {
      anchor: {path: spanPath, offset: 1},
      focus: {path: spanPath, offset: 4},
    }

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'abcde', marks: []}],
          markDefs: [],
        },
      ],
    })

    const registeredDecoration = {id: 'trackable', render, range}

    createRangeDecorationLayer(editor, {
      rangeDecorations: [registeredDecoration],
      on,
    })

    // Offset 2 is strictly inside the range (after the anchor, before the
    // focus): the insertion shifts the focus but not the anchor, and the
    // text the range covers changes. The editable must be focused before
    // a manual mid-text `select`, or `userEvent.type`'s own focusing click
    // resets the caret to wherever it lands by default.
    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 2},
        focus: {path: spanPath, offset: 2},
      },
    })

    await userEvent.type(locator, 'X')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: abX|cde')
    })

    await vi.waitFor(() => {
      expect(on).toHaveBeenCalledTimes(1)
    })

    const newRange = {
      anchor: {path: spanPath, offset: 1},
      focus: {path: spanPath, offset: 5},
    }
    expect(on.mock.calls[0]?.[0]).toEqual([
      {
        type: 'moved',
        previousRange: range,
        newRange,
        rangeDecoration: registeredDecoration,
        origin: 'local',
      },
      {
        type: 'content-changed',
        range: newRange,
        rangeDecoration: registeredDecoration,
        origin: 'local',
      },
    ])
  })

  test("Scenario: a same-length local edit inside a decorated range delivers 'content-changed' only", async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const on = vi.fn()
    const render = (props: RangeDecorationRenderProps) => (
      <span>{props.children}</span>
    )
    const range = {
      anchor: {path: spanPath, offset: 1},
      focus: {path: spanPath, offset: 5},
    }

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'abcdef', marks: []}],
          markDefs: [],
        },
      ],
    })

    const registeredDecoration = {id: 'trackable', render, range}

    createRangeDecorationLayer(editor, {
      rangeDecorations: [registeredDecoration],
      on,
    })

    // Replacing "d" (offsets [3, 4), strictly inside the range on both
    // sides) with "X" keeps the range's own length: the delete and the
    // insert shift the focus in opposite directions by the same amount,
    // netting no move.
    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 3},
        focus: {path: spanPath, offset: 4},
      },
    })
    editor.send({type: 'insert.text', text: 'X'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: abcX|ef')
    })

    await vi.waitFor(() => {
      expect(on).toHaveBeenCalledTimes(1)
    })

    expect(on.mock.calls[0]?.[0]).toEqual([
      {
        type: 'content-changed',
        range,
        rangeDecoration: registeredDecoration,
        origin: 'local',
      },
    ])
  })

  test('Scenario: an edit destroying a registered decoration delivers `lost` only, no other events, in that batch', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const on = vi.fn()
    const render = (props: RangeDecorationRenderProps) => (
      <span>{props.children}</span>
    )
    const range = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    })

    const registeredDecoration = {id: 'trackable', render, range}

    createRangeDecorationLayer(editor, {
      rangeDecorations: [registeredDecoration],
      on,
    })

    editor.send({type: 'delete.block', at: [{_key: blockKey}]})

    await vi.waitFor(() => {
      expect(on).toHaveBeenCalledTimes(1)
    })

    expect(on.mock.calls[0]?.[0]).toEqual([
      {
        type: 'lost',
        previousRange: range,
        rangeDecoration: registeredDecoration,
        origin: 'local',
      },
    ])
  })

  test('Scenario: a remote patch that moves a registered decoration reports a remote origin', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const on = vi.fn()
    const render = (props: RangeDecorationRenderProps) => (
      <span data-testid="tracked-decoration">{props.children}</span>
    )
    const range = {
      anchor: {path: spanPath, offset: 1},
      focus: {path: spanPath, offset: 3},
    }

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    })

    const registeredDecoration = {id: 'trackable', render, range}

    createRangeDecorationLayer(editor, {
      rangeDecorations: [registeredDecoration],
      on,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="tracked-decoration"]'),
      ).not.toEqual(null)
    })

    editor.send({
      type: 'patches',
      // Importing @portabletext/patches's diffMatchPatch here mirrors the
      // legacy suite's origin harness (see `@portabletext/editor`'s
      // `tests/range-decorations.test.tsx`).
      patches: [
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
          value: '@@ -1,3 +1,6 @@\n+bar\n foo\n',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(on).toHaveBeenCalledTimes(1)
    })

    expect(on.mock.calls[0]?.[0]).toEqual([
      {
        type: 'moved',
        previousRange: range,
        newRange: {
          anchor: {path: spanPath, offset: 4},
          focus: {path: spanPath, offset: 6},
        },
        rangeDecoration: registeredDecoration,
        origin: 'remote',
      },
    ])
  })

  test('Scenario: a same-length remote patch inside a decorated range reports a remote origin on `content-changed`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const on = vi.fn()
    const render = (props: RangeDecorationRenderProps) => (
      <span data-testid="tracked-decoration">{props.children}</span>
    )
    const range = {
      anchor: {path: spanPath, offset: 1},
      focus: {path: spanPath, offset: 5},
    }

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'abcdef', marks: []}],
          markDefs: [],
        },
      ],
    })

    const registeredDecoration = {id: 'trackable', render, range}

    createRangeDecorationLayer(editor, {
      rangeDecorations: [registeredDecoration],
      on,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="tracked-decoration"]'),
      ).not.toEqual(null)
    })

    // Replacing "d" with "X" keeps the text length: same shape as the local
    // same-length-edit scenario, applied as a remote patch instead.
    editor.send({
      type: 'patches',
      patches: [
        diffMatchPatch('abcdef', 'abcXef', [
          {_key: blockKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(on).toHaveBeenCalledTimes(1)
    })

    expect(on.mock.calls[0]?.[0]).toEqual([
      {
        type: 'content-changed',
        range,
        rangeDecoration: registeredDecoration,
        origin: 'remote',
      },
    ])
  })

  test('Scenario: a remote patch destroying a registered decoration reports a remote origin on `lost`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const otherBlockKey = keyGenerator()
    const otherSpanKey = keyGenerator()

    const on = vi.fn()
    const render = (props: RangeDecorationRenderProps) => (
      <span data-testid="tracked-decoration">{props.children}</span>
    )
    const range = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
        },
        {
          _type: 'block',
          _key: otherBlockKey,
          children: [
            {_type: 'span', _key: otherSpanKey, text: 'bar', marks: []},
          ],
          markDefs: [],
        },
      ],
    })

    const registeredDecoration = {id: 'trackable', render, range}

    createRangeDecorationLayer(editor, {
      rangeDecorations: [registeredDecoration],
      on,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="tracked-decoration"]'),
      ).not.toEqual(null)
    })

    editor.send({
      type: 'patches',
      patches: [{type: 'unset', path: [{_key: blockKey}]}],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(on).toHaveBeenCalledTimes(1)
    })

    expect(on.mock.calls[0]?.[0]).toEqual([
      {
        type: 'lost',
        previousRange: range,
        rangeDecoration: registeredDecoration,
        origin: 'remote',
      },
    ])
  })

  test('Scenario: a multi-operation local change delivers one batch with at most one event per decoration per concern', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const on = vi.fn()
    const render = (props: RangeDecorationRenderProps) => (
      <span>{props.children}</span>
    )
    const range = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'abcde', marks: []}],
          markDefs: [],
        },
      ],
    })

    const registeredDecoration = {id: 'trackable', render, range}

    createRangeDecorationLayer(editor, {
      rangeDecorations: [registeredDecoration],
      on,
    })

    // Two local operations in one synchronous burst, both inserting before
    // the decorated range: a buggy per-operation delivery would surface as
    // two `moved` events (or two batches); a correct implementation folds
    // them into the one net move.
    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 0},
        focus: {path: spanPath, offset: 0},
      },
    })
    editor.send({type: 'insert.text', text: 'X'})
    editor.send({type: 'insert.text', text: 'Y'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: XY|abcde')
    })

    await vi.waitFor(() => {
      expect(on).toHaveBeenCalledTimes(1)
    })

    expect(on.mock.calls[0]?.[0]).toEqual([
      {
        type: 'moved',
        previousRange: range,
        newRange: {
          anchor: {path: spanPath, offset: 2},
          focus: {path: spanPath, offset: 5},
        },
        rangeDecoration: registeredDecoration,
        origin: 'local',
      },
    ])
  })

  test("Scenario: a throwing `on` handler does not prevent delivery to another layer's handler", async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const onThrows = vi.fn(() => {
      throw new Error('listener boom')
    })
    const onSucceeds = vi.fn()
    const render = (props: RangeDecorationRenderProps) => (
      <span>{props.children}</span>
    )
    const range = {
      anchor: {path: spanPath, offset: 1},
      focus: {path: spanPath, offset: 3},
    }

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    })

    createRangeDecorationLayer(editor, {
      rangeDecorations: [{id: 'throws', render, range}],
      on: onThrows,
    })
    createRangeDecorationLayer(editor, {
      rangeDecorations: [{id: 'succeeds', render, range}],
      on: onSucceeds,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 0},
        focus: {path: spanPath, offset: 0},
      },
    })
    await userEvent.type(locator, 'x')

    await vi.waitFor(() => {
      expect(onSucceeds).toHaveBeenCalledTimes(1)
    })
    expect(onThrows).toHaveBeenCalledTimes(1)
  })

  test('Scenario: two registrations each deliver their own `moved` event to their own `on` handler', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const onFirst = vi.fn()
    const onSecond = vi.fn()
    const render = (props: RangeDecorationRenderProps) => (
      <span>{props.children}</span>
    )
    const range = {
      anchor: {path: spanPath, offset: 1},
      focus: {path: spanPath, offset: 3},
    }

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    })

    const firstDecoration = {id: 'first', render, range}
    const secondDecoration = {id: 'second', render, range}

    createRangeDecorationLayer(editor, {
      rangeDecorations: [firstDecoration],
      on: onFirst,
    })
    createRangeDecorationLayer(editor, {
      rangeDecorations: [secondDecoration],
      on: onSecond,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 0},
        focus: {path: spanPath, offset: 0},
      },
    })

    await userEvent.type(locator, 'x')

    await vi.waitFor(() => {
      expect(onFirst).toHaveBeenCalledTimes(1)
      expect(onSecond).toHaveBeenCalledTimes(1)
    })

    const movedRange = {
      anchor: {path: spanPath, offset: 2},
      focus: {path: spanPath, offset: 4},
    }

    expect(onFirst.mock.calls[0]?.[0]).toEqual([
      {
        type: 'moved',
        previousRange: range,
        newRange: movedRange,
        rangeDecoration: firstDecoration,
        origin: 'local',
      },
    ])
    expect(onSecond.mock.calls[0]?.[0]).toEqual([
      {
        type: 'moved',
        previousRange: range,
        newRange: movedRange,
        rangeDecoration: secondDecoration,
        origin: 'local',
      },
    ])
  })

  test("Scenario: within one layer, a batch orders events by the layer's array order, not by id or by resulting position", async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const on = vi.fn()
    const render = (props: RangeDecorationRenderProps) => (
      <span>{props.children}</span>
    )
    // Array index 0 gets the id that sorts last (`z`) and the range that
    // ends up at the higher offset; array index 1 gets the id that sorts
    // first (`a`) and the range that ends up at the lower offset. Sorting
    // by id, or by the ranges' resulting position, both give the opposite
    // of array order - only array order matches the expected output.
    const firstRange = {
      anchor: {path: spanPath, offset: 3},
      focus: {path: spanPath, offset: 5},
    }
    const secondRange = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 2},
    }

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foobar', marks: []}],
          markDefs: [],
        },
      ],
    })

    const firstDecoration = {id: 'z', render, range: firstRange}
    const secondDecoration = {id: 'a', render, range: secondRange}

    createRangeDecorationLayer(editor, {
      rangeDecorations: [firstDecoration, secondDecoration],
      on,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 0},
        focus: {path: spanPath, offset: 0},
      },
    })

    await userEvent.type(locator, 'x')

    await vi.waitFor(() => {
      expect(on).toHaveBeenCalledTimes(1)
    })

    expect(on.mock.calls[0]?.[0]).toEqual([
      {
        type: 'moved',
        previousRange: firstRange,
        newRange: {
          anchor: {path: spanPath, offset: 4},
          focus: {path: spanPath, offset: 6},
        },
        rangeDecoration: firstDecoration,
        origin: 'local',
      },
      {
        type: 'moved',
        previousRange: secondRange,
        newRange: {
          anchor: {path: spanPath, offset: 1},
          focus: {path: spanPath, offset: 3},
        },
        rangeDecoration: secondDecoration,
        origin: 'local',
      },
    ])
  })

  test('Scenario: the flushed event resolves rangeDecoration from the config in effect when the mapping arrived, not a same-tick update() that only swaps render', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const on = vi.fn()
    const renderOne = (props: RangeDecorationRenderProps) => (
      <span data-testid="one">{props.children}</span>
    )
    const renderTwo = (props: RangeDecorationRenderProps) => (
      <span data-testid="two">{props.children}</span>
    )
    const range = {
      anchor: {path: spanPath, offset: 1},
      focus: {path: spanPath, offset: 3},
    }

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    })

    const registeredDecoration = {id: 'a', render: renderOne, range}

    const layer = createRangeDecorationLayer(editor, {
      rangeDecorations: [registeredDecoration],
      on,
    })

    // Queues a `moved` mapping in the batcher, not yet flushed.
    editor.send({
      type: 'insert.text',
      at: spanPath,
      offset: 0,
      text: 'x',
    })

    // Same tick: swaps only `render`. The range is unchanged, so
    // `update()`'s own diff never touches the queued mapping (it isn't a
    // drop or a re-anchor) - this must not retroactively change which
    // `rangeDecoration` the pending event resolves to.
    const repointedDecoration = {id: 'a', render: renderTwo, range}
    layer.update([repointedDecoration])

    await vi.waitFor(() => {
      expect(on).toHaveBeenCalledTimes(1)
    })

    expect(on.mock.calls[0]?.[0][0]?.rangeDecoration).toBe(registeredDecoration)
  })
})

describe('createRangeDecorationLayer: reading state', () => {
  test('Scenario: layer.current returns live, edit-adjusted ranges in registration order, with a stable reference between changes', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const render = (props: RangeDecorationRenderProps) => (
      <span>{props.children}</span>
    )
    const rangeA = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 1},
    }
    const rangeB = {
      anchor: {path: spanPath, offset: 1},
      focus: {path: spanPath, offset: 3},
    }

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    })

    const layer = createRangeDecorationLayer(editor, {
      rangeDecorations: [
        {id: 'a', render, range: rangeA},
        {id: 'b', render, range: rangeB},
      ],
    })

    expect(layer.current).toEqual([
      {id: 'a', range: rangeA},
      {id: 'b', range: rangeB},
    ])

    const firstRead = layer.current
    expect(layer.current).toBe(firstRead)

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 0},
        focus: {path: spanPath, offset: 0},
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.offset).toBe(0)
    })
    await userEvent.keyboard('x')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: x|foo')
    })

    await vi.waitFor(() => {
      expect(layer.current).not.toBe(firstRead)
    })

    expect(layer.current).toEqual([
      {
        id: 'a',
        range: {
          anchor: {path: spanPath, offset: 1},
          focus: {path: spanPath, offset: 2},
        },
      },
      {
        id: 'b',
        range: {
          anchor: {path: spanPath, offset: 2},
          focus: {path: spanPath, offset: 4},
        },
      },
    ])
  })

  test('Scenario: layer.current updates after update(), and omits lost or removed entries', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const render = (props: RangeDecorationRenderProps) => (
      <span>{props.children}</span>
    )
    const rangeA = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 1},
    }
    const rangeB = {
      anchor: {path: spanPath, offset: 1},
      focus: {path: spanPath, offset: 3},
    }

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    })

    const layer = createRangeDecorationLayer(editor, {
      rangeDecorations: [
        {id: 'a', render, range: rangeA},
        {id: 'b', render, range: rangeB},
      ],
    })

    const beforeUpdate = layer.current

    const rangeARepointed = {
      anchor: {path: spanPath, offset: 2},
      focus: {path: spanPath, offset: 3},
    }
    layer.update([{id: 'a', render, range: rangeARepointed}])

    expect(layer.current).not.toBe(beforeUpdate)
    expect(layer.current).toEqual([{id: 'a', range: rangeARepointed}])

    editor.send({type: 'delete.block', at: [{_key: blockKey}]})

    await vi.waitFor(() => {
      expect(layer.current).toEqual([])
    })
  })

  test('Scenario: useRangeDecorations(layer) re-renders a consumer with new positions after an edit settles', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const render = (props: RangeDecorationRenderProps) => (
      <span>{props.children}</span>
    )
    const range = {
      anchor: {path: spanPath, offset: 1},
      focus: {path: spanPath, offset: 3},
    }

    const {editor, locator, rerender} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    })

    const layer = createRangeDecorationLayer(editor, {
      rangeDecorations: [{id: 'a', render, range}],
    })

    const renders: Array<RangeDecorationLayer['current']> = []

    await rerender({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
      children: (
        <RangeDecorationsPositionsProbe
          layer={layer}
          onRender={(current) => renders.push(current)}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(renders.at(-1)).toEqual([{id: 'a', range}])
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 0},
        focus: {path: spanPath, offset: 0},
      },
    })
    await userEvent.type(locator, 'x')

    await vi.waitFor(() => {
      expect(renders.at(-1)).toEqual([
        {
          id: 'a',
          range: {
            anchor: {path: spanPath, offset: 2},
            focus: {path: spanPath, offset: 4},
          },
        },
      ])
    })
  })

  test("Scenario: an unchanged update() leaves `current`'s reference unchanged", async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const render = (props: RangeDecorationRenderProps) => (
      <span>{props.children}</span>
    )
    const range = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }
    const registeredDecoration = {id: 'a', render, range}

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    })

    const layer = createRangeDecorationLayer(editor, {
      rangeDecorations: [registeredDecoration],
    })

    const before = layer.current

    layer.update([registeredDecoration])

    expect(layer.current).toBe(before)
  })

  test("Scenario: a net-zero local burst leaves `current`'s reference unchanged", async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const render = (props: RangeDecorationRenderProps) => (
      <span>{props.children}</span>
    )
    const range = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }
    const registeredDecoration = {id: 'a', render, range}

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    })

    const layer = createRangeDecorationLayer(editor, {
      rangeDecorations: [registeredDecoration],
    })

    await vi.waitFor(() => {
      expect(layer.current).toEqual([{id: 'a', range}])
    })

    const before = layer.current

    // Inserting "X" at the range's own start, then removing it again, both
    // in one synchronous burst: the range ends up back where it started,
    // without ever moving through an intermediate render.
    editor.send({
      type: 'insert.text',
      at: spanPath,
      offset: 0,
      text: 'X',
    })
    editor.send({
      type: 'remove.text',
      at: spanPath,
      offset: 0,
      text: 'X',
    })

    // Waiting for the applied text proves the burst already ran: the
    // machine's operation listener runs synchronously in the `before`
    // phase, so by the time this settles, any batcher flush the burst
    // scheduled has already run too.
    await vi.waitFor(() => {
      const block = editor.getSnapshot().context
        .value[0] as PortableTextBlock & {
        children: Array<{text?: string}>
      }
      expect(block.children[0]?.text).toEqual('foo')
    })

    expect(layer.current).toEqual([{id: 'a', range}])
    expect(layer.current).toBe(before)
  })
})

describe('createRangeDecorationLayer: batcher lifecycle', () => {
  test('Scenario: unregister() in the same tick as a moving operation cancels delivery', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const on = vi.fn()
    const render = (props: RangeDecorationRenderProps) => (
      <span>{props.children}</span>
    )
    const range = {
      anchor: {path: spanPath, offset: 1},
      focus: {path: spanPath, offset: 3},
    }
    const registeredDecoration = {id: 'trackable', render, range}

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    })

    const layer = createRangeDecorationLayer(editor, {
      rangeDecorations: [registeredDecoration],
      on,
    })

    const sentinelOn = vi.fn()
    createRangeDecorationLayer(editor, {
      rangeDecorations: [{id: 'sentinel', render, range}],
      on: sentinelOn,
    })

    await vi.waitFor(() => {
      expect(layer.current).toEqual([{id: 'trackable', range}])
    })

    editor.send({
      type: 'insert.text',
      at: spanPath,
      offset: 0,
      text: 'x',
    })
    layer.unregister()

    // The sentinel layer isn't unregistered, so its batcher delivers this
    // same burst's `moved` event normally: waiting for it proves the
    // flush the unregistered layer's queued event would have used has
    // already run.
    await vi.waitFor(() => {
      expect(sentinelOn).toHaveBeenCalled()
    })

    expect(on).not.toHaveBeenCalled()
    expect(layer.current).toEqual([])
  })

  test('Scenario: reviving a killed id with a same-tick update() cancels the queued `lost`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const otherBlockKey = keyGenerator()
    const otherSpanKey = keyGenerator()
    const otherSpanPath = [
      {_key: otherBlockKey},
      'children',
      {_key: otherSpanKey},
    ]
    const sentinelBlockKey = keyGenerator()
    const sentinelSpanKey = keyGenerator()
    const sentinelSpanPath = [
      {_key: sentinelBlockKey},
      'children',
      {_key: sentinelSpanKey},
    ]

    const on = vi.fn()
    const render = (props: RangeDecorationRenderProps) => (
      <span>{props.children}</span>
    )
    const range = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }
    const registeredDecoration = {id: 'trackable', render, range}

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
        },
        {
          _type: 'block',
          _key: otherBlockKey,
          children: [
            {_type: 'span', _key: otherSpanKey, text: 'bar', marks: []},
          ],
          markDefs: [],
        },
        {
          _type: 'block',
          _key: sentinelBlockKey,
          children: [
            {_type: 'span', _key: sentinelSpanKey, text: 'baz', marks: []},
          ],
          markDefs: [],
        },
      ],
    })

    const layer = createRangeDecorationLayer(editor, {
      rangeDecorations: [registeredDecoration],
      on,
    })

    const sentinelOn = vi.fn()
    createRangeDecorationLayer(editor, {
      rangeDecorations: [
        {
          id: 'sentinel',
          render,
          range: {
            anchor: {path: sentinelSpanPath, offset: 0},
            focus: {path: sentinelSpanPath, offset: 3},
          },
        },
      ],
      on: sentinelOn,
    })

    await vi.waitFor(() => {
      expect(layer.current).toEqual([{id: 'trackable', range}])
    })

    // Kills it: removing the block the range is anchored to queues a
    // `lost` for `trackable` in the batcher, not yet flushed.
    editor.send({type: 'delete.block', at: [{_key: blockKey}]})

    const revivedRange = {
      anchor: {path: otherSpanPath, offset: 0},
      focus: {path: otherSpanPath, offset: 3},
    }
    // Same tick: a deliberate re-anchor to a changed range revives it
    // before the queued `lost` ever flushes.
    layer.update([{id: 'trackable', render, range: revivedRange}])

    // An unrelated edit in the same synchronous burst: its sentinel
    // decoration genuinely moves, so waiting for its `on` proves every
    // batcher scheduled in this burst, including `trackable`'s, has
    // flushed.
    editor.send({
      type: 'insert.text',
      at: sentinelSpanPath,
      offset: 0,
      text: 'Q',
    })

    await vi.waitFor(() => {
      expect(sentinelOn).toHaveBeenCalled()
    })

    expect(on).not.toHaveBeenCalled()
    expect(layer.current).toEqual([{id: 'trackable', range: revivedRange}])
  })

  test('Scenario: reviving a killed id with a same-tick update() resupplying the range it moved to (not its original config) still delivers the queued `lost`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const otherBlockKey = keyGenerator()
    const otherSpanKey = keyGenerator()

    const on = vi.fn()
    const render = (props: RangeDecorationRenderProps) => (
      <span>{props.children}</span>
    )
    const range = {
      anchor: {path: spanPath, offset: 3},
      focus: {path: spanPath, offset: 6},
    }
    const registeredDecoration = {id: 'trackable', render, range}

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'aaafoobbb', marks: []},
          ],
          markDefs: [],
        },
        {
          _type: 'block',
          _key: otherBlockKey,
          children: [
            {_type: 'span', _key: otherSpanKey, text: 'bar', marks: []},
          ],
          markDefs: [],
        },
      ],
    })

    const layer = createRangeDecorationLayer(editor, {
      rangeDecorations: [registeredDecoration],
      on,
    })

    await vi.waitFor(() => {
      expect(layer.current).toEqual([{id: 'trackable', range}])
    })

    // Moves it, still alive: only the live position tracks the edit, the
    // layer's own config (`registeredDecoration.range`) doesn't.
    editor.send({
      type: 'insert.text',
      at: spanPath,
      offset: 0,
      text: 'X',
    })

    const movedRange = {
      anchor: {path: spanPath, offset: 4},
      focus: {path: spanPath, offset: 7},
    }

    await vi.waitFor(() => {
      expect(layer.current).toEqual([{id: 'trackable', range: movedRange}])
    })

    // The move above already flushed a `moved` event; only the kill's
    // event matters from here.
    on.mockClear()

    // Kills it: removing the block the range is anchored to queues a
    // `lost` for `trackable` in the batcher, not yet flushed. The
    // tombstone records the range it died under: `movedRange`, not the
    // stale `registeredDecoration.range`.
    editor.send({type: 'delete.block', at: [{_key: blockKey}]})

    // Same tick: resupplying the range it just died under - a redundant
    // no-op to the machine's reconciliation, which stays dead - even
    // though this range differs from the layer's last stored config, so
    // it must not be mistaken for a genuine re-anchor that revives it.
    layer.update([{id: 'trackable', render, range: movedRange}])

    await vi.waitFor(() => {
      expect(on).toHaveBeenCalledTimes(1)
    })

    expect(on.mock.calls[0]?.[0]).toEqual([
      {
        type: 'lost',
        rangeDecoration: registeredDecoration,
        previousRange: movedRange,
        origin: 'local',
      },
    ])
    expect(layer.current).toEqual([])
  })
})

describe('RangeDecorationPlugin', () => {
  test('Scenario: RangeDecorationPlugin registers on mount and decorates text', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const rangeDecorations: Array<RegistrableRangeDecoration> = [
      {
        id: 'plugin-decoration',
        render: (props) => (
          <span data-testid="plugin-decoration">{props.children}</span>
        ),
        range: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 0,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 3,
          },
        },
      },
    ]

    await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
      children: <RangeDecorationPlugin rangeDecorations={rangeDecorations} />,
    })

    await vi.waitFor(() => {
      expect(getEditorHtml()).toEqual(
        [
          `<div data-pt-path="[_key==&quot;${blockKey}&quot;]" data-pt-block="text">`,
          '<div>',
          `<span data-pt-path="[_key==&quot;${blockKey}&quot;].children[_key==&quot;${spanKey}&quot;]" data-pt-inline="span">`,
          '<span data-testid="plugin-decoration">',
          '<span data-pt-marks="true"><span data-pt-text="true">foo</span></span>',
          '</span>',
          '</span>',
          '</div>',
          '</div>',
        ].join(''),
      )
    })
  })

  test('Scenario: RangeDecorationPlugin calls update() exactly once on mount', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const rangeDecorations: Array<RegistrableRangeDecoration> = [
      {
        id: 'plugin-decoration',
        render: (props) => (
          <span data-testid="plugin-decoration">{props.children}</span>
        ),
        range: {
          anchor: {path: spanPath, offset: 0},
          focus: {path: spanPath, offset: 3},
        },
      },
    ]

    const {editor, rerender} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    })

    const updateSpy = vi.fn()
    const registerRangeDecorations =
      editor.registerRangeDecorations.bind(editor)
    vi.spyOn(editor, 'registerRangeDecorations').mockImplementation(
      (config) => {
        const registration = registerRangeDecorations(config)
        const update = registration.update.bind(registration)
        registration.update = (nextRangeDecorations) => {
          updateSpy(nextRangeDecorations)
          return update(nextRangeDecorations)
        }
        return registration
      },
    )

    await rerender({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
      children: <RangeDecorationPlugin rangeDecorations={rangeDecorations} />,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="plugin-decoration"]'),
      ).not.toEqual(null)
    })

    expect(updateSpy).toHaveBeenCalledTimes(1)
  })

  test("Scenario: a changed rangeDecorations reference flows through update() without resetting the layer's stacking position", async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const range = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }

    const renderA = (props: RangeDecorationRenderProps) => (
      <span data-testid="decoration-a">{props.children}</span>
    )
    const renderB = (props: RangeDecorationRenderProps) => (
      <span data-testid="decoration-b">{props.children}</span>
    )

    const initialValue: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
      },
    ]

    const {rerender} = await createTestEditor({
      keyGenerator,
      initialValue,
      children: (
        <>
          <RangeDecorationPlugin
            rangeDecorations={[{id: 'a', render: renderA, range}]}
          />
          <RangeDecorationPlugin
            rangeDecorations={[{id: 'b', render: renderB, range}]}
          />
        </>
      ),
    })

    const nestedDecorationsHtml = [
      `<div data-pt-path="[_key==&quot;${blockKey}&quot;]" data-pt-block="text">`,
      '<div>',
      `<span data-pt-path="[_key==&quot;${blockKey}&quot;].children[_key==&quot;${spanKey}&quot;]" data-pt-inline="span">`,
      '<span data-testid="decoration-a">',
      '<span data-testid="decoration-b">',
      '<span data-pt-marks="true"><span data-pt-text="true">foo</span></span>',
      '</span>',
      '</span>',
      '</span>',
      '</div>',
      '</div>',
    ].join('')

    await vi.waitFor(() => {
      expect(getEditorHtml()).toEqual(nestedDecorationsHtml)
    })

    // Fresh array literals, same ids/ranges/renders: a changed reference,
    // not a changed configuration.
    await rerender({
      keyGenerator,
      initialValue,
      children: (
        <>
          <RangeDecorationPlugin
            rangeDecorations={[{id: 'a', render: renderA, range}]}
          />
          <RangeDecorationPlugin
            rangeDecorations={[{id: 'b', render: renderB, range}]}
          />
        </>
      ),
    })

    // Re-registering would move `a`'s layer to the end, nesting it inside
    // `b` instead of around it.
    expect(getEditorHtml()).toEqual(nestedDecorationsHtml)
  })

  test('Scenario: RangeDecorationPlugin unregisters on unmount', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const rangeDecorations: Array<RegistrableRangeDecoration> = [
      {
        id: 'unmountable',
        render: (props) => (
          <span data-testid="unmountable-decoration">{props.children}</span>
        ),
        range: {
          anchor: {path: spanPath, offset: 0},
          focus: {path: spanPath, offset: 3},
        },
      },
    ]

    const initialValue: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
      },
    ]

    const {rerender} = await createTestEditor({
      keyGenerator,
      initialValue,
      children: <RangeDecorationPlugin rangeDecorations={rangeDecorations} />,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="unmountable-decoration"]'),
      ).not.toEqual(null)
    })

    await rerender({keyGenerator, initialValue, children: null})

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="unmountable-decoration"]'),
      ).toEqual(null)
    })
  })
})

describe('useRangeDecorationLayer', () => {
  test('Scenario: the returned handle stays the same object across re-renders, even as rangeDecorations changes', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const range = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }

    const handles: Array<RangeDecorationLayer> = []
    const initialValue: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
      },
    ]

    const {rerender} = await createTestEditor({
      keyGenerator,
      initialValue,
      children: (
        <RangeDecorationLayerHandleProbe
          rangeDecorations={[]}
          onRender={(layer) => handles.push(layer)}
        />
      ),
    })

    await rerender({
      keyGenerator,
      initialValue,
      children: (
        <RangeDecorationLayerHandleProbe
          rangeDecorations={[{id: 'a', render: () => null as never, range}]}
          onRender={(layer) => handles.push(layer)}
        />
      ),
    })

    expect(handles.length).toBeGreaterThanOrEqual(2)
    expect(new Set(handles).size).toEqual(1)
  })

  test('Scenario: current is an empty array before the registration effect lands, and settles to the initial rangeDecorations once it does', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const range = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }

    const currents: Array<RangeDecorationLayer['current']> = []

    await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
      children: (
        <RangeDecorationLayerCurrentProbe
          rangeDecorations={[{id: 'a', render: () => null as never, range}]}
          onRenderCurrent={(current) => currents.push(current)}
        />
      ),
    })

    // The first entry is captured synchronously during the first render,
    // strictly before the registration effect (or any effect) has run.
    expect(currents[0]).toEqual([])

    await vi.waitFor(() => {
      expect(currents.at(-1)).toEqual([{id: 'a', range}])
    })
  })

  test("Scenario: a changed rangeDecorations reference flows through update() without resetting the layer's stacking position", async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const range = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }

    const renderA = (props: RangeDecorationRenderProps) => (
      <span data-testid="decoration-a">{props.children}</span>
    )
    const renderB = (props: RangeDecorationRenderProps) => (
      <span data-testid="decoration-b">{props.children}</span>
    )

    const initialValue: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
      },
    ]

    const {rerender} = await createTestEditor({
      keyGenerator,
      initialValue,
      children: (
        <>
          <HookLayer rangeDecorations={[{id: 'a', render: renderA, range}]} />
          <HookLayer rangeDecorations={[{id: 'b', render: renderB, range}]} />
        </>
      ),
    })

    const nestedDecorationsHtml = [
      `<div data-pt-path="[_key==&quot;${blockKey}&quot;]" data-pt-block="text">`,
      '<div>',
      `<span data-pt-path="[_key==&quot;${blockKey}&quot;].children[_key==&quot;${spanKey}&quot;]" data-pt-inline="span">`,
      '<span data-testid="decoration-a">',
      '<span data-testid="decoration-b">',
      '<span data-pt-marks="true"><span data-pt-text="true">foo</span></span>',
      '</span>',
      '</span>',
      '</span>',
      '</div>',
      '</div>',
    ].join('')

    await vi.waitFor(() => {
      expect(getEditorHtml()).toEqual(nestedDecorationsHtml)
    })

    // Fresh array literals, same ids/ranges/renders: a changed reference,
    // not a changed configuration.
    await rerender({
      keyGenerator,
      initialValue,
      children: (
        <>
          <HookLayer rangeDecorations={[{id: 'a', render: renderA, range}]} />
          <HookLayer rangeDecorations={[{id: 'b', render: renderB, range}]} />
        </>
      ),
    })

    // Re-registering would move `a`'s layer to the end, nesting it inside
    // `b` instead of around it.
    expect(getEditorHtml()).toEqual(nestedDecorationsHtml)
  })

  test('Scenario: useRangeDecorations(handle) delivers live, edit-adjusted positions for a layer whose owner mounts before the editor is ready', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const range = {
      anchor: {path: spanPath, offset: 1},
      focus: {path: spanPath, offset: 3},
    }

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
      children: (
        <RangeDecorationLayerReadsProbe
          rangeDecorations={[{id: 'a', render: () => null as never, range}]}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector(
          '[data-testid="range-decoration-layer-reads-probe"]',
        )?.textContent,
      ).toEqual(JSON.stringify([{id: 'a', range}]))
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 0},
        focus: {path: spanPath, offset: 0},
      },
    })
    await userEvent.type(locator, 'x')

    await vi.waitFor(() => {
      expect(
        document.querySelector(
          '[data-testid="range-decoration-layer-reads-probe"]',
        )?.textContent,
      ).toEqual(
        JSON.stringify([
          {
            id: 'a',
            range: {
              anchor: {path: spanPath, offset: 2},
              focus: {path: spanPath, offset: 4},
            },
          },
        ]),
      )
    })
  })

  test('Scenario: unmounting the owner unregisters the layer', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const rangeDecorations: Array<RegistrableRangeDecoration> = [
      {
        id: 'unmountable',
        render: (props) => (
          <span data-testid="hook-unmountable-decoration">
            {props.children}
          </span>
        ),
        range: {
          anchor: {path: spanPath, offset: 0},
          focus: {path: spanPath, offset: 3},
        },
      },
    ]

    const initialValue: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
      },
    ]

    const {rerender} = await createTestEditor({
      keyGenerator,
      initialValue,
      children: <HookLayer rangeDecorations={rangeDecorations} />,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="hook-unmountable-decoration"]'),
      ).not.toEqual(null)
    })

    await rerender({keyGenerator, initialValue, children: null})

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="hook-unmountable-decoration"]'),
      ).toEqual(null)
    })
  })

  test('Scenario: useRangeDecorationLayer re-rendered with a new inline `on` identity keeps its stacking position and delivers only to the latest handler', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const range = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }

    const renderA = (props: RangeDecorationRenderProps) => (
      <span data-testid="hook-decoration-a">{props.children}</span>
    )
    const renderB = (props: RangeDecorationRenderProps) => (
      <span data-testid="hook-decoration-b">{props.children}</span>
    )
    const rangeDecorationsA = [{id: 'a', render: renderA, range}]
    const rangeDecorationsB = [{id: 'b', render: renderB, range}]

    const onFirstOn = vi.fn()
    const onSecondOn = vi.fn()

    const initialValue: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
      },
    ]

    const {editor, locator, rerender} = await createTestEditor({
      keyGenerator,
      initialValue,
      children: (
        <>
          <HookLayer rangeDecorations={rangeDecorationsA} on={onFirstOn} />
          <HookLayer rangeDecorations={rangeDecorationsB} />
        </>
      ),
    })

    const nestedDecorationsHtml = [
      `<div data-pt-path="[_key==&quot;${blockKey}&quot;]" data-pt-block="text">`,
      '<div>',
      `<span data-pt-path="[_key==&quot;${blockKey}&quot;].children[_key==&quot;${spanKey}&quot;]" data-pt-inline="span">`,
      '<span data-testid="hook-decoration-a">',
      '<span data-testid="hook-decoration-b">',
      '<span data-pt-marks="true"><span data-pt-text="true">foo</span></span>',
      '</span>',
      '</span>',
      '</span>',
      '</div>',
      '</div>',
    ].join('')

    await vi.waitFor(() => {
      expect(getEditorHtml()).toEqual(nestedDecorationsHtml)
    })

    // A fresh inline `on` closure, same `rangeDecorations` reference: `on`
    // is fixed at registration and never re-registers on its own change.
    await rerender({
      keyGenerator,
      initialValue,
      children: (
        <>
          <HookLayer rangeDecorations={rangeDecorationsA} on={onSecondOn} />
          <HookLayer rangeDecorations={rangeDecorationsB} />
        </>
      ),
    })

    // Re-registering would move `a`'s layer to the end, nesting it inside
    // `b` instead of around it.
    expect(getEditorHtml()).toEqual(nestedDecorationsHtml)

    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 0},
        focus: {path: spanPath, offset: 0},
      },
    })
    await userEvent.type(locator, 'x')

    await vi.waitFor(() => {
      expect(onSecondOn).toHaveBeenCalledTimes(1)
    })

    expect(onFirstOn).not.toHaveBeenCalled()
  })

  test('Scenario: StrictMode double-invoking effects does not leak a duplicate registration', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const rangeDecorations: Array<RegistrableRangeDecoration> = [
      {
        id: 'strict-mode-decoration',
        render: (props) => (
          <span data-testid="strict-mode-decoration">{props.children}</span>
        ),
        range: {
          anchor: {path: spanPath, offset: 0},
          focus: {path: spanPath, offset: 3},
        },
      },
    ]

    // `createTestEditor` doesn't support a StrictMode option; hand-rolled
    // here to wrap the whole tree in it.
    await render(
      <StrictMode>
        <EditorProvider
          initialConfig={{
            keyGenerator,
            schemaDefinition: defineSchema({}),
            initialValue: [
              {
                _type: 'block',
                _key: blockKey,
                children: [
                  {_type: 'span', _key: spanKey, text: 'foo', marks: []},
                ],
                markDefs: [],
              },
            ],
          }}
        >
          <PortableTextEditable />
          <HookLayer rangeDecorations={rangeDecorations} />
        </EditorProvider>
      </StrictMode>,
    )

    await vi.waitFor(() => {
      expect(
        document.querySelectorAll('[data-testid="strict-mode-decoration"]')
          .length,
      ).toEqual(1)
    })
  })

  test("Scenario: the hook's rangeDecorations wins over a child's pre-attach update() call once registered, and pre-attach duplicate ids still throw synchronously", async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const ownerRange = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 1},
    }
    const childRange = {
      anchor: {path: spanPath, offset: 1},
      focus: {path: spanPath, offset: 2},
    }

    const ownerDecoration: RegistrableRangeDecoration = {
      id: 'owner',
      render: (props) => (
        <span data-testid="owner-decoration">{props.children}</span>
      ),
      range: ownerRange,
    }
    const childDecoration: RegistrableRangeDecoration = {
      id: 'child',
      render: (props) => (
        <span data-testid="child-decoration">{props.children}</span>
      ),
      range: childRange,
    }
    const duplicated: Array<RegistrableRangeDecoration> = [
      {id: 'dup', render: () => null as never, range: childRange},
      {id: 'dup', render: () => null as never, range: childRange},
    ]

    const initialValue: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
      },
    ]

    const handles: Array<RangeDecorationLayer> = []
    const currents: Array<RangeDecorationLayer['current']> = []
    let preAttachUpdateError: unknown

    const {rerender} = await createTestEditor({keyGenerator, initialValue})

    // Mounted via `rerender`, once the editor (and its range-decorations
    // actor) has already settled: isolates the ownership conflict at a
    // normal attach from a not-ready-yet path.
    await rerender({
      keyGenerator,
      initialValue,
      children: (
        <PreAttachUpdateOwner
          ownerDecoration={ownerDecoration}
          childDecoration={childDecoration}
          duplicated={duplicated}
          onHandle={(handle) => handles.push(handle)}
          onRenderCurrent={(current) => currents.push(current)}
          onPreAttachUpdateError={(error) => {
            preAttachUpdateError = error
          }}
        />
      ),
    })

    expect(preAttachUpdateError).toBeInstanceOf(Error)
    expect((preAttachUpdateError as Error).message).toMatch(/dup/)

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="owner-decoration"]'),
      ).not.toEqual(null)
    })
    expect(document.querySelector('[data-testid="child-decoration"]')).toEqual(
      null,
    )

    await vi.waitFor(() => {
      expect(currents.at(-1)).toEqual([{id: 'owner', range: ownerRange}])
    })

    const handle = handles.at(-1)!
    expect(handle.current).toEqual([{id: 'owner', range: ownerRange}])

    handle.update([
      {id: 'child', render: () => null as never, range: childRange},
    ])

    expect(handle.current).toEqual([{id: 'child', range: childRange}])
  })

  test("Scenario: calling the returned handle's own unregister() while still attached removes the decoration, current reads empty, and a subsequent update() no-ops", async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const range = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }

    const handles: Array<RangeDecorationLayer> = []

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
      children: (
        <RangeDecorationLayerHandleProbe
          rangeDecorations={[
            {
              id: 'facade-unregister',
              render: (props) => (
                <span data-testid="facade-unregister-decoration">
                  {props.children}
                </span>
              ),
              range,
            },
          ]}
          onRender={(handle) => handles.push(handle)}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="facade-unregister-decoration"]'),
      ).not.toEqual(null)
    })

    const handle = handles.at(-1)!
    handle.unregister()

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="facade-unregister-decoration"]'),
      ).toEqual(null)
    })

    expect(handle.current).toEqual([])

    handle.update([
      {
        id: 'facade-unregister',
        render: (props: RangeDecorationRenderProps) => (
          <span data-testid="facade-unregister-decoration">
            {props.children}
          </span>
        ),
        range,
      },
    ])

    // A separate, still-live registration gives the (would-be) update a
    // real, observable change to land alongside before asserting it didn't.
    createRangeDecorationLayer(editor, {
      rangeDecorations: [
        {
          id: 'observable',
          render: (props: RangeDecorationRenderProps) => (
            <span data-testid="facade-unregister-observable">
              {props.children}
            </span>
          ),
          range: {
            anchor: {path: spanPath, offset: 0},
            focus: {path: spanPath, offset: 1},
          },
        },
      ],
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="facade-unregister-observable"]'),
      ).not.toEqual(null)
    })

    expect(
      document.querySelector('[data-testid="facade-unregister-decoration"]'),
    ).toEqual(null)
    expect(handle.current).toEqual([])
  })
})

describe('Rendering', () => {
  test('Scenario: a decoration rendering `RangeDecorationWidget` produces a zero-width, non-editable span, and the decorated text stays editable', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    })

    editor.registerRangeDecorations({
      rangeDecorations: [
        defineRangeDecoration({
          id: 'widget',
          range: {
            anchor: {path: spanPath, offset: 0},
            focus: {path: spanPath, offset: 3},
          },
          render: ({children}: RangeDecorationRenderProps) => (
            <>
              <RangeDecorationWidget data-testid="w" />
              {children}
            </>
          ),
        }),
      ],
    })

    await vi.waitFor(() => {
      expect(locator.getByTestId('w').elements().length).toBe(1)
    })

    const widget = document.querySelector('[data-testid="w"]')
    expect(widget).not.toEqual(null)
    expect(widget!.tagName).toEqual('SPAN')
    expect(widget!.getAttribute('contenteditable')).toEqual('false')
    expect(getComputedStyle(widget!).width).toEqual('0px')
    expect(
      document.querySelector('[data-pt-editor]')?.contains(widget),
    ).toEqual(true)

    if (server.browser !== 'webkit') {
      // WebKit drops keystrokes at a caret whose leaf rendering starts
      // with a `contentEditable={false}` island: the selection sits at
      // the position but no `beforeinput` fires. An engine WebKit-compat
      // gap, tracked separately; un-gate when it is fixed.
      await userEvent.click(locator)
      editor.send({
        type: 'select',
        at: {
          anchor: {path: spanPath, offset: 0},
          focus: {path: spanPath, offset: 0},
        },
      })
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection?.focus.offset).toBe(0)
      })
      await userEvent.keyboard('x')

      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual('B: x|foo')
      })
    }
  })
})

function RangeDecorationsPositionsProbe(props: {
  layer: RangeDecorationLayer
  onRender: (current: RangeDecorationLayer['current']) => void
}) {
  const current = useRangeDecorations(props.layer)
  props.onRender(current)
  return null
}

function HookLayer(props: {
  rangeDecorations: Array<RegistrableRangeDecoration>
  on?: (events: Array<RangeDecorationEvent>) => void
}) {
  useRangeDecorationLayer(props)
  return null
}

function RangeDecorationLayerHandleProbe(props: {
  rangeDecorations: Array<RegistrableRangeDecoration>
  onRender: (layer: RangeDecorationLayer) => void
}) {
  const layer = useRangeDecorationLayer({
    rangeDecorations: props.rangeDecorations,
  })
  props.onRender(layer)
  return null
}

function RangeDecorationLayerCurrentProbe(props: {
  rangeDecorations: Array<RegistrableRangeDecoration>
  onRenderCurrent: (current: RangeDecorationLayer['current']) => void
}) {
  const layer = useRangeDecorationLayer({
    rangeDecorations: props.rangeDecorations,
  })
  const current = useRangeDecorations(layer)
  props.onRenderCurrent(current)
  return null
}

function RangeDecorationLayerReadsProbe(props: {
  rangeDecorations: Array<RegistrableRangeDecoration>
}) {
  const layer = useRangeDecorationLayer({
    rangeDecorations: props.rangeDecorations,
  })
  const current = useRangeDecorations(layer)

  return (
    <span data-testid="range-decoration-layer-reads-probe">
      {JSON.stringify(current)}
    </span>
  )
}

function PreAttachUpdateOwner(props: {
  ownerDecoration: RegistrableRangeDecoration
  childDecoration: RegistrableRangeDecoration
  duplicated: Array<RegistrableRangeDecoration>
  onHandle: (handle: RangeDecorationLayer) => void
  onRenderCurrent: (current: RangeDecorationLayer['current']) => void
  onPreAttachUpdateError: (error: unknown) => void
}) {
  const handle = useRangeDecorationLayer({
    rangeDecorations: [props.ownerDecoration],
  })
  props.onHandle(handle)

  return (
    <PreAttachUpdateChild
      handle={handle}
      childDecoration={props.childDecoration}
      duplicated={props.duplicated}
      onRenderCurrent={props.onRenderCurrent}
      onPreAttachUpdateError={props.onPreAttachUpdateError}
    />
  )
}

function PreAttachUpdateChild(props: {
  handle: RangeDecorationLayer
  childDecoration: RegistrableRangeDecoration
  duplicated: Array<RegistrableRangeDecoration>
  onRenderCurrent: (current: RangeDecorationLayer['current']) => void
  onPreAttachUpdateError: (error: unknown) => void
}) {
  useEffect(() => {
    try {
      props.handle.update(props.duplicated)
      props.onPreAttachUpdateError(undefined)
    } catch (error) {
      props.onPreAttachUpdateError(error)
    }

    props.handle.update([props.childDecoration])
  }, [])

  const current = useRangeDecorations(props.handle)
  props.onRenderCurrent(current)

  return null
}
