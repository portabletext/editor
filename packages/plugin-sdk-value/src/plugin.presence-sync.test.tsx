import {EditorProvider, PortableTextEditable} from '@portabletext/editor'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {useMemo, type PropsWithChildren, type ReactElement} from 'react'
import {describe, expect, test} from 'vitest'
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

  return (
    <PortableTextEditable
      data-testid="editable"
      rangeDecorations={rangeDecorations}
    />
  )
}

async function renderEditor(
  cursors: readonly RemoteCursor[],
  options: {useDefaultCaret?: boolean} = {},
) {
  const result = await render(
    <EditorProvider initialConfig={{schemaDefinition, initialValue}}>
      <Harness cursors={cursors} useDefaultCaret={options.useDefaultCaret} />
    </EditorProvider>,
  )

  await expect.element(page.getByTestId('editable')).toBeInTheDocument()

  return result
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
