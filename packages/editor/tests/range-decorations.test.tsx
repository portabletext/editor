import {diffMatchPatch} from '@portabletext/patches'
import {
  compileSchema,
  isSpan,
  isTextBlock,
  type PortableTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import {
  createRef,
  Fragment,
  useEffect,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {page, userEvent} from 'vitest/browser'
import {
  defineContainer,
  defineSchema,
  EditorProvider,
  PortableTextEditable as CorePortableTextEditable,
  useEditor,
  type Decoration,
  type DecorationMapping,
  type Editor,
  type MutationEvent,
} from '../src'
import {EventListenerPlugin, NodePlugin} from '../src/plugins'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'
import {createTestEditor as createEditorHarness} from '../src/test/vitest'
import {
  getBlockKeyFromSelectionPoint,
  getChildKeyFromSelectionPoint,
} from '../src/utils/util.selection-point'
import {
  getSelectionAfterText,
  getSelectionBeforeText,
} from '../test-utils/text-selection'

type DecorationRegistrationOptions = {
  decorations: Array<Decoration>
  onMapped?: (mappings: Array<DecorationMapping>) => void
}

type TestEditorOptions = NonNullable<
  Parameters<typeof createEditorHarness>[0]
> & {
  registration?: DecorationRegistrationOptions
}

async function createTestEditor(options: TestEditorOptions) {
  const result = await createEditorHarness(toRegisteredOptions(options))
  return {
    ...result,
    rerender: (nextOptions: TestEditorOptions) =>
      result.rerender(toRegisteredOptions(nextOptions)),
  }
}

function toRegisteredOptions(options: TestEditorOptions) {
  const {registration, children, ...editorOptions} = options
  const registeredChildren = (
    <Fragment>
      {children}
      {registration ? <Decorations {...registration} /> : null}
    </Fragment>
  )
  return {...editorOptions, children: registeredChildren}
}

function Decorations(props: DecorationRegistrationOptions) {
  const editor = useEditor()

  useEffect(() => {
    const registration = editor.registerDecorations({
      decorations: props.decorations,
      onMapped: props.onMapped,
    })
    return registration.unregister
  }, [editor, props.decorations, props.onMapped])

  return null
}

describe('Decorations', () => {
  test('Scenario: Drawing a registered decoration', async () => {
    const decorations: Array<Decoration> = [
      {
        id: 'a',
        type: 'range',
        render: (props) => (
          <span data-testid="range-decoration">{props.children}</span>
        ),
        range: {
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
      registration: {
        decorations,
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

  test('Scenario: Moving a registered decoration', async () => {
    const decorations: Array<Decoration> = [
      {
        id: 'a',
        type: 'range',
        render: (props) => (
          <span data-testid="range-decoration">{props.children}</span>
        ),
        range: {
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
      registration: {
        decorations,
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
      registration: {
        decorations,
      },
    })

    await vi.waitFor(() => {
      expect(locator.getByTestId('range-decoration')).toHaveTextContent('there')
    })
  })

  test('Scenario: Drawing a collapsed registered decoration', async () => {
    const decorations: Array<Decoration> = [
      {
        id: 'a',
        type: 'range',
        render: (props) => (
          <span data-testid="range-decoration">{props.children}</span>
        ),
        range: {
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
      registration: {
        decorations,
      },
    })

    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toBeInTheDocument(),
    )
  })

  test('Scenario: Overlapping registered decorations render nested, outer decoration first', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const decorations: Array<Decoration> = [
      {
        id: 'a',
        type: 'range',
        render: (props) => (
          <span data-testid="decoration-a">{props.children}</span>
        ),
        range: {
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
        id: 'b',
        type: 'range',
        render: (props) => (
          <span data-testid="decoration-b">{props.children}</span>
        ),
        range: {
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
      registration: {
        decorations,
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

  test('Scenario: Three overlapping registered decorations nest in array order', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
    const decorations: Array<Decoration> = (['a', 'b', 'c'] as const).map(
      (name) => ({
        id: name,
        type: 'range',
        render: (props) => (
          <span data-testid={`decoration-${name}`}>{props.children}</span>
        ),
        range: {
          anchor: {path: spanPath, offset: 0},
          focus: {path: spanPath, offset: 3},
        },
      }),
    )

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
      registration: {
        decorations,
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

  test('Scenario: A remote edit that moves a registered decoration reports a remote origin', async () => {
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

    const onMapped = vi.fn()

    const decoration: Decoration = {
      id: 'a',
      type: 'range',
      render: (props) => (
        <span data-testid="range-decoration">{props.children}</span>
      ),
      range: {
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
      registration: {
        decorations: [decoration],
        onMapped,
      },
    })

    await vi.waitFor(() =>
      expect
        .element(locator.getByTestId('range-decoration'))
        .toBeInTheDocument(),
    )

    editor.send({
      type: 'apply',
      patches: [
        diffMatchPatch('foo', 'barfoo', [
          {_key: blockKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
      ],
    })

    await vi.waitFor(() => {
      expect(onMapped).toHaveBeenCalledTimes(1)
    })

    expect(onMapped.mock.calls[0]?.[0]).toEqual([
      {
        id: 'a',
        previousRange: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 1,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 3,
          },
        },
        newRange: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 4,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 6,
          },
        },
        contentTouched: false,
        origin: 'remote',
      },
    ])
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

    const onMapped = vi.fn()

    const decoration: Decoration = {
      id: 'a',
      type: 'range',
      render: (props) => (
        <span data-testid="range-decoration">{props.children}</span>
      ),
      range: {
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
      registration: {
        decorations: [decoration],
        onMapped,
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
      type: 'apply',
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
    })

    await vi.waitFor(() => {
      expect(onMapped).toHaveBeenCalledTimes(2)
    })

    expect(onMapped.mock.calls[0]?.[0]).toEqual([
      {
        id: 'a',
        previousRange: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 1,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 3,
          },
        },
        newRange: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 1,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 3,
          },
        },
        contentTouched: true,
        origin: 'remote',
      },
    ])
    expect(onMapped.mock.calls[1]?.[0]).toEqual([
      {
        id: 'a',
        previousRange: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 1,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 3,
          },
        },
        newRange: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: 'k4'}],
            offset: 1,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: 'k4'}],
            offset: 3,
          },
        },
        contentTouched: true,
        origin: 'remote',
      },
    ])
  })

  test('Scenario: Undoing a local edit that moves a registered decoration reports a local origin', async () => {
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

    const onMapped = vi.fn()

    const decoration: Decoration = {
      id: 'a',
      type: 'range',
      render: (props) => (
        <span data-testid="range-decoration">{props.children}</span>
      ),
      range: {
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
      registration: {
        decorations: [decoration],
        onMapped,
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
      expect(onMapped).toHaveBeenCalledTimes(1)
    })

    expect(onMapped.mock.calls[0]?.[0]).toEqual([
      {
        id: 'a',
        previousRange: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 1,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 3,
          },
        },
        newRange: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 2,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 4,
          },
        },
        contentTouched: false,
        origin: 'local',
      },
    ])

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(onMapped).toHaveBeenCalledTimes(2)
    })

    expect(onMapped.mock.calls[1]?.[0]).toEqual([
      {
        id: 'a',
        previousRange: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 2,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 4,
          },
        },
        newRange: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 1,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 3,
          },
        },
        contentTouched: false,
        origin: 'local',
      },
    ])
  })

  test("Scenario: registered decorations don't affect the caret position", async () => {
    const keyGenerator = createTestKeyGenerator()
    const editorRef: RefObject<Editor | null> = createRef()
    // Keeping track of the mutation events emitted by the editor
    const mutationEvents: Array<MutationEvent> = []

    function SpanDecoration(props: {children?: ReactNode}) {
      return <span data-testid="range-decoration">{props.children}</span>
    }

    function App(props: {children: ReactNode}) {
      const [decorations, setDecorations] = useState<Array<Decoration>>([])
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

                // Create a registered decoration that follows the span from the
                // start to the end
                const decoration: Decoration = {
                  id: 'a',
                  type: 'range',
                  render: SpanDecoration,
                  range: {
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

                setDecorations([decoration])
              }

              if (event.type === 'mutation') {
                // Set the value to trigger a re-render of the App component
                setValue(event.value ?? [])
                mutationEvents.push(event)
              }
            }}
          />
          <Decorations decorations={decorations} />
          <CorePortableTextEditable />
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

describe('Decorations inside editable containers', () => {
  test('Scenario: Drawing a collapsed registered decoration inside a callout', async () => {
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
    const decorations: Array<Decoration> = [
      {
        id: 'a',
        type: 'range',
        render: (props) => (
          <span data-testid="range-decoration">{props.children}</span>
        ),
        range: {
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
      registration: {
        decorations,
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
