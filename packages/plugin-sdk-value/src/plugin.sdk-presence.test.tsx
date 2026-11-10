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

const {useSDKPresenceCursors} = await import('./plugin.sdk-presence')

describe('presence caret root', () => {
  const value = [
    {
      _type: 'block',
      _key: 'k0',
      markDefs: [],
      children: [{_type: 'span', _key: 'k1', text: 'foo bar', marks: []}],
    },
  ] as Array<PortableTextBlock>
  const spanPath = [{_key: 'k0'}, 'children', {_key: 'k1'}]

  test('Scenario: a local edit pushes the caret, a resent report keeps it, and a changed report wins', async () => {
    const {editorRef, result} = await setUp(value, spanPath)
    await expect.element(page.getByTestId('caret-remote')).toBeInTheDocument()
    expect(caretOffset()).toEqual(4)

    editorRef.current!.send({type: 'focus'})
    editorRef.current!.send({type: 'select', at: at(spanPath, 0)})
    editorRef.current!.send({type: 'insert.text', text: 'XY'})
    await vi.waitFor(() => expect(caretOffset()).toEqual(6))

    await resend(value, result, editorRef, at(spanPath, 4), 1)
    await vi.waitFor(() => expect(caretOffset()).toEqual(6))

    await resend(value, result, editorRef, at(spanPath, 1), 2)
    await vi.waitFor(() => expect(caretOffset()).toEqual(1))
  })

  test('Scenario: a changed report with the same focus wins over the locally moved caret', async () => {
    const {editorRef, result} = await setUp(value, spanPath)
    await expect.element(page.getByTestId('caret-remote')).toBeInTheDocument()
    expect(caretOffset()).toEqual(4)

    editorRef.current!.send({type: 'focus'})
    editorRef.current!.send({type: 'select', at: at(spanPath, 0)})
    editorRef.current!.send({type: 'insert.text', text: 'XY'})
    await vi.waitFor(() => expect(caretOffset()).toEqual(6))

    await resend(
      value,
      result,
      editorRef,
      {anchor: at(spanPath, 1).anchor, focus: at(spanPath, 4).focus},
      1,
    )
    await vi.waitFor(() => expect(caretOffset()).toEqual(4))
  })

  test('Scenario: a report that differs only by the backward flag keeps the locally moved caret', async () => {
    const {editorRef, result} = await setUp(value, spanPath)
    await expect.element(page.getByTestId('caret-remote')).toBeInTheDocument()
    expect(caretOffset()).toEqual(4)

    editorRef.current!.send({type: 'focus'})
    editorRef.current!.send({type: 'select', at: at(spanPath, 0)})
    editorRef.current!.send({type: 'insert.text', text: 'XY'})
    await vi.waitFor(() => expect(caretOffset()).toEqual(6))
    const caret = page.getByTestId('caret-remote').element()

    await resend(
      value,
      result,
      editorRef,
      {...at(spanPath, 4), backward: false},
      1,
    )

    await vi.waitFor(() => expect(caretOffset()).toEqual(6))
    expect(page.getByTestId('caret-remote').element()).toBe(caret)
  })

  test('Scenario: a report that differs only by extra fields on its points and keyed segments keeps the locally moved caret', async () => {
    const {editorRef, result} = await setUp(value, spanPath)
    await expect.element(page.getByTestId('caret-remote')).toBeInTheDocument()
    expect(caretOffset()).toEqual(4)

    editorRef.current!.send({type: 'focus'})
    editorRef.current!.send({type: 'select', at: at(spanPath, 0)})
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
      value,
      result,
      editorRef,
      {
        anchor: withExtras(at(spanPath, 4).anchor),
        focus: withExtras(at(spanPath, 4).focus),
        backward: false,
      },
      1,
    )

    await vi.waitFor(() => expect(caretOffset()).toEqual(6))
    expect(page.getByTestId('caret-remote').element()).toBe(caret)
  })

  test('Scenario: a remote edit pushes the caret, a resent report keeps it, and a changed report wins', async () => {
    const {editorRef, result} = await setUp(value, spanPath)
    await expect.element(page.getByTestId('caret-remote')).toBeInTheDocument()
    expect(caretOffset()).toEqual(4)

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

    await resend(value, result, editorRef, at(spanPath, 4), 1)
    await vi.waitFor(() => expect(caretOffset()).toEqual(6))

    await resend(value, result, editorRef, at(spanPath, 1), 2)
    await vi.waitFor(() => expect(caretOffset()).toEqual(1))
  })

  test('Scenario: typing before the caret with the keyboard pushes it', async () => {
    const {editorRef} = await setUp(value, spanPath)
    await expect.element(page.getByTestId('caret-remote')).toBeInTheDocument()
    expect(caretOffset()).toEqual(4)
    editorRef.current!.send({type: 'focus'})
    editorRef.current!.send({type: 'select', at: at(spanPath, 0)})
    await userEvent.keyboard('Z')
    await vi.waitFor(() => expect(caretOffset()).toEqual(5))
  })

  test('Scenario: a fresh presence report with the same data keeps the caret mounted', async () => {
    const {editorRef, result} = await setUp(value, spanPath)
    await expect.element(page.getByTestId('caret-remote')).toBeInTheDocument()
    expect(caretOffset()).toEqual(4)
    const caret = page.getByTestId('caret-remote').element()

    await resend(value, result, editorRef, at(spanPath, 4), 1)

    await vi.waitFor(() =>
      expect(page.getByTestId('caret-remote').element()).toBe(caret),
    )
  })
})

describe('presence caret callout', () => {
  const value = [
    {
      _type: 'callout',
      _key: 'k2',
      content: [
        {
          _type: 'block',
          _key: 'k0',
          markDefs: [],
          children: [{_type: 'span', _key: 'k1', text: 'foo bar', marks: []}],
        },
      ],
    },
  ] as Array<PortableTextBlock>
  const spanPath = [
    {_key: 'k2'},
    'content',
    {_key: 'k0'},
    'children',
    {_key: 'k1'},
  ]

  test('Scenario: a local edit pushes the caret, a resent report keeps it, and a changed report wins', async () => {
    const {editorRef, result} = await setUp(value, spanPath)
    await expect.element(page.getByTestId('caret-remote')).toBeInTheDocument()
    expect(caretOffset()).toEqual(4)

    editorRef.current!.send({type: 'focus'})
    editorRef.current!.send({type: 'select', at: at(spanPath, 0)})
    editorRef.current!.send({type: 'insert.text', text: 'XY'})
    await vi.waitFor(() => expect(caretOffset()).toEqual(6))

    await resend(value, result, editorRef, at(spanPath, 4), 1)
    await vi.waitFor(() => expect(caretOffset()).toEqual(6))

    await resend(value, result, editorRef, at(spanPath, 1), 2)
    await vi.waitFor(() => expect(caretOffset()).toEqual(1))
  })

  test('Scenario: a changed report with the same focus wins over the locally moved caret', async () => {
    const {editorRef, result} = await setUp(value, spanPath)
    await expect.element(page.getByTestId('caret-remote')).toBeInTheDocument()
    expect(caretOffset()).toEqual(4)

    editorRef.current!.send({type: 'focus'})
    editorRef.current!.send({type: 'select', at: at(spanPath, 0)})
    editorRef.current!.send({type: 'insert.text', text: 'XY'})
    await vi.waitFor(() => expect(caretOffset()).toEqual(6))

    await resend(
      value,
      result,
      editorRef,
      {anchor: at(spanPath, 1).anchor, focus: at(spanPath, 4).focus},
      1,
    )
    await vi.waitFor(() => expect(caretOffset()).toEqual(4))
  })

  test('Scenario: a report that differs only by the backward flag keeps the locally moved caret', async () => {
    const {editorRef, result} = await setUp(value, spanPath)
    await expect.element(page.getByTestId('caret-remote')).toBeInTheDocument()
    expect(caretOffset()).toEqual(4)

    editorRef.current!.send({type: 'focus'})
    editorRef.current!.send({type: 'select', at: at(spanPath, 0)})
    editorRef.current!.send({type: 'insert.text', text: 'XY'})
    await vi.waitFor(() => expect(caretOffset()).toEqual(6))
    const caret = page.getByTestId('caret-remote').element()

    await resend(
      value,
      result,
      editorRef,
      {...at(spanPath, 4), backward: false},
      1,
    )

    await vi.waitFor(() => expect(caretOffset()).toEqual(6))
    expect(page.getByTestId('caret-remote').element()).toBe(caret)
  })

  test('Scenario: a report that differs only by extra fields on its points and keyed segments keeps the locally moved caret', async () => {
    const {editorRef, result} = await setUp(value, spanPath)
    await expect.element(page.getByTestId('caret-remote')).toBeInTheDocument()
    expect(caretOffset()).toEqual(4)

    editorRef.current!.send({type: 'focus'})
    editorRef.current!.send({type: 'select', at: at(spanPath, 0)})
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
      value,
      result,
      editorRef,
      {
        anchor: withExtras(at(spanPath, 4).anchor),
        focus: withExtras(at(spanPath, 4).focus),
        backward: false,
      },
      1,
    )

    await vi.waitFor(() => expect(caretOffset()).toEqual(6))
    expect(page.getByTestId('caret-remote').element()).toBe(caret)
  })

  test('Scenario: a remote edit pushes the caret, a resent report keeps it, and a changed report wins', async () => {
    const {editorRef, result} = await setUp(value, spanPath)
    await expect.element(page.getByTestId('caret-remote')).toBeInTheDocument()
    expect(caretOffset()).toEqual(4)

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

    await resend(value, result, editorRef, at(spanPath, 4), 1)
    await vi.waitFor(() => expect(caretOffset()).toEqual(6))

    await resend(value, result, editorRef, at(spanPath, 1), 2)
    await vi.waitFor(() => expect(caretOffset()).toEqual(1))
  })

  test('Scenario: typing before the caret with the keyboard pushes it', async () => {
    const {editorRef} = await setUp(value, spanPath)
    await expect.element(page.getByTestId('caret-remote')).toBeInTheDocument()
    expect(caretOffset()).toEqual(4)
    editorRef.current!.send({type: 'focus'})
    editorRef.current!.send({type: 'select', at: at(spanPath, 0)})
    await userEvent.keyboard('Z')
    await vi.waitFor(() => expect(caretOffset()).toEqual(5))
  })

  test('Scenario: a fresh presence report with the same data keeps the caret mounted', async () => {
    const {editorRef, result} = await setUp(value, spanPath)
    await expect.element(page.getByTestId('caret-remote')).toBeInTheDocument()
    expect(caretOffset()).toEqual(4)
    const caret = page.getByTestId('caret-remote').element()

    await resend(value, result, editorRef, at(spanPath, 4), 1)

    await vi.waitFor(() =>
      expect(page.getByTestId('caret-remote').element()).toBe(caret),
    )
  })
})

describe('presence caret table cell', () => {
  const value = [
    {
      _type: 'table',
      _key: 'k3',
      rows: [
        {
          _type: 'row',
          _key: 'k4',
          cells: [
            {
              _type: 'cell',
              _key: 'k5',
              content: [
                {
                  _type: 'block',
                  _key: 'k0',
                  markDefs: [],
                  children: [
                    {_type: 'span', _key: 'k1', text: 'foo bar', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ] as Array<PortableTextBlock>
  const spanPath = [
    {_key: 'k3'},
    'rows',
    {_key: 'k4'},
    'cells',
    {_key: 'k5'},
    'content',
    {_key: 'k0'},
    'children',
    {_key: 'k1'},
  ]

  test('Scenario: a local edit pushes the caret, a resent report keeps it, and a changed report wins', async () => {
    const {editorRef, result} = await setUp(value, spanPath)
    await expect.element(page.getByTestId('caret-remote')).toBeInTheDocument()
    expect(caretOffset()).toEqual(4)

    editorRef.current!.send({type: 'focus'})
    editorRef.current!.send({type: 'select', at: at(spanPath, 0)})
    editorRef.current!.send({type: 'insert.text', text: 'XY'})
    await vi.waitFor(() => expect(caretOffset()).toEqual(6))

    await resend(value, result, editorRef, at(spanPath, 4), 1)
    await vi.waitFor(() => expect(caretOffset()).toEqual(6))

    await resend(value, result, editorRef, at(spanPath, 1), 2)
    await vi.waitFor(() => expect(caretOffset()).toEqual(1))
  })

  test('Scenario: a changed report with the same focus wins over the locally moved caret', async () => {
    const {editorRef, result} = await setUp(value, spanPath)
    await expect.element(page.getByTestId('caret-remote')).toBeInTheDocument()
    expect(caretOffset()).toEqual(4)

    editorRef.current!.send({type: 'focus'})
    editorRef.current!.send({type: 'select', at: at(spanPath, 0)})
    editorRef.current!.send({type: 'insert.text', text: 'XY'})
    await vi.waitFor(() => expect(caretOffset()).toEqual(6))

    await resend(
      value,
      result,
      editorRef,
      {anchor: at(spanPath, 1).anchor, focus: at(spanPath, 4).focus},
      1,
    )
    await vi.waitFor(() => expect(caretOffset()).toEqual(4))
  })

  test('Scenario: a report that differs only by the backward flag keeps the locally moved caret', async () => {
    const {editorRef, result} = await setUp(value, spanPath)
    await expect.element(page.getByTestId('caret-remote')).toBeInTheDocument()
    expect(caretOffset()).toEqual(4)

    editorRef.current!.send({type: 'focus'})
    editorRef.current!.send({type: 'select', at: at(spanPath, 0)})
    editorRef.current!.send({type: 'insert.text', text: 'XY'})
    await vi.waitFor(() => expect(caretOffset()).toEqual(6))
    const caret = page.getByTestId('caret-remote').element()

    await resend(
      value,
      result,
      editorRef,
      {...at(spanPath, 4), backward: false},
      1,
    )

    await vi.waitFor(() => expect(caretOffset()).toEqual(6))
    expect(page.getByTestId('caret-remote').element()).toBe(caret)
  })

  test('Scenario: a report that differs only by extra fields on its points and keyed segments keeps the locally moved caret', async () => {
    const {editorRef, result} = await setUp(value, spanPath)
    await expect.element(page.getByTestId('caret-remote')).toBeInTheDocument()
    expect(caretOffset()).toEqual(4)

    editorRef.current!.send({type: 'focus'})
    editorRef.current!.send({type: 'select', at: at(spanPath, 0)})
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
      value,
      result,
      editorRef,
      {
        anchor: withExtras(at(spanPath, 4).anchor),
        focus: withExtras(at(spanPath, 4).focus),
        backward: false,
      },
      1,
    )

    await vi.waitFor(() => expect(caretOffset()).toEqual(6))
    expect(page.getByTestId('caret-remote').element()).toBe(caret)
  })

  test('Scenario: a remote edit pushes the caret, a resent report keeps it, and a changed report wins', async () => {
    const {editorRef, result} = await setUp(value, spanPath)
    await expect.element(page.getByTestId('caret-remote')).toBeInTheDocument()
    expect(caretOffset()).toEqual(4)

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

    await resend(value, result, editorRef, at(spanPath, 4), 1)
    await vi.waitFor(() => expect(caretOffset()).toEqual(6))

    await resend(value, result, editorRef, at(spanPath, 1), 2)
    await vi.waitFor(() => expect(caretOffset()).toEqual(1))
  })

  test('Scenario: typing before the caret with the keyboard pushes it', async () => {
    const {editorRef} = await setUp(value, spanPath)
    await expect.element(page.getByTestId('caret-remote')).toBeInTheDocument()
    expect(caretOffset()).toEqual(4)
    editorRef.current!.send({type: 'focus'})
    editorRef.current!.send({type: 'select', at: at(spanPath, 0)})
    await userEvent.keyboard('Z')
    await vi.waitFor(() => expect(caretOffset()).toEqual(5))
  })

  test('Scenario: a fresh presence report with the same data keeps the caret mounted', async () => {
    const {editorRef, result} = await setUp(value, spanPath)
    await expect.element(page.getByTestId('caret-remote')).toBeInTheDocument()
    expect(caretOffset()).toEqual(4)
    const caret = page.getByTestId('caret-remote').element()

    await resend(value, result, editorRef, at(spanPath, 4), 1)

    await vi.waitFor(() =>
      expect(page.getByTestId('caret-remote').element()).toBe(caret),
    )
  })
})

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

function Cursors(props: {path: string}) {
  const decorations = useSDKPresenceCursors({
    documentId: 'doc',
    documentType: 'article',
    path: props.path,
    renderCursor: (cursor) => (cursorProps: PropsWithChildren) => (
      <span data-testid={`caret-${cursor.sessionId}`}>
        {cursorProps.children}
      </span>
    ),
  })
  return (
    <PortableTextEditable
      data-testid="editable"
      rangeDecorations={decorations}
    />
  )
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

function at(
  path: NonNullable<EditorSelection>['anchor']['path'],
  offset: number,
) {
  return {
    anchor: {path, offset},
    focus: {path, offset},
  }
}

function caretOffset(): number {
  const caret = page.getByTestId('caret-remote').element()
  const spanElement = caret.closest('[data-pt-inline="span"]')!
  const range = document.createRange()
  range.setStart(spanElement, 0)
  range.setEndBefore(caret)
  return range.toString().length
}

async function setUp(
  value: Array<PortableTextBlock>,
  spanPath: NonNullable<EditorSelection>['anchor']['path'],
) {
  const editorRef = createRef<Editor>()
  presenceState.presence = [participant(at(spanPath, 4))]
  const result = await render(
    <App value={value} editorRef={editorRef} tick={0} />,
  )
  return {editorRef, result}
}

async function resend(
  value: Array<PortableTextBlock>,
  result: Awaited<ReturnType<typeof render>>,
  editorRef: React.RefObject<Editor | null>,
  selection: EditorSelection,
  tick: number,
) {
  presenceState.presence = [participant(structuredClone(selection))]
  await result.rerender(<App value={value} editorRef={editorRef} tick={tick} />)
}
