import {defineContainer, defineSchema} from '@portabletext/editor'
import {BehaviorPlugin, NodePlugin} from '@portabletext/editor/plugins'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {tableBehaviors} from '../plugin.table'
import {TableCell, Table, TableRow} from './table-render'

const schemaDefinition = defineSchema({
  blockObjects: [
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
                        {name: 'value', type: 'array', of: [{type: 'block'}]},
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

const tableContainer = defineContainer({
  type: 'table',
  arrayField: 'rows',
  render: (props) => <Table {...props} />,
  of: [
    defineContainer({
      type: 'row',
      arrayField: 'cells',
      render: (props) => <TableRow {...props} />,
      of: [
        defineContainer({
          type: 'cell',
          arrayField: 'value',
          render: (props) => <TableCell {...props} />,
        }),
      ],
    }),
  ],
})

function cell(key: string, text: string) {
  return {
    _type: 'cell',
    _key: key,
    value: [
      {
        _type: 'block',
        _key: `b-${key}`,
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: `s-${key}`, text, marks: []}],
      },
    ],
  }
}

const initialValue = [
  {
    _type: 'table',
    _key: 't0',
    rows: [
      {_type: 'row', _key: 'r0', cells: [cell('c00', 'A'), cell('c01', 'B')]},
      {_type: 'row', _key: 'r1', cells: [cell('c10', 'C'), cell('c11', 'D')]},
    ],
  },
]

describe('Feature: Scroll Clipping of Portaled Chrome', () => {
  const paragraph = (index: number) => ({
    _type: 'block',
    _key: `p${index}`,
    style: 'normal',
    markDefs: [],
    children: [
      {
        _type: 'span',
        _key: `ps${index}`,
        text: `paragraph ${index}`,
        marks: [],
      },
    ],
  })

  test('Scenario: the trash chip hides when the table scrolls out of view', async () => {
    // Enough content below the table that the window can scroll it out.
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: [
        ...initialValue,
        ...Array.from({length: 60}, (_, index) => paragraph(index)),
      ],
      children: <NodePlugin nodes={[tableContainer]} />,
    })
    editor.send({type: 'focus'})

    // A whole-row rectangle summons the row trash chip.
    const point = (
      cellKey: string,
      blockKey: string,
      spanKey: string,
      offset: number,
    ) => ({
      path: [
        {_key: 't0'},
        'rows',
        {_key: 'r0'},
        'cells',
        {_key: cellKey},
        'value',
        {_key: blockKey},
        'children',
        {_key: spanKey},
      ],
      offset,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: point('c00', 'b-c00', 's-c00', 0),
        focus: point('c01', 'b-c01', 's-c01', 1),
      },
    })
    await vi.waitFor(() => {
      expect(
        document.querySelectorAll('button[aria-label="Delete row"]').length,
      ).toBe(1)
    })

    // Scroll the table far above the viewport: the chip must not float.
    // It stays mounted (the anchoring keeps watching for its return) but
    // invisible and inert.
    window.scrollTo(0, 4000)
    await vi.waitFor(() => {
      const chip = document.querySelector('button[aria-label="Delete row"]')
      expect(chip).not.toBeNull()
      expect(getComputedStyle(chip as HTMLElement).visibility).toBe('hidden')
    })

    // Scrolling back restores it: the selection never changed.
    window.scrollTo(0, 0)
    await vi.waitFor(() => {
      const chip = document.querySelector('button[aria-label="Delete row"]')
      expect(chip).not.toBeNull()
      expect(getComputedStyle(chip as HTMLElement).visibility).toBe('visible')
    })
  })

  test('Scenario: the trash chip follows its column when a structural edit shifts the bands', async () => {
    // The real stylesheet fixes the table's width (`width: 100%`,
    // `table-layout: fixed`), so adding a column compresses the bands
    // inside an unchanged table box: nothing scrolls or resizes, only the
    // measured geometry moves.
    const style = document.createElement('style')
    style.textContent =
      'table.pt-plugin-table {width: 400px; table-layout: fixed}'
    document.head.appendChild(style)
    try {
      const {editor} = await createTestEditor({
        keyGenerator: createTestKeyGenerator(),
        schemaDefinition,
        initialValue,
        children: (
          <>
            <NodePlugin nodes={[tableContainer]} />
            <BehaviorPlugin behaviors={tableBehaviors} />
          </>
        ),
      })
      editor.send({type: 'focus'})

      // A whole-column rectangle on the first column summons its chip.
      const point = (cellKey: string, offset: number) => ({
        path: [
          {_key: 't0'},
          'rows',
          {_key: cellKey === 'c00' ? 'r0' : 'r1'},
          'cells',
          {_key: cellKey},
          'value',
          {_key: `b-${cellKey}`},
          'children',
          {_key: `s-${cellKey}`},
        ],
        offset,
      })
      editor.send({
        type: 'select',
        at: {anchor: point('c00', 0), focus: point('c10', 1)},
      })
      const chipCenter = () => {
        const chip = document.querySelector(
          'button[aria-label="Delete column"]',
        )
        if (!chip) {
          return null
        }
        const rect = chip.getBoundingClientRect()
        return rect.left + rect.width / 2
      }
      const columnCenter = () => {
        const cell = document.querySelector('table.pt-plugin-table td')
        if (!cell) {
          return null
        }
        const rect = cell.getBoundingClientRect()
        return rect.left + rect.width / 2
      }
      await vi.waitFor(() => {
        expect(chipCenter()).not.toBeNull()
        expect(
          Math.abs((chipCenter() ?? 0) - (columnCenter() ?? 0)),
        ).toBeLessThan(2)
      })

      // Inserting a column after the selection keeps the selected index
      // but compresses every band; the chip must follow its column.
      editor.send({
        type: 'custom.insert.column',
        at: [
          {_key: 't0'},
          'rows',
          {_key: 'r0'},
          'cells',
          {_key: 'c00'},
          'value',
          {_key: 'b-c00'},
        ],
        position: 'after',
      })
      await vi.waitFor(() => {
        expect(
          document.querySelectorAll('table.pt-plugin-table td').length,
        ).toBe(6)
        expect(
          Math.abs((chipCenter() ?? 0) - (columnCenter() ?? 0)),
        ).toBeLessThan(2)
      })
    } finally {
      style.remove()
    }
  })

  test('Scenario: the open table menu closes when its trigger scrolls out of view', async () => {
    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: [
        ...initialValue,
        ...Array.from({length: 60}, (_, index) => paragraph(index)),
      ],
      children: <NodePlugin nodes={[tableContainer]} />,
    })
    editor.send({type: 'focus'})
    window.scrollTo(0, 0)

    // Reveal the trigger by hovering the table, then open the menu.
    const {userEvent} = await import('vitest/browser')
    await userEvent.hover(
      locator.element().querySelector('table.pt-plugin-table')!,
    )
    const trigger = document.querySelector(
      'button[aria-label="Table options"]',
    ) as HTMLButtonElement
    trigger.dispatchEvent(
      new PointerEvent('pointerdown', {bubbles: true, cancelable: true}),
    )
    await vi.waitFor(() => {
      expect(document.querySelectorAll('[role="menu"]').length).toBe(1)
    })

    window.scrollTo(0, 4000)
    await vi.waitFor(() => {
      expect(document.querySelectorAll('[role="menu"]').length).toBe(0)
    })
  })
})

describe('Feature: Header Cell State Attribute', () => {
  test('Scenario: header row cells carry `data-pt-plugin-table-header`', async () => {
    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: [
        {
          _type: 'table',
          _key: 't0',
          headerRows: 1,
          rows: [
            {
              _type: 'row',
              _key: 'r0',
              cells: [cell('c00', 'A'), cell('c01', 'B')],
            },
            {
              _type: 'row',
              _key: 'r1',
              cells: [cell('c10', 'C'), cell('c11', 'D')],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={[tableContainer]} />,
    })

    await vi.waitFor(() => {
      const cells = Array.from(
        document.querySelectorAll('table.pt-plugin-table td'),
      )
      expect(
        cells.map((cellElement) =>
          cellElement.hasAttribute('data-pt-plugin-table-header'),
        ),
      ).toEqual([true, true, false, false])
    })
  })

  test('Scenario: a table without header rows marks no cells', async () => {
    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <NodePlugin nodes={[tableContainer]} />,
    })

    await vi.waitFor(() => {
      const cells = Array.from(
        document.querySelectorAll('table.pt-plugin-table td'),
      )
      expect(
        cells.map((cellElement) =>
          cellElement.hasAttribute('data-pt-plugin-table-header'),
        ),
      ).toEqual([false, false, false, false])
    })
  })
})

describe('Feature: Read-Only Table Chrome', () => {
  test('Scenario: A read-only editor renders the table without mutation affordances', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <NodePlugin nodes={[tableContainer]} />,
    })

    // Editable editors carry the full chrome: the menu trigger plus the
    // handles, lanes, and insert affordances.
    await vi.waitFor(() => {
      expect(
        document.querySelectorAll('button[aria-label="Table options"]').length,
      ).toBe(1)
      expect(
        document.querySelectorAll('button[aria-label="Insert here"]').length,
      ).toBe(2)
    })

    editor.send({type: 'update readOnly', readOnly: true})

    // The mutation affordances go; the table content stays selectable.
    await vi.waitFor(() => {
      expect(
        document.querySelectorAll('button[aria-label="Table options"]').length,
      ).toBe(0)
      expect(
        document.querySelectorAll('.pt-plugin-table-chrome button').length,
      ).toBe(0)
      expect(document.querySelectorAll('table.pt-plugin-table td').length).toBe(
        4,
      )
    })

    editor.send({type: 'update readOnly', readOnly: false})

    // Editability restores the chrome.
    await vi.waitFor(() => {
      expect(
        document.querySelectorAll('button[aria-label="Table options"]').length,
      ).toBe(1)
    })
  })
})
