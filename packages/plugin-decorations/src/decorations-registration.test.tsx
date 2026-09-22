import {
  EditorProvider,
  PortableTextEditable,
  type DecorationRenderProps,
  type Decoration,
} from '@portabletext/editor'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {diffMatchPatch} from '@portabletext/patches'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import {StrictMode, useEffect} from 'react'
import {renderToString} from 'react-dom/server'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {server, userEvent} from 'vitest/browser'
import {createDecorationLayer} from './create-decoration-layer'
import {DecorationWidget} from './decoration-widget'
import type {DecorationEvent, DecorationLayer} from './decoration.types'
import {DecorationsPlugin} from './plugin.decorations'
import {useDecorationLayer} from './use-decoration-layer'
import {useDecorations} from './use-decorations'

function getEditorHtml() {
  const editorElement = document.querySelector('[data-pt-editor]')
  expect(editorElement).not.toEqual(null)
  return editorElement!.innerHTML
}

describe('createDecorationLayer: registration and errors', () => {
  test('Scenario: a DecorationsPlugin re-rendered with a new inline `on` identity keeps its stacking position and delivers only to the latest handler', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const range = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }

    const renderA = (props: DecorationRenderProps) => (
      <span data-testid="decoration-a">{props.children}</span>
    )
    const renderB = (props: DecorationRenderProps) => (
      <span data-testid="decoration-b">{props.children}</span>
    )
    const decorationsA: Array<Decoration> = [
      {id: 'a', type: 'range', render: renderA, range},
    ]
    const decorationsB: Array<Decoration> = [
      {id: 'b', type: 'range', render: renderB, range},
    ]

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
          <DecorationsPlugin decorations={decorationsA} on={onFirstOn} />
          <DecorationsPlugin decorations={decorationsB} />
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

    // A fresh inline `on` closure, same `decorations` reference: `on`
    // is fixed at registration and never re-registers on its own change.
    await rerender({
      keyGenerator,
      initialValue,
      children: (
        <>
          <DecorationsPlugin decorations={decorationsA} on={onSecondOn} />
          <DecorationsPlugin decorations={decorationsB} />
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

describe('createDecorationLayer: events', () => {
  test("Scenario: typing before a decorated range delivers a single-element batch of 'moved' only", async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const on = vi.fn()
    const render = (props: DecorationRenderProps) => (
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

    const registeredDecoration: Decoration = {
      id: 'trackable',
      type: 'range',
      render,
      range,
    }

    createDecorationLayer(editor, {
      decorations: [registeredDecoration],
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
        decoration: registeredDecoration,
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
    const render = (props: DecorationRenderProps) => (
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

    const registeredDecoration: Decoration = {
      id: 'trackable',
      type: 'range',
      render,
      range,
    }

    createDecorationLayer(editor, {
      decorations: [registeredDecoration],
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
        decoration: registeredDecoration,
        origin: 'local',
      },
      {
        type: 'content-changed',
        range: newRange,
        decoration: registeredDecoration,
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
    const render = (props: DecorationRenderProps) => (
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

    const registeredDecoration: Decoration = {
      id: 'trackable',
      type: 'range',
      render,
      range,
    }

    createDecorationLayer(editor, {
      decorations: [registeredDecoration],
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
        decoration: registeredDecoration,
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
    const render = (props: DecorationRenderProps) => (
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

    const registeredDecoration: Decoration = {
      id: 'trackable',
      type: 'range',
      render,
      range,
    }

    createDecorationLayer(editor, {
      decorations: [registeredDecoration],
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
        decoration: registeredDecoration,
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
    const render = (props: DecorationRenderProps) => (
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

    const registeredDecoration: Decoration = {
      id: 'trackable',
      type: 'range',
      render,
      range,
    }

    createDecorationLayer(editor, {
      decorations: [registeredDecoration],
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
        decoration: registeredDecoration,
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
    const render = (props: DecorationRenderProps) => (
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

    const registeredDecoration: Decoration = {
      id: 'trackable',
      type: 'range',
      render,
      range,
    }

    createDecorationLayer(editor, {
      decorations: [registeredDecoration],
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
        decoration: registeredDecoration,
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
    const render = (props: DecorationRenderProps) => (
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

    const registeredDecoration: Decoration = {
      id: 'trackable',
      type: 'range',
      render,
      range,
    }

    createDecorationLayer(editor, {
      decorations: [registeredDecoration],
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
        decoration: registeredDecoration,
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
    const render = (props: DecorationRenderProps) => (
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

    const registeredDecoration: Decoration = {
      id: 'trackable',
      type: 'range',
      render,
      range,
    }

    createDecorationLayer(editor, {
      decorations: [registeredDecoration],
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
        decoration: registeredDecoration,
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
    const render = (props: DecorationRenderProps) => (
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

    createDecorationLayer(editor, {
      decorations: [{id: 'throws', type: 'range', render, range}],
      on: onThrows,
    })
    createDecorationLayer(editor, {
      decorations: [{id: 'succeeds', type: 'range', render, range}],
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
    const render = (props: DecorationRenderProps) => (
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

    const firstDecoration: Decoration = {
      id: 'first',
      type: 'range',
      render,
      range,
    }
    const secondDecoration: Decoration = {
      id: 'second',
      type: 'range',
      render,
      range,
    }

    createDecorationLayer(editor, {
      decorations: [firstDecoration],
      on: onFirst,
    })
    createDecorationLayer(editor, {
      decorations: [secondDecoration],
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
        decoration: firstDecoration,
        origin: 'local',
      },
    ])
    expect(onSecond.mock.calls[0]?.[0]).toEqual([
      {
        type: 'moved',
        previousRange: range,
        newRange: movedRange,
        decoration: secondDecoration,
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
    const render = (props: DecorationRenderProps) => (
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

    const firstDecoration: Decoration = {
      id: 'z',
      type: 'range',
      render,
      range: firstRange,
    }
    const secondDecoration: Decoration = {
      id: 'a',
      type: 'range',
      render,
      range: secondRange,
    }

    createDecorationLayer(editor, {
      decorations: [firstDecoration, secondDecoration],
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
        decoration: firstDecoration,
        origin: 'local',
      },
      {
        type: 'moved',
        previousRange: secondRange,
        newRange: {
          anchor: {path: spanPath, offset: 1},
          focus: {path: spanPath, offset: 3},
        },
        decoration: secondDecoration,
        origin: 'local',
      },
    ])
  })

  test('Scenario: the flushed event resolves decoration from the config in effect when the mapping arrived, not a same-tick update() that only swaps render', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const on = vi.fn()
    const renderOne = (props: DecorationRenderProps) => (
      <span data-testid="one">{props.children}</span>
    )
    const renderTwo = (props: DecorationRenderProps) => (
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

    const registeredDecoration: Decoration = {
      id: 'a',
      type: 'range',
      render: renderOne,
      range,
    }

    const layer = createDecorationLayer(editor, {
      decorations: [registeredDecoration],
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
    // `decoration` the pending event resolves to.
    const repointedDecoration: Decoration = {
      id: 'a',
      type: 'range',
      render: renderTwo,
      range,
    }
    layer.update([repointedDecoration])

    await vi.waitFor(() => {
      expect(on).toHaveBeenCalledTimes(1)
    })

    expect(on.mock.calls[0]?.[0][0]?.decoration).toEqual(registeredDecoration)
  })
})

describe('createDecorationLayer: mixed-origin bursts', () => {
  test('Scenario: a local-then-remote burst for one decoration yields one `moved` event per origin run, in chronological order', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const on = vi.fn()
    const render = (props: DecorationRenderProps) => (
      <span>{props.children}</span>
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

    const registeredDecoration: Decoration = {
      id: 'trackable',
      type: 'range',
      render,
      range,
    }

    createDecorationLayer(editor, {
      decorations: [registeredDecoration],
      on,
    })

    const movedByLocal = {
      anchor: {path: spanPath, offset: 2},
      focus: {path: spanPath, offset: 4},
    }
    const movedByRemote = {
      anchor: {path: spanPath, offset: 4},
      focus: {path: spanPath, offset: 6},
    }

    // Both operations land in the same synchronous turn, so the batcher
    // sees them as one settled burst: a local insert first, then a
    // remote patch, each moving the decoration further.
    editor.send({
      type: 'insert.text',
      at: spanPath,
      offset: 0,
      text: 'x',
    })
    editor.send({
      type: 'patches',
      patches: [
        diffMatchPatch('xfoo', 'YZxfoo', [
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
        type: 'moved',
        previousRange: range,
        newRange: movedByLocal,
        decoration: registeredDecoration,
        origin: 'local',
      },
      {
        type: 'moved',
        previousRange: movedByLocal,
        newRange: movedByRemote,
        decoration: registeredDecoration,
        origin: 'remote',
      },
    ])
  })

  test("Scenario: a mixed burst where the later, remote leg nets to zero delivers only the earlier local leg's `moved`", async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const on = vi.fn()
    const render = (props: DecorationRenderProps) => (
      <span>{props.children}</span>
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

    const registeredDecoration: Decoration = {
      id: 'trackable',
      type: 'range',
      render,
      range,
    }

    createDecorationLayer(editor, {
      decorations: [registeredDecoration],
      on,
    })

    const movedByLocal = {
      anchor: {path: spanPath, offset: 2},
      focus: {path: spanPath, offset: 4},
    }

    // Same synchronous burst: a local insert, then two remote patches
    // that move the decoration out and straight back, netting to zero
    // for that origin run.
    editor.send({
      type: 'insert.text',
      at: spanPath,
      offset: 0,
      text: 'x',
    })
    editor.send({
      type: 'patches',
      patches: [
        diffMatchPatch('xfoo', 'YZxfoo', [
          {_key: blockKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
      ],
      snapshot: undefined,
    })
    editor.send({
      type: 'patches',
      patches: [
        diffMatchPatch('YZxfoo', 'xfoo', [
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
        type: 'moved',
        previousRange: range,
        newRange: movedByLocal,
        decoration: registeredDecoration,
        origin: 'local',
      },
    ])
  })
})

describe('createDecorationLayer: reading state', () => {
  test('Scenario: layer.current returns live, edit-adjusted ranges in registration order, with a stable reference between changes', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const render = (props: DecorationRenderProps) => (
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

    const layer = createDecorationLayer(editor, {
      decorations: [
        {id: 'a', type: 'range', render, range: rangeA},
        {id: 'b', type: 'range', render, range: rangeB},
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

    const render = (props: DecorationRenderProps) => (
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

    const layer = createDecorationLayer(editor, {
      decorations: [
        {id: 'a', type: 'range', render, range: rangeA},
        {id: 'b', type: 'range', render, range: rangeB},
      ],
    })

    const beforeUpdate = layer.current

    const rangeARepointed = {
      anchor: {path: spanPath, offset: 2},
      focus: {path: spanPath, offset: 3},
    }
    layer.update([{id: 'a', type: 'range', render, range: rangeARepointed}])

    expect(layer.current).not.toBe(beforeUpdate)
    expect(layer.current).toEqual([{id: 'a', range: rangeARepointed}])

    editor.send({type: 'delete.block', at: [{_key: blockKey}]})

    await vi.waitFor(() => {
      expect(layer.current).toEqual([])
    })
  })

  test('Scenario: useDecorations(layer) re-renders a consumer with new positions after an edit settles', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const render = (props: DecorationRenderProps) => (
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

    const layer = createDecorationLayer(editor, {
      decorations: [{id: 'a', type: 'range', render, range}],
    })

    const renders: Array<DecorationLayer['current']> = []

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
        <DecorationsPositionsProbe
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

  test('Scenario: useDecorations(layer) renders under `renderToString` and reports the empty state', () => {
    const emptyLayer: DecorationLayer = {
      update: () => {},
      unregister: () => {},
      current: [],
    }

    expect(
      renderToString(<DecorationsCountProbe layer={emptyLayer} />),
    ).toEqual('<span data-testid="decorations-count-probe">0</span>')
  })

  test("Scenario: an unchanged update() leaves `current`'s reference unchanged", async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const render = (props: DecorationRenderProps) => (
      <span>{props.children}</span>
    )
    const range = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }
    const registeredDecoration: Decoration = {
      id: 'a',
      type: 'range',
      render,
      range,
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

    const layer = createDecorationLayer(editor, {
      decorations: [registeredDecoration],
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

    const render = (props: DecorationRenderProps) => (
      <span>{props.children}</span>
    )
    const range = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }
    const registeredDecoration: Decoration = {
      id: 'a',
      type: 'range',
      render,
      range,
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

    const layer = createDecorationLayer(editor, {
      decorations: [registeredDecoration],
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

describe('createDecorationLayer: batcher lifecycle', () => {
  test('Scenario: unregister() in the same tick as a moving operation cancels delivery', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const on = vi.fn()
    const render = (props: DecorationRenderProps) => (
      <span>{props.children}</span>
    )
    const range = {
      anchor: {path: spanPath, offset: 1},
      focus: {path: spanPath, offset: 3},
    }
    const registeredDecoration: Decoration = {
      id: 'trackable',
      type: 'range',
      render,
      range,
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

    const layer = createDecorationLayer(editor, {
      decorations: [registeredDecoration],
      on,
    })

    const sentinelOn = vi.fn()
    createDecorationLayer(editor, {
      decorations: [{id: 'sentinel', type: 'range', render, range}],
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
    const render = (props: DecorationRenderProps) => (
      <span>{props.children}</span>
    )
    const range = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }
    const registeredDecoration: Decoration = {
      id: 'trackable',
      type: 'range',
      render,
      range,
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

    const layer = createDecorationLayer(editor, {
      decorations: [registeredDecoration],
      on,
    })

    const sentinelOn = vi.fn()
    createDecorationLayer(editor, {
      decorations: [
        {
          id: 'sentinel',
          type: 'range',
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
    layer.update([
      {id: 'trackable', type: 'range', render, range: revivedRange},
    ])

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

  test("Scenario: reviving a killed id with a same-tick update() that mutates the same decoration object's `range` in place also cancels the queued `lost`", async () => {
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
    const render = (props: DecorationRenderProps) => (
      <span>{props.children}</span>
    )
    const range = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }
    const registeredDecoration: Decoration = {
      id: 'trackable',
      type: 'range',
      render,
      range,
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

    const layer = createDecorationLayer(editor, {
      decorations: [registeredDecoration],
      on,
    })

    const sentinelOn = vi.fn()
    createDecorationLayer(editor, {
      decorations: [
        {
          id: 'sentinel',
          type: 'range',
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

    // Same tick: mutates the SAME decoration object's `range` in place
    // (rather than resupplying a fresh object) to a live position, then
    // calls `update()` with that same object. A layer that aliases the
    // caller's array by reference would compare `previous.range` to
    // `next.range` as the same object, value-to-itself, and miss that
    // this is a re-anchor at all.
    range.anchor.path = otherSpanPath
    range.anchor.offset = 0
    range.focus.path = otherSpanPath
    range.focus.offset = 3
    layer.update([registeredDecoration])

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
    expect(layer.current).toEqual([{id: 'trackable', range}])
  })

  test('Scenario: reviving a killed id with a same-tick update() resupplying the range it moved to (not its original config) still delivers the queued `lost`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const otherBlockKey = keyGenerator()
    const otherSpanKey = keyGenerator()

    const on = vi.fn()
    const render = (props: DecorationRenderProps) => (
      <span>{props.children}</span>
    )
    const range = {
      anchor: {path: spanPath, offset: 3},
      focus: {path: spanPath, offset: 6},
    }
    const registeredDecoration: Decoration = {
      id: 'trackable',
      type: 'range',
      render,
      range,
    }

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

    const layer = createDecorationLayer(editor, {
      decorations: [registeredDecoration],
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
    layer.update([{id: 'trackable', type: 'range', render, range: movedRange}])

    await vi.waitFor(() => {
      expect(on).toHaveBeenCalledTimes(1)
    })

    expect(on.mock.calls[0]?.[0]).toEqual([
      {
        type: 'lost',
        decoration: registeredDecoration,
        previousRange: movedRange,
        origin: 'local',
      },
    ])
    expect(layer.current).toEqual([])
  })
})

describe('DecorationsPlugin', () => {
  test('Scenario: DecorationsPlugin registers on mount and decorates text', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const decorations: Array<Decoration> = [
      {
        id: 'plugin-decoration',
        type: 'range',
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
      children: <DecorationsPlugin decorations={decorations} />,
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

  test('Scenario: DecorationsPlugin calls update() exactly once on mount', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const decorations: Array<Decoration> = [
      {
        id: 'plugin-decoration',
        type: 'range',
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
    const registerDecorations = editor.registerDecorations.bind(editor)
    vi.spyOn(editor, 'registerDecorations').mockImplementation((config) => {
      const registration = registerDecorations(config)
      const update = registration.update.bind(registration)
      registration.update = (nextDecorations) => {
        updateSpy(nextDecorations)
        return update(nextDecorations)
      }
      return registration
    })

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
      children: <DecorationsPlugin decorations={decorations} />,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="plugin-decoration"]'),
      ).not.toEqual(null)
    })

    expect(updateSpy).toHaveBeenCalledTimes(1)
  })

  test("Scenario: a changed decorations reference flows through update() without resetting the layer's stacking position", async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const range = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }

    const renderA = (props: DecorationRenderProps) => (
      <span data-testid="decoration-a">{props.children}</span>
    )
    const renderB = (props: DecorationRenderProps) => (
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
          <DecorationsPlugin
            decorations={[{id: 'a', type: 'range', render: renderA, range}]}
          />
          <DecorationsPlugin
            decorations={[{id: 'b', type: 'range', render: renderB, range}]}
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
          <DecorationsPlugin
            decorations={[{id: 'a', type: 'range', render: renderA, range}]}
          />
          <DecorationsPlugin
            decorations={[{id: 'b', type: 'range', render: renderB, range}]}
          />
        </>
      ),
    })

    // Re-registering would move `a`'s layer to the end, nesting it inside
    // `b` instead of around it.
    expect(getEditorHtml()).toEqual(nestedDecorationsHtml)
  })

  test('Scenario: DecorationsPlugin unregisters on unmount', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const decorations: Array<Decoration> = [
      {
        id: 'unmountable',
        type: 'range',
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
      children: <DecorationsPlugin decorations={decorations} />,
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

describe('useDecorationLayer', () => {
  test('Scenario: the returned handle stays the same object across re-renders, even as decorations changes', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const range = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }

    const handles: Array<DecorationLayer> = []
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
        <DecorationLayerHandleProbe
          decorations={[]}
          onRender={(layer) => handles.push(layer)}
        />
      ),
    })

    await rerender({
      keyGenerator,
      initialValue,
      children: (
        <DecorationLayerHandleProbe
          decorations={[
            {id: 'a', type: 'range', render: () => null as never, range},
          ]}
          onRender={(layer) => handles.push(layer)}
        />
      ),
    })

    expect(handles.length).toBeGreaterThanOrEqual(2)
    expect(new Set(handles).size).toEqual(1)
  })

  test('Scenario: current is an empty array before the registration effect lands, and settles to the initial decorations once it does', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const range = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }

    const currents: Array<DecorationLayer['current']> = []

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
        <DecorationLayerCurrentProbe
          decorations={[
            {id: 'a', type: 'range', render: () => null as never, range},
          ]}
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

  test("Scenario: a changed decorations reference flows through update() without resetting the layer's stacking position", async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const range = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }

    const renderA = (props: DecorationRenderProps) => (
      <span data-testid="decoration-a">{props.children}</span>
    )
    const renderB = (props: DecorationRenderProps) => (
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
          <HookLayer
            decorations={[{id: 'a', type: 'range', render: renderA, range}]}
          />
          <HookLayer
            decorations={[{id: 'b', type: 'range', render: renderB, range}]}
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
          <HookLayer
            decorations={[{id: 'a', type: 'range', render: renderA, range}]}
          />
          <HookLayer
            decorations={[{id: 'b', type: 'range', render: renderB, range}]}
          />
        </>
      ),
    })

    // Re-registering would move `a`'s layer to the end, nesting it inside
    // `b` instead of around it.
    expect(getEditorHtml()).toEqual(nestedDecorationsHtml)
  })

  test('Scenario: useDecorations(handle) delivers live, edit-adjusted positions for a layer whose owner mounts before the editor is ready', async () => {
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
        <DecorationLayerReadsProbe
          decorations={[
            {id: 'a', type: 'range', render: () => null as never, range},
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="decoration-layer-reads-probe"]')
          ?.textContent,
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
        document.querySelector('[data-testid="decoration-layer-reads-probe"]')
          ?.textContent,
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

    const decorations: Array<Decoration> = [
      {
        id: 'unmountable',
        type: 'range',
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
      children: <HookLayer decorations={decorations} />,
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

  test('Scenario: useDecorationLayer re-rendered with a new inline `on` identity keeps its stacking position and delivers only to the latest handler', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const range = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }

    const renderA = (props: DecorationRenderProps) => (
      <span data-testid="hook-decoration-a">{props.children}</span>
    )
    const renderB = (props: DecorationRenderProps) => (
      <span data-testid="hook-decoration-b">{props.children}</span>
    )
    const decorationsA: Array<Decoration> = [
      {id: 'a', type: 'range', render: renderA, range},
    ]
    const decorationsB: Array<Decoration> = [
      {id: 'b', type: 'range', render: renderB, range},
    ]

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
          <HookLayer decorations={decorationsA} on={onFirstOn} />
          <HookLayer decorations={decorationsB} />
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

    // A fresh inline `on` closure, same `decorations` reference: `on`
    // is fixed at registration and never re-registers on its own change.
    await rerender({
      keyGenerator,
      initialValue,
      children: (
        <>
          <HookLayer decorations={decorationsA} on={onSecondOn} />
          <HookLayer decorations={decorationsB} />
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

    const decorations: Array<Decoration> = [
      {
        id: 'strict-mode-decoration',
        type: 'range',
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
          <HookLayer decorations={decorations} />
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

  test("Scenario: the hook's decorations wins over a child's pre-attach update() call once registered, and pre-attach duplicate ids still throw synchronously", async () => {
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

    const ownerDecoration: Decoration = {
      id: 'owner',
      type: 'range',
      render: (props) => (
        <span data-testid="owner-decoration">{props.children}</span>
      ),
      range: ownerRange,
    }
    const childDecoration: Decoration = {
      id: 'child',
      type: 'range',
      render: (props) => (
        <span data-testid="child-decoration">{props.children}</span>
      ),
      range: childRange,
    }
    const duplicated: Array<Decoration> = [
      {
        id: 'dup',
        type: 'range',
        render: () => null as never,
        range: childRange,
      },
      {
        id: 'dup',
        type: 'range',
        render: () => null as never,
        range: childRange,
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

    const handles: Array<DecorationLayer> = []
    const currents: Array<DecorationLayer['current']> = []
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
      {
        id: 'child',
        type: 'range',
        render: () => null as never,
        range: childRange,
      },
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

    const handles: Array<DecorationLayer> = []

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
        <DecorationLayerHandleProbe
          decorations={[
            {
              id: 'facade-unregister',
              type: 'range',
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
        type: 'range',
        render: (props: DecorationRenderProps) => (
          <span data-testid="facade-unregister-decoration">
            {props.children}
          </span>
        ),
        range,
      },
    ])

    // A separate, still-live registration gives the (would-be) update a
    // real, observable change to land alongside before asserting it didn't.
    createDecorationLayer(editor, {
      decorations: [
        {
          id: 'observable',
          type: 'range',
          render: (props: DecorationRenderProps) => (
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
  test('Scenario: a decoration rendering `DecorationWidget` produces a zero-width, non-editable span, and the decorated text stays editable', async () => {
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

    editor.registerDecorations({
      decorations: [
        {
          id: 'widget',
          type: 'range',
          range: {
            anchor: {path: spanPath, offset: 0},
            focus: {path: spanPath, offset: 3},
          },
          render: ({children}: DecorationRenderProps) => (
            <>
              <DecorationWidget data-testid="w" />
              {children}
            </>
          ),
        },
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

function DecorationsPositionsProbe(props: {
  layer: DecorationLayer
  onRender: (current: DecorationLayer['current']) => void
}) {
  const current = useDecorations(props.layer)
  props.onRender(current)
  return null
}

function DecorationsCountProbe(props: {layer: DecorationLayer}) {
  const current = useDecorations(props.layer)
  return <span data-testid="decorations-count-probe">{current.length}</span>
}

function HookLayer(props: {
  decorations: Array<Decoration>
  on?: (events: Array<DecorationEvent>) => void
}) {
  useDecorationLayer(props)
  return null
}

function DecorationLayerHandleProbe(props: {
  decorations: Array<Decoration>
  onRender: (layer: DecorationLayer) => void
}) {
  const layer = useDecorationLayer({
    decorations: props.decorations,
  })
  props.onRender(layer)
  return null
}

function DecorationLayerCurrentProbe(props: {
  decorations: Array<Decoration>
  onRenderCurrent: (current: DecorationLayer['current']) => void
}) {
  const layer = useDecorationLayer({
    decorations: props.decorations,
  })
  const current = useDecorations(layer)
  props.onRenderCurrent(current)
  return null
}

function DecorationLayerReadsProbe(props: {decorations: Array<Decoration>}) {
  const layer = useDecorationLayer({
    decorations: props.decorations,
  })
  const current = useDecorations(layer)

  return (
    <span data-testid="decoration-layer-reads-probe">
      {JSON.stringify(current)}
    </span>
  )
}

function PreAttachUpdateOwner(props: {
  ownerDecoration: Decoration
  childDecoration: Decoration
  duplicated: Array<Decoration>
  onHandle: (handle: DecorationLayer) => void
  onRenderCurrent: (current: DecorationLayer['current']) => void
  onPreAttachUpdateError: (error: unknown) => void
}) {
  const handle = useDecorationLayer({
    decorations: [props.ownerDecoration],
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
  handle: DecorationLayer
  childDecoration: Decoration
  duplicated: Array<Decoration>
  onRenderCurrent: (current: DecorationLayer['current']) => void
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

  const current = useDecorations(props.handle)
  props.onRenderCurrent(current)

  return null
}
