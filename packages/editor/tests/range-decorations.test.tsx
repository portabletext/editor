import {diffMatchPatch} from '@portabletext/patches'
import {
  compileSchema,
  isSpan,
  isTextBlock,
  type PortableTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import {createRef, useState, type ReactNode, type RefObject} from 'react'
import {describe, expect, it, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {page, userEvent} from 'vitest/browser'
import {
  defineContainer,
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  useEditor,
  type Editor,
  type MutationEvent,
  type RangeDecoration,
  type RangeDecorationOnMovedDetails,
  type Decoration,
} from '../src'
import type {PortableTextEditor} from '../src/editor/PortableTextEditor'
import {EventListenerPlugin, NodePlugin} from '../src/plugins'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'
import {InternalPortableTextEditorRefPlugin} from '../src/plugins/plugin.internal.portable-text-editor-ref'
import {createTestEditor} from '../src/test/vitest'
import {
  getBlockKeyFromSelectionPoint,
  getChildKeyFromSelectionPoint,
} from '../src/utils/util.selection-point'
import {
  getSelectionAfterText,
  getSelectionBeforeText,
} from '../test-utils/text-selection'

const helloBlock: PortableTextBlock = {
  _key: '123',
  _type: 'block',
  markDefs: [],
  children: [{_key: '567', _type: 'span', text: 'Hello', marks: []}],
}

let rangeDecorationIteration = 0

const RangeDecorationTestComponent = ({children}: {children?: ReactNode}) => {
  rangeDecorationIteration++
  return <span data-testid="range-decoration">{children}</span>
}

function updateRangeDecorations({
  rangeDecorations,
  details,
}: {
  rangeDecorations: Array<RangeDecoration>
  details: RangeDecorationOnMovedDetails
}) {
  return rangeDecorations?.flatMap((rangeDecoration) => {
    if (
      rangeDecoration.payload?.['id'] ===
      details.rangeDecoration.payload?.['id']
    ) {
      if (!details.newSelection) {
        return []
      }

      return [
        {
          selection: details.newSelection,
          payload: rangeDecoration.payload,
          onMoved: rangeDecoration.onMoved,
          component: rangeDecoration.component,
        },
      ]
    }

    return [rangeDecoration]
  })
}

describe('RangeDecorations', () => {
  test('Scenario: Drawing a Range Decoration', async () => {
    let rangeDecorations: Array<RangeDecoration> = [
      {
        component: (props) => (
          <span data-testid="range-decoration">{props.children}</span>
        ),
        onMoved: (details) => {
          rangeDecorations = updateRangeDecorations({
            rangeDecorations,
            details,
          })
        },
        selection: {
          anchor: {
            path: [{_key: 'a'}, 'children', {_key: 'a1'}],
            offset: 6,
          },
          focus: {
            path: [{_key: 'a'}, 'children', {_key: 'a1'}],
            offset: 11,
          },
        },
      },
    ]

    const {locator} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'a',
          children: [{_type: 'span', _key: 'a1', text: 'Hello there world'}],
          markDefs: [],
        },
        {
          _type: 'block',
          _key: 'b',
          children: [
            {
              _type: 'span',
              _key: 'b1',
              text: "It's a beautiful day on planet earth",
            },
          ],
          markDefs: [],
        },
      ],
      editableProps: {
        rangeDecorations,
      },
    })

    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toBeInTheDocument(),
    )

    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toHaveTextContent('there'),
    )
  })

  test('Scenario: Moving a Range Decoration', async () => {
    let rangeDecorations: Array<RangeDecoration> = [
      {
        component: (props) => (
          <span data-testid="range-decoration">{props.children}</span>
        ),
        onMoved: (details) => {
          rangeDecorations = updateRangeDecorations({
            rangeDecorations,
            details,
          })
        },
        selection: {
          anchor: {
            path: [{_key: 'a'}, 'children', {_key: 'a1'}],
            offset: 6,
          },
          focus: {
            path: [{_key: 'a'}, 'children', {_key: 'a1'}],
            offset: 11,
          },
        },
        payload: {
          id: 'rd0',
        },
      },
    ]
    const initialValue = [
      {
        _type: 'block',
        _key: 'a',
        children: [{_type: 'span', _key: 'a1', text: 'Hello there world'}],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'b',
        children: [
          {
            _type: 'span',
            _key: 'b1',
            text: "It's a beautiful day on planet earth",
          },
        ],
        markDefs: [],
      },
    ]

    const {editor, locator, rerender} = await createTestEditor({
      initialValue,
      editableProps: {
        rangeDecorations,
      },
    })

    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toBeInTheDocument(),
    )

    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toHaveTextContent('there'),
    )

    editor.send({
      type: 'select',
      at: getSelectionBeforeText(editor.getSnapshot().context, 'Hello'),
    })

    await userEvent.type(locator, '123 ')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        "B: 123 |Hello there world\nB: It's a beautiful day on planet earth",
      )
    })

    await rerender({
      initialValue,
      editableProps: {
        rangeDecorations,
      },
    })

    await vi.waitFor(() => {
      expect(locator.getByTestId('range-decoration')).toHaveTextContent('there')
    })
  })

  test('Scenario: Drawing a collapsed Range Decoration', async () => {
    let rangeDecorations: Array<RangeDecoration> = [
      {
        component: (props) => (
          <span data-testid="range-decoration">{props.children}</span>
        ),
        onMoved: (details) => {
          rangeDecorations = updateRangeDecorations({
            rangeDecorations,
            details,
          })
        },
        selection: {
          anchor: {
            path: [{_key: 'a'}, 'children', {_key: 'a1'}],
            offset: 6,
          },
          focus: {
            path: [{_key: 'a'}, 'children', {_key: 'a1'}],
            offset: 6,
          },
        },
      },
    ]

    const {locator} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'a',
          children: [{_type: 'span', _key: 'a1', text: 'Hello there world'}],
          markDefs: [],
        },
        {
          _type: 'block',
          _key: 'b',
          children: [
            {
              _type: 'span',
              _key: 'b1',
              text: "It's a beautiful day on planet earth",
            },
          ],
          markDefs: [],
        },
      ],
      editableProps: {
        rangeDecorations,
      },
    })

    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toBeInTheDocument(),
    )
  })

  test('Scenario: Overlapping Range Decorations render nested, outer decoration first', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const rangeDecorations: Array<RangeDecoration> = [
      {
        component: (props) => (
          <span data-testid="decoration-a">{props.children}</span>
        ),
        selection: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 0,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 2,
          },
        },
      },
      {
        component: (props) => (
          <span data-testid="decoration-b">{props.children}</span>
        ),
        selection: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 1,
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
      editableProps: {
        rangeDecorations,
      },
    })

    await vi.waitFor(() => {
      const editorElement = document.querySelector('[data-pt-editor]')
      expect(editorElement).not.toEqual(null)
      expect(editorElement!.innerHTML).toEqual(
        [
          `<div data-pt-path="[_key==&quot;${blockKey}&quot;]" data-pt-block="text">`,
          '<div>',
          `<span data-pt-path="[_key==&quot;${blockKey}&quot;].children[_key==&quot;${spanKey}&quot;]" data-pt-inline="span">`,
          '<span data-testid="decoration-a">',
          '<span data-pt-marks="true"><span data-pt-text="true">f</span></span>',
          '</span>',
          '<span data-testid="decoration-a">',
          '<span data-testid="decoration-b">',
          '<span data-pt-marks="true"><span data-pt-text="true">o</span></span>',
          '</span>',
          '</span>',
          '<span data-testid="decoration-b">',
          '<span data-pt-marks="true"><span data-pt-text="true">o</span></span>',
          '</span>',
          '</span>',
          '</div>',
          '</div>',
        ].join(''),
      )
    })
  })

  test('Scenario: Three overlapping Range Decorations nest in array order', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const rangeDecorations: Array<RangeDecoration> = (
      ['a', 'b', 'c'] as const
    ).map((name) => ({
      component: (props) => (
        <span data-testid={`decoration-${name}`}>{props.children}</span>
      ),
      selection: {
        anchor: {path: spanPath, offset: 0},
        focus: {path: spanPath, offset: 3},
      },
    }))

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
      editableProps: {
        rangeDecorations,
      },
    })

    await vi.waitFor(() => {
      const editorElement = document.querySelector('[data-pt-editor]')
      expect(editorElement).not.toEqual(null)
      expect(editorElement!.innerHTML).toEqual(
        [
          `<div data-pt-path="[_key==&quot;${blockKey}&quot;]" data-pt-block="text">`,
          '<div>',
          `<span data-pt-path="[_key==&quot;${blockKey}&quot;].children[_key==&quot;${spanKey}&quot;]" data-pt-inline="span">`,
          '<span data-testid="decoration-a">',
          '<span data-testid="decoration-b">',
          '<span data-testid="decoration-c">',
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

  it('Scenario: Range decorations only render as necessary', async () => {
    const editorRef: RefObject<PortableTextEditor | null> = createRef()
    const onChange = vi.fn()
    const value = [helloBlock]
    let rangeDecorations: RangeDecoration[] = [
      {
        component: RangeDecorationTestComponent,
        selection: {
          anchor: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 0},
          focus: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
        },
        payload: {id: 'a'},
      },
    ]

    const {rerender} = await createTestEditor({
      children: (
        <>
          <EventListenerPlugin on={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      initialValue: value,
      editableProps: {rangeDecorations},
    })

    await vi.waitFor(() => {
      if (editorRef.current) {
        expect(onChange).toHaveBeenCalledWith({
          type: 'value changed',
          value,
        })
        expect(onChange).toHaveBeenCalledWith({type: 'ready'})
      }
    })

    await vi.waitFor(() => {
      expect([rangeDecorationIteration, 'initial']).toEqual([1, 'initial'])
    })

    // Re-render with the same range decorations
    await rerender({
      children: (
        <>
          <EventListenerPlugin on={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      initialValue: value,
      editableProps: {rangeDecorations},
    })

    await vi.waitFor(() => {
      expect([rangeDecorationIteration, 'initial']).toEqual([1, 'initial'])
    })
    // Update the range decorations, a new object with identical values
    rangeDecorations = [
      {
        component: RangeDecorationTestComponent,
        selection: {
          anchor: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 0},
          focus: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
        },
        payload: {id: 'a'},
      },
    ]

    await rerender({
      children: (
        <>
          <EventListenerPlugin on={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      initialValue: value,
      editableProps: {rangeDecorations},
    })

    await vi.waitFor(() => {
      expect([rangeDecorationIteration, 'updated-with-equal-values']).toEqual([
        1,
        'updated-with-equal-values',
      ])
    })
    // Update the range decorations with a new offset
    rangeDecorations = [
      {
        component: RangeDecorationTestComponent,
        selection: {
          anchor: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
          focus: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 4},
        },
        payload: {id: 'a'},
      },
    ]
    await rerender({
      children: (
        <>
          <EventListenerPlugin on={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      initialValue: value,
      editableProps: {rangeDecorations},
    })

    await vi.waitFor(() => {
      expect([rangeDecorationIteration, 'updated-with-different']).toEqual([
        2,
        'updated-with-different',
      ])
    })

    // Update the range decorations with a new offset again
    rangeDecorations = [
      {
        component: RangeDecorationTestComponent,
        selection: {
          anchor: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 0},
          focus: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
        },
        payload: {id: 'a'},
      },
    ]

    await rerender({
      children: (
        <>
          <EventListenerPlugin on={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      initialValue: value,
      editableProps: {rangeDecorations},
    })

    await vi.waitFor(() => {
      expect([rangeDecorationIteration, 'updated-with-different']).toEqual([
        3,
        'updated-with-different',
      ])
    })

    // Update the range decorations with a new payload
    rangeDecorations = [
      {
        component: RangeDecorationTestComponent,
        selection: {
          anchor: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 0},
          focus: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
        },
        payload: {id: 'b'},
      },
    ]

    await rerender({
      children: (
        <>
          <EventListenerPlugin on={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      initialValue: value,
      editableProps: {rangeDecorations},
    })

    await vi.waitFor(() => {
      expect([
        rangeDecorationIteration,
        'updated-with-different-payload',
      ]).toEqual([4, 'updated-with-different-payload'])
    })

    // Update the range decorations with a new payload again
    rangeDecorations = [
      {
        component: RangeDecorationTestComponent,
        selection: {
          anchor: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 0},
          focus: {path: [{_key: '123'}, 'children', {_key: '567'}], offset: 2},
        },
        payload: {id: 'c'},
      },
    ]

    await rerender({
      children: (
        <>
          <EventListenerPlugin on={onChange} />
          <InternalPortableTextEditorRefPlugin ref={editorRef} />
        </>
      ),
      initialValue: value,
      editableProps: {rangeDecorations},
    })

    await vi.waitFor(() => {
      expect([
        rangeDecorationIteration,
        'updated-with-different-payload',
      ]).toEqual([5, 'updated-with-different-payload'])
    })
  })

  test('Scenario: A remote edit that moves a Range Decoration reports a remote origin', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
      },
    ]

    const onMoved = vi.fn()

    const rangeDecoration: RangeDecoration = {
      component: (props) => (
        <span data-testid="range-decoration">{props.children}</span>
      ),
      onMoved,
      selection: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 3,
        },
      },
    }

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
      editableProps: {
        rangeDecorations: [rangeDecoration],
      },
    })

    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toBeInTheDocument(),
    )

    editor.send({
      type: 'patches',
      patches: [
        diffMatchPatch('foo', 'barfoo', [
          {_key: blockKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(onMoved).toHaveBeenCalledTimes(1)
    })

    expect(onMoved.mock.calls[0]?.[0]).toEqual({
      newSelection: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 4,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 6,
        },
      },
      rangeDecoration,
      origin: 'remote',
    })
  })

  test('Scenario: A repair triggered by a remote patch reports a remote origin', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
      },
    ]

    const onMoved = vi.fn()

    const rangeDecoration: RangeDecoration = {
      component: (props) => (
        <span data-testid="range-decoration">{props.children}</span>
      ),
      onMoved,
      selection: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 3,
        },
      },
    }

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
      editableProps: {
        rangeDecorations: [rangeDecoration],
      },
    })

    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toBeInTheDocument(),
    )

    // The remote insert lands a second span with the same key as the
    // first, so the engine's duplicate-key fix re-mints the duplicate.
    // That repair is what moves the decoration, and it must report the
    // origin of the change that triggered it: `remote`, not the repair's
    // own executor.
    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          position: 'after',
          items: [
            {_type: 'span', _key: spanKey, text: 'bar', marks: ['strong']},
          ],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(onMoved).toHaveBeenCalledTimes(1)
    })

    expect(onMoved.mock.calls[0]?.[0]).toEqual({
      newSelection: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: 'k4'}],
          offset: 1,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: 'k4'}],
          offset: 3,
        },
      },
      rangeDecoration,
      origin: 'remote',
    })
  })

  test('Scenario: Undoing a local edit that moves a Range Decoration reports a local origin', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        markDefs: [],
      },
    ]

    const onMoved = vi.fn()

    const rangeDecoration: RangeDecoration = {
      component: (props) => (
        <span data-testid="range-decoration">{props.children}</span>
      ),
      onMoved,
      selection: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 3,
        },
      },
    }

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
      editableProps: {
        rangeDecorations: [rangeDecoration],
      },
    })

    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toBeInTheDocument(),
    )

    editor.send({
      type: 'select',
      at: getSelectionBeforeText(editor.getSnapshot().context, 'foo'),
    })

    await userEvent.type(locator, 'x')

    await vi.waitFor(() => {
      expect(onMoved).toHaveBeenCalledTimes(1)
    })

    expect(onMoved.mock.calls[0]?.[0]).toEqual({
      newSelection: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 2,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 4,
        },
      },
      rangeDecoration,
      origin: 'local',
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(onMoved).toHaveBeenCalledTimes(2)
    })

    expect(onMoved.mock.calls[1]?.[0]).toEqual({
      newSelection: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 3,
        },
      },
      rangeDecoration: {
        ...rangeDecoration,
        selection: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 2,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 4,
          },
        },
      },
      origin: 'local',
    })
  })

  test("Scenario: Range Decorations don't affect the caret position", async () => {
    const keyGenerator = createTestKeyGenerator()
    const editorRef: RefObject<Editor | null> = createRef()
    // Keeping track of the mutation events emitted by the editor
    const mutationEvents: Array<MutationEvent> = []

    function SpanRangeDecoration(props: {children?: ReactNode}) {
      return <span data-testid="range-decoration">{props.children}</span>
    }

    function App(props: {children: ReactNode}) {
      const [rangeDecorations, setRangeDecorations] = useState<
        Array<RangeDecoration>
      >([])
      const schema = compileSchema(defineSchema({}))
      const [value, setValue] = useState<Array<PortableTextBlock>>([])

      return (
        <EditorProvider
          initialConfig={{
            keyGenerator,
            schemaDefinition: schema,
            initialValue: value,
          }}
        >
          <EventListenerPlugin
            on={(event) => {
              if (
                event.type === 'patch' &&
                event.patch.type === 'diffMatchPatch' &&
                event.patch.origin === 'local'
              ) {
                const blockKey = getBlockKeyFromSelectionPoint({
                  path: event.patch.path,
                  offset: 0,
                })
                const spanKey = getChildKeyFromSelectionPoint({
                  path: event.patch.path,
                  offset: 0,
                })
                const block = editorRef.current
                  ?.getSnapshot()
                  .context.value?.find((block) => block._key === blockKey)
                const child = isTextBlock({schema}, block)
                  ? block?.children?.find((child) => child._key === spanKey)
                  : undefined

                if (!isSpan({schema}, child)) {
                  return
                }

                // Create a Range Decoration that follows the span from the
                // start to the end
                const rangeDecoration: RangeDecoration = {
                  component: SpanRangeDecoration,
                  selection: {
                    anchor: {
                      path: event.patch.path.slice(0, 2),
                      offset: 0,
                    },
                    focus: {
                      path: event.patch.path.slice(0, 2),
                      offset: child.text.length,
                    },
                  },
                }

                setRangeDecorations([rangeDecoration])
              }

              if (event.type === 'mutation') {
                // Set the value to trigger a re-render of the App component
                setValue(event.value ?? [])
                mutationEvents.push(event)
              }
            }}
          />
          <PortableTextEditable rangeDecorations={rangeDecorations} />
          {props.children}
        </EditorProvider>
      )
    }

    render(
      <App>
        <EditorRefPlugin ref={editorRef} />
      </App>,
    )

    const locator = page.getByRole('textbox')

    await userEvent.click(locator)
    await userEvent.type(locator, 'f')

    // Assert that the caret is after "f"
    expect(editorRef.current?.getSnapshot().context.selection).toEqual(
      getSelectionAfterText(editorRef.current!.getSnapshot().context, 'f'),
    )

    await vi.waitFor(() => {
      expect(page.getByTestId('range-decoration')).toBeInTheDocument()
    })

    // Waiting for the mutation event to be emitted so we know the value has
    // been set inside `App`
    await vi.waitFor(() => {
      expect(mutationEvents.length).toEqual(1)
    })

    // Assert that the caret is still after "f"
    expect(editorRef.current?.getSnapshot().context.selection).toEqual(
      getSelectionAfterText(editorRef.current!.getSnapshot().context, 'f'),
    )
  })
})

describe('RangeDecorations: transaction re-anchoring acceptance', () => {
  test.each([
    {kind: 'prop' as const, direction: 'backward' as const},
    {kind: 'prop' as const, direction: 'forward' as const},
    {kind: 'registered' as const, direction: 'backward' as const},
    {kind: 'registered' as const, direction: 'forward' as const},
  ])(
    'Scenario: a $kind decoration survives split then $direction merge',
    async ({kind, direction}) => {
      const harness = await createSplitMergeDecorationHarness(kind)

      harness.editor.send({
        type: 'select',
        at: acceptanceSelection('b0', 's0', 6, 'b0', 's0', 6),
      })
      harness.editor.send({type: 'insert.break'})

      await vi.waitFor(() => {
        expect(harness.getText()).toEqual(['highli', 'ghted words'])
      })

      const value = harness.editor.getSnapshot().context.value
      const firstBlock = value[0]!
      const secondBlock = value[1]!
      if (
        !isTextBlock(
          {schema: harness.editor.getSnapshot().context.schema},
          firstBlock,
        ) ||
        !isTextBlock(
          {schema: harness.editor.getSnapshot().context.schema},
          secondBlock,
        )
      ) {
        throw new Error('Expected text blocks')
      }
      const firstSpan = firstBlock.children[0]!
      const secondSpan = secondBlock.children[0]!
      if (
        !isSpan(
          {schema: harness.editor.getSnapshot().context.schema},
          firstSpan,
        ) ||
        !isSpan(
          {schema: harness.editor.getSnapshot().context.schema},
          secondSpan,
        )
      ) {
        throw new Error('Expected spans')
      }

      harness.editor.send({
        type: 'select',
        at:
          direction === 'backward'
            ? acceptanceSelection(
                secondBlock._key,
                secondSpan._key,
                0,
                secondBlock._key,
                secondSpan._key,
                0,
              )
            : acceptanceSelection(
                firstBlock._key,
                firstSpan._key,
                firstSpan.text.length,
                firstBlock._key,
                firstSpan._key,
                firstSpan.text.length,
              ),
      })
      harness.editor.send({type: 'delete', direction})

      await vi.waitFor(() => {
        expect(harness.getText()).toEqual(['highlighted words'])
        expect(harness.getSelection()).toEqual(
          acceptanceSelection('b0', 's0', 0, 'b0', 's0', 17),
        )
      })
    },
  )

  test('Scenario: a controlled null prop decoration does not call `onMoved`', async () => {
    const onMoved = vi.fn()

    function App() {
      const [rangeDecorations, setRangeDecorations] = useState<
        Array<RangeDecoration>
      >([
        {
          component: ({children}) => <span>{children}</span>,
          selection: null,
          onMoved: (details) => {
            onMoved(details)
            setRangeDecorations((decorations) => [...decorations])
          },
        },
      ])

      return (
        <EditorProvider
          initialConfig={{
            keyGenerator: createTestKeyGenerator(),
            schemaDefinition: defineSchema({}),
            initialValue: [acceptanceBlock('b0', 's0', 'highlighted words')],
          }}
        >
          <PortableTextEditable rangeDecorations={rangeDecorations} />
        </EditorProvider>
      )
    }

    await render(<App />)
    await expect.element(page.getByRole('textbox')).toBeVisible()
    expect(onMoved).toHaveBeenCalledTimes(0)
  })

  test.each([
    {
      name: 'P1 text/plain single line pasted inside a decoration',
      text: 'XX',
      value: ['HeXXllo world'],
      expected: acceptanceSelection('b1', 's1', 0, 'b1', 's1', 7),
    },
    {
      name: 'P2 text/plain single newline pasted inside a decoration',
      text: 'one\ntwo',
      value: ['Heone\ntwollo world'],
      expected: acceptanceSelection('b1', 's1', 0, 'b1', 's1', 12),
    },
    {
      name: 'P3 text/plain blank line pasted inside a decoration',
      text: 'a\n\nb',
      value: ['Hea', 'bllo world'],
      expected: acceptanceSelection('b1', 's1', 0, 'k8', 'k6', 4),
    },
  ])('Scenario: $name', async ({text, value, expected}) => {
    const harness = await createAcceptanceDecorationHarness({
      initialValue: [acceptanceBlock('b1', 's1', 'Hello world')],
      decoration: acceptanceSelection('b1', 's1', 0, 'b1', 's1', 5),
    })

    pasteAcceptanceText(harness.editor, 'b1', 's1', 2, text)

    await vi.waitFor(() => {
      expect(harness.getText()).toEqual(value)
      expect(harness.getSelection()).toEqual(expected)
    })
  })

  test.each([
    {
      name: 'X1 typing over only a block break keeps a decoration in the second block',
      decoration: acceptanceSelection('b2', 's2', 0, 'b2', 's2', 5),
      editSelection: acceptanceSelection('b1', 's1', 5, 'b2', 's2', 0),
      text: 'Z',
      value: ['AlphaZBravo charlie'],
      expected: acceptanceSelection('b1', 's1', 6, 'b1', 's1', 11),
    },
    {
      name: 'X2 typing over text across a block break keeps a later decoration',
      decoration: acceptanceSelection('b2', 's2', 3, 'b2', 's2', 8),
      editSelection: acceptanceSelection('b1', 's1', 3, 'b2', 's2', 2),
      text: 'Y',
      value: ['AlpYavo charlie'],
      expected: acceptanceSelection('b1', 's1', 5, 'b1', 's1', 10),
    },
    {
      name: 'X3 typing inside a decoration across a block break preserves both tails',
      decoration: acceptanceSelection('b1', 's1', 6, 'b2', 's2', 8),
      editSelection: acceptanceSelection('b1', 's1', 10, 'b2', 's2', 3),
      text: 'X',
      value: ['Bravo highXosses the line'],
      expected: acceptanceSelection('b1', 's1', 6, 'b1', 's1', 16),
      initialValue: [
        acceptanceBlock('b1', 's1', 'Bravo highlight'),
        acceptanceBlock('b2', 's2', ' crosses the line'),
      ],
    },
  ])('Scenario: $name', async (scenario) => {
    const harness = await createAcceptanceDecorationHarness({
      initialValue: scenario.initialValue ?? [
        acceptanceBlock('b1', 's1', 'Alpha'),
        acceptanceBlock('b2', 's2', 'Bravo charlie'),
      ],
      decoration: scenario.decoration,
    })

    harness.editor.send({type: 'select', at: scenario.editSelection})
    harness.editor.send({type: 'insert.text', text: scenario.text})

    await vi.waitFor(() => {
      expect(harness.getText()).toEqual(scenario.value)
      expect(harness.getSelection()).toEqual(scenario.expected)
    })
  })

  test.each([
    {
      name: 'X4 backspace over only a block break',
      direction: 'backward' as const,
      decoration: acceptanceSelection('b2', 's2', 0, 'b2', 's2', 5),
      editSelection: acceptanceSelection('b1', 's1', 5, 'b2', 's2', 0),
      value: ['AlphaBravo charlie'],
      expected: acceptanceSelection('b1', 's1', 5, 'b1', 's1', 10),
    },
    {
      name: 'X4 delete over only a block break',
      direction: 'forward' as const,
      decoration: acceptanceSelection('b2', 's2', 0, 'b2', 's2', 5),
      editSelection: acceptanceSelection('b1', 's1', 5, 'b2', 's2', 0),
      value: ['AlphaBravo charlie'],
      expected: acceptanceSelection('b1', 's1', 5, 'b1', 's1', 10),
    },
    {
      name: 'X4 backspace over text across a block break',
      direction: 'backward' as const,
      decoration: acceptanceSelection('b2', 's2', 3, 'b2', 's2', 8),
      editSelection: acceptanceSelection('b1', 's1', 3, 'b2', 's2', 2),
      value: ['Alpavo charlie'],
      expected: acceptanceSelection('b1', 's1', 4, 'b1', 's1', 9),
    },
    {
      name: 'X4 delete over text across a block break',
      direction: 'forward' as const,
      decoration: acceptanceSelection('b2', 's2', 3, 'b2', 's2', 8),
      editSelection: acceptanceSelection('b1', 's1', 3, 'b2', 's2', 2),
      value: ['Alpavo charlie'],
      expected: acceptanceSelection('b1', 's1', 4, 'b1', 's1', 9),
    },
  ])(
    'Scenario: $name keeps a decoration in the second block',
    async (scenario) => {
      const harness = await createAcceptanceDecorationHarness({
        initialValue: [
          acceptanceBlock('b1', 's1', 'Alpha'),
          acceptanceBlock('b2', 's2', 'Bravo charlie'),
        ],
        decoration: scenario.decoration,
      })

      harness.editor.send({
        type: 'select',
        at: scenario.editSelection,
      })
      harness.editor.send({type: 'delete', direction: scenario.direction})

      await vi.waitFor(() => {
        expect(harness.getText()).toEqual(scenario.value)
        expect(harness.getSelection()).toEqual(scenario.expected)
      })
    },
  )
})

function acceptanceBlock(blockKey: string, spanKey: string, text: string) {
  return {
    _type: 'block',
    _key: blockKey,
    style: 'normal',
    children: [{_type: 'span', _key: spanKey, text, marks: []}],
    markDefs: [],
  }
}

function acceptanceSelection(
  anchorBlockKey: string,
  anchorSpanKey: string,
  anchorOffset: number,
  focusBlockKey: string,
  focusSpanKey: string,
  focusOffset: number,
) {
  return {
    anchor: {
      path: [
        {_key: anchorBlockKey},
        'children' as const,
        {_key: anchorSpanKey},
      ],
      offset: anchorOffset,
    },
    focus: {
      path: [{_key: focusBlockKey}, 'children' as const, {_key: focusSpanKey}],
      offset: focusOffset,
    },
  }
}

async function createAcceptanceDecorationHarness(args: {
  initialValue: Array<ReturnType<typeof acceptanceBlock>>
  decoration: ReturnType<typeof acceptanceSelection>
}) {
  let rangeDecorations: Array<RangeDecoration> = [
    {
      component: ({children}) => <span>{children}</span>,
      payload: {id: 'acceptance'},
      selection: args.decoration,
      onMoved: (details) => {
        rangeDecorations = updateRangeDecorations({rangeDecorations, details})
      },
    },
  ]
  const result = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    initialValue: args.initialValue,
    editableProps: {rangeDecorations},
  })

  return {
    ...result,
    getSelection: () => rangeDecorations[0]?.selection,
    getText: () =>
      result.editor
        .getSnapshot()
        .context.value.map((block) =>
          isTextBlock(
            {schema: result.editor.getSnapshot().context.schema},
            block,
          )
            ? block.children
                .map((child) =>
                  isSpan(
                    {schema: result.editor.getSnapshot().context.schema},
                    child,
                  )
                    ? child.text
                    : '',
                )
                .join('')
            : '',
        ),
  }
}

async function createSplitMergeDecorationHarness(kind: 'prop' | 'registered') {
  const decoration = acceptanceSelection('b0', 's0', 0, 'b0', 's0', 17)
  if (kind === 'registered') {
    const result = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      initialValue: [acceptanceBlock('b0', 's0', 'highlighted words')],
    })
    const registration = result.editor.registerDecorations({
      decorations: [
        {
          id: 'acceptance',
          type: 'range',
          render: ({children}) => <span>{children}</span>,
          range: decoration,
        },
      ],
    })
    return {
      ...result,
      getSelection: () => registration.getDecorations()[0]?.range,
      getText: () =>
        result.editor
          .getSnapshot()
          .context.value.map((block) =>
            isTextBlock(
              {schema: result.editor.getSnapshot().context.schema},
              block,
            )
              ? block.children
                  .map((child) =>
                    isSpan(
                      {schema: result.editor.getSnapshot().context.schema},
                      child,
                    )
                      ? child.text
                      : '',
                  )
                  .join('')
              : '',
          ),
    }
  }

  return createAcceptanceDecorationHarness({
    initialValue: [acceptanceBlock('b0', 's0', 'highlighted words')],
    decoration,
  })
}

function pasteAcceptanceText(
  editor: Editor,
  blockKey: string,
  spanKey: string,
  offset: number,
  text: string,
) {
  const at = acceptanceSelection(
    blockKey,
    spanKey,
    offset,
    blockKey,
    spanKey,
    offset,
  )
  editor.send({type: 'select', at})
  const dataTransfer = new DataTransfer()
  dataTransfer.setData('text/plain', text)
  editor.send({
    type: 'clipboard.paste',
    originEvent: {dataTransfer},
    position: {selection: at},
  })
}

describe('RangeDecorations inside editable containers', () => {
  test('Scenario: Drawing a collapsed Range Decoration inside a callout', async () => {
    const schemaDefinition = defineSchema({
      blockObjects: [
        {
          name: 'callout',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [{type: 'block'}],
            },
          ],
        },
      ],
    })

    const calloutContainer = defineContainer({
      type: 'callout',
      arrayField: 'content',
    })

    // A collapsed range decoration whose path points inside a container.
    // `range-decorations-machine.ts` has a special branch for collapsed
    // ranges that matches by block key. With root-only path slicing
    // (`path.at(0)` = callout key) the inner text block iteration sees a
    // mismatch and the decoration never renders. Container-aware lookup
    // resolves the enclosing block at any depth.
    const rangeDecorations: Array<RangeDecoration> = [
      {
        component: (props) => (
          <span data-testid="range-decoration">{props.children}</span>
        ),
        selection: {
          anchor: {
            path: [
              {_key: 'callout1'},
              'content',
              {_key: 'inner1'},
              'children',
              {_key: 'span1'},
            ],
            offset: 6,
          },
          focus: {
            path: [
              {_key: 'callout1'},
              'content',
              {_key: 'inner1'},
              'children',
              {_key: 'span1'},
            ],
            offset: 6,
          },
        },
      },
    ]

    const {locator} = await createTestEditor({
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'callout1',
          content: [
            {
              _type: 'block',
              _key: 'inner1',
              children: [
                {_type: 'span', _key: 'span1', text: 'Hello there world'},
              ],
              markDefs: [],
            },
          ],
        },
      ],
      editableProps: {
        rangeDecorations,
      },
      children: <NodePlugin nodes={[calloutContainer]} />,
    })

    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toBeInTheDocument(),
    )
  })
})

describe('RangeDecorations: multiple PortableTextEditables under one provider', () => {
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
      {
        component: (props) => (
          <span data-testid="decoration-second-on-a">{props.children}</span>
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

    // Both editables' props decorate the same span here: the first-mounted
    // editable's prop (`decoration-first`) nests outermost, the
    // second-mounted editable's prop (`decoration-second-on-a`) inside it.
    await vi.waitFor(() => {
      const firstEditable = document.querySelector(
        '[data-testid="editable-first"]',
      )
      expect(firstEditable).not.toEqual(null)
      expect(
        firstEditable!.querySelector(
          `[data-pt-path='[_key=="${blockAKey}"].children[_key=="${spanAKey}"]']`,
        )!.innerHTML,
      ).toEqual(
        [
          '<span data-testid="decoration-first">',
          '<span data-testid="decoration-second-on-a">',
          '<span data-pt-marks="true"><span data-pt-text="true">foo</span></span>',
          '</span>',
          '</span>',
        ].join(''),
      )
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

    const registered: Array<Decoration> = [
      {
        id: 'registered',
        type: 'range',
        render: (props) => (
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

    function RegisteredDecorationsProbe(props: {
      decorations: Array<Decoration>
    }) {
      const editor = useEditor()
      useState(() =>
        editor.registerDecorations({decorations: props.decorations}),
      )
      return null
    }

    function App(props: {showFirstEditable: boolean}) {
      return (
        <EditorProvider
          initialConfig={{
            keyGenerator,
            schemaDefinition: defineSchema({}),
            initialValue,
          }}
        >
          <RegisteredDecorationsProbe decorations={registered} />
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

  test('Scenario: registered decorations move synchronously with an edit', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children' as const, {_key: spanKey}]
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'Hello world', marks: []},
          ],
          markDefs: [],
        },
      ],
    })
    const renderDecoration = (props: {children: ReactNode}) => (
      <span>{props.children}</span>
    )
    const registration = editor.registerDecorations({
      decorations: [
        {
          id: 'decoration',
          type: 'range',
          render: renderDecoration,
          range: {
            anchor: {path: spanPath, offset: 6},
            focus: {path: spanPath, offset: 11},
          },
        },
      ],
    })
    await vi.waitFor(() => {
      expect(registration.getDecorations()).toEqual([
        {
          id: 'decoration',
          range: {
            anchor: {path: spanPath, offset: 6},
            focus: {path: spanPath, offset: 11},
          },
        },
      ])
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 0},
        focus: {path: spanPath, offset: 0},
      },
    })
    editor.send({type: 'insert.text', text: 'XX'})

    expect(registration.getDecorations()[0]!.range).toEqual({
      anchor: {path: spanPath, offset: 8},
      focus: {path: spanPath, offset: 13},
    })
  })

  test('Scenario: updating a registered decoration after an edit does not move it twice', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const spanPath = [{_key: blockKey}, 'children' as const, {_key: spanKey}]
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'Hello world', marks: []},
          ],
          markDefs: [],
        },
      ],
    })
    const renderDecoration = (props: {children: ReactNode}) => (
      <span>{props.children}</span>
    )
    const registration = editor.registerDecorations({
      decorations: [
        {
          id: 'decoration',
          type: 'range',
          render: renderDecoration,
          range: {
            anchor: {path: spanPath, offset: 6},
            focus: {path: spanPath, offset: 11},
          },
        },
      ],
    })
    await vi.waitFor(() => {
      expect(registration.getDecorations()[0]?.range).toEqual({
        anchor: {path: spanPath, offset: 6},
        focus: {path: spanPath, offset: 11},
      })
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 0},
        focus: {path: spanPath, offset: 0},
      },
    })
    editor.send({type: 'insert.text', text: 'XX'})
    registration.update([
      {
        id: 'decoration',
        type: 'range',
        render: renderDecoration,
        range: {
          anchor: {path: spanPath, offset: 8},
          focus: {path: spanPath, offset: 13},
        },
      },
    ])

    expect(registration.getDecorations()[0]!.range).toEqual({
      anchor: {path: spanPath, offset: 8},
      focus: {path: spanPath, offset: 13},
    })
  })

  test('Scenario: operation mapping preserves a registered decoration when its block is rekeyed', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    })
    const registration = editor.registerDecorations({
      decorations: [
        {
          id: 'decoration',
          type: 'range',
          render: (props) => <span>{props.children}</span>,
          range: {
            anchor: {
              path: [{_key: 'b1'}, 'children', {_key: 's1'}],
              offset: 0,
            },
            focus: {
              path: [{_key: 'b1'}, 'children', {_key: 's1'}],
              offset: 3,
            },
          },
        },
      ],
    })
    await vi.waitFor(() => {
      expect(registration.getDecorations()[0]?.range).toEqual({
        anchor: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 3,
        },
      })
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(registration.getDecorations()[0]?.range).toEqual({
        anchor: {
          path: [{_key: 'b2'}, 'children', {_key: 's2'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'b2'}, 'children', {_key: 's2'}],
          offset: 3,
        },
      })
    })
  })
})
