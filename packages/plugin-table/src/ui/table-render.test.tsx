import {defineContainer, defineSchema} from '@portabletext/editor'
import {BehaviorPlugin, NodePlugin} from '@portabletext/editor/plugins'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {tableBehaviors} from '../plugin.table'
import {diagDescribe} from './table-chrome'
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

  test(
    'Scenario: the trash chip hides when the table scrolls out of view',
    {repeats: 4},
    async () => {
      console.log(
        `[DIAG] ===== trash test start t=${performance.now().toFixed(1)} =====`,
      )
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
      const table = document.querySelector('table.pt-plugin-table')!
      const stopTrashDiag = startScrollDiag('trash')
      window.scrollTo(0, 4000)
      await vi.waitFor(() => {
        expect(table.getBoundingClientRect().bottom).toBeLessThan(0)
      })
      await vi.waitFor(() => {
        const chip = document.querySelector('button[aria-label="Delete row"]')
        console.log(
          `[DIAG] trash tick t=${performance.now().toFixed(1)} scrollY=${window.scrollY} tableBottom=${table.getBoundingClientRect().bottom.toFixed(1)} chipVisibility=${chip ? getComputedStyle(chip).visibility : 'none'}`,
        )
        expect(table.getBoundingClientRect().bottom).toBeLessThan(0)
        expect(chip).not.toBeNull()
        expect(getComputedStyle(chip as HTMLElement).visibility).toBe('hidden')
      })

      stopTrashDiag()

      // Scrolling back restores it: the selection never changed.
      window.scrollTo(0, 0)
      await vi.waitFor(() => {
        expect(table.getBoundingClientRect().top).toBeGreaterThanOrEqual(0)
      })
      await vi.waitFor(() => {
        const chip = document.querySelector('button[aria-label="Delete row"]')
        expect(table.getBoundingClientRect().top).toBeGreaterThanOrEqual(0)
        expect(chip).not.toBeNull()
        expect(getComputedStyle(chip as HTMLElement).visibility).toBe('visible')
      })
    },
  )

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

  test(
    'Scenario: the open table menu closes when its trigger scrolls out of view',
    {repeats: 4},
    async () => {
      console.log(
        `[DIAG] ===== menu test start t=${performance.now().toFixed(1)} =====`,
      )
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
      await userEvent.hover(
        locator.element().querySelector('table.pt-plugin-table')!,
      )
      const trigger = document.querySelector(
        'button[aria-label="Table options"]',
      ) as HTMLButtonElement
      console.log(
        `[DIAG] menu test before click t=${performance.now().toFixed(1)} trigger=${diagDescribe(trigger)} triggerRect=${diagTestRect(trigger)} activeElement=${diagDescribe(document.activeElement)}`,
      )
      await userEvent.click(trigger)
      await vi.waitFor(() => {
        expect(document.querySelectorAll('[role="menu"]').length).toBe(1)
      })
      logMenuState('after-open', trigger)

      const stopMenuDiag = startScrollDiag('menu')
      const scrolledAt = performance.now()
      window.scrollTo(0, 4000)
      console.log(
        `[DIAG] menu test scrollTo returned t=${performance.now().toFixed(1)} scrollY=${window.scrollY}`,
      )
      try {
        await vi.waitFor(() => {
          logMenuState('wait-offscreen', trigger, scrolledAt)
          expect(trigger.getBoundingClientRect().bottom).toBeLessThan(0)
        })
        await vi.waitFor(
          () => {
            logMenuState('wait-closed', trigger, scrolledAt)
            expect(trigger.getBoundingClientRect().bottom).toBeLessThan(0)
            expect(document.querySelectorAll('[role="menu"]').length).toBe(0)
          },
          {timeout: 2000, interval: 50},
        )
        logMenuState('PASSED', trigger, scrolledAt)
      } catch (error) {
        logMenuState('FAILED', trigger, scrolledAt)
        throw error
      } finally {
        stopMenuDiag()
      }
    },
  )
})

describe('Feature: Per-Instance Theming Tokens', () => {
  test('Scenario: `tokens` reach the chrome root and the portal layers', async () => {
    const tokenedContainer = defineContainer({
      type: 'table',
      arrayField: 'rows',
      render: (props) => (
        <Table
          {...props}
          tokens={{
            '--pt-plugin-table-bg': 'rgb(1, 2, 3)',
            '--pt-plugin-table-trash-bg': 'rgb(4, 5, 6)',
          }}
        />
      ),
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

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: (
        <>
          <NodePlugin nodes={[tokenedContainer]} />
          <BehaviorPlugin behaviors={tableBehaviors} />
        </>
      ),
    })

    // The in-tree chrome root carries the values; the cells (which paint
    // `--pt-plugin-table-bg`) resolve them by inheritance.
    await vi.waitFor(() => {
      const cell = document.querySelector('table.pt-plugin-table td')
      expect(cell).not.toBeNull()
      expect(getComputedStyle(cell!).backgroundColor).toBe('rgb(1, 2, 3)')
    })

    // Selecting a row summons the trash chip, which portals outside the
    // editor subtree and must carry its own copy of the values.
    const handle = document.querySelector<HTMLButtonElement>(
      '[data-pt-plugin-table-handle="row"][data-pt-plugin-table-handle-index="0"]',
    )
    handle?.focus()
    await userEvent.keyboard(' ')

    await vi.waitFor(() => {
      const trash = document.querySelector<HTMLButtonElement>(
        'button[aria-label="Delete row"]',
      )
      expect(trash).not.toBeNull()
      expect(getComputedStyle(trash!).backgroundColor).toBe('rgb(4, 5, 6)')
    })
  })
})

describe('Feature: Chrome Label Overrides', () => {
  test('Scenario: `labels` overrides merge over the English defaults', async () => {
    const labeledContainer = defineContainer({
      type: 'table',
      arrayField: 'rows',
      render: (props) => (
        <Table
          {...props}
          labels={{
            'table-options': 'Tabellenoptionen',
            'insert-here': 'Hier einf\u00fcgen',
            'row-handle': 'Zeilengriff',
            'menu-delete-table': 'Tabelle l\u00f6schen',
          }}
        />
      ),
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

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <NodePlugin nodes={[labeledContainer]} />,
    })

    await vi.waitFor(() => {
      // Overridden strings reach the DOM.
      expect(
        document.querySelectorAll('button[aria-label="Tabellenoptionen"]')
          .length,
      ).toBe(1)
      expect(
        document.querySelectorAll('button[aria-label="Hier einf\u00fcgen"]')
          .length,
      ).toBeGreaterThan(0)
      expect(
        document.querySelectorAll('button[aria-label="Zeilengriff"]').length,
      ).toBe(2)
      // Keys that were not overridden keep their defaults.
      expect(
        document.querySelectorAll('button[aria-label="Add row at end"]').length,
      ).toBe(1)
      expect(
        document.querySelectorAll('button[aria-label="Column handle"]').length,
      ).toBe(2)
    })

    // The built-in menu's items render the `menu-*` keys once opened.
    const trigger = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Tabellenoptionen"]',
    )
    trigger?.focus()
    await userEvent.keyboard(' ')

    await vi.waitFor(() => {
      const items = Array.from(
        document.querySelectorAll('[role="menuitem"]'),
      ).map((item) => item.textContent)
      expect(items).toEqual([
        'Header row',
        'Select table',
        'Tabelle l\u00f6schen',
      ])
    })
  })
})

describe('Feature: Keyboard Activation of Chrome', () => {
  test('Scenario: `Space` on the extend lane appends a row', async () => {
    await createTestEditor({
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

    await vi.waitFor(() => {
      expect(document.querySelectorAll('table.pt-plugin-table td').length).toBe(
        4,
      )
    })

    const lane = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Add row at end"]',
    )
    expect(lane).not.toBeNull()
    lane?.focus()
    await userEvent.keyboard(' ')

    await vi.waitFor(() => {
      expect(document.querySelectorAll('table.pt-plugin-table td').length).toBe(
        6,
      )
    })
  })

  test('Scenario: `Space` on a row handle selects the row and `Space` on the trash deletes it', async () => {
    await createTestEditor({
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

    await vi.waitFor(() => {
      expect(document.querySelectorAll('table.pt-plugin-table td').length).toBe(
        4,
      )
    })

    const handle = document.querySelector<HTMLButtonElement>(
      '[data-pt-plugin-table-handle="row"][data-pt-plugin-table-handle-index="1"]',
    )
    expect(handle).not.toBeNull()
    handle?.focus()
    await userEvent.keyboard(' ')

    await vi.waitFor(() => {
      const rows = Array.from(
        document.querySelectorAll('table.pt-plugin-table tr'),
      )
      expect(
        rows.map((row) => row.hasAttribute('data-pt-plugin-table-selected')),
      ).toEqual([false, true])
    })

    const trash = await vi.waitFor(() => {
      const trashButton = document.querySelector<HTMLButtonElement>(
        'button[aria-label="Delete row"]',
      )
      expect(trashButton).not.toBeNull()
      return trashButton
    })
    trash?.focus()
    await userEvent.keyboard(' ')

    await vi.waitFor(() => {
      expect(document.querySelectorAll('table.pt-plugin-table td').length).toBe(
        2,
      )
    })
  })

  test('Scenario: `Space` on the trigger opens the table menu', async () => {
    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <NodePlugin nodes={[tableContainer]} />,
    })

    const trigger = await vi.waitFor(() => {
      const triggerButton = document.querySelector<HTMLButtonElement>(
        'button[aria-label="Table options"]',
      )
      expect(triggerButton).not.toBeNull()
      return triggerButton
    })
    trigger?.focus()
    await userEvent.keyboard(' ')

    await vi.waitFor(() => {
      expect(trigger?.getAttribute('aria-expanded')).toBe('true')
      expect(document.querySelectorAll('[role="menuitem"]').length).toBe(3)
    })
  })
})

describe('Feature: Chrome Geometry After Reorder', () => {
  test('Scenario: moving rows of unequal heights re-measures the chrome', async () => {
    const tallCell = (key: string) => ({
      _type: 'cell',
      _key: key,
      value: [
        {
          _type: 'block',
          _key: `b1-${key}`,
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: `s1-${key}`, text: 'one', marks: []},
          ],
        },
        {
          _type: 'block',
          _key: `b2-${key}`,
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: `s2-${key}`, text: 'two', marks: []},
          ],
        },
        {
          _type: 'block',
          _key: `b3-${key}`,
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: `s3-${key}`, text: 'three', marks: []},
          ],
        },
      ],
    })

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: [
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {
              _type: 'row',
              _key: 'r0',
              cells: [tallCell('c00'), tallCell('c01')],
            },
            {
              _type: 'row',
              _key: 'r1',
              cells: [cell('c10', 'C'), cell('c11', 'D')],
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin nodes={[tableContainer]} />
          <BehaviorPlugin behaviors={tableBehaviors} />
        </>
      ),
    })

    const handlesTrackRows = () => {
      const rowElements = Array.from(
        document.querySelectorAll('table.pt-plugin-table tbody tr'),
      )
      for (const [index, rowElement] of rowElements.entries()) {
        const handle = document.querySelector(
          `[data-pt-plugin-table-handle="row"][data-pt-plugin-table-handle-index="${index}"]`,
        )
        expect(handle).not.toBeNull()
        const handleRect = handle!.getBoundingClientRect()
        const rowRect = rowElement.getBoundingClientRect()
        const handleCenter = handleRect.top + handleRect.height / 2
        const rowCenter = rowRect.top + rowRect.height / 2
        // Sub-pixel rounding tolerance.
        expect(Math.abs(handleCenter - rowCenter)).toBeLessThanOrEqual(2)
      }
    }

    await vi.waitFor(handlesTrackRows)

    editor.send({
      type: 'custom.move.row',
      at: [{_key: 't0'}, 'rows', {_key: 'r0'}],
      to: [{_key: 't0'}, 'rows', {_key: 'r1'}],
    })

    // The tall row is now second; the handles must sit on the new centers.
    await vi.waitFor(() => {
      const firstRow = document.querySelector('table.pt-plugin-table tbody tr')
      expect(
        firstRow?.querySelector('[data-pt-plugin-table-cell] p, td')
          ?.textContent ?? firstRow?.textContent,
      ).toContain('C')
    })
    await vi.waitFor(handlesTrackRows)
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

function diagTestRect(element: Element): string {
  const rect = element.getBoundingClientRect()
  return `{top:${rect.top.toFixed(1)},bottom:${rect.bottom.toFixed(1)},left:${rect.left.toFixed(1)},right:${rect.right.toFixed(1)}}`
}

function logMenuState(label: string, trigger: HTMLElement, since?: number) {
  const menus = Array.from(document.querySelectorAll('[role="menu"]'))
  const now = performance.now()
  console.log(
    `[DIAG] menu tick ${label} t=${now.toFixed(1)}${since === undefined ? '' : ` sinceScroll=${(now - since).toFixed(1)}ms`} scrollY=${window.scrollY} scrollingElementTop=${document.scrollingElement?.scrollTop} scrollingElement=${document.scrollingElement?.tagName} triggerRect=${diagTestRect(trigger)} triggerConnected=${trigger.isConnected} triggerIsLive=${trigger === document.querySelector('button[aria-label="Table options"]')} ariaExpanded=${trigger.getAttribute('aria-expanded')} menuCount=${menus.length} menus=${menus
      .map(
        (menu) =>
          `[visibility=${(menu as HTMLElement).style.visibility} left=${(menu as HTMLElement).style.left} top=${(menu as HTMLElement).style.top} parent=${menu.parentElement?.tagName}]`,
      )
      .join(
        ',',
      )} activeElement=${diagDescribe(document.activeElement)} hasFocus=${document.hasFocus()} visibilityState=${document.visibilityState} rafFrames=${diagRafFrames}`,
  )
}

let diagRafFrames = 0

function startScrollDiag(label: string): () => void {
  const onWindowScroll = (event: Event) => {
    console.log(
      `[DIAG] ${label} scroll-event on=window(capture) t=${performance.now().toFixed(1)} target=${diagDescribe(event.target)} scrollY=${window.scrollY}`,
    )
  }
  const onDocumentScroll = (event: Event) => {
    console.log(
      `[DIAG] ${label} scroll-event on=document(capture) t=${performance.now().toFixed(1)} target=${diagDescribe(event.target)} scrollY=${window.scrollY}`,
    )
  }
  window.addEventListener('scroll', onWindowScroll, true)
  document.addEventListener('scroll', onDocumentScroll, true)
  diagRafFrames = 0
  let frame = requestAnimationFrame(function tick() {
    diagRafFrames++
    frame = requestAnimationFrame(tick)
  })
  return () => {
    window.removeEventListener('scroll', onWindowScroll, true)
    document.removeEventListener('scroll', onDocumentScroll, true)
    cancelAnimationFrame(frame)
    console.log(
      `[DIAG] ${label} scroll-diag stopped t=${performance.now().toFixed(1)} rafFrames=${diagRafFrames}`,
    )
  }
}
