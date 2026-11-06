import {
  EditorProvider,
  PortableTextEditable,
  type Editor,
  type RangeDecoration,
} from '@portabletext/editor'
import {EditorRefPlugin} from '@portabletext/editor/plugins'
import {diffMatchPatch} from '@portabletext/patches'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {
  createRef,
  useEffect,
  useMemo,
  type PropsWithChildren,
  type ReactElement,
} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {page} from 'vitest/browser'
import {useRemoteCursors} from './plugin.presence-sync'
import {renderDefaultCursor} from './presence-caret'
import type {RemoteCursor} from './presence-cursors'

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}],
})

const initialValue: PortableTextBlock[] = [
  {
    _type: 'block',
    _key: 'block-1',
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: 'span-1', text: 'Hello world', marks: []}],
  },
]

function caretAt(offset: number): RemoteCursor['selection'] {
  const path = [{_key: 'block-1'}, 'children', {_key: 'span-1'}]
  return {anchor: {path, offset}, focus: {path, offset}}
}

function Harness(props: {
  cursors: readonly RemoteCursor[]
  useDefaultCaret?: boolean
  onDecorations?: (decorations: RangeDecoration[]) => void
}) {
  const cursors = useMemo(() => props.cursors, [props.cursors])
  const rangeDecorations = useRemoteCursors({
    cursors,
    renderCursor: props.useDefaultCaret
      ? (renderDefaultCursor as (
          cursor: RemoteCursor,
        ) => (componentProps: PropsWithChildren) => ReactElement)
      : (cursor) => (componentProps: PropsWithChildren) => (
          <span data-testid={`caret-${cursor.sessionId}`}>
            {componentProps.children}
          </span>
        ),
  })

  useEffect(() => {
    props.onDecorations?.(rangeDecorations)
  }, [props, rangeDecorations])

  return (
    <PortableTextEditable
      data-testid="editable"
      rangeDecorations={rangeDecorations}
    />
  )
}

async function renderEditor(
  cursors: readonly RemoteCursor[],
  options: {
    initialValue?: PortableTextBlock[]
    useDefaultCaret?: boolean
  } = {},
) {
  const editorRef = createRef<Editor>()
  let decorations: RangeDecoration[] = []
  const result = await render(
    <EditorProvider
      initialConfig={{
        schemaDefinition,
        initialValue: options.initialValue ?? initialValue,
        keyGenerator: createTestKeyGenerator(),
      }}
    >
      <EditorRefPlugin ref={editorRef} />
      <Harness
        cursors={cursors}
        useDefaultCaret={options.useDefaultCaret}
        onDecorations={(nextDecorations) => {
          decorations = nextDecorations
        }}
      />
    </EditorProvider>,
  )

  await expect.element(page.getByTestId('editable')).toBeInTheDocument()

  await vi.waitFor(() => {
    expect(editorRef.current).not.toBeNull()
  })

  return {
    ...result,
    editor: editorRef.current!,
    getSelection: () => decorations[0]?.selection,
  }
}

describe('useRemoteCursors in a real editor', () => {
  test('Scenario: a remote participant gets a caret', async () => {
    await renderEditor([{sessionId: 'session-a', selection: caretAt(5)}])

    await expect
      .element(page.getByTestId('caret-session-a'))
      .toBeInTheDocument()
  })

  test('Scenario: a participant with no selection gets no caret', async () => {
    await renderEditor([{sessionId: 'session-a', selection: null}])

    await expect
      .element(page.getByTestId('caret-session-a'))
      .not.toBeInTheDocument()
  })

  test('Scenario: two tabs of one person draw one caret per session', async () => {
    await renderEditor([
      {sessionId: 'session-a', selection: caretAt(2)},
      {sessionId: 'session-b', selection: caretAt(8)},
    ])

    await expect
      .element(page.getByTestId('caret-session-a'))
      .toBeInTheDocument()
    await expect
      .element(page.getByTestId('caret-session-b'))
      .toBeInTheDocument()
  })

  test.each([{origin: 'local' as const}, {origin: 'remote' as const}])(
    'Scenario: a remote caret inside a split tail follows it for a $origin split',
    async ({origin}) => {
      const harness = await renderEditor([
        {sessionId: 'session-a', selection: caretAt(8)},
      ])
      await expect
        .element(page.getByTestId('caret-session-a'))
        .toBeInTheDocument()

      if (origin === 'local') {
        harness.editor.send({type: 'select', at: caretAt(5)})
        harness.editor.send({type: 'insert.break'})
      } else {
        harness.editor.send({
          type: 'patches',
          patches: [
            diffMatchPatch('Hello world', 'Hello', [
              {_key: 'block-1'},
              'children',
              {_key: 'span-1'},
              'text',
            ]),
            {
              type: 'insert',
              path: [{_key: 'block-1'}],
              position: 'after',
              items: [block('block-2', 'span-2', ' world')],
              origin: 'remote',
            },
          ],
          snapshot: undefined,
        })
      }

      await vi.waitFor(() => {
        expect(harness.getSelection()).toEqual(
          caret(
            origin === 'local' ? 'k2' : 'block-2',
            origin === 'local' ? 'span-1' : 'span-2',
            3,
          ),
        )
      })
    },
  )

  test('Scenario: a remote caret exactly at a split follows the local caret to the new block start', async () => {
    const harness = await renderEditor([
      {sessionId: 'session-a', selection: caretAt(5)},
    ])
    await expect
      .element(page.getByTestId('caret-session-a'))
      .toBeInTheDocument()

    harness.editor.send({type: 'select', at: caretAt(5)})
    harness.editor.send({type: 'insert.break'})

    await vi.waitFor(() => {
      expect(harness.getSelection()).toEqual(caret('k2', 'span-1', 0))
    })
  })

  test.each([
    {
      name: 'one-character',
      text: 'Hello x',
      offset: 7,
      splitOffset: 6,
      expected: caret('block-1', 'span-1', 6),
    },
    {
      name: 'ambiguous repeated-text',
      text: 'foo foo foo',
      offset: 9,
      splitOffset: 8,
      expected: caret('k2', 'span-1', 1),
    },
  ])(
    'Scenario: a remote caret in a $name split tail maps through final-value pairing',
    async ({text, offset, splitOffset, expected}) => {
      const value = [block('block-1', 'span-1', text)]
      const harness = await renderEditor(
        [
          {
            sessionId: 'session-a',
            selection: caret('block-1', 'span-1', offset),
          },
        ],
        {initialValue: value},
      )
      await expect
        .element(page.getByTestId('caret-session-a'))
        .toBeInTheDocument()

      harness.editor.send({
        type: 'select',
        at: caret('block-1', 'span-1', splitOffset),
      })
      harness.editor.send({type: 'insert.break'})

      await vi.waitFor(() => {
        expect(harness.getSelection()).toEqual(expected)
      })
    },
  )

  test('Scenario: a remote caret in a merge donor lands at the merged offset', async () => {
    const value = [
      block('block-1', 'span-1', 'foo'),
      block('block-2', 'span-2', 'bar'),
    ]
    const harness = await renderEditor(
      [{sessionId: 'session-a', selection: caret('block-2', 'span-2', 2)}],
      {initialValue: value},
    )
    await expect
      .element(page.getByTestId('caret-session-a'))
      .toBeInTheDocument()

    harness.editor.send({
      type: 'select',
      at: caret('block-2', 'span-2', 0),
    })
    harness.editor.send({type: 'delete', direction: 'backward'})

    await vi.waitFor(() => {
      expect(harness.getSelection()).toEqual(caret('block-1', 'span-1', 5))
    })
  })

  test('Scenario: a remote caret at a mark boundary uses the preceding span end', async () => {
    const value: PortableTextBlock[] = [
      block('block-1', 'span-1', 'foo'),
      {
        ...block('block-2', 'span-2', 'bar'),
        children: [
          {
            _type: 'span',
            _key: 'span-2',
            text: 'bar',
            marks: ['strong'],
          },
        ],
      },
    ]
    const harness = await renderEditor(
      [{sessionId: 'session-a', selection: caret('block-2', 'span-2', 0)}],
      {initialValue: value},
    )
    await expect
      .element(page.getByTestId('caret-session-a'))
      .toBeInTheDocument()

    harness.editor.send({
      type: 'select',
      at: caret('block-2', 'span-2', 0),
    })
    harness.editor.send({type: 'delete', direction: 'backward'})

    await vi.waitFor(() => {
      expect(harness.getSelection()).toEqual(caret('block-1', 'span-1', 3))
    })
  })

  test('Scenario: undoing a split returns a remote caret to its original point', async () => {
    const harness = await renderEditor([
      {sessionId: 'session-a', selection: caretAt(8)},
    ])
    await expect
      .element(page.getByTestId('caret-session-a'))
      .toBeInTheDocument()

    harness.editor.send({type: 'select', at: caretAt(5)})
    harness.editor.send({type: 'insert.break'})
    await vi.waitFor(() => {
      expect(harness.getSelection()).toEqual(caret('k2', 'span-1', 3))
    })

    harness.editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(harness.getSelection()).toEqual(caretAt(8))
    })
  })

  test('Scenario: a remote batch moving the caret block keeps its keyed address', async () => {
    const value = [
      block('block-1', 'span-1', 'foo'),
      block('block-2', 'span-2', 'bar'),
    ]
    const harness = await renderEditor(
      [{sessionId: 'session-a', selection: caret('block-2', 'span-2', 2)}],
      {initialValue: value},
    )
    await expect
      .element(page.getByTestId('caret-session-a'))
      .toBeInTheDocument()

    harness.editor.send({
      type: 'patches',
      patches: [
        {type: 'unset', path: [{_key: 'block-2'}], origin: 'remote'},
        {
          type: 'insert',
          path: [{_key: 'block-1'}],
          position: 'before',
          items: [block('block-2', 'span-2', 'bar')],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(harness.editor.getSnapshot().context.value).toEqual([
        block('block-2', 'span-2', 'bar'),
        block('block-1', 'span-1', 'foo'),
      ])
      expect(harness.getSelection()).toEqual(caret('block-2', 'span-2', 2))
    })
  })
})

function participant(
  sessionId: string,
  userId: string,
  displayName: string,
  offset: number,
): RemoteCursor {
  return {
    sessionId,
    selection: caretAt(offset),
    user: {sanityUserId: userId, profile: {displayName}},
  } as unknown as RemoteCursor
}

function caretColorOf(sessionId: string): string {
  const element = page.getByTestId(`presence-caret-${sessionId}`).element()
  return getComputedStyle(element).borderLeftColor
}

function caret(blockKey: string, spanKey: string, offset: number) {
  const path = [{_key: blockKey}, 'children' as const, {_key: spanKey}]
  return {anchor: {path, offset}, focus: {path, offset}}
}

function block(blockKey: string, spanKey: string, text: string) {
  return {
    _type: 'block' as const,
    _key: blockKey,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span' as const, _key: spanKey, text, marks: []}],
  }
}

describe('the default caret', () => {
  const cursor = participant('session-a', 'user-abc', 'Ada Lovelace', 5)

  test('Scenario: the default caret draws without the app providing a caret component', async () => {
    await renderEditor([cursor], {useDefaultCaret: true})

    await expect
      .element(page.getByTestId('presence-caret-session-a'))
      .toBeInTheDocument()
  })

  test('Scenario: the default caret is not editable, so the local cursor cannot land inside it', async () => {
    await renderEditor([cursor], {useDefaultCaret: true})

    await expect
      .element(page.getByTestId('presence-caret-session-a'))
      .toHaveAttribute('contenteditable', 'false')
  })

  test('Scenario: the default caret names the participant on its dot, for hover', async () => {
    await renderEditor([cursor], {useDefaultCaret: true})

    await expect
      .element(page.getByTestId('presence-caret-dot-session-a'))
      .toHaveAttribute('title', 'Ada Lovelace')
  })
})

describe('the default caret colour', () => {
  test('Scenario: one person in two tabs gets matching caret colours, so they read as the same user', async () => {
    await renderEditor(
      [
        participant('session-a', 'user-abc', 'Ada Lovelace', 2),
        participant('session-b', 'user-abc', 'Ada Lovelace', 8),
      ],
      {useDefaultCaret: true},
    )

    await expect
      .element(page.getByTestId('presence-caret-session-b'))
      .toBeInTheDocument()

    expect(caretColorOf('session-a')).toBe(caretColorOf('session-b'))
  })

  test('Scenario: two people get different caret colours, so they can be told apart', async () => {
    await renderEditor(
      [
        participant('session-a', 'user-abc', 'Ada Lovelace', 2),
        participant('session-b', 'user-xyz', 'Grace Hopper', 8),
      ],
      {useDefaultCaret: true},
    )

    await expect
      .element(page.getByTestId('presence-caret-session-b'))
      .toBeInTheDocument()

    expect(caretColorOf('session-a')).not.toBe(caretColorOf('session-b'))
  })
})
