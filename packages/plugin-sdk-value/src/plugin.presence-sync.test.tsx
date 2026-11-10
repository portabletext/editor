import {EditorProvider, PortableTextEditable} from '@portabletext/editor'
import {useDecorationLayer} from '@portabletext/plugin-decorations'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {type PropsWithChildren} from 'react'
import {describe, expect, test} from 'vitest'
import {render} from 'vitest-browser-react'
import {page} from 'vitest/browser'
import {collapseToCaret} from './presence-cursors'

const initialValue: PortableTextBlock[] = [
  {
    _type: 'block',
    _key: 'block-1',
    markDefs: [],
    children: [{_type: 'span', _key: 'span-1', text: 'foo', marks: []}],
  },
]

type Cursor = {
  sessionId: string
  selection: ReturnType<typeof caretAt> | null
}

function PresenceLayer(props: {cursors: Cursor[]}) {
  useDecorationLayer({
    decorations: props.cursors.flatMap((cursor) => {
      const range = collapseToCaret(cursor.selection)
      return range
        ? [
            {
              id: cursor.sessionId,
              type: 'range' as const,
              range,
              render: ({children}: PropsWithChildren) => (
                <span data-testid={`caret-${cursor.sessionId}`}>
                  {children}
                </span>
              ),
            },
          ]
        : []
    }),
  })
  return null
}

async function renderEditor(cursors: Cursor[]) {
  await render(
    <EditorProvider
      initialConfig={{schemaDefinition: defineSchema({}), initialValue}}
    >
      <PortableTextEditable data-testid="editable" />
      <PresenceLayer cursors={cursors} />
    </EditorProvider>,
  )
  await expect.element(page.getByTestId('editable')).toBeInTheDocument()
}

describe('presence decoration layer', () => {
  test('Scenario: a remote participant gets a caret', async () => {
    await renderEditor([{sessionId: 'a', selection: caretAt(1)}])
    await expect.element(page.getByTestId('caret-a')).toBeInTheDocument()
  })

  test('Scenario: a participant with no selection gets no caret', async () => {
    await renderEditor([{sessionId: 'a', selection: null}])
    await expect.element(page.getByTestId('caret-a')).not.toBeInTheDocument()
  })

  test('Scenario: two sessions draw two carets', async () => {
    await renderEditor([
      {sessionId: 'a', selection: caretAt(1)},
      {sessionId: 'b', selection: caretAt(2)},
    ])
    await expect.element(page.getByTestId('caret-a')).toBeInTheDocument()
    await expect.element(page.getByTestId('caret-b')).toBeInTheDocument()
  })
})

function caretAt(offset: number) {
  const point = {
    path: [{_key: 'block-1'}, 'children', {_key: 'span-1'}],
    offset,
  }
  return {anchor: point, focus: point}
}
