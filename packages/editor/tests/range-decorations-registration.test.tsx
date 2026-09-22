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
  type Decoration,
  type DecorationRegistration,
  type DecorationRenderProps,
  type EditorSelection,
  type RangeDecoration,
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

describe('registerDecorations: registration and errors', () => {
  test('Scenario: registerDecorations decorates text', async () => {
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

    editor.registerDecorations({
      decorations: [
        {
          id: 'registered-decoration',
          type: 'range',
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

    const original: Decoration = {
      id: 'kept',
      type: 'range',
      render: (props) => (
        <span data-testid="kept-decoration">{props.children}</span>
      ),
      range: {
        anchor: {path: spanPath, offset: 0},
        focus: {path: spanPath, offset: 1},
      },
    }

    const duplicated: Array<Decoration> = [
      {
        id: 'dup',
        type: 'range',
        render: (props) => <span>{props.children}</span>,
        range: {
          anchor: {path: spanPath, offset: 0},
          focus: {path: spanPath, offset: 1},
        },
      },
      {
        id: 'dup',
        type: 'range',
        render: (props) => <span>{props.children}</span>,
        range: {
          anchor: {path: spanPath, offset: 1},
          focus: {path: spanPath, offset: 2},
        },
      },
    ]

    expect(() => editor.registerDecorations({decorations: duplicated})).toThrow(
      /dup/,
    )

    const registration = editor.registerDecorations({
      decorations: [original],
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

    const registration = editor.registerDecorations({
      decorations: [
        {
          id: 'unregistered',
          type: 'range',
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

    // Synchronous: `getDecorations()` reflects `unregister()` immediately,
    // without waiting for the machine to process the removal.
    expect(registration.getDecorations()).toEqual([])

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="unregistered-decoration"]'),
      ).toEqual(null)
    })

    expect(registration.getDecorations()).toEqual([])

    registration.update([
      {
        id: 'unregistered',
        type: 'range',
        render: (props) => (
          <span data-testid="unregistered-decoration">{props.children}</span>
        ),
        range,
      },
    ])

    // A separate, still-live registration gives the (would-be) update a
    // real, observable change to land alongside before asserting it didn't.
    editor.registerDecorations({
      decorations: [
        {
          id: 'observable',
          type: 'range',
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

  test("Scenario: mutating a range returned by getDecorations() doesn't affect tracking or rendering", async () => {
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
          children: [{_type: 'span', _key: spanKey, text: 'foobar', marks: []}],
          markDefs: [],
        },
      ],
    })

    const registration = editor.registerDecorations({
      decorations: [
        {
          id: 'leaky',
          type: 'range',
          render: (props) => (
            <span data-testid="leaky-decoration">{props.children}</span>
          ),
          range,
        },
      ],
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="leaky-decoration"]')?.textContent,
      ).toEqual('foo')
    })

    const leaked = registration.getDecorations()[0]!
    leaked.range.anchor.offset = 5
    leaked.range.focus.offset = 6
    leaked.range.anchor.path.splice(0)
    leaked.range.focus.path[0] = {_key: 'mutated'}

    // A path built fresh from the same keys, not `spanPath`: a shallow
    // clone aliases `leaked.range`'s path straight through to tracking,
    // so asserting against `spanPath` itself would compare the mutated
    // path to itself and pass regardless of the leak.
    const trackedPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    expect(registration.getDecorations()).toEqual([
      {
        id: 'leaky',
        range: {
          anchor: {path: trackedPath, offset: 0},
          focus: {path: trackedPath, offset: 3},
        },
      },
    ])
    expect(
      document.querySelector('[data-testid="leaky-decoration"]')?.textContent,
    ).toEqual('foo')
  })
})

describe('registerDecorations: reconciliation by id', () => {
  test('Scenario: a stale update() does not revert a registered decoration already moved by typing', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const render = (props: DecorationRenderProps) => (
      <span data-testid="tracked-decoration">{props.children}</span>
    )
    // No repeated letters in the decorated substring, so a
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

    const registration = editor.registerDecorations({
      decorations: [
        {id: 'tracked', type: 'range', render, range: initialRange},
      ],
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
    registration.update([
      {id: 'tracked', type: 'range', render, range: initialRange},
    ])

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

    const render = (props: DecorationRenderProps) => (
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

    const registration = editor.registerDecorations({
      decorations: [
        {
          id: 'tracked',
          type: 'range',
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
    registration.update([
      {id: 'tracked', type: 'range', render, range: repointedRange},
    ])

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

    const registration = editor.registerDecorations({
      decorations: [
        {
          id: 'swappable',
          type: 'range',
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
        type: 'range',
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

    const registration = editor.registerDecorations({
      decorations: [
        {
          id: 'removable',
          type: 'range',
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

    const registration = editor.registerDecorations({
      decorations: [registeredDecoration],
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
        contentTouched: true,
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
    registration.update([
      {id: 'trackable', type: 'range', render, range: revivedRange},
    ])

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

    const render = (props: DecorationRenderProps) => (
      <span data-testid="tracked-decoration">{props.children}</span>
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
      ],
    })

    const registration = editor.registerDecorations({
      decorations: [registeredDecoration],
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

    registration.update([])

    // The revived range still points at the block `delete.block` removed,
    // so it can't resolve to a DOM node again: assert through
    // `getDecorations()` instead.
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

    const renderA = (props: DecorationRenderProps) => (
      <span data-testid="decoration-a">{props.children}</span>
    )
    const renderB = (props: DecorationRenderProps) => (
      <span data-testid="decoration-b">{props.children}</span>
    )

    const registration = editor.registerDecorations({
      decorations: [{id: 'a', type: 'range', render: renderA, range}],
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="decoration-a"]'),
      ).not.toEqual(null)
    })

    registration.update([
      {id: 'a', type: 'range', render: renderA, range},
      {id: 'b', type: 'range', render: renderB, range},
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

  test('Scenario: the same id in two different layers is independent: killing one leaves the other alive', async () => {
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

    const registrationOne = editor.registerDecorations({
      decorations: [
        {
          id: 'shared',
          type: 'range',
          render: (props) => (
            <span data-testid="layer-one">{props.children}</span>
          ),
          range,
        },
      ],
    })
    const registrationTwo = editor.registerDecorations({
      decorations: [
        {
          id: 'shared',
          type: 'range',
          render: (props) => (
            <span data-testid="layer-two">{props.children}</span>
          ),
          range,
        },
      ],
    })

    await vi.waitFor(() => {
      expect(document.querySelector('[data-testid="layer-one"]')).not.toEqual(
        null,
      )
      expect(document.querySelector('[data-testid="layer-two"]')).not.toEqual(
        null,
      )
    })

    registrationOne.unregister()

    await vi.waitFor(() => {
      expect(document.querySelector('[data-testid="layer-one"]')).toEqual(null)
    })

    expect(document.querySelector('[data-testid="layer-two"]')).not.toEqual(
      null,
    )
    expect(registrationOne.getDecorations()).toEqual([])
    expect(registrationTwo.getDecorations()).toEqual([{id: 'shared', range}])
  })
})

describe('registerDecorations: death by collapse', () => {
  test('Scenario: an edit that collapses an expanded decoration to zero length kills it, mapping it to `newRange: null` only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const onMapped = vi.fn()
    const render = (props: DecorationRenderProps) => (
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

    const registeredDecoration: Decoration = {
      id: 'trackable',
      type: 'range',
      render,
      range,
    }

    const registration = editor.registerDecorations({
      decorations: [registeredDecoration],
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
        contentTouched: true,
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
    const render = (props: DecorationRenderProps) => (
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

    const registeredDecoration: Decoration = {
      id: 'trackable',
      type: 'range',
      render,
      range,
    }

    const registration = editor.registerDecorations({
      decorations: [registeredDecoration],
      onMapped,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="tracked-decoration"]'),
      ).not.toEqual(null)
    })

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
        contentTouched: true,
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
    const render = (props: DecorationRenderProps) => (
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

    const registeredDecoration: Decoration = {
      id: 'trackable',
      type: 'range',
      render,
      range,
    }

    const registration = editor.registerDecorations({
      decorations: [registeredDecoration],
      onMapped,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="tracked-decoration"]'),
      ).not.toEqual(null)
    })

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
    const render = (props: DecorationRenderProps) => (
      <span data-testid="caret-decoration">{props.children}</span>
    )
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

    const registeredDecoration: Decoration = {
      id: 'caret',
      type: 'range',
      render,
      range,
    }

    const registration = editor.registerDecorations({
      decorations: [registeredDecoration],
      onMapped,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="caret-decoration"]'),
      ).not.toEqual(null)
    })

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
    const render = (props: DecorationRenderProps) => (
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

    const registeredDecoration: Decoration = {
      id: 'trackable',
      type: 'range',
      render,
      range,
    }

    const registration = editor.registerDecorations({
      decorations: [registeredDecoration],
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

    registration.update([registeredDecoration])

    expect(onMapped).toHaveBeenCalledTimes(1)
    expect(
      document.querySelector('[data-testid="tracked-decoration"]'),
    ).toEqual(null)
    expect(registration.getDecorations()).toEqual([])
  })

  test('Scenario: undo after a decoration dies does not revive it', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const onMapped = vi.fn()
    const render = (props: DecorationRenderProps) => (
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

    const registeredDecoration: Decoration = {
      id: 'trackable',
      type: 'range',
      render,
      range,
    }

    const registration = editor.registerDecorations({
      decorations: [registeredDecoration],
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

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          children: [
            {_type: 'span', _key: spanKey, text: 'foo bar baz', marks: []},
          ],
          markDefs: [],
        },
      ])
    })

    expect(onMapped).toHaveBeenCalledTimes(1)
    expect(registration.getDecorations()).toEqual([])
    expect(
      document.querySelector('[data-testid="tracked-decoration"]'),
    ).toEqual(null)
  })
})

describe('registerDecorations: onMapped and getDecorations', () => {
  test('Scenario: newRange is a fresh reference when the operation moves the decoration', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const onMapped = vi.fn()
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

    editor.registerDecorations({
      decorations: [{id: 'a', type: 'range', render, range}],
      onMapped,
    })

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

    editor.registerDecorations({
      decorations: [{id: 'a', type: 'range', render, range}],
      onMapped,
    })

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
    const render = (props: DecorationRenderProps) => (
      <span>{props.children}</span>
    )
    const directRange = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }
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

    editor.registerDecorations({
      decorations: [
        {id: 'direct-death', type: 'range', render, range: directRange},
        {id: 'collapse-death', type: 'range', render, range: collapseRange},
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
        contentTouched: true,
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
        contentTouched: true,
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

    const registration = editor.registerDecorations({
      decorations: [
        {
          id: 'a',
          type: 'range',
          render: (props) => <span>{props.children}</span>,
          range,
        },
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

    const onMapped = vi.fn()
    let decorationsBeforeReady:
      | ReturnType<DecorationRegistration['getDecorations']>
      | undefined

    function PreReadyProbe(props: {
      decorations: Array<Decoration>
      onReady: (
        decorations: ReturnType<DecorationRegistration['getDecorations']>,
      ) => void
    }) {
      const editor = useEditor()
      useState(() => {
        const registration = editor.registerDecorations({
          decorations: props.decorations,
          onMapped,
        })
        decorationsBeforeReady = registration.getDecorations()
        editor.on('ready', () => props.onReady(registration.getDecorations()))
        return registration
      })
      return null
    }

    let decorationsAtReady:
      | ReturnType<DecorationRegistration['getDecorations']>
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
          decorations={[
            {id: 'a', type: 'range', render: () => null as never, range},
          ]}
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
    const render = (props: DecorationRenderProps) => (
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

    const registration = editor.registerDecorations({
      decorations: [{id: 'a', type: 'range', render, range: rangeA}],
      onMapped,
    })

    await vi.waitFor(() => {
      expect(registration.getDecorations()).toEqual([{id: 'a', range: rangeA}])
    })

    registration.update([{id: 'a', type: 'range', render, range: rangeB}])

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
    const passthroughRender = (props: DecorationRenderProps) => (
      <>{props.children}</>
    )
    const throwingRegistration = editor.registerDecorations({
      decorations: [
        {id: 'thrower', type: 'range', render: passthroughRender, range},
      ],
      onMapped: () => {
        throw new Error('consumer bug')
      },
    })
    const siblingOnMapped = vi.fn()
    editor.registerDecorations({
      decorations: [
        {id: 'sibling', type: 'range', render: passthroughRender, range},
      ],
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

    const movedRange = {
      anchor: {path: spanPath, offset: 1},
      focus: {path: spanPath, offset: 4},
    }

    await vi.waitFor(() => {
      expect(siblingOnMapped).toHaveBeenCalledWith([
        {
          id: 'sibling',
          previousRange: range,
          newRange: movedRange,
          contentTouched: false,
          origin: 'local',
        },
      ])
    })
    await vi.waitFor(() => {
      expect(throwingRegistration.getDecorations()).toEqual([
        {id: 'thrower', range: movedRange},
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

    const registeredA: Array<Decoration> = [
      {
        id: 'a',
        type: 'range',
        render: (props) => (
          <span data-testid="decoration-a">{props.children}</span>
        ),
        range: {
          anchor: {path: spanPath, offset: 0},
          focus: {path: spanPath, offset: 3},
        },
      },
    ]

    const registeredB: Array<Decoration> = [
      {
        id: 'b',
        type: 'range',
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
          <RegisteredDecorationsProbe decorations={registeredA} />
          <RegisteredDecorationsProbe decorations={registeredB} />
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

    const registered: Array<Decoration> = [
      {
        id: 'a',
        type: 'range',
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
        <RegisteredDecorationsProbe decorations={registered} />
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

    const registered: Array<Decoration> = [
      {
        id: 'fragment',
        type: 'range',
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
      children: <RegisteredDecorationsProbe decorations={registered} />,
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

    const registered: Array<Decoration> = [
      {
        id: 'collapsed',
        type: 'range',
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
      children: <RegisteredDecorationsProbe decorations={registered} />,
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
    const registered: Array<Decoration> = [
      {
        id: 'point',
        type: 'range',
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
        type: 'range',
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
      children: <RegisteredDecorationsProbe decorations={registered} />,
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

    const registered: Array<Decoration> = [
      {
        id: 'cross-block',
        type: 'range',
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
      children: <RegisteredDecorationsProbe decorations={registered} />,
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

    const registered: Array<Decoration> = [
      {
        id: 'a',
        type: 'range',
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
        type: 'range',
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
      children: <RegisteredDecorationsProbe decorations={registered} />,
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
    editor.registerDecorations({
      decorations: [
        {
          id: 'remote-caret',
          type: 'range',
          range: {anchor: {path, offset: 0}, focus: {path, offset: 0}},
          render: ({children}) => (
            <>
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

function RegisteredDecorationsProbe(props: {decorations: Array<Decoration>}) {
  const editor = useEditor()
  useState(() =>
    editor.registerDecorations({
      decorations: props.decorations,
    }),
  )
  return null
}
