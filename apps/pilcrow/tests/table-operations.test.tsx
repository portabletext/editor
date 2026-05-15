import {
  EditorProvider,
  type Editor,
  type PortableTextBlock,
} from '@portabletext/editor'
import {EditorRefPlugin} from '@portabletext/editor/plugins'
import {createTestKeyGenerator} from '@portabletext/test'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {PilcrowEditor} from '../src/editor'
import {schemaDefinition} from '../src/schema'

/**
 * Slash-menu and contextual actions for tables: add/remove row,
 * add/remove column. Each emits a custom behavior event the tables
 * plugin handles.
 */

async function mount(initialValue: Array<PortableTextBlock>) {
  const editorRef = React.createRef<Editor>()
  const keyGenerator = createTestKeyGenerator()
  const result = await render(
    <EditorProvider
      initialConfig={{
        keyGenerator,
        schemaDefinition,
        initialValue,
      }}
    >
      <EditorRefPlugin ref={editorRef} />
      <PilcrowEditor />
    </EditorProvider>,
  )
  const locator = result.locator.getByRole('textbox')
  await vi.waitFor(() => expect.element(locator).toBeInTheDocument())
  if (!editorRef.current) {
    throw new Error('editor ref not set')
  }
  return {editor: editorRef.current, locator}
}

function cell(_key: string, blockKey: string, spanKey: string, text: string) {
  return {
    _type: 'cell',
    _key,
    content: [
      {
        _type: 'block',
        _key: blockKey,
        style: 'normal' as const,
        children: [{_type: 'span', _key: spanKey, text, marks: []}],
        markDefs: [],
      },
    ],
  }
}

function tableValue(): Array<PortableTextBlock> {
  return [
    {
      _type: 'table',
      _key: 'T1',
      headerRows: 0,
      rows: [
        {
          _type: 'row',
          _key: 'R1',
          cells: [
            cell('C1A', 'B1A', 'S1A', 'a'),
            cell('C1B', 'B1B', 'S1B', 'b'),
          ],
        },
        {
          _type: 'row',
          _key: 'R2',
          cells: [
            cell('C2A', 'B2A', 'S2A', 'c'),
            cell('C2B', 'B2B', 'S2B', 'd'),
          ],
        },
      ],
    },
  ] as Array<PortableTextBlock>
}

function focusCell(
  editor: Editor,
  cellKey: string,
  blockKey: string,
  spanKey: string,
) {
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {_key: 'T1'},
          'rows',
          {_key: 'R1'},
          'cells',
          {_key: cellKey},
          'content',
          {_key: blockKey},
          'children',
          {_key: spanKey},
        ],
        offset: 0,
      },
      focus: {
        path: [
          {_key: 'T1'},
          'rows',
          {_key: 'R1'},
          'cells',
          {_key: cellKey},
          'content',
          {_key: blockKey},
          'children',
          {_key: spanKey},
        ],
        offset: 0,
      },
    },
  })
}

describe('table row/column operations', () => {
  test('add-row inserts a new row after the focus row', async () => {
    const {editor} = await mount(tableValue())
    focusCell(editor, 'C1A', 'B1A', 'S1A')
    await new Promise((r) => setTimeout(r, 50))
    editor.send({type: 'custom.tables.add-row'} as never)
    await vi.waitFor(() => {
      const table = editor.getSnapshot().context.value[0] as unknown as {
        rows: Array<{_key: string; cells: Array<unknown>}>
      }
      expect(table.rows).toHaveLength(3)
      expect(table.rows[0]._key).toBe('R1')
      expect(table.rows[1]._key).not.toBe('R2') // new row inserted between
      expect(table.rows[2]._key).toBe('R2')
      // New row has same column count as existing rows
      expect(table.rows[1].cells).toHaveLength(2)
    })
  })

  test('remove-row removes the focus row', async () => {
    const {editor} = await mount(tableValue())
    focusCell(editor, 'C1A', 'B1A', 'S1A')
    await new Promise((r) => setTimeout(r, 50))
    editor.send({type: 'custom.tables.remove-row'} as never)
    await vi.waitFor(() => {
      const table = editor.getSnapshot().context.value[0] as unknown as {
        rows: Array<{_key: string}>
      }
      expect(table.rows).toHaveLength(1)
      expect(table.rows[0]._key).toBe('R2')
    })
  })

  test('add-column inserts a new cell at focus column index + 1 in every row', async () => {
    const {editor} = await mount(tableValue())
    focusCell(editor, 'C1A', 'B1A', 'S1A') // column index 0
    await new Promise((r) => setTimeout(r, 50))
    editor.send({type: 'custom.tables.add-column'} as never)
    await vi.waitFor(() => {
      const table = editor.getSnapshot().context.value[0] as unknown as {
        rows: Array<{cells: Array<{_key: string}>}>
      }
      expect(table.rows[0].cells).toHaveLength(3)
      expect(table.rows[1].cells).toHaveLength(3)
      // Original cells stay
      expect(table.rows[0].cells[0]._key).toBe('C1A')
      expect(table.rows[0].cells[2]._key).toBe('C1B')
      expect(table.rows[1].cells[0]._key).toBe('C2A')
      expect(table.rows[1].cells[2]._key).toBe('C2B')
    })
  })

  test('remove-column removes the focus column from every row', async () => {
    const {editor} = await mount(tableValue())
    focusCell(editor, 'C1A', 'B1A', 'S1A') // column index 0
    await new Promise((r) => setTimeout(r, 50))
    editor.send({type: 'custom.tables.remove-column'} as never)
    await vi.waitFor(() => {
      const table = editor.getSnapshot().context.value[0] as unknown as {
        rows: Array<{cells: Array<{_key: string}>}>
      }
      expect(table.rows[0].cells).toHaveLength(1)
      expect(table.rows[1].cells).toHaveLength(1)
      expect(table.rows[0].cells[0]._key).toBe('C1B')
      expect(table.rows[1].cells[0]._key).toBe('C2B')
    })
  })
})
