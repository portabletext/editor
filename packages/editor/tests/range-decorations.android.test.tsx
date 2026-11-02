import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {createRef, useMemo, type PropsWithChildren} from 'react'
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'
import {render} from 'vitest-browser-react'
import {cdp, page, server, userEvent} from 'vitest/browser'
import type {Editor, EditorSnapshot, RangeDecoration} from '../src'

const isChromium = server.browser === 'chromium'
const originalUserAgent = navigator.userAgent

if (isChromium) {
  // `IS_ANDROID` is read from `navigator.userAgent` when the engine module
  // loads, so the override has to land before the editor is imported.
  await cdp().send('Emulation.setUserAgentOverride', {
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  })
}

const {EditorProvider, PortableTextEditable, useEditor, useEditorSelector} =
  await import('../src')
const {EditorRefPlugin} = await import('../src/plugins/plugin.editor-ref')
const {NodePlugin} = await import('../src/plugins/plugin.node')
const {defineContainer} = await import('../src/renderers/renderer.types')
const {blockOffsetsToSelection, getTextBlockText, isTextBlock} =
  await import('../src/utils')
const {createTestEditor} = await import('../src/test/vitest')

afterAll(async () => {
  if (isChromium) {
    await cdp().send('Emulation.setUserAgentOverride', {
      userAgent: originalUserAgent,
    })
  }
})

const errors: Array<string> = []
const recordWindowError = (event: ErrorEvent) => {
  errors.push(`window.error: ${String(event.error ?? event.message)}`)
}
const recordRejection = (event: PromiseRejectionEvent) => {
  errors.push(`unhandledrejection: ${String(event.reason)}`)
}

beforeEach(() => {
  errors.length = 0
  window.addEventListener('error', recordWindowError)
  window.addEventListener('unhandledrejection', recordRejection)
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    errors.push(`console.error: ${args.map(String).join(' ')}`)
  })
})

afterEach(() => {
  window.removeEventListener('error', recordWindowError)
  window.removeEventListener('unhandledrejection', recordRejection)
  vi.restoreAllMocks()
})

const decorationComponents = [
  {
    name: 'inline span',
    component: (props: PropsWithChildren) => (
      <span data-decorated="">{props.children}</span>
    ),
  },
  {
    name: 'separate React component',
    component: Highlight,
  },
]

const routes = [
  {
    name: 'userEvent.type',
    typeCharacter: async (character: string) => {
      await userEvent.keyboard(character)
    },
  },
  {
    name: 'CDP Input.insertText',
    typeCharacter: async (character: string) => {
      await cdp().send('Input.insertText', {text: character})
    },
  },
]

describe.skipIf(!isChromium)(
  'Range decoration that splits the span being typed on Android',
  () => {
    describe.each(decorationComponents)(
      'decoration component: $name',
      ({component}) => {
        test.for(
          routes.flatMap((route) =>
            ['K', ''].map((prefix) => ({...route, prefix})),
          ),
        )(
          'Scenario: Typing "$prefix" + "you" via $name',
          async ({typeCharacter, prefix}) => {
            const keyGenerator = createTestKeyGenerator()
            const editorRef = createRef<Editor>()
            await render(
              <EditorProvider
                initialConfig={{
                  keyGenerator,
                  schemaDefinition: defineSchema({}),
                }}
              >
                <EditorRefPlugin ref={editorRef} />
                <WordDecoratedEditable word="you" component={component} />
              </EditorProvider>,
            )
            const locator = page.getByRole('textbox')
            await expect.element(locator).toBeInTheDocument()

            await userEvent.click(locator)

            for (const character of `${prefix}yo`) {
              await typeCharacter(character)
            }
            await vi.waitFor(() => {
              expect(locator.element().textContent).toEqual(`${prefix}yo`)
            })

            await typeCharacter('u')

            await vi.waitFor(() => {
              expect(editorRef.current?.getSnapshot().context.value).toEqual([
                {
                  _key: 'k0',
                  _type: 'block',
                  children: [
                    {
                      _key: 'k1',
                      _type: 'span',
                      text: `${prefix}you`,
                      marks: [],
                    },
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ])
            })
            await vi.waitFor(() => {
              expect(locator.element().textContent).toEqual(`${prefix}you`)
            })
            expect(
              Array.from(
                locator.element().querySelectorAll('[data-pt-text]'),
              ).map((element) => element.textContent),
            ).toEqual(prefix ? [prefix, 'you'] : ['you'])
            expect(document.activeElement).toBe(locator.element())
            expect(editorRef.current?.getSnapshot().context.selection).toEqual({
              anchor: {
                path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
                offset: prefix.length + 3,
              },
              focus: {
                path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
                offset: prefix.length + 3,
              },
              backward: false,
            })
            expect(errors).toEqual([])
          },
        )
      },
    )
  },
)

describe.skipIf(!isChromium)(
  'Range decoration that changes without typing on Android',
  () => {
    test('Scenario: Adding a decoration right after input keeps the decorated leaf through the next restore', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
      const initialValue = [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foobar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ]
      const {editor, locator, rerender} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue,
      })
      await userEvent.click(locator)
      editor.send({
        type: 'select',
        at: {
          anchor: {path: spanPath, offset: 0},
          focus: {path: spanPath, offset: 0},
        },
      })
      await vi.waitFor(() => {
        expect(window.getSelection()?.anchorOffset).toEqual(0)
      })

      openUserInputWindow(locator.element())
      await rerender({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue,
        editableProps: {
          rangeDecorations: [
            {
              component: DecoratedSpan,
              selection: {
                anchor: {path: spanPath, offset: 3},
                focus: {path: spanPath, offset: 6},
              },
            },
          ],
        },
      })
      await vi.waitFor(() => {
        expect(
          Array.from(
            locator.element().querySelectorAll('[data-decorated]'),
          ).map((element) => element.textContent),
        ).toEqual(['bar'])
      })

      await cdp().send('Input.insertText', {text: 'X'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'Xfoobar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('Xfoobar')
      })
      expect(
        Array.from(locator.element().querySelectorAll('[data-pt-text]')).map(
          (element) => element.textContent,
        ),
      ).toEqual(['Xfoo', 'bar'])
      expect(
        Array.from(locator.element().querySelectorAll('[data-decorated]')).map(
          (element) => element.textContent,
        ),
      ).toEqual(['bar'])
      expect(errors).toEqual([])
    })

    test('Scenario: Adding a decoration right after input keeps the decorated leaf through the next restore in a text block inside a container', async () => {
      const keyGenerator = createTestKeyGenerator()
      const calloutKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const spanPath = [
        {_key: calloutKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: spanKey},
      ]
      const schemaDefinition = calloutSchemaDefinition()
      const initialValue = [
        {
          _key: calloutKey,
          _type: 'callout',
          content: [
            {
              _key: blockKey,
              _type: 'block',
              children: [
                {_key: spanKey, _type: 'span', text: 'foobar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ]
      const children = <NodePlugin nodes={[calloutContainer()]} />
      const {editor, locator, rerender} = await createTestEditor({
        keyGenerator,
        schemaDefinition,
        initialValue,
        children,
      })
      await userEvent.click(locator)
      editor.send({
        type: 'select',
        at: {
          anchor: {path: spanPath, offset: 0},
          focus: {path: spanPath, offset: 0},
        },
      })
      await vi.waitFor(() => {
        expect(window.getSelection()?.anchorOffset).toEqual(0)
      })

      openUserInputWindow(locator.element())
      await rerender({
        keyGenerator,
        schemaDefinition,
        initialValue,
        children,
        editableProps: {
          rangeDecorations: [
            {
              component: DecoratedSpan,
              selection: {
                anchor: {path: spanPath, offset: 3},
                focus: {path: spanPath, offset: 6},
              },
            },
          ],
        },
      })
      await vi.waitFor(() => {
        expect(
          Array.from(
            locator.element().querySelectorAll('[data-decorated]'),
          ).map((element) => element.textContent),
        ).toEqual(['bar'])
      })

      await cdp().send('Input.insertText', {text: 'X'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: calloutKey,
            _type: 'callout',
            content: [
              {
                _key: blockKey,
                _type: 'block',
                children: [
                  {_key: spanKey, _type: 'span', text: 'Xfoobar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ])
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('Xfoobar')
      })
      expect(
        Array.from(locator.element().querySelectorAll('[data-pt-text]')).map(
          (element) => element.textContent,
        ),
      ).toEqual(['Xfoo', 'bar'])
      expect(
        Array.from(locator.element().querySelectorAll('[data-decorated]')).map(
          (element) => element.textContent,
        ),
      ).toEqual(['bar'])
      expect(errors).toEqual([])
    })

    test('Scenario: Adding a decoration right after input keeps the decorated leaf through the next restore in a text block inside a container inside a container', async () => {
      const keyGenerator = createTestKeyGenerator()
      const outerCalloutKey = keyGenerator()
      const innerCalloutKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const spanPath = [
        {_key: outerCalloutKey},
        'content',
        {_key: innerCalloutKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: spanKey},
      ]
      const schemaDefinition = calloutSchemaDefinition()
      const initialValue = [
        {
          _key: outerCalloutKey,
          _type: 'callout',
          content: [
            {
              _key: innerCalloutKey,
              _type: 'callout',
              content: [
                {
                  _key: blockKey,
                  _type: 'block',
                  children: [
                    {_key: spanKey, _type: 'span', text: 'foobar', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ]
      const children = <NodePlugin nodes={[calloutContainer()]} />
      const {editor, locator, rerender} = await createTestEditor({
        keyGenerator,
        schemaDefinition,
        initialValue,
        children,
      })
      await userEvent.click(locator)
      editor.send({
        type: 'select',
        at: {
          anchor: {path: spanPath, offset: 0},
          focus: {path: spanPath, offset: 0},
        },
      })
      await vi.waitFor(() => {
        expect(window.getSelection()?.anchorOffset).toEqual(0)
      })

      openUserInputWindow(locator.element())
      await rerender({
        keyGenerator,
        schemaDefinition,
        initialValue,
        children,
        editableProps: {
          rangeDecorations: [
            {
              component: DecoratedSpan,
              selection: {
                anchor: {path: spanPath, offset: 3},
                focus: {path: spanPath, offset: 6},
              },
            },
          ],
        },
      })
      await vi.waitFor(() => {
        expect(
          Array.from(
            locator.element().querySelectorAll('[data-decorated]'),
          ).map((element) => element.textContent),
        ).toEqual(['bar'])
      })

      await cdp().send('Input.insertText', {text: 'X'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: outerCalloutKey,
            _type: 'callout',
            content: [
              {
                _key: innerCalloutKey,
                _type: 'callout',
                content: [
                  {
                    _key: blockKey,
                    _type: 'block',
                    children: [
                      {
                        _key: spanKey,
                        _type: 'span',
                        text: 'Xfoobar',
                        marks: [],
                      },
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                ],
              },
            ],
          },
        ])
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('Xfoobar')
      })
      expect(
        Array.from(locator.element().querySelectorAll('[data-pt-text]')).map(
          (element) => element.textContent,
        ),
      ).toEqual(['Xfoo', 'bar'])
      expect(
        Array.from(locator.element().querySelectorAll('[data-decorated]')).map(
          (element) => element.textContent,
        ),
      ).toEqual(['bar'])
      expect(errors).toEqual([])
    })

    test('Scenario: Removing a decoration right after input keeps the merged leaf through the next restore', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]
      const initialValue = [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foobar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ]
      const {editor, locator, rerender} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue,
        editableProps: {
          rangeDecorations: [
            {
              component: DecoratedSpan,
              selection: {
                anchor: {path: spanPath, offset: 3},
                focus: {path: spanPath, offset: 6},
              },
            },
          ],
        },
      })
      await userEvent.click(locator)
      editor.send({
        type: 'select',
        at: {
          anchor: {path: spanPath, offset: 0},
          focus: {path: spanPath, offset: 0},
        },
      })
      await vi.waitFor(() => {
        expect(window.getSelection()?.anchorOffset).toEqual(0)
      })

      openUserInputWindow(locator.element())
      await rerender({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue,
        editableProps: {rangeDecorations: []},
      })
      await vi.waitFor(() => {
        expect(
          locator.element().querySelectorAll('[data-decorated]').length,
        ).toEqual(0)
      })

      await cdp().send('Input.insertText', {text: 'X'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: spanKey, _type: 'span', text: 'Xfoobar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(locator.element().textContent).toEqual('Xfoobar')
      })
      expect(
        Array.from(locator.element().querySelectorAll('[data-pt-text]')).map(
          (element) => element.textContent,
        ),
      ).toEqual(['Xfoobar'])
      expect(errors).toEqual([])
    })
    test('Scenario: Decorating an inline object right after input', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const fooKey = keyGenerator()
      const stockTickerKey = keyGenerator()
      const barKey = keyGenerator()
      const schemaDefinition = defineSchema({
        inlineObjects: [{name: 'stock-ticker'}],
      })
      const initialValue = [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: fooKey, _type: 'span', text: 'foo', marks: []},
            {_key: stockTickerKey, _type: 'stock-ticker'},
            {_key: barKey, _type: 'span', text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ]
      const {editor, locator, rerender} = await createTestEditor({
        keyGenerator,
        schemaDefinition,
        initialValue,
      })
      await userEvent.click(locator)
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: barKey}],
            offset: 1,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: barKey}],
            offset: 1,
          },
        },
      })
      await vi.waitFor(() => {
        expect(window.getSelection()?.anchorOffset).toEqual(1)
      })
      const htmlBeforeDecoration = locator.element().innerHTML

      openUserInputWindow(locator.element())
      await rerender({
        keyGenerator,
        schemaDefinition,
        initialValue,
        editableProps: {
          rangeDecorations: [
            {
              component: DecoratedSpan,
              selection: {
                anchor: {
                  path: [{_key: blockKey}, 'children', {_key: stockTickerKey}],
                  offset: 0,
                },
                focus: {
                  path: [{_key: blockKey}, 'children', {_key: stockTickerKey}],
                  offset: 0,
                },
              },
            },
          ],
        },
      })
      expect(locator.element().innerHTML).toEqual(htmlBeforeDecoration)

      await cdp().send('Input.insertText', {text: 'X'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: fooKey, _type: 'span', text: 'foo', marks: []},
              {_key: stockTickerKey, _type: 'stock-ticker'},
              {_key: barKey, _type: 'span', text: 'bXar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
      await vi.waitFor(() => {
        expect(
          Array.from(locator.element().querySelectorAll('[data-pt-text]')).map(
            (element) => element.textContent,
          ),
        ).toEqual(['foo', 'bXar'])
      })
      expect(
        locator.element().querySelectorAll('[data-pt-inline="object"]').length,
      ).toEqual(1)
      expect(errors).toEqual([])
    })
  },
)

// `restoreDOM` only buffers mutations that land within one animation frame
// of a `beforeinput`. An input type the editor does not handle opens that
// window without changing the value, so the next change is decoration-only.
function openUserInputWindow(element: Element) {
  element.dispatchEvent(
    new InputEvent('beforeinput', {
      inputType: 'formatBold',
      bubbles: true,
      cancelable: true,
    }),
  )
}

function calloutSchemaDefinition() {
  return defineSchema({
    blockObjects: [
      {
        name: 'callout',
        fields: [
          {
            name: 'content',
            type: 'array',
            of: [{type: 'block'}, {type: 'callout'}],
          },
        ],
      },
    ],
  })
}

function calloutContainer() {
  return defineContainer({
    type: 'callout',
    arrayField: 'content',
    render: ({attributes, children}) => <div {...attributes}>{children}</div>,
  })
}

function DecoratedSpan(props: PropsWithChildren) {
  return <span data-decorated="">{props.children}</span>
}

function WordDecoratedEditable(props: {
  word: string
  component: RangeDecoration['component']
}) {
  // The device page is not compiled, and React Compiler would drop `value`
  // from the deps since the memo body reads the value through `getSnapshot`.
  'use no memo'
  const editor = useEditor()
  const value = useEditorSelector(editor, (snapshot) => snapshot.context.value)
  const rangeDecorations = useMemo(
    () => wordDecorations(editor.getSnapshot(), props.word, props.component),
    [editor, value, props.word, props.component],
  )
  return <PortableTextEditable rangeDecorations={rangeDecorations} />
}

function wordDecorations(
  snapshot: EditorSnapshot,
  word: string,
  component: RangeDecoration['component'],
): Array<RangeDecoration> {
  const decorations: Array<RangeDecoration> = []
  for (const block of snapshot.context.value) {
    if (!isTextBlock(snapshot.context, block)) {
      continue
    }
    const text = getTextBlockText(block)
    for (
      let offset = text.indexOf(word);
      offset !== -1;
      offset = text.indexOf(word, offset + word.length)
    ) {
      const selection = blockOffsetsToSelection({
        snapshot,
        offsets: {
          anchor: {path: [{_key: block._key}], offset},
          focus: {path: [{_key: block._key}], offset: offset + word.length},
        },
      })
      if (selection) {
        decorations.push({component, selection})
      }
    }
  }
  return decorations
}

// The editor calls a decoration's `component` as a function inside its leaf,
// so `Decorated` is the component that actually mounts per decoration.
function Highlight(props: PropsWithChildren) {
  return <Decorated>{props.children}</Decorated>
}

function Decorated(props: PropsWithChildren) {
  return <span data-decorated="">{props.children}</span>
}
