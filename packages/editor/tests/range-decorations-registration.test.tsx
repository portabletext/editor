import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {userEvent} from 'vitest/browser'
import {
  EditorProvider,
  PortableTextEditable,
  type RangeDecoration,
  type RangeDecorationRenderProps,
  type RegistrableRangeDecoration,
} from '../src'
import {RangeDecorationsPlugin} from '../src/plugins/plugin.range-decorations'
import {createTestEditor} from '../src/test/vitest'
import {getSelectionBeforeText} from '../test-utils/text-selection'
import {toTextspec} from '../test-utils/to-textspec'

function getEditorHtml() {
  const editorElement = document.querySelector('[data-pt-editor]')
  expect(editorElement).not.toEqual(null)
  return editorElement!.innerHTML
}

describe('RangeDecorationsPlugin', () => {
  test('Scenario: RangeDecorationsPlugin decorates text', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const rangeDecorations: Array<RegistrableRangeDecoration> = [
      {
        id: 'plugin-decoration',
        component: (props) => (
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
      children: <RangeDecorationsPlugin rangeDecorations={rangeDecorations} />,
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

  test('Scenario: swapping `on` delivers subsequent events to the new handler, not the old one', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const onA = vi.fn()
    const onB = vi.fn()
    const component = (props: RangeDecorationRenderProps) => (
      <span>{props.children}</span>
    )
    const range = {
      anchor: {path: spanPath, offset: 1},
      focus: {path: spanPath, offset: 3},
    }
    const rangeDecorations: Array<RegistrableRangeDecoration> = [
      {id: 'plugin-decoration', component, range},
    ]

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
        <RangeDecorationsPlugin rangeDecorations={rangeDecorations} on={onA} />
      ),
    })

    await rerender({
      keyGenerator,
      initialValue,
      children: (
        <RangeDecorationsPlugin rangeDecorations={rangeDecorations} on={onB} />
      ),
    })

    editor.send({
      type: 'select',
      at: getSelectionBeforeText(editor.getSnapshot().context, 'foo'),
    })
    await userEvent.type(locator, 'x')

    await vi.waitFor(() => {
      expect(onB).toHaveBeenCalledTimes(1)
    })

    expect(onA).not.toHaveBeenCalled()
    expect(onB.mock.calls[0]?.[0]).toEqual({
      type: 'moved',
      newRange: {
        anchor: {path: spanPath, offset: 2},
        focus: {path: spanPath, offset: 4},
      },
      rangeDecoration: rangeDecorations[0],
      origin: 'local',
    })
  })

  test("Scenario: swapping `on` does not reset the layer's stacking position", async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const range = {
      anchor: {path: spanPath, offset: 0},
      focus: {path: spanPath, offset: 3},
    }

    const registeredA: Array<RegistrableRangeDecoration> = [
      {
        id: 'a',
        component: (props) => (
          <span data-testid="decoration-a">{props.children}</span>
        ),
        range,
      },
    ]
    const registeredB: Array<RegistrableRangeDecoration> = [
      {
        id: 'b',
        component: (props) => (
          <span data-testid="decoration-b">{props.children}</span>
        ),
        range,
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
      children: (
        <>
          <RangeDecorationsPlugin
            rangeDecorations={registeredA}
            on={() => {}}
          />
          <RangeDecorationsPlugin rangeDecorations={registeredB} />
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

    await rerender({
      keyGenerator,
      initialValue,
      children: (
        <>
          <RangeDecorationsPlugin
            rangeDecorations={registeredA}
            on={() => {}}
          />
          <RangeDecorationsPlugin rangeDecorations={registeredB} />
        </>
      ),
    })

    // A fresh `on` reference must not re-register: re-registering would
    // move `a`'s layer to the end, nesting it inside `b` instead of
    // around it.
    expect(getEditorHtml()).toEqual(nestedDecorationsHtml)
  })

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
        component: (props) => (
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
        component: (props) => (
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
          <RangeDecorationsPlugin rangeDecorations={registeredA} />
          <RangeDecorationsPlugin rangeDecorations={registeredB} />
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
        component: (props) => (
          <span data-testid="decoration-a">{props.children}</span>
        ),
        range: {
          anchor: {path: spanPath, offset: 0},
          focus: {path: spanPath, offset: 3},
        },
      },
    ]

    // `RangeDecorationsPlugin` mounts (and registers) before
    // `PortableTextEditable` here - the opposite of `createTestEditor`'s
    // fixed JSX order, and the opposite of arrival order the machine would
    // flatten by if it didn't enforce prop-first ordering.
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
        <RangeDecorationsPlugin rangeDecorations={registered} />
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

  test('Scenario: duplicate ids in one registration throw', async () => {
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

    const duplicated: Array<RegistrableRangeDecoration> = [
      {
        id: 'dup',
        component: (props) => <span>{props.children}</span>,
        range: {
          anchor: {path: spanPath, offset: 0},
          focus: {path: spanPath, offset: 1},
        },
      },
      {
        id: 'dup',
        component: (props) => <span>{props.children}</span>,
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
      rangeDecorations: [duplicated[0]!],
    })

    expect(() => registration.update(duplicated)).toThrow(/dup/)
  })

  test('Scenario: a stale update() does not revert a registered decoration already moved by typing', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const component = (props: RangeDecorationRenderProps) => (
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
      rangeDecorations: [{id: 'tracked', component, range: initialRange}],
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

    // A consumer that hasn't folded the `on` handler's feedback into its
    // own state resupplies the original (now stale) selection on every
    // re-render.
    registration.update([{id: 'tracked', component, range: initialRange}])

    // A second, independent edit is the deterministic flush point: it
    // forces a further `transformRange` pass over whatever anchor/focus is
    // currently stored. If the stale `update()` above reverted the live
    // position, this edit carries that wrong position forward to a
    // different, observable substring instead of leaving "bc" (still
    // "bc": tracking the same two letters, now offset one character
    // further along by each of the two inserts).
    editor.send({
      type: 'select',
      at: getSelectionBeforeText(editor.getSnapshot().context, 'zabcde'),
    })
    await userEvent.type(locator, 'y')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: y|zabcde')
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="tracked-decoration"]')
          ?.textContent,
      ).toEqual('bc')
    })
  })

  test('Scenario: updating a registered decoration with a new component re-renders with it', async () => {
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
          component: (props) => (
            <span data-testid="component-one">{props.children}</span>
          ),
          range,
        },
      ],
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="component-one"]'),
      ).not.toEqual(null)
    })

    registration.update([
      {
        id: 'swappable',
        component: (props) => (
          <span data-testid="component-two">{props.children}</span>
        ),
        range,
      },
    ])

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="component-two"]'),
      ).not.toEqual(null)
    })
    expect(document.querySelector('[data-testid="component-one"]')).toEqual(
      null,
    )
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
          component: (props) => (
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
  })

  test('Scenario: update after unregister is a no-op', async () => {
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
          id: 'unregistered',
          component: (props) => (
            <span data-testid="unregistered-decoration">{props.children}</span>
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
        document.querySelector('[data-testid="unregistered-decoration"]'),
      ).not.toEqual(null)
    })

    registration.unregister()

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="unregistered-decoration"]'),
      ).toEqual(null)
    })

    registration.update([
      {
        id: 'unregistered',
        component: (props) => (
          <span data-testid="unregistered-decoration">{props.children}</span>
        ),
        range: {
          anchor: {path: spanPath, offset: 0},
          focus: {path: spanPath, offset: 3},
        },
      },
    ])

    // A separate, still-live registration gives the (would-be) update a
    // real, observable event to land alongside before asserting it didn't.
    editor.registerRangeDecorations({
      rangeDecorations: [
        {
          id: 'observable',
          component: (props) => (
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
  })

  test("Scenario: 'moved' fires on `on` for a registered decoration when the user types", async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const on = vi.fn()
    const component = (props: RangeDecorationRenderProps) => (
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

    const registeredDecoration = {id: 'trackable', component, range}

    editor.registerRangeDecorations({
      rangeDecorations: [registeredDecoration],
      on,
    })

    editor.send({
      type: 'select',
      at: getSelectionBeforeText(editor.getSnapshot().context, 'foo'),
    })

    await userEvent.type(locator, 'x')

    await vi.waitFor(() => {
      expect(on).toHaveBeenCalledTimes(1)
    })

    expect(on.mock.calls[0]?.[0]).toEqual({
      type: 'moved',
      newRange: {
        anchor: {path: spanPath, offset: 2},
        focus: {path: spanPath, offset: 4},
      },
      rangeDecoration: registeredDecoration,
      origin: 'local',
    })
  })

  test('Scenario: an edit destroying a registered decoration dies, stays dead through a redundant update, and revives on a changed range', async () => {
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

    const on = vi.fn()
    const component = (props: RangeDecorationRenderProps) => (
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

    const registeredDecoration = {id: 'trackable', component, range}

    const registration = editor.registerRangeDecorations({
      rangeDecorations: [registeredDecoration],
      on,
    })

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="tracked-decoration"]'),
      ).not.toEqual(null)
    })

    // Destroy the block the decoration is anchored to.
    editor.send({type: 'delete.block', at: [{_key: blockKey}]})

    await vi.waitFor(() => {
      expect(on).toHaveBeenCalledTimes(1)
    })

    expect(on.mock.calls[0]?.[0]).toEqual({
      type: 'moved',
      rangeDecoration: registeredDecoration,
      newRange: null,
      origin: 'local',
    })
    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="tracked-decoration"]'),
      ).toEqual(null)
    })

    // A redundant `update()` resupplying the same (now stale) range: the
    // consumer hasn't folded the `{type: 'moved', newRange: null}` event
    // in yet.
    registration.update([registeredDecoration])

    expect(on).toHaveBeenCalledTimes(1)
    expect(
      document.querySelector('[data-testid="tracked-decoration"]'),
    ).toEqual(null)

    // A deliberate re-anchor to the surviving block's span revives it.
    const revivedRange = {
      anchor: {path: otherSpanPath, offset: 0},
      focus: {path: otherSpanPath, offset: 3},
    }
    registration.update([{id: 'trackable', component, range: revivedRange}])

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="tracked-decoration"]'),
      ).not.toEqual(null)
    })
  })

  test('Scenario: two registrations each deliver `moved` events to their own `on` handler', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    const onFirst = vi.fn()
    const onSecond = vi.fn()
    const component = (props: RangeDecorationRenderProps) => (
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

    const firstDecoration = {id: 'first', component, range}
    const secondDecoration = {id: 'second', component, range}

    editor.registerRangeDecorations({
      rangeDecorations: [firstDecoration],
      on: onFirst,
    })
    editor.registerRangeDecorations({
      rangeDecorations: [secondDecoration],
      on: onSecond,
    })

    editor.send({
      type: 'select',
      at: getSelectionBeforeText(editor.getSnapshot().context, 'foo'),
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

    expect(onFirst.mock.calls[0]?.[0]).toEqual({
      type: 'moved',
      newRange: movedRange,
      rangeDecoration: firstDecoration,
      origin: 'local',
    })
    expect(onSecond.mock.calls[0]?.[0]).toEqual({
      type: 'moved',
      newRange: movedRange,
      rangeDecoration: secondDecoration,
      origin: 'local',
    })
  })

  test('Scenario: two PortableTextEditables under one provider each contribute decorations without stomping each other', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockAKey = keyGenerator()
    const spanAKey = keyGenerator()
    const blockBKey = keyGenerator()
    const spanBKey = keyGenerator()

    const initialValue: Array<PortableTextBlock> = [
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
    ]

    const rangeDecorationsA: Array<RangeDecoration> = [
      {
        component: (props) => (
          <span data-testid="decoration-first">{props.children}</span>
        ),
        selection: {
          anchor: {
            path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
            offset: 0,
          },
          focus: {
            path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
            offset: 3,
          },
        },
      },
    ]

    const rangeDecorationsB: Array<RangeDecoration> = [
      {
        component: (props) => (
          <span data-testid="decoration-second">{props.children}</span>
        ),
        selection: {
          anchor: {
            path: [{_key: blockBKey}, 'children', {_key: spanBKey}],
            offset: 0,
          },
          focus: {
            path: [{_key: blockBKey}, 'children', {_key: spanBKey}],
            offset: 3,
          },
        },
      },
    ]

    const extraDecorationForA: RangeDecoration = {
      component: (props) => (
        <span data-testid="decoration-first-extra">{props.children}</span>
      ),
      selection: {
        anchor: {
          path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
          offset: 1,
        },
      },
    }

    function App(props: {rangeDecorationsA: Array<RangeDecoration>}) {
      return (
        <EditorProvider
          initialConfig={{
            keyGenerator,
            schemaDefinition: defineSchema({}),
            initialValue,
          }}
        >
          <PortableTextEditable
            data-testid="editable-first"
            rangeDecorations={props.rangeDecorationsA}
          />
          <PortableTextEditable
            data-testid="editable-second"
            rangeDecorations={rangeDecorationsB}
          />
        </EditorProvider>
      )
    }

    // `createTestEditor` renders a single `PortableTextEditable`; this
    // scenario needs two under one provider, so it hand-rolls the render.
    const {rerender} = await render(
      <App rangeDecorationsA={rangeDecorationsA} />,
    )

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="decoration-first"]'),
      ).not.toEqual(null)
      expect(
        document.querySelector('[data-testid="decoration-second"]'),
      ).not.toEqual(null)
    })

    await rerender(
      <App rangeDecorationsA={[...rangeDecorationsA, extraDecorationForA]} />,
    )

    await vi.waitFor(() => {
      expect(
        document.querySelector('[data-testid="decoration-first-extra"]'),
      ).not.toEqual(null)
    })

    expect(
      document.querySelector('[data-testid="decoration-second"]'),
    ).not.toEqual(null)
  })

  test('Scenario: unmounting an editable removes its prop decorations but leaves a registered layer alone', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockAKey = keyGenerator()
    const spanAKey = keyGenerator()
    const blockBKey = keyGenerator()
    const spanBKey = keyGenerator()

    const initialValue: Array<PortableTextBlock> = [
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
    ]

    const propDecoration: RangeDecoration = {
      component: (props) => (
        <span data-testid="prop-decoration">{props.children}</span>
      ),
      selection: {
        anchor: {
          path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
          offset: 3,
        },
      },
    }

    const registered: Array<RegistrableRangeDecoration> = [
      {
        id: 'registered',
        component: (props) => (
          <span data-testid="registered-decoration">{props.children}</span>
        ),
        range: {
          anchor: {
            path: [{_key: blockBKey}, 'children', {_key: spanBKey}],
            offset: 0,
          },
          focus: {
            path: [{_key: blockBKey}, 'children', {_key: spanBKey}],
            offset: 3,
          },
        },
      },
    ]

    function App(props: {showFirstEditable: boolean}) {
      return (
        <EditorProvider
          initialConfig={{
            keyGenerator,
            schemaDefinition: defineSchema({}),
            initialValue,
          }}
        >
          <RangeDecorationsPlugin rangeDecorations={registered} />
          {props.showFirstEditable ? (
            <PortableTextEditable
              data-testid="editable-first"
              rangeDecorations={[propDecoration]}
            />
          ) : null}
          <PortableTextEditable data-testid="editable-second" />
        </EditorProvider>
      )
    }

    // `createTestEditor` renders a single `PortableTextEditable`; this
    // scenario needs two under one provider, so it hand-rolls the render.
    const {rerender} = await render(<App showFirstEditable />)

    await vi.waitFor(() => {
      expect(
        document.querySelectorAll('[data-testid="prop-decoration"]').length,
      ).toEqual(2)
      expect(
        document.querySelectorAll('[data-testid="registered-decoration"]')
          .length,
      ).toEqual(2)
    })

    await rerender(<App showFirstEditable={false} />)

    await vi.waitFor(() => {
      expect(document.querySelector('[data-testid="editable-first"]')).toEqual(
        null,
      )
    })

    expect(
      document.querySelectorAll('[data-testid="prop-decoration"]').length,
    ).toEqual(0)

    const survivingEditable = document.querySelector(
      '[data-testid="editable-second"]',
    )
    expect(survivingEditable).not.toEqual(null)
    expect(
      survivingEditable!.querySelectorAll(
        '[data-testid="registered-decoration"]',
      ).length,
    ).toEqual(1)
  })
})

describe('RangeDecoration fragment props', () => {
  test('Scenario: a decoration spanning a mark boundary reports isFirst/isLast per fragment', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanAKey = keyGenerator()
    const spanBKey = keyGenerator()
    const spanCKey = keyGenerator()

    const rangeDecorations: Array<RangeDecoration> = [
      {
        component: (props) => (
          <span
            data-testid="fragment-decoration"
            data-is-first={props.isFirst}
            data-is-last={props.isLast}
          >
            {props.children}
          </span>
        ),
        selection: {
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
      editableProps: {rangeDecorations},
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

    const rangeDecorations: Array<RangeDecoration> = [
      {
        component: (props) => (
          <span
            data-testid="collapsed-decoration"
            data-is-first={props.isFirst}
            data-is-last={props.isLast}
          >
            {props.children}
          </span>
        ),
        selection: {
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
      editableProps: {rangeDecorations},
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
    const rangeDecorations: Array<RangeDecoration> = [
      {
        component: (props) => (
          <span
            data-testid="point"
            data-is-first={props.isFirst}
            data-is-last={props.isLast}
          >
            {props.children}
          </span>
        ),
        selection: {
          anchor: {path: spanPath, offset: 5},
          focus: {path: spanPath, offset: 5},
        },
      },
      {
        component: (props) => (
          <span
            data-testid="range"
            data-is-first={props.isFirst}
            data-is-last={props.isLast}
          >
            {props.children}
          </span>
        ),
        selection: {
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
      editableProps: {rangeDecorations},
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

    const rangeDecorations: Array<RangeDecoration> = [
      {
        component: (props) => (
          <span
            data-testid="cross-block-decoration"
            data-is-first={props.isFirst}
            data-is-last={props.isLast}
          >
            {props.children}
          </span>
        ),
        selection: {
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
      editableProps: {rangeDecorations},
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

    const rangeDecorations: Array<RangeDecoration> = [
      {
        component: (props) => (
          <span
            data-testid="decoration-a"
            data-is-first={props.isFirst}
            data-is-last={props.isLast}
          >
            {props.children}
          </span>
        ),
        selection: {
          anchor: {path: spanPath, offset: 0},
          focus: {path: spanPath, offset: 2},
        },
      },
      {
        component: (props) => (
          <span
            data-testid="decoration-b"
            data-is-first={props.isFirst}
            data-is-last={props.isLast}
          >
            {props.children}
          </span>
        ),
        selection: {
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
      editableProps: {rangeDecorations},
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

    // A ([0, 2)) is split by B's start into "f" (A alone) and "o" (A and B
    // nested): isFirst only on the first fragment, isLast only on the
    // second - unaffected by B sharing that boundary.
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

    // B ([1, 3)) is split by A's end into "o" (A and B nested) and "o" (B
    // alone): isFirst only on the first fragment, isLast only on the
    // second - unaffected by A sharing that boundary.
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
