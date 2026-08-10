import {
  compileSchema,
  isSpan,
  isTextBlock,
  type PortableTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {createRef, useState, type ReactNode, type RefObject} from 'react'
import {describe, expect, it, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {page, userEvent} from 'vitest/browser'
import {
  defineContainer,
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  type Editor,
  type MutationEvent,
  type RangeDecoration,
  type RangeDecorationOnMovedDetails,
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
import {toTextspec} from '../test-utils/to-textspec'

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

describe('caret painting at zero-advance leaf boundaries', () => {
  test('Scenario: The caret after a decorated soft hyphen paints in the following text', async () => {
    const {editor, locator} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'a',
          children: [{_type: 'span', _key: 'a1', text: 'foo\u00ADbar'}],
          markDefs: [],
        },
      ],
      editableProps: {
        rangeDecorations: decorateRange({anchor: 3, focus: 4}),
      },
    })

    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toBeInTheDocument(),
    )

    const afterSoftHyphen = {
      path: [{_key: 'a'}, 'children', {_key: 'a1'}],
      offset: 4,
    }
    editor.send({type: 'focus'})
    editor.send({
      type: 'select',
      at: {anchor: afterSoftHyphen, focus: afterSoftHyphen},
    })

    await vi.waitFor(() => {
      expect(domCaret()).toEqual({text: 'bar', offset: 0})
    })

    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: 'a'}, 'children', {_key: 'a1'}],
        offset: 4,
      },
      focus: {
        path: [{_key: 'a'}, 'children', {_key: 'a1'}],
        offset: 4,
      },
      backward: false,
    })
  })

  test('Scenario: The caret after a decorated zero-width run paints in the following text', async () => {
    const {editor, locator} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'a',
          children: [
            {_type: 'span', _key: 'a1', text: 'foo\u200B\u2060\uFEFFbar'},
          ],
          markDefs: [],
        },
      ],
      editableProps: {
        rangeDecorations: decorateRange({anchor: 3, focus: 6}),
      },
    })

    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toBeInTheDocument(),
    )

    const afterRun = {
      path: [{_key: 'a'}, 'children', {_key: 'a1'}],
      offset: 6,
    }
    editor.send({type: 'focus'})
    editor.send({
      type: 'select',
      at: {anchor: afterRun, focus: afterRun},
    })

    await vi.waitFor(() => {
      expect(domCaret()).toEqual({text: 'bar', offset: 0})
    })
  })

  test('Scenario: The caret before a decorated soft hyphen paints in the preceding text', async () => {
    const {editor, locator} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'a',
          children: [{_type: 'span', _key: 'a1', text: 'foo\u00ADbar'}],
          markDefs: [],
        },
      ],
      editableProps: {
        rangeDecorations: decorateRange({anchor: 3, focus: 4}),
      },
    })

    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toBeInTheDocument(),
    )

    const beforeSoftHyphen = {
      path: [{_key: 'a'}, 'children', {_key: 'a1'}],
      offset: 3,
    }
    editor.send({type: 'focus'})
    editor.send({
      type: 'select',
      at: {anchor: beforeSoftHyphen, focus: beforeSoftHyphen},
    })

    await vi.waitFor(() => {
      expect(domCaret()).toEqual({text: 'foo', offset: 3})
    })
  })

  test('Scenario: The caret after a block-leading decorated soft hyphen paints in the following text', async () => {
    const {editor, locator} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'a',
          children: [{_type: 'span', _key: 'a1', text: '\u00ADbar'}],
          markDefs: [],
        },
      ],
      editableProps: {
        rangeDecorations: decorateRange({anchor: 0, focus: 1}),
      },
    })

    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toBeInTheDocument(),
    )

    const afterSoftHyphen = {
      path: [{_key: 'a'}, 'children', {_key: 'a1'}],
      offset: 1,
    }
    editor.send({type: 'focus'})
    editor.send({
      type: 'select',
      at: {anchor: afterSoftHyphen, focus: afterSoftHyphen},
    })

    await vi.waitFor(() => {
      expect(domCaret()).toEqual({text: 'bar', offset: 0})
    })
  })

  test('Scenario: The caret before a block-leading decorated soft hyphen stays on its text node', async () => {
    const {editor, locator} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'a',
          children: [{_type: 'span', _key: 'a1', text: '\u00ADbar'}],
          markDefs: [],
        },
      ],
      editableProps: {
        rangeDecorations: decorateRange({anchor: 0, focus: 1}),
      },
    })

    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toBeInTheDocument(),
    )

    const beforeSoftHyphen = {
      path: [{_key: 'a'}, 'children', {_key: 'a1'}],
      offset: 0,
    }
    editor.send({type: 'focus'})
    editor.send({
      type: 'select',
      at: {anchor: beforeSoftHyphen, focus: beforeSoftHyphen},
    })

    await vi.waitFor(() => {
      expect(domCaret()).toEqual({text: '\u00AD', offset: 0})
    })
  })

  test('Scenario: The caret after a block-ending decorated soft hyphen stays on its text node', async () => {
    const {editor, locator} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'a',
          children: [{_type: 'span', _key: 'a1', text: 'foo\u00AD'}],
          markDefs: [],
        },
      ],
      editableProps: {
        rangeDecorations: decorateRange({anchor: 3, focus: 4}),
      },
    })

    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toBeInTheDocument(),
    )

    const afterSoftHyphen = {
      path: [{_key: 'a'}, 'children', {_key: 'a1'}],
      offset: 4,
    }
    editor.send({type: 'focus'})
    editor.send({
      type: 'select',
      at: {anchor: afterSoftHyphen, focus: afterSoftHyphen},
    })

    await vi.waitFor(() => {
      expect(domCaret()).toEqual({text: '\u00AD', offset: 1})
    })
  })

  test('Scenario: The caret after a block-ending decorated soft hyphen ignores trailing spacer leaves', async () => {
    const collapsedEnd = {
      path: [{_key: 'a'}, 'children', {_key: 'a1'}],
      offset: 4,
    }
    const {editor, locator} = await createTestEditor({
      initialValue: [
        {
          _type: 'block',
          _key: 'a',
          children: [{_type: 'span', _key: 'a1', text: 'foo\u00AD'}],
          markDefs: [],
        },
      ],
      editableProps: {
        rangeDecorations: [
          ...decorateRange({anchor: 3, focus: 4}),
          {
            component: (props: {children?: ReactNode}) => (
              <span data-testid="collapsed-decoration">{props.children}</span>
            ),
            selection: {anchor: collapsedEnd, focus: collapsedEnd},
          },
        ],
      },
    })

    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toBeInTheDocument(),
    )

    editor.send({type: 'focus'})
    editor.send({
      type: 'select',
      at: {anchor: collapsedEnd, focus: collapsedEnd},
    })

    await vi.waitFor(() => {
      expect(domCaret()).toEqual({text: '\u00AD', offset: 1})
    })
  })

  function decorateRange(offsets: {anchor: number; focus: number}) {
    return [
      {
        component: (props: {children?: ReactNode}) => (
          <span data-testid="range-decoration">{props.children}</span>
        ),
        selection: {
          anchor: {
            path: [{_key: 'a'}, 'children', {_key: 'a1'}],
            offset: offsets.anchor,
          },
          focus: {
            path: [{_key: 'a'}, 'children', {_key: 'a1'}],
            offset: offsets.focus,
          },
        },
      },
    ]
  }

  function domCaret() {
    const selection = window.getSelection()
    return {
      text: selection?.anchorNode?.textContent,
      offset: selection?.anchorOffset,
    }
  }
})
