import {
  defineContainer,
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  type Editor,
  type EditorSelection,
} from '@portabletext/editor'
import {EditorRefPlugin, NodePlugin} from '@portabletext/editor/plugins'
import type {PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {createRef, type PropsWithChildren} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {page, userEvent} from 'vitest/browser'

type Participant = {
  sessionId: string
  selection: EditorSelection
  user: {sanityUserId: string; profile: {displayName: string}}
}

const presenceState = vi.hoisted(() => ({
  presence: [] as Array<unknown>,
}))

vi.mock('@sanity/sdk-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sanity/sdk-react')>()
  return {
    ...actual,
    usePresenceForDocument: () => ({presence: presenceState.presence}),
    useReportPresence: () => {},
  }
})

const {SDKPresencePlugin, useSDKPresenceCursors} =
  await import('./plugin.sdk-presence')

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
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

const nextKey = createTestKeyGenerator()
const keys = {
  block: nextKey(),
  span: nextKey(),
  callout: nextKey(),
  table: nextKey(),
  row: nextKey(),
  cell: nextKey(),
}

const textBlock = {
  _type: 'block',
  _key: keys.block,
  markDefs: [],
  children: [{_type: 'span', _key: keys.span, text: 'foo bar', marks: []}],
}

const layouts = [
  {
    name: 'root',
    value: [textBlock],
    prefix: [] as NonNullable<EditorSelection>['anchor']['path'],
  },
  {
    name: 'callout',
    value: [{_type: 'callout', _key: keys.callout, content: [textBlock]}],
    prefix: [{_key: keys.callout}, 'content'],
  },
  {
    name: 'table cell',
    value: [
      {
        _type: 'table',
        _key: keys.table,
        rows: [
          {
            _type: 'row',
            _key: keys.row,
            cells: [{_type: 'cell', _key: keys.cell, content: [textBlock]}],
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

function Cursors(props: {path: string}) {
  useSDKPresenceCursors({
    documentId: 'doc',
    documentType: 'article',
    path: props.path,
    renderCursor: (cursor) => (cursorProps: PropsWithChildren) => (
      <span data-testid={`caret-${cursor.sessionId}`}>
        {cursorProps.children}
      </span>
    ),
  })
  return null
}

function App(props: {
  value: Array<PortableTextBlock>
  editorRef: React.RefObject<Editor | null>
  tick: number
}) {
  return (
    <EditorProvider
      initialConfig={{schemaDefinition, initialValue: props.value}}
    >
      <EditorRefPlugin ref={props.editorRef} />
      <NodePlugin nodes={containers} />
      <PortableTextEditable data-testid="editable" />
      <Cursors path="content" key="cursors" />
      <span data-tick={props.tick} />
    </EditorProvider>
  )
}

function participant(selection: EditorSelection): Participant {
  return {
    sessionId: 'remote',
    selection,
    user: {sanityUserId: 'u', profile: {displayName: 'U'}},
  }
}

describe.each(layouts)('presence caret $name', (layout) => {
  const spanPath = [
    ...layout.prefix,
    {_key: keys.block},
    'children',
    {_key: keys.span},
  ]
  const at = (offset: number) => ({
    anchor: {path: spanPath, offset},
    focus: {path: spanPath, offset},
  })

  function caretOffset(): number {
    const caret = page.getByTestId('caret-remote').element()
    const spanElement = caret.closest('[data-pt-inline="span"]')!
    const range = document.createRange()
    range.setStart(spanElement, 0)
    range.setEndBefore(caret)
    return range.toString().length
  }

  async function setUp() {
    const editorRef = createRef<Editor>()
    presenceState.presence = [participant(at(4))]
    const result = await render(
      <App
        value={layout.value as Array<PortableTextBlock>}
        editorRef={editorRef}
        tick={0}
      />,
    )
    await expect.element(page.getByTestId('caret-remote')).toBeInTheDocument()
    expect(caretOffset()).toEqual(4)
    return {editorRef, result}
  }

  async function resend(
    result: Awaited<ReturnType<typeof render>>,
    editorRef: React.RefObject<Editor | null>,
    selection: EditorSelection,
    tick: number,
  ) {
    presenceState.presence = [participant(structuredClone(selection))]
    await result.rerender(
      <App
        value={layout.value as Array<PortableTextBlock>}
        editorRef={editorRef}
        tick={tick}
      />,
    )
  }

  test('Scenario: a local edit pushes the caret, a resent report keeps it, and a changed report wins', async () => {
    const {editorRef, result} = await setUp()

    editorRef.current!.send({type: 'focus'})
    editorRef.current!.send({type: 'select', at: at(0)})
    editorRef.current!.send({type: 'insert.text', text: 'XY'})
    await vi.waitFor(() => expect(caretOffset()).toEqual(6))

    await resend(result, editorRef, at(4), 1)
    await vi.waitFor(() => expect(caretOffset()).toEqual(6))

    await resend(result, editorRef, at(1), 2)
    await vi.waitFor(() => expect(caretOffset()).toEqual(1))
  })

  test('Scenario: a changed report with the same focus wins over the locally moved caret', async () => {
    const {editorRef, result} = await setUp()

    editorRef.current!.send({type: 'focus'})
    editorRef.current!.send({type: 'select', at: at(0)})
    editorRef.current!.send({type: 'insert.text', text: 'XY'})
    await vi.waitFor(() => expect(caretOffset()).toEqual(6))

    await resend(
      result,
      editorRef,
      {anchor: at(1).anchor, focus: at(4).focus},
      1,
    )
    await vi.waitFor(() => expect(caretOffset()).toEqual(4))
  })

  test('Scenario: a report that differs only by the backward flag keeps the locally moved caret', async () => {
    const {editorRef, result} = await setUp()

    editorRef.current!.send({type: 'focus'})
    editorRef.current!.send({type: 'select', at: at(0)})
    editorRef.current!.send({type: 'insert.text', text: 'XY'})
    await vi.waitFor(() => expect(caretOffset()).toEqual(6))
    const caret = page.getByTestId('caret-remote').element()

    await resend(result, editorRef, {...at(4), backward: false}, 1)

    await vi.waitFor(() => expect(caretOffset()).toEqual(6))
    expect(page.getByTestId('caret-remote').element()).toBe(caret)
  })

  test('Scenario: a report that differs only by extra fields on its points and keyed segments keeps the locally moved caret', async () => {
    const {editorRef, result} = await setUp()

    editorRef.current!.send({type: 'focus'})
    editorRef.current!.send({type: 'select', at: at(0)})
    editorRef.current!.send({type: 'insert.text', text: 'XY'})
    await vi.waitFor(() => expect(caretOffset()).toEqual(6))
    const caret = page.getByTestId('caret-remote').element()

    const withExtras = (point: {
      path: NonNullable<EditorSelection>['anchor']['path']
      offset: number
    }) => ({
      ...point,
      extra: 'ignored',
      path: point.path.map((segment) =>
        typeof segment === 'object' && '_key' in segment
          ? {...segment, extra: 'ignored'}
          : segment,
      ),
    })
    await resend(
      result,
      editorRef,
      {
        anchor: withExtras(at(4).anchor),
        focus: withExtras(at(4).focus),
        backward: false,
      },
      1,
    )

    await vi.waitFor(() => expect(caretOffset()).toEqual(6))
    expect(page.getByTestId('caret-remote').element()).toBe(caret)
  })

  test('Scenario: a remote edit pushes the caret, a resent report keeps it, and a changed report wins', async () => {
    const {editorRef, result} = await setUp()

    editorRef.current!.send({
      type: 'apply',
      patches: [
        {
          type: 'diffMatchPatch',
          path: [...spanPath, 'text'],
          value: '@@ -1,7 +1,9 @@\n+XY\n foo bar\n',
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() => expect(caretOffset()).toEqual(6))

    await resend(result, editorRef, at(4), 1)
    await vi.waitFor(() => expect(caretOffset()).toEqual(6))

    await resend(result, editorRef, at(1), 2)
    await vi.waitFor(() => expect(caretOffset()).toEqual(1))
  })

  test('Scenario: typing at the caret with the keyboard pushes it', async () => {
    const {editorRef} = await setUp()
    editorRef.current!.send({type: 'focus'})
    editorRef.current!.send({type: 'select', at: at(0)})
    await userEvent.keyboard('Z')
    await vi.waitFor(() => expect(caretOffset()).toEqual(5))
  })

  test('Scenario: a fresh presence report with the same data keeps the caret mounted', async () => {
    const {editorRef, result} = await setUp()
    const caret = page.getByTestId('caret-remote').element()

    await resend(result, editorRef, at(4), 1)

    await vi.waitFor(() =>
      expect(page.getByTestId('caret-remote').element()).toBe(caret),
    )
  })
})

describe('SDKPresencePlugin', () => {
  test('Scenario: mounting the plugin with the default caret draws a remote caret', async () => {
    const layout = layouts[0]!
    const spanPath = [{_key: keys.block}, 'children', {_key: keys.span}]
    presenceState.presence = [
      participant({
        anchor: {path: spanPath, offset: 4},
        focus: {path: spanPath, offset: 4},
      }),
    ]
    await render(
      <EditorProvider
        initialConfig={{
          schemaDefinition,
          initialValue: layout.value as Array<PortableTextBlock>,
        }}
      >
        <PortableTextEditable />
        <SDKPresencePlugin
          documentId="doc"
          documentType="article"
          path="content"
        />
      </EditorProvider>,
    )
    await expect
      .element(page.getByTestId('presence-caret-remote'))
      .toBeInTheDocument()
  })
})
