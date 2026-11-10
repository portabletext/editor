import {
  defineContainer,
  defineSchema,
  EditorProvider,
  type Editor,
  type EditorSelection,
} from '@portabletext/editor'
import {EditorRefPlugin, NodePlugin} from '@portabletext/editor/plugins'
import type {PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {createRef} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {page, userEvent} from 'vitest/browser'

const presenceState = vi.hoisted(() => ({presence: [] as Array<unknown>}))

vi.mock('@sanity/sdk-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sanity/sdk-react')>()
  return {
    ...actual,
    usePresenceForDocument: () => ({presence: presenceState.presence}),
    useReportPresence: () => {},
    useSanityInstance: () => ({}),
    useEditDocument: () => () => {},
    useApplyDocumentActions: () => () => Promise.resolve(),
    getDocumentState: () => ({
      getCurrent: () => undefined,
      subscribe: () => () => {},
    }),
    subscribeDocumentEvents: () => () => {},
  }
})

const {PortableTextEditable} = await import('@portabletext/editor')
const {SDKPresencePlugin, useSDKPresenceCursors} =
  await import('./plugin.sdk-presence')
const {SDKValuePlugin} = await import('./plugin.sdk-value')
const {renderDefaultCursor} = await import('./presence-caret')

const nextKey = createTestKeyGenerator()
const keys = {
  block: nextKey(),
  span: nextKey(),
  callout: nextKey(),
  table: nextKey(),
  row: nextKey(),
  cell: nextKey(),
}

const spanPath = [{_key: keys.block}, 'children', {_key: keys.span}]
const at = (offset: number): EditorSelection => ({
  anchor: {path: spanPath, offset},
  focus: {path: spanPath, offset},
})
const initialValue = [
  {
    _type: 'block',
    _key: keys.block,
    markDefs: [],
    children: [{_type: 'span', _key: keys.span, text: 'foo bar', marks: []}],
  },
]

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
    {
      name: 'table',
      fields: [
        {
          name: 'rows',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'row',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  of: [
                    {
                      type: 'object',
                      name: 'cell',
                      fields: [
                        {name: 'content', type: 'array', of: [{type: 'block'}]},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
})

const containers = [
  defineContainer({type: 'callout', arrayField: 'content'}),
  defineContainer({type: 'table', arrayField: 'rows'}),
  defineContainer({type: 'row', arrayField: 'cells'}),
  defineContainer({type: 'cell', arrayField: 'content'}),
]

const cursorlessLayouts = [
  {
    name: 'root',
    wrap: (block: unknown) => [block],
    prefix: [] as NonNullable<EditorSelection>['anchor']['path'],
  },
  {
    name: 'callout container',
    wrap: (block: unknown) => [
      {_type: 'callout', _key: keys.callout, content: [block]},
    ],
    prefix: [{_key: keys.callout}, 'content'],
  },
  {
    name: 'table cell',
    wrap: (block: unknown) => [
      {
        _type: 'table',
        _key: keys.table,
        rows: [
          {
            _type: 'row',
            _key: keys.row,
            cells: [{_type: 'cell', _key: keys.cell, content: [block]}],
          },
        ],
      },
    ],
    prefix: [
      {_key: keys.table},
      'rows',
      {_key: keys.row},
      'cells',
      {_key: keys.cell},
      'content',
    ],
  },
]

function participant(
  offset: number,
  sessionId = 'remote',
  userId = 'u',
  displayName = 'U',
) {
  return {
    sessionId,
    selection: at(offset),
    user: {sanityUserId: userId, profile: {displayName}},
  }
}

function Cursors(props: {tick: number; nullRenderer?: boolean}) {
  useSDKPresenceCursors({
    documentId: 'doc',
    documentType: 'article',
    path: 'content',
    renderCursor: props.nullRenderer ? () => () => <></> : renderDefaultCursor,
  })
  return null
}

function App(props: {
  tick: number
  nullRenderer?: boolean
  editorRef: React.RefObject<Editor | null>
}) {
  return (
    <EditorProvider
      initialConfig={{schemaDefinition: defineSchema({}), initialValue}}
    >
      <EditorRefPlugin ref={props.editorRef} />
      <PortableTextEditable data-testid="editable" />
      <Cursors tick={props.tick} nullRenderer={props.nullRenderer} />
    </EditorProvider>
  )
}

function textNodeAfterCaret(): Text {
  const caret = page.getByTestId('presence-caret-remote').element()
  const walker = document.createTreeWalker(
    page.getByTestId('editable').element(),
    NodeFilter.SHOW_TEXT,
  )
  let node: Node | null
  while ((node = walker.nextNode())) {
    if (
      caret.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING &&
      node.textContent === 'bar'
    ) {
      return node as Text
    }
  }
  throw new Error('no text node after caret')
}

describe('presence re-render', () => {
  test('Scenario: a fresh presence report with the same data keeps the wrapped text node', async () => {
    const editorRef = createRef<Editor>()
    presenceState.presence = [participant(4)]
    const result = await render(<App tick={0} editorRef={editorRef} />)
    await expect
      .element(page.getByTestId('presence-caret-remote'))
      .toBeInTheDocument()

    const before = textNodeAfterCaret()
    const caretBefore = page.getByTestId('presence-caret-remote').element()
    presenceState.presence = [participant(4)]
    await result.rerender(<App tick={1} editorRef={editorRef} />)
    await expect
      .element(page.getByTestId('presence-caret-remote'))
      .toBeInTheDocument()

    expect({
      textConnected: before.isConnected,
      textSame: before === textNodeAfterCaret(),
      caretSame:
        caretBefore === page.getByTestId('presence-caret-remote').element(),
    }).toEqual({textConnected: true, textSame: true, caretSame: true})
  })

  describe.each(cursorlessLayouts)(
    '`renderCursor={null}` at $name',
    (layout) => {
      test('Scenario: it matches no presence and keeps the editor leaf at the remote caret', async () => {
        const editorRef = createRef<Editor>()
        const value = layout.wrap(initialValue[0]) as Array<PortableTextBlock>
        const path = [...layout.prefix, ...spanPath]
        presenceState.presence = [participantAt(path, 4)]
        const errors: Array<unknown> = []
        const onError = (event: ErrorEvent) => errors.push(event.message)
        window.addEventListener('error', onError)

        try {
          await render(
            <CursorlessApp
              value={value}
              editorRef={editorRef}
              testId="with-presence"
            />,
          )
          await expect
            .element(page.getByTestId('with-presence'))
            .toBeInTheDocument()

          presenceState.presence = []
          await render(
            <CursorlessApp
              value={value}
              editorRef={createRef<Editor>()}
              testId="without-presence"
            />,
          )
          await expect
            .element(page.getByTestId('without-presence'))
            .toBeInTheDocument()

          await vi.waitFor(() =>
            expect(
              page.getByTestId('with-presence').element().innerHTML,
            ).toEqual(page.getByTestId('without-presence').element().innerHTML),
          )

          editorRef.current!.send({type: 'focus'})
          editorRef.current!.send({
            type: 'select',
            at: {
              anchor: {path, offset: 4},
              focus: {path, offset: 4},
            },
          })
          await userEvent.keyboard('Z')
          await vi.waitFor(() =>
            expect(
              page.getByTestId('with-presence').element().textContent,
            ).toEqual('foo Zbar'),
          )
        } finally {
          window.removeEventListener('error', onError)
        }
        expect(errors).toEqual([])
      })
    },
  )
})

describe('default presence caret', () => {
  test('Scenario: it draws without a caller component', async () => {
    presenceState.presence = [
      participant(4, 'session-a', 'user-a', 'Ada Lovelace'),
    ]
    await render(<App tick={0} editorRef={createRef<Editor>()} />)

    await expect
      .element(page.getByTestId('presence-caret-session-a'))
      .toBeInTheDocument()
  })

  test('Scenario: it is not editable', async () => {
    presenceState.presence = [
      participant(4, 'session-a', 'user-a', 'Ada Lovelace'),
    ]
    await render(<App tick={0} editorRef={createRef<Editor>()} />)

    await expect
      .element(page.getByTestId('presence-caret-session-a'))
      .toHaveAttribute('contenteditable', 'false')
  })

  test('Scenario: its dot names the participant', async () => {
    presenceState.presence = [
      participant(4, 'session-a', 'user-a', 'Ada Lovelace'),
    ]
    await render(<App tick={0} editorRef={createRef<Editor>()} />)

    await expect
      .element(page.getByTestId('presence-caret-dot-session-a'))
      .toHaveAttribute('title', 'Ada Lovelace')
  })

  test('Scenario: one user in two tabs gets one colour', async () => {
    presenceState.presence = [
      participant(2, 'session-a', 'user-a', 'Ada Lovelace'),
      participant(6, 'session-b', 'user-a', 'Ada Lovelace'),
    ]
    await render(<App tick={0} editorRef={createRef<Editor>()} />)
    await expect
      .element(page.getByTestId('presence-caret-session-b'))
      .toBeInTheDocument()

    expect(caretColor('session-a')).toEqual(caretColor('session-b'))
  })

  test('Scenario: two users get different colours', async () => {
    presenceState.presence = [
      participant(2, 'session-a', 'user-a', 'Ada Lovelace'),
      participant(6, 'session-b', 'user-b', 'Grace Hopper'),
    ]
    await render(<App tick={0} editorRef={createRef<Editor>()} />)
    await expect
      .element(page.getByTestId('presence-caret-session-b'))
      .toBeInTheDocument()

    expect(caretColor('session-a')).not.toEqual(caretColor('session-b'))
  })
})

function caretColor(sessionId: string) {
  return getComputedStyle(
    page.getByTestId(`presence-caret-${sessionId}`).element(),
  ).borderLeftColor
}

function participantAt(
  path: NonNullable<EditorSelection>['anchor']['path'],
  offset: number,
) {
  return {
    sessionId: 'remote',
    selection: {
      anchor: {path, offset},
      focus: {path, offset},
    },
    user: {sanityUserId: 'u', profile: {displayName: 'U'}},
  }
}

function CursorlessApp(props: {
  value: Array<PortableTextBlock>
  editorRef: React.RefObject<Editor | null>
  testId: string
}) {
  return (
    <EditorProvider
      initialConfig={{schemaDefinition, initialValue: props.value}}
    >
      <EditorRefPlugin ref={props.editorRef} />
      <NodePlugin nodes={containers} />
      <PortableTextEditable data-testid={props.testId} />
      <SDKValuePlugin documentId="doc" documentType="article" path="content" />
      <SDKPresencePlugin
        documentId="doc"
        documentType="article"
        path="content"
        renderCursor={null}
      />
    </EditorProvider>
  )
}
