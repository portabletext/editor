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
  type RegistrableRangeDecoration,
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

  it('only render range decorations as necessary', async () => {
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

    function App(props: {showFirstEditable: boolean}) {
      return (
        <EditorProvider
          initialConfig={{
            keyGenerator,
            schemaDefinition: defineSchema({}),
            initialValue,
          }}
        >
          <RegisteredRangeDecorationsProbe rangeDecorations={registered} />
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
