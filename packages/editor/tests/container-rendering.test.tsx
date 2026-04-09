import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {RendererPlugin} from '../src/plugins/plugin.renderer'
import {createTestEditor} from '../src/test/vitest'

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
              type: 'row',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  of: [
                    {
                      type: 'cell',
                      fields: [
                        {
                          name: 'content',
                          type: 'array',
                          of: [{type: 'block'}],
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
    },
  ],
})

function CalloutRenderer({
  attributes,
  children,
}: {
  attributes: Record<string, unknown>
  children: React.ReactNode
}) {
  return (
    <aside {...attributes} data-testid="callout">
      {children}
    </aside>
  )
}

function TableRenderer({
  attributes,
  children,
}: {
  attributes: Record<string, unknown>
  children: React.ReactNode
}) {
  return (
    <table {...attributes}>
      <tbody>{children}</tbody>
    </table>
  )
}

function RowRenderer({
  attributes,
  children,
}: {
  attributes: Record<string, unknown>
  children: React.ReactNode
}) {
  return <tr {...attributes}>{children}</tr>
}

function CellRenderer({
  attributes,
  children,
}: {
  attributes: Record<string, unknown>
  children: React.ReactNode
}) {
  return <td {...attributes}>{children}</td>
}

describe('container rendering', () => {
  test('callout with text block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const calloutKey = keyGenerator()
    const contentBlockKey = keyGenerator()
    const contentSpanKey = keyGenerator()

    const {locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: contentBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: contentSpanKey,
                  text: 'inside callout',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <RendererPlugin
          renderers={[{renderer: {type: 'callout', render: CalloutRenderer}}]}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(locator.element().innerHTML).toBe(
        [
          // Root text block with full rendering pipeline
          '<div data-slate-node="element" data-pt-path="[_key==&quot;k0&quot;]" class="pt-block pt-text-block pt-text-block-style-normal" data-block-key="k0" data-block-name="block" data-block-type="text" data-style="normal">',
          '<div>',
          '<span data-slate-node="text" data-pt-path="[_key==&quot;k0&quot;].children[_key==&quot;k1&quot;]" data-child-key="k1" data-child-name="span" data-child-type="span">',
          '<span data-slate-leaf="true">',
          '<span data-slate-string="true">hello</span>',
          '</span>',
          '</span>',
          '</div>',
          '</div>',
          // Callout container with custom renderer
          '<aside data-slate-node="element" data-pt-path="[_key==&quot;k2&quot;]" data-testid="callout">',
          // Text block inside container: minimal, no class names or data-block-* attributes
          '<div data-slate-node="element" data-pt-path="[_key==&quot;k2&quot;].content[_key==&quot;k3&quot;]">',
          '<span data-slate-node="text" data-pt-path="[_key==&quot;k2&quot;].content[_key==&quot;k3&quot;].children[_key==&quot;k4&quot;]" data-child-key="k4" data-child-name="span" data-child-type="span">',
          '<span data-slate-leaf="true">',
          '<span data-slate-string="true">inside callout</span>',
          '</span>',
          '</span>',
          '</div>',
          '</aside>',
        ].join(''),
      )
    })
  })

  test('table with row and cell renderers', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const cellBlockKey = keyGenerator()
    const cellSpanKey = keyGenerator()

    const {locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: cellBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: cellSpanKey,
                          text: 'cell text',
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
          ],
        },
      ],
      children: (
        <RendererPlugin
          renderers={[
            {renderer: {type: 'table', render: TableRenderer}},
            {renderer: {type: 'table.row', render: RowRenderer}},
            {renderer: {type: 'table.row.cell', render: CellRenderer}},
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(locator.element().innerHTML).toBe(
        [
          '<table data-slate-node="element" data-pt-path="[_key==&quot;k0&quot;]">',
          '<tbody>',
          '<tr data-slate-node="element" data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;k1&quot;]">',
          '<td data-slate-node="element" data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;k1&quot;].cells[_key==&quot;k2&quot;]">',
          '<div data-slate-node="element" data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;k1&quot;].cells[_key==&quot;k2&quot;].content[_key==&quot;k3&quot;]">',
          '<span data-slate-node="text" data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;k1&quot;].cells[_key==&quot;k2&quot;].content[_key==&quot;k3&quot;].children[_key==&quot;k4&quot;]" data-child-key="k4" data-child-name="span" data-child-type="span">',
          '<span data-slate-leaf="true">',
          '<span data-slate-string="true">cell text</span>',
          '</span>',
          '</span>',
          '</div>',
          '</td>',
          '</tr>',
          '</tbody>',
          '</table>',
        ].join(''),
      )
    })
  })

  test('table without row and cell renderers defaults to divs', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const cellBlockKey = keyGenerator()
    const cellSpanKey = keyGenerator()

    const {locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: cellBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: cellSpanKey,
                          text: 'cell text',
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
          ],
        },
      ],
      children: (
        <RendererPlugin
          renderers={[{renderer: {type: 'table', render: TableRenderer}}]}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(locator.element().innerHTML).toBe(
        [
          '<table data-slate-node="element" data-pt-path="[_key==&quot;k0&quot;]">',
          '<tbody>',
          // Row defaults to div (no row renderer registered)
          '<div data-slate-node="element" data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;k1&quot;]">',
          // Cell defaults to div (no cell renderer registered)
          '<div data-slate-node="element" data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;k1&quot;].cells[_key==&quot;k2&quot;]">',
          '<div data-slate-node="element" data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;k1&quot;].cells[_key==&quot;k2&quot;].content[_key==&quot;k3&quot;]">',
          '<span data-slate-node="text" data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;k1&quot;].cells[_key==&quot;k2&quot;].content[_key==&quot;k3&quot;].children[_key==&quot;k4&quot;]" data-child-key="k4" data-child-name="span" data-child-type="span">',
          '<span data-slate-leaf="true">',
          '<span data-slate-string="true">cell text</span>',
          '</span>',
          '</span>',
          '</div>',
          '</div>',
          '</div>',
          '</tbody>',
          '</table>',
        ].join(''),
      )
    })
  })

  test('clicking inside a callout text block resolves selection', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const contentBlockKey = keyGenerator()
    const contentSpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: contentBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: contentSpanKey,
                  text: 'click here',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <RendererPlugin
          renderers={[{renderer: {type: 'callout', render: CalloutRenderer}}]}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(
        locator.element().querySelector('[data-testid="callout"]'),
      ).not.toBeNull()
    })

    // Click on the text inside the callout
    const textSpan = locator
      .element()
      .querySelector(
        `[data-pt-path='[_key=="${calloutKey}"].content[_key=="${contentBlockKey}"].children[_key=="${contentSpanKey}"]']`,
      )
    expect(textSpan).not.toBeNull()
    await userEvent.click(textSpan!)

    await vi.waitFor(() => {
      const selection = editor.getSnapshot().context.selection

      expect(selection).toEqual({
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: contentBlockKey},
            'children',
            {_key: contentSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: contentBlockKey},
            'children',
            {_key: contentSpanKey},
          ],
          offset: 0,
        },
        backward: false,
      })
    })
  })

  test('typing inside a callout text block inserts text', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const contentBlockKey = keyGenerator()
    const contentSpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: contentBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: contentSpanKey,
                  text: 'hello',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <RendererPlugin
          renderers={[{renderer: {type: 'callout', render: CalloutRenderer}}]}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(
        locator.element().querySelector('[data-testid="callout"]'),
      ).not.toBeNull()
    })

    // Click on the text to place cursor
    const textSpan = locator
      .element()
      .querySelector(
        `[data-pt-path='[_key=="${calloutKey}"].content[_key=="${contentBlockKey}"].children[_key=="${contentSpanKey}"]']`,
      )
    expect(textSpan).not.toBeNull()
    await userEvent.click(textSpan!)

    // Wait for selection to be established
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })

    // Type multiple characters at the cursor position
    await userEvent.keyboard('abc')

    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value

      expect(value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: contentBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: contentSpanKey,
                  text: 'abchello',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('backspace inside a callout text block deletes text', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const contentBlockKey = keyGenerator()
    const contentSpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: contentBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: contentSpanKey,
                  text: 'hello',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <RendererPlugin
          renderers={[{renderer: {type: 'callout', render: CalloutRenderer}}]}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(
        locator.element().querySelector('[data-testid="callout"]'),
      ).not.toBeNull()
    })

    // Click on the text to place cursor
    const textSpan = locator
      .element()
      .querySelector(
        `[data-pt-path='[_key=="${calloutKey}"].content[_key=="${contentBlockKey}"].children[_key=="${contentSpanKey}"]']`,
      )
    expect(textSpan).not.toBeNull()
    await userEvent.click(textSpan!)

    // Wait for selection to be established
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })

    // Type a character then backspace it
    await userEvent.keyboard('x')

    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value
      expect(value).toHaveLength(1)
    })

    await userEvent.keyboard('{Backspace}')

    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value

      expect(value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: contentBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: contentSpanKey,
                  text: 'hello',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })
})
