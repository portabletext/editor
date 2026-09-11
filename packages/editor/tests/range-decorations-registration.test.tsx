import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import {useState} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {userEvent} from 'vitest/browser'
import {
  EditorProvider,
  PortableTextEditable,
  useEditor,
  type EditorSelection,
  type RangeDecoration,
  type RangeDecorationRegistration,
  type RangeDecorationRenderProps,
  type RegistrableRangeDecoration,
} from '../src'
import {createTestEditor} from '../src/test/vitest'
import {
  getSelectionBeforeText,
  getTextSelection,
} from '../test-utils/text-selection'

function getEditorHtml() {
  const editorElement = document.querySelector('[data-pt-editor]')
  expect(editorElement).not.toEqual(null)
  return editorElement!.innerHTML
}

describe('registerRangeDecorations: registration and errors', () => {
  test('Scenario: registerRangeDecorations decorates text', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

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

    editor.registerRangeDecorations({
      rangeDecorations: [
        {
          id: 'registered-decoration',
          render: (props) => (
            <span data-testid="registered-decoration">{props.children}</span>
          ),
          range: {
            anchor: {path: spanPath, offset: 0},
            focus: {path: spanPath, offset: 3},
          },
        },
      ],
    })

    await vi.waitFor(() => {
      expect(getEditorHtml()).toEqual(
        [
          `<div data-pt-path="[_key==&quot;${blockKey}&quot;]" data-pt-block="text">`,
          '<div>',
          `<span data-pt-path="[_key==&quot;${blockKey}&quot;].children[_key==&quot;${spanKey}&quot;]" data-pt-inline="span">`,
          '<span data-testid="registered-decoration">',
          '<span data-pt-marks="true"><span data-pt-text="true">foo</span></span>',
          '</span>',
          '</span>',
          '</div>',
          '</div>',
        ].join(''),
      )
    })
  })

  test('Scenario: duplicate ids in one registration throw synchronously, and a throwing update() leaves the registration unchanged', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

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

    const original: RegistrableRangeDecoration = {
      id: 'kept',
      render: (props) => (
        <span data-testid="kept-decoration">{props.children}</span>
      ),
      range: {
        anchor: {path: spanPath, offset: 0},
        focus: {path: spanPath, offset: 1},
      },
    }

    const duplicated: Array<RegistrableRangeDecoration> = [
      {
        id: 'dup',
        render: (props) => <span>{props.children}</span>,
        range: {
          anchor: {path: spanPath, offset: 0},
          focus: {path: spanPath, offset: 1},
        },
      },
      {
        id: 'dup',
        render: (props) => <span>{props.children}</span>,
        range: {
          anchor: {path: spanPath, offset: 1},
          focus: {path: spanPath, offset: 2},
        },
      },
    ]

    expect(() =>
      editor.registerRangeDecorations({rangeDecorations: duplicated}),
    ).toThrow(/dup/)

    const registration = editor.registerRangeDecorations({
      rangeDecorations: [original],
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="kept-decoration"]'),
      ).not.toEqual(null)
    })

    expect(() => registration.update(duplicated)).toThrow(/dup/)

    expect(registration.getDecorations()).toEqual([
      {id: 'kept', range: original.range},
    ])
    expect(
      document.querySelector('[data-testid="kept-decoration"]'),
    ).not.toEqual(null)
  })

  test('Scenario: update() and unregister() after unregister() are no-ops, and getDecorations() is empty', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

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

    const range = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }

    const registration = editor.registerRangeDecorations({
      rangeDecorations: [
        {
          id: 'unregistered',
          render: (props) => (
            <span data-testid="unregistered-decoration">{props.children}</span>
          ),
          range,
        },
      ],
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="unregistered-decoration"]'),
      ).not.toEqual(null)
    })

    registration.unregister()

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="unregistered-decoration"]'),
      ).toEqual(null)
    })

    expect(registration.getDecorations()).toEqual([])

    registration.update([
      {
        id: 'unregistered',
        render: (props) => (
          <span data-testid="unregistered-decoration">{props.children}</span>
        ),
        range,
      },
    ])

    // A separate, still-live registration gives the (would-be) update a
    // real, observable change to land alongside before asserting it didn't.
    editor.registerRangeDecorations({
      rangeDecorations: [
        {
          id: 'observable',
          render: (props) => (
            <span data-testid="observable-decoration">{props.children}</span>
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
        document.querySelector('[data-testid="observable-decoration"]'),
      ).not.toEqual(null)
    })

    expect(
      document.querySelector('[data-testid="unregistered-decoration"]'),
    ).toEqual(null)
    expect(registration.getDecorations()).toEqual([])

    registration.unregister()
    expect(registration.getDecorations()).toEqual([])
  })
})

describe('registerRangeDecorations: reconciliation by id', () => {
  test('Scenario: a stale update() does not revert a registered decoration already moved by typing', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const render = (props: RangeDecorationRenderProps) => (
      <span data-testid="tracked-decoration">{props.children}</span>
    )
    // Offsets [1, 3) of "abcde" are "bc". No repeated letters, so a
    // reconciliation bug that reverts to the wrong offsets lands on a
    // different, distinguishable substring instead of coincidentally
    // matching the correct one.
    const initialRange = {
      anchor: {path: spanPath, offset: 1},
      focus: {path: spanPath, offset: 3},
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

    const registration = editor.registerRangeDecorations({
      rangeDecorations: [{id: 'tracked', render, range: initialRange}],
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="tracked-decoration"]')
          ?.textContent,
      ).toEqual('bc')
    })

    editor.send({
      type: 'select',
      at: getSelectionBeforeText(editor.getSnapshot().context, 'abcde'),
    })
    await userEvent.type(locator, 'z')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: z|abcde')
    })

    // A consumer that hasn't folded the `onMapped` callback's feedback into
    // its own state resupplies the original (now stale) selection.
    registration.update([{id: 'tracked', render, range: initialRange}])

    expect(registration.getDecorations()).toEqual([
      {
        id: 'tracked',
        range: {
          anchor: {path: spanPath, offset: 2},
          focus: {path: spanPath, offset: 4},
        },
      },
    ])
    expect(
      document.querySelector('[data-testid="tracked-decoration"]')?.textContent,
    ).toEqual('bc')
  })

  test('Scenario: updating with a changed range re-points the decoration', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const render = (props: RangeDecorationRenderProps) => (
      <span data-testid="tracked-decoration">{props.children}</span>
    )

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

    const registration = editor.registerRangeDecorations({
      rangeDecorations: [
        {
          id: 'tracked',
          render,
          range: {
            anchor: {path: spanPath, offset: 0},
            focus: {path: spanPath, offset: 2},
          },
        },
      ],
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="tracked-decoration"]')
          ?.textContent,
      ).toEqual('ab')
    })

    const repointedRange = {
      anchor: {path: spanPath, offset: 3},
      focus: {path: spanPath, offset: 5},
    }
    registration.update([{id: 'tracked', render, range: repointedRange}])

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="tracked-decoration"]')
          ?.textContent,
      ).toEqual('de')
    })
    expect(registration.getDecorations()).toEqual([
      {id: 'tracked', range: repointedRange},
    ])
  })

  test('Scenario: updating a registered decoration with a new render re-renders with it, without touching the range', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

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

    const registration = editor.registerRangeDecorations({
      rangeDecorations: [
        {
          id: 'swappable',
          render: (props) => (
            <span data-testid="render-one">{props.children}</span>
          ),
          range,
        },
      ],
    })

    await vi.waitFor(() => {
      expect(document.querySelector('[data-testid="render-one"]')).not.toEqual(
        null,
      )
    })

    registration.update([
      {
        id: 'swappable',
        render: (props) => (
          <span data-testid="render-two">{props.children}</span>
        ),
        range,
      },
    ])

    await vi.waitFor(() => {
      expect(document.querySelector('[data-testid="render-two"]')).not.toEqual(
        null,
      )
    })
    expect(document.querySelector('[data-testid="render-one"]')).toEqual(null)
    expect(registration.getDecorations()).toEqual([{id: 'swappable', range}])
  })

  test('Scenario: an id absent from an update is removed', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

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

    const registration = editor.registerRangeDecorations({
      rangeDecorations: [
        {
          id: 'removable',
          render: (props) => (
            <span data-testid="removable-decoration">{props.children}</span>
          ),
          range: {
            anchor: {path: spanPath, offset: 0},
            focus: {path: spanPath, offset: 3},
          },
        },
      ],
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="removable-decoration"]'),
      ).not.toEqual(null)
    })

    registration.update([])

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="removable-decoration"]'),
      ).toEqual(null)
    })
    expect(registration.getDecorations()).toEqual([])
  })

  test('Scenario: an edit destroying a registered decoration maps it to `newRange: null` once, stays dead through a redundant update, and revives on a changed range', async () => {
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

    const onMapped = vi.fn()
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

    const registration = editor.registerRangeDecorations({
      rangeDecorations: [registeredDecoration],
      onMapped,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="tracked-decoration"]'),
      ).not.toEqual(null)
    })

    editor.send({type: 'delete.block', at: [{_key: blockKey}]})

    await vi.waitFor(() => {
      expect(onMapped).toHaveBeenCalledTimes(1)
    })

    expect(onMapped.mock.calls[0]?.[0]).toEqual([
      {
        id: 'trackable',
        previousRange: range,
        newRange: null,
        contentTouched: false,
        origin: 'local',
      },
    ])
    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="tracked-decoration"]'),
      ).toEqual(null)
    })
    expect(registration.getDecorations()).toEqual([])

    // A redundant `update()` resupplying the same (now stale) range: the
    // consumer hasn't folded the `onMapped` callback's feedback in yet.
    registration.update([registeredDecoration])

    expect(onMapped).toHaveBeenCalledTimes(1)
    expect(
      document.querySelector('[data-testid="tracked-decoration"]'),
    ).toEqual(null)

    registration.update([registeredDecoration])
    expect(onMapped).toHaveBeenCalledTimes(1)

    // A deliberate re-anchor to the surviving block's span revives it.
    const revivedRange = {
      anchor: {path: otherSpanPath, offset: 0},
      focus: {path: otherSpanPath, offset: 3},
    }
    registration.update([{id: 'trackable', render, range: revivedRange}])

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="tracked-decoration"]'),
      ).not.toEqual(null)
    })
    expect(registration.getDecorations()).toEqual([
      {id: 'trackable', range: revivedRange},
    ])
  })

  test('Scenario: leaving a killed id out of one update then re-adding it revives it, even under the range it died under', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const render = (props: RangeDecorationRenderProps) => (
      <span data-testid="tracked-decoration">{props.children}</span>
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
      ],
    })

    const registration = editor.registerRangeDecorations({
      rangeDecorations: [registeredDecoration],
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="tracked-decoration"]'),
      ).not.toEqual(null)
    })

    editor.send({type: 'delete.block', at: [{_key: blockKey}]})

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="tracked-decoration"]'),
      ).toEqual(null)
    })

    // Drop it: the next `update()` omits `trackable` entirely, not just
    // its range - this clears its tombstone.
    registration.update([])

    // Re-add it under the exact range it died under. Coming back after a
    // drop is a fresh registration, not a redundant resupply, so it
    // revives even though the range matches the tombstone. The revived
    // range still points at the block `delete.block` removed, so it
    // can't resolve to a DOM node again; `getDecorations()` is the
    // reconciliation-level surface this scenario is actually about.
    registration.update([registeredDecoration])

    expect(registration.getDecorations()).toEqual([{id: 'trackable', range}])
  })

  test("Scenario: update() adding a new id to a non-empty layer registers it at the layer's end", async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
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

    const renderA = (props: RangeDecorationRenderProps) => (
      <span data-testid="decoration-a">{props.children}</span>
    )
    const renderB = (props: RangeDecorationRenderProps) => (
      <span data-testid="decoration-b">{props.children}</span>
    )

    const registration = editor.registerRangeDecorations({
      rangeDecorations: [{id: 'a', render: renderA, range}],
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="decoration-a"]'),
      ).not.toEqual(null)
    })

    registration.update([
      {id: 'a', render: renderA, range},
      {id: 'b', render: renderB, range},
    ])

    await vi.waitFor(() => {
      expect(getEditorHtml()).toEqual(
        [
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
        ].join(''),
      )
    })
  })
})

describe('registerRangeDecorations: death by collapse', () => {
  test('Scenario: an edit that collapses an expanded decoration to zero length kills it, mapping it to `newRange: null` only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const onMapped = vi.fn()
    const render = (props: RangeDecorationRenderProps) => (
      <span data-testid="tracked-decoration">{props.children}</span>
    )
    // "bar" is offsets [4, 7) of "foo bar baz": deleting exactly the
    // decoration's own range collapses it to zero length without
    // touching the block or span it's anchored to.
    const range = {
      anchor: {path: spanPath, offset: 4},
      focus: {path: spanPath, offset: 7},
    }

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'foo bar baz', marks: []},
          ],
          markDefs: [],
        },
      ],
    })

    const registeredDecoration = {id: 'trackable', render, range}

    const registration = editor.registerRangeDecorations({
      rangeDecorations: [registeredDecoration],
      onMapped,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="tracked-decoration"]'),
      ).not.toEqual(null)
    })

    editor.send({
      type: 'delete',
      at: getTextSelection(editor.getSnapshot().context, 'bar'),
    })

    await vi.waitFor(() => {
      expect(onMapped).toHaveBeenCalledTimes(1)
    })

    expect(onMapped.mock.calls[0]?.[0]).toEqual([
      {
        id: 'trackable',
        previousRange: range,
        newRange: null,
        contentTouched: false,
        origin: 'local',
      },
    ])
    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="tracked-decoration"]'),
      ).toEqual(null)
    })
    expect(registration.getDecorations()).toEqual([])
  })

  test('Scenario: a deletion wider than the decoration that collapses it also kills it, `previousRange` still the range it lived at', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const onMapped = vi.fn()
    const render = (props: RangeDecorationRenderProps) => (
      <span data-testid="tracked-decoration">{props.children}</span>
    )
    const range = {
      anchor: {path: spanPath, offset: 4},
      focus: {path: spanPath, offset: 7},
    }

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'foo bar baz', marks: []},
          ],
          markDefs: [],
        },
      ],
    })

    const registeredDecoration = {id: 'trackable', render, range}

    const registration = editor.registerRangeDecorations({
      rangeDecorations: [registeredDecoration],
      onMapped,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="tracked-decoration"]'),
      ).not.toEqual(null)
    })

    // "o bar b" is offsets [2, 9) of "foo bar baz": it starts before the
    // decoration's anchor and ends after its focus, so the deletion
    // engulfs the decoration's content entirely rather than exactly
    // matching its bounds.
    editor.send({
      type: 'delete',
      at: getTextSelection(editor.getSnapshot().context, 'o bar b'),
    })

    await vi.waitFor(() => {
      expect(onMapped).toHaveBeenCalledTimes(1)
    })

    expect(onMapped.mock.calls[0]?.[0]).toEqual([
      {
        id: 'trackable',
        previousRange: range,
        newRange: null,
        contentTouched: false,
        origin: 'local',
      },
    ])
    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="tracked-decoration"]'),
      ).toEqual(null)
    })
    expect(registration.getDecorations()).toEqual([])
  })

  test('Scenario: a partial interior deletion that leaves the range non-empty does not kill it', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const onMapped = vi.fn()
    const render = (props: RangeDecorationRenderProps) => (
      <span data-testid="tracked-decoration">{props.children}</span>
    )
    const range = {
      anchor: {path: spanPath, offset: 4},
      focus: {path: spanPath, offset: 7},
    }

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'foo bar baz', marks: []},
          ],
          markDefs: [],
        },
      ],
    })

    const registeredDecoration = {id: 'trackable', render, range}

    const registration = editor.registerRangeDecorations({
      rangeDecorations: [registeredDecoration],
      onMapped,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="tracked-decoration"]'),
      ).not.toEqual(null)
    })

    // "ba" (offsets [4, 6), the first match in "foo bar baz") only trims
    // the decoration's start: [4, 7) survives as [4, 5), still covering
    // "r".
    editor.send({
      type: 'delete',
      at: getTextSelection(editor.getSnapshot().context, 'ba'),
    })

    await vi.waitFor(() => {
      expect(onMapped).toHaveBeenCalledTimes(1)
    })

    const survivingRange = {
      anchor: {path: spanPath, offset: 4},
      focus: {path: spanPath, offset: 5},
    }
    expect(onMapped.mock.calls[0]?.[0]).toEqual([
      {
        id: 'trackable',
        previousRange: range,
        newRange: survivingRange,
        contentTouched: true,
        origin: 'local',
      },
    ])
    expect(registration.getDecorations()).toEqual([
      {id: 'trackable', range: survivingRange},
    ])
    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="tracked-decoration"]')
          ?.textContent,
      ).toEqual('r')
    })
  })

  test('Scenario: a decoration collapsed by configuration never dies from an edit that keeps it collapsed', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const onMapped = vi.fn()
    const render = (props: RangeDecorationRenderProps) => (
      <span data-testid="caret-decoration">{props.children}</span>
    )
    // A caret shape: anchor and focus both at offset 4, the configured
    // (not merely transformed) collapse this rule must never kill.
    const range = {
      anchor: {path: spanPath, offset: 4},
      focus: {path: spanPath, offset: 4},
    }

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'foo bar baz', marks: []},
          ],
          markDefs: [],
        },
      ],
    })

    const registeredDecoration = {id: 'caret', render, range}

    const registration = editor.registerRangeDecorations({
      rangeDecorations: [registeredDecoration],
      onMapped,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="caret-decoration"]'),
      ).not.toEqual(null)
    })

    // Deleting "foo", strictly before the caret, shifts it: alive, moved.
    editor.send({
      type: 'delete',
      at: getTextSelection(editor.getSnapshot().context, 'foo'),
    })

    await vi.waitFor(() => {
      expect(onMapped).toHaveBeenCalledTimes(1)
    })

    const movedRange = {
      anchor: {path: spanPath, offset: 1},
      focus: {path: spanPath, offset: 1},
    }
    expect(onMapped.mock.calls[0]?.[0]).toEqual([
      {
        id: 'caret',
        previousRange: range,
        newRange: movedRange,
        contentTouched: false,
        origin: 'local',
      },
    ])
    expect(registration.getDecorations()).toEqual([
      {id: 'caret', range: movedRange},
    ])

    onMapped.mockClear()

    // Deleting "bar", now starting exactly where the caret sits: the point
    // transforms to the same offset (still 1), a live no-op position, not
    // a death - `newRange` is never `null` even though this operation
    // still maps (a fresh point reference, same value; the primitive
    // reports every touched operation, unlike a batched-vocabulary
    // consumer that coalesces a net-zero burst away).
    editor.send({
      type: 'delete',
      at: getTextSelection(editor.getSnapshot().context, 'bar'),
    })

    await vi.waitFor(() => {
      expect(onMapped).toHaveBeenCalledTimes(1)
    })

    expect(onMapped.mock.calls[0]?.[0]).toEqual([
      {
        id: 'caret',
        previousRange: movedRange,
        newRange: movedRange,
        contentTouched: false,
        origin: 'local',
      },
    ])
    expect(registration.getDecorations()).toEqual([
      {id: 'caret', range: movedRange},
    ])
  })

  test('Scenario: a decoration killed by collapse stays dead through a redundant update() at its configured range', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const onMapped = vi.fn()
    const render = (props: RangeDecorationRenderProps) => (
      <span data-testid="tracked-decoration">{props.children}</span>
    )
    const range = {
      anchor: {path: spanPath, offset: 4},
      focus: {path: spanPath, offset: 7},
    }

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'foo bar baz', marks: []},
          ],
          markDefs: [],
        },
      ],
    })

    const registeredDecoration = {id: 'trackable', render, range}

    const registration = editor.registerRangeDecorations({
      rangeDecorations: [registeredDecoration],
      onMapped,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="tracked-decoration"]'),
      ).not.toEqual(null)
    })

    editor.send({
      type: 'delete',
      at: getTextSelection(editor.getSnapshot().context, 'bar'),
    })

    await vi.waitFor(() => {
      expect(onMapped).toHaveBeenCalledTimes(1)
    })
    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="tracked-decoration"]'),
      ).toEqual(null)
    })
    expect(registration.getDecorations()).toEqual([])

    // The tombstone is keyed by id, not by why the decoration died: a
    // redundant `update()` resupplying its configured range is a no-op
    // regardless of what killed it.
    registration.update([registeredDecoration])

    expect(onMapped).toHaveBeenCalledTimes(1)
    expect(
      document.querySelector('[data-testid="tracked-decoration"]'),
    ).toEqual(null)
    expect(registration.getDecorations()).toEqual([])
  })
})

describe('registerRangeDecorations: onMapped and getDecorations', () => {
  test('Scenario: newRange is a fresh reference when the operation moves the decoration', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const onMapped = vi.fn()
    const render = (props: RangeDecorationRenderProps) => (
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

    editor.registerRangeDecorations({
      rangeDecorations: [{id: 'a', render, range}],
      onMapped,
    })

    // Inserting before the range moves both endpoints: `newRange` is a
    // freshly transformed object, not the `previousRange` reference.
    editor.send({
      type: 'insert.text',
      at: spanPath,
      offset: 0,
      text: 'X',
    })

    await vi.waitFor(() => {
      expect(onMapped).toHaveBeenCalledTimes(1)
    })

    const movedRange = {
      anchor: {path: spanPath, offset: 2},
      focus: {path: spanPath, offset: 4},
    }
    const mappings = onMapped.mock.calls[0]?.[0]
    expect(mappings).toEqual([
      {
        id: 'a',
        previousRange: range,
        newRange: movedRange,
        contentTouched: false,
        origin: 'local',
      },
    ])
    expect(mappings[0].newRange).not.toBe(mappings[0].previousRange)
  })

  test('Scenario: newRange keeps the previousRange reference when a same-length edit touches content without moving either endpoint', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const onMapped = vi.fn()
    const render = (props: RangeDecorationRenderProps) => (
      <span>{props.children}</span>
    )
    // Offsets [1, 5) of "abcdef" are "bcde".
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

    editor.registerRangeDecorations({
      rangeDecorations: [{id: 'a', render, range}],
      onMapped,
    })

    // A same-length whole-text replacement (one `set` operation, not a
    // remove/insert pair): every offset within the new text's length
    // clamps to itself, so both endpoints transform to their own
    // reference and `newRange` carries over `previousRange` unchanged.
    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
          value: 'ABCDEF',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(onMapped).toHaveBeenCalledTimes(1)
    })

    const mappings = onMapped.mock.calls[0]?.[0]
    expect(mappings).toEqual([
      {
        id: 'a',
        previousRange: range,
        newRange: range,
        contentTouched: true,
        origin: 'remote',
      },
    ])
    expect(mappings[0].newRange).toBe(mappings[0].previousRange)
  })

  test('Scenario: death delivers `newRange: null` with the same mapping shape, whether by direct destruction or by collapse', async () => {
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

    const onMapped = vi.fn()
    const render = (props: RangeDecorationRenderProps) => (
      <span>{props.children}</span>
    )
    const directRange = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }
    // "bar" is offsets [4, 7) of "foo bar baz": deleting exactly this
    // decoration's own range collapses it to zero length instead of
    // destroying the block or span it's anchored to.
    const collapseRange = {
      anchor: {path: otherSpanPath, offset: 4},
      focus: {path: otherSpanPath, offset: 7},
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
            {
              _type: 'span',
              _key: otherSpanKey,
              text: 'foo bar baz',
              marks: [],
            },
          ],
          markDefs: [],
        },
      ],
    })

    editor.registerRangeDecorations({
      rangeDecorations: [
        {id: 'direct-death', render, range: directRange},
        {id: 'collapse-death', render, range: collapseRange},
      ],
      onMapped,
    })

    editor.send({type: 'delete.block', at: [{_key: blockKey}]})

    await vi.waitFor(() => {
      expect(onMapped).toHaveBeenCalledTimes(1)
    })

    expect(onMapped.mock.calls[0]?.[0]).toEqual([
      {
        id: 'direct-death',
        previousRange: directRange,
        newRange: null,
        contentTouched: false,
        origin: 'local',
      },
    ])

    editor.send({
      type: 'delete',
      at: getTextSelection(editor.getSnapshot().context, 'bar'),
    })

    await vi.waitFor(() => {
      expect(onMapped).toHaveBeenCalledTimes(2)
    })

    expect(onMapped.mock.calls[1]?.[0]).toEqual([
      {
        id: 'collapse-death',
        previousRange: collapseRange,
        newRange: null,
        contentTouched: false,
        origin: 'local',
      },
    ])
  })

  test('Scenario: getDecorations() inside onMapped already reflects that operation, not the pre-operation state', async () => {
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
    })

    let duringOnMapped:
      | Array<{id: string; range: NonNullable<EditorSelection>}>
      | undefined

    const registration = editor.registerRangeDecorations({
      rangeDecorations: [
        {id: 'a', render: (props) => <span>{props.children}</span>, range},
      ],
      onMapped: () => {
        duringOnMapped = registration.getDecorations()
      },
    })

    editor.send({
      type: 'select',
      at: getSelectionBeforeText(editor.getSnapshot().context, 'foo'),
    })
    await userEvent.type(locator, 'x')

    await vi.waitFor(() => {
      expect(duringOnMapped).not.toBeUndefined()
    })

    expect(duringOnMapped).toEqual([
      {
        id: 'a',
        range: {
          anchor: {path: spanPath, offset: 2},
          focus: {path: spanPath, offset: 4},
        },
      },
    ])
  })

  test("Scenario: register pre-ready, getDecorations() settles once the editor's ready event fires, with no edit and no update() call", async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const range = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }

    // Registers and subscribes to `ready` during this component's first
    // render, strictly before any effect: the earliest either can
    // plausibly land, and before `EditorProvider`'s own effects have even
    // started the range-decorations actor. `getDecorations()` is read
    // synchronously inside the `ready` listener itself (not later, from
    // an effect or a `vi.waitFor` poll): only that ordering is sensitive
    // to whether the range-decorations actor has already processed
    // `ready` (and populated its decorated ranges) by the time consumers
    // hear about it.
    const onMapped = vi.fn()
    let decorationsBeforeReady:
      | ReturnType<RangeDecorationRegistration['getDecorations']>
      | undefined

    function PreReadyProbe(props: {
      rangeDecorations: Array<RegistrableRangeDecoration>
      onReady: (
        decorations: ReturnType<RangeDecorationRegistration['getDecorations']>,
      ) => void
    }) {
      const editor = useEditor()
      useState(() => {
        const registration = editor.registerRangeDecorations({
          rangeDecorations: props.rangeDecorations,
          onMapped,
        })
        decorationsBeforeReady = registration.getDecorations()
        editor.on('ready', () => props.onReady(registration.getDecorations()))
        return registration
      })
      return null
    }

    let decorationsAtReady:
      | ReturnType<RangeDecorationRegistration['getDecorations']>
      | undefined

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
        <PreReadyProbe
          rangeDecorations={[{id: 'a', render: () => null as never, range}]}
          onReady={(decorations) => {
            decorationsAtReady = decorations
          }}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(decorationsAtReady).not.toBeUndefined()
    })

    expect(decorationsBeforeReady).toEqual([])
    expect(decorationsAtReady).toEqual([{id: 'a', range}])
    expect(decorationsAtReady).not.toBe(decorationsBeforeReady)
    expect(onMapped).toHaveBeenCalledTimes(0)
  })

  test('Scenario: update() reconciliation never calls onMapped', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const rangeA = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 1},
    }
    const rangeB = {
      anchor: {path: spanPath, offset: 1},
      focus: {path: spanPath, offset: 3},
    }

    const onMapped = vi.fn()
    const render = (props: RangeDecorationRenderProps) => (
      <span>{props.children}</span>
    )

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

    const registration = editor.registerRangeDecorations({
      rangeDecorations: [{id: 'a', render, range: rangeA}],
      onMapped,
    })

    await vi.waitFor(() => {
      expect(registration.getDecorations()).toEqual([{id: 'a', range: rangeA}])
    })

    registration.update([{id: 'a', render, range: rangeB}])

    expect(registration.getDecorations()).toEqual([{id: 'a', range: rangeB}])
    expect(onMapped).not.toHaveBeenCalled()
  })

  test('Scenario: a throwing onMapped neither stops tracking nor starves a sibling layer', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const range = {
      anchor: {path: spanPath, offset: 0},
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

    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    const passthroughRender = (props: RangeDecorationRenderProps) => (
      <>{props.children}</>
    )
    const throwingRegistration = editor.registerRangeDecorations({
      rangeDecorations: [{id: 'thrower', render: passthroughRender, range}],
      onMapped: () => {
        throw new Error('consumer bug')
      },
    })
    const siblingOnMapped = vi.fn()
    editor.registerRangeDecorations({
      rangeDecorations: [{id: 'sibling', render: passthroughRender, range}],
      onMapped: siblingOnMapped,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 0},
        focus: {path: spanPath, offset: 0},
      },
    })
    await userEvent.keyboard('x')

    await vi.waitFor(() => {
      expect(siblingOnMapped).toHaveBeenCalled()
    })
    await vi.waitFor(() => {
      expect(throwingRegistration.getDecorations()).toEqual([
        {
          id: 'thrower',
          range: {
            anchor: {path: spanPath, offset: 1},
            focus: {path: spanPath, offset: 4},
          },
        },
      ])
    })
    expect(consoleErrorSpy).toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })
})

describe('Ordering and composition', () => {
  test('Scenario: the legacy prop and registered sources nest prop-first, then registration order', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const propDecoration: RangeDecoration = {
      component: (props) => (
        <span data-testid="decoration-prop">{props.children}</span>
      ),
      selection: {
        anchor: {path: spanPath, offset: 0},
        focus: {path: spanPath, offset: 3},
      },
    }

    const registeredA: Array<RegistrableRangeDecoration> = [
      {
        id: 'a',
        render: (props) => (
          <span data-testid="decoration-a">{props.children}</span>
        ),
        range: {
          anchor: {path: spanPath, offset: 0},
          focus: {path: spanPath, offset: 3},
        },
      },
    ]

    const registeredB: Array<RegistrableRangeDecoration> = [
      {
        id: 'b',
        render: (props) => (
          <span data-testid="decoration-b">{props.children}</span>
        ),
        range: {
          anchor: {path: spanPath, offset: 0},
          focus: {path: spanPath, offset: 3},
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
      editableProps: {rangeDecorations: [propDecoration]},
      children: (
        <>
          <RegisteredRangeDecorationsProbe rangeDecorations={registeredA} />
          <RegisteredRangeDecorationsProbe rangeDecorations={registeredB} />
        </>
      ),
    })

    await vi.waitFor(() => {
      expect(getEditorHtml()).toEqual(
        [
          `<div data-pt-path="[_key==&quot;${blockKey}&quot;]" data-pt-block="text">`,
          '<div>',
          `<span data-pt-path="[_key==&quot;${blockKey}&quot;].children[_key==&quot;${spanKey}&quot;]" data-pt-inline="span">`,
          '<span data-testid="decoration-prop">',
          '<span data-testid="decoration-a">',
          '<span data-testid="decoration-b">',
          '<span data-pt-marks="true"><span data-pt-text="true">foo</span></span>',
          '</span>',
          '</span>',
          '</span>',
          '</span>',
          '</div>',
          '</div>',
        ].join(''),
      )
    })
  })

  test('Scenario: the prop renders outermost even when its `PortableTextEditable` mounts after the registration', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const propDecoration: RangeDecoration = {
      component: (props) => (
        <span data-testid="decoration-prop">{props.children}</span>
      ),
      selection: {
        anchor: {path: spanPath, offset: 0},
        focus: {path: spanPath, offset: 3},
      },
    }

    const registered: Array<RegistrableRangeDecoration> = [
      {
        id: 'a',
        render: (props) => (
          <span data-testid="decoration-a">{props.children}</span>
        ),
        range: {
          anchor: {path: spanPath, offset: 0},
          focus: {path: spanPath, offset: 3},
        },
      },
    ]

    // The registration probe mounts (and registers, during its own first
    // render) before `PortableTextEditable` here - the opposite of
    // `createTestEditor`'s fixed JSX order, and the opposite of arrival
    // order the machine would flatten by if it didn't enforce prop-first
    // ordering.
    await render(
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
        <RegisteredRangeDecorationsProbe rangeDecorations={registered} />
        <PortableTextEditable rangeDecorations={[propDecoration]} />
      </EditorProvider>,
    )

    await vi.waitFor(() => {
      expect(getEditorHtml()).toEqual(
        [
          `<div data-pt-path="[_key==&quot;${blockKey}&quot;]" data-pt-block="text">`,
          '<div>',
          `<span data-pt-path="[_key==&quot;${blockKey}&quot;].children[_key==&quot;${spanKey}&quot;]" data-pt-inline="span">`,
          '<span data-testid="decoration-prop">',
          '<span data-testid="decoration-a">',
          '<span data-pt-marks="true"><span data-pt-text="true">foo</span></span>',
          '</span>',
          '</span>',
          '</span>',
          '</div>',
          '</div>',
        ].join(''),
      )
    })
  })
})

describe('RangeDecoration fragment props', () => {
  test('Scenario: a decoration spanning a mark boundary reports isFirst/isLast per fragment', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanAKey = keyGenerator()
    const spanBKey = keyGenerator()
    const spanCKey = keyGenerator()

    const registered: Array<RegistrableRangeDecoration> = [
      {
        id: 'fragment',
        render: (props) => (
          <span
            data-testid="fragment-decoration"
            data-is-first={props.isFirst}
            data-is-last={props.isLast}
          >
            {props.children}
          </span>
        ),
        range: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanAKey}],
            offset: 0,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanCKey}],
            offset: 1,
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
          children: [
            {_type: 'span', _key: spanAKey, text: 'f', marks: []},
            {_type: 'span', _key: spanBKey, text: 'o', marks: ['strong']},
            {_type: 'span', _key: spanCKey, text: 'o', marks: []},
          ],
          markDefs: [],
        },
      ],
      children: (
        <RegisteredRangeDecorationsProbe rangeDecorations={registered} />
      ),
    })

    await vi.waitFor(() => {
      expect(getEditorHtml()).toEqual(
        [
          `<div data-pt-path="[_key==&quot;${blockKey}&quot;]" data-pt-block="text">`,
          '<div>',
          `<span data-pt-path="[_key==&quot;${blockKey}&quot;].children[_key==&quot;${spanAKey}&quot;]" data-pt-inline="span">`,
          '<span data-testid="fragment-decoration" data-is-first="true" data-is-last="false">',
          '<span data-pt-marks="true"><span data-pt-text="true">f</span></span>',
          '</span>',
          '</span>',
          `<span data-pt-path="[_key==&quot;${blockKey}&quot;].children[_key==&quot;${spanBKey}&quot;]" data-pt-inline="span">`,
          '<span data-testid="fragment-decoration" data-is-first="false" data-is-last="false">',
          '<span data-pt-marks="true"><span data-pt-text="true">o</span></span>',
          '</span>',
          '</span>',
          `<span data-pt-path="[_key==&quot;${blockKey}&quot;].children[_key==&quot;${spanCKey}&quot;]" data-pt-inline="span">`,
          '<span data-testid="fragment-decoration" data-is-first="false" data-is-last="true">',
          '<span data-pt-marks="true"><span data-pt-text="true">o</span></span>',
          '</span>',
          '</span>',
          '</div>',
          '</div>',
        ].join(''),
      )
    })
  })

  test('Scenario: a collapsed decoration is both isFirst and isLast', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const registered: Array<RegistrableRangeDecoration> = [
      {
        id: 'collapsed',
        render: (props) => (
          <span
            data-testid="collapsed-decoration"
            data-is-first={props.isFirst}
            data-is-last={props.isLast}
          >
            {props.children}
          </span>
        ),
        range: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 1,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 1,
          },
        },
      },
    ]

    const {locator} = await createTestEditor({
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
        <RegisteredRangeDecorationsProbe rangeDecorations={registered} />
      ),
    })

    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('collapsed-decoration'))
        .toBeInTheDocument(),
    )

    const decoration = document.querySelector(
      '[data-testid="collapsed-decoration"]',
    )
    expect(decoration?.getAttribute('data-is-first')).toEqual('true')
    expect(decoration?.getAttribute('data-is-last')).toEqual('true')
  })

  test("Scenario: a collapsed decoration exactly at another decoration's start does not duplicate isFirst", async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    // Listed first so it's processed (and splits the span) before the
    // range decoration below - the ordering that leaves an empty fragment
    // exactly at the range decoration's own start offset.
    const registered: Array<RegistrableRangeDecoration> = [
      {
        id: 'point',
        render: (props) => (
          <span
            data-testid="point"
            data-is-first={props.isFirst}
            data-is-last={props.isLast}
          >
            {props.children}
          </span>
        ),
        range: {
          anchor: {path: spanPath, offset: 5},
          focus: {path: spanPath, offset: 5},
        },
      },
      {
        id: 'range',
        render: (props) => (
          <span
            data-testid="range"
            data-is-first={props.isFirst}
            data-is-last={props.isLast}
          >
            {props.children}
          </span>
        ),
        range: {
          anchor: {path: spanPath, offset: 5},
          focus: {path: spanPath, offset: 10},
        },
      },
    ]

    await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'abcdefghij', marks: []},
          ],
          markDefs: [],
        },
      ],
      children: (
        <RegisteredRangeDecorationsProbe rangeDecorations={registered} />
      ),
    })

    await vi.waitFor(() => {
      expect(document.querySelectorAll('[data-testid="range"]').length).toEqual(
        2,
      )
    })

    // Splitting the span at the collapsed decoration's offset (5) leaves an
    // empty fragment there in addition to the real "fghij" fragment; both
    // sit at the range decoration's start offset, but only one may claim
    // `isFirst`.
    const [emptyFragment, textFragment] = document.querySelectorAll(
      '[data-testid="range"]',
    )
    // Empty leaves render a `\uFEFF` zero-width placeholder character so
    // the caret has somewhere to land.
    expect(emptyFragment?.textContent).toEqual('\uFEFF')
    expect(emptyFragment?.getAttribute('data-is-first')).toEqual('true')
    expect(emptyFragment?.getAttribute('data-is-last')).toEqual('false')
    expect(textFragment?.textContent).toEqual('fghij')
    expect(textFragment?.getAttribute('data-is-first')).toEqual('false')
    expect(textFragment?.getAttribute('data-is-last')).toEqual('true')
  })

  test('Scenario: a decoration spanning two blocks reports isFirst only on the first block and isLast only on the second', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockAKey = keyGenerator()
    const spanAKey = keyGenerator()
    const blockBKey = keyGenerator()
    const spanBKey = keyGenerator()

    const registered: Array<RegistrableRangeDecoration> = [
      {
        id: 'cross-block',
        render: (props) => (
          <span
            data-testid="cross-block-decoration"
            data-is-first={props.isFirst}
            data-is-last={props.isLast}
          >
            {props.children}
          </span>
        ),
        range: {
          anchor: {
            path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
            offset: 0,
          },
          focus: {
            path: [{_key: blockBKey}, 'children', {_key: spanBKey}],
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
          _key: blockAKey,
          children: [{_type: 'span', _key: spanAKey, text: 'foo', marks: []}],
          markDefs: [],
        },
        {
          _type: 'block',
          _key: blockBKey,
          children: [{_type: 'span', _key: spanBKey, text: 'bar', marks: []}],
          markDefs: [],
        },
      ],
      children: (
        <RegisteredRangeDecorationsProbe rangeDecorations={registered} />
      ),
    })

    await vi.waitFor(() => {
      expect(
        document.querySelectorAll('[data-testid="cross-block-decoration"]')
          .length,
      ).toEqual(2)
    })

    const [first, second] = document.querySelectorAll(
      '[data-testid="cross-block-decoration"]',
    )
    expect(first?.getAttribute('data-is-first')).toEqual('true')
    expect(first?.getAttribute('data-is-last')).toEqual('false')
    expect(second?.getAttribute('data-is-first')).toEqual('false')
    expect(second?.getAttribute('data-is-last')).toEqual('true')
  })

  test('Scenario: an overlap split does not flip isFirst/isLast on either decoration', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const registered: Array<RegistrableRangeDecoration> = [
      {
        id: 'a',
        render: (props) => (
          <span
            data-testid="decoration-a"
            data-is-first={props.isFirst}
            data-is-last={props.isLast}
          >
            {props.children}
          </span>
        ),
        range: {
          anchor: {path: spanPath, offset: 0},
          focus: {path: spanPath, offset: 2},
        },
      },
      {
        id: 'b',
        render: (props) => (
          <span
            data-testid="decoration-b"
            data-is-first={props.isFirst}
            data-is-last={props.isLast}
          >
            {props.children}
          </span>
        ),
        range: {
          anchor: {path: spanPath, offset: 1},
          focus: {path: spanPath, offset: 3},
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
      // Array order within one registration, not two: this is also the
      // "array order within a layer" nesting contract.
      children: (
        <RegisteredRangeDecorationsProbe rangeDecorations={registered} />
      ),
    })

    await vi.waitFor(() => {
      expect(
        document.querySelectorAll('[data-testid="decoration-b"]').length,
      ).toEqual(2)
    })

    const [decorationAFirstFragment, decorationASecondFragment] =
      document.querySelectorAll('[data-testid="decoration-a"]')
    const [decorationBFirstFragment, decorationBSecondFragment] =
      document.querySelectorAll('[data-testid="decoration-b"]')

    expect(decorationAFirstFragment?.textContent).toEqual('f')
    expect(decorationAFirstFragment?.getAttribute('data-is-first')).toEqual(
      'true',
    )
    expect(decorationAFirstFragment?.getAttribute('data-is-last')).toEqual(
      'false',
    )
    expect(decorationASecondFragment?.textContent).toEqual('o')
    expect(decorationASecondFragment?.getAttribute('data-is-first')).toEqual(
      'false',
    )
    expect(decorationASecondFragment?.getAttribute('data-is-last')).toEqual(
      'true',
    )

    expect(decorationBFirstFragment?.textContent).toEqual('o')
    expect(decorationBFirstFragment?.getAttribute('data-is-first')).toEqual(
      'true',
    )
    expect(decorationBFirstFragment?.getAttribute('data-is-last')).toEqual(
      'false',
    )
    expect(decorationBSecondFragment?.textContent).toEqual('o')
    expect(decorationBSecondFragment?.getAttribute('data-is-first')).toEqual(
      'false',
    )
    expect(decorationBSecondFragment?.getAttribute('data-is-last')).toEqual(
      'true',
    )
  })
})

describe('Rendering', () => {
  test('Scenario: pressing Enter at a collapsed decoration rendered with a `contentEditable={false}` sibling still splits the block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanKey, _type: 'span', text: 'foo bar baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    const path = [{_key: blockKey}, 'children', {_key: spanKey}]
    editor.registerRangeDecorations({
      rangeDecorations: [
        {
          id: 'remote-caret',
          range: {anchor: {path, offset: 0}, focus: {path, offset: 0}},
          render: ({children}) => (
            <>
              {/* The safe shape for non-text decoration chrome
                  (`RangeDecorationWidget` in `@portabletext/plugin-range-decorations`
                  codifies this): zero-width and `contentEditable={false}`,
                  with the document's `children` as a sibling, never nested
                  inside it. */}
              <span
                data-testid="presence"
                contentEditable={false}
                style={{
                  display: 'inline-block',
                  width: 0,
                  height: '1em',
                  borderLeft: '2px solid red',
                }}
              />
              {children}
            </>
          ),
        },
      ],
    })

    await vi.waitFor(() => {
      expect(locator.getByTestId('presence').elements().length).toBe(1)
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: getSelectionBeforeText(editor.getSnapshot().context, 'foo'),
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.offset).toBe(0)
    })

    await userEvent.keyboard('{Enter}')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value?.length).toBe(2)
    })
  })
})

function RegisteredRangeDecorationsProbe(props: {
  rangeDecorations: Array<RegistrableRangeDecoration>
}) {
  const editor = useEditor()
  useState(() =>
    editor.registerRangeDecorations({
      rangeDecorations: props.rangeDecorations,
    }),
  )
  return null
}
