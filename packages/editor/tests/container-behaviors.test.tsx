import type {Patch} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {RendererPlugin} from '../src/plugins/plugin.renderer'
import type {Renderer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

// --- Callout schema (depth 1 container) ---

const calloutSchemaDefinition = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}],
  annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
  blockObjects: [
    {
      name: 'callout',
      fields: [
        {name: 'variant', type: 'string'},
        {name: 'content', type: 'array', of: [{type: 'block'}]},
      ],
    },
  ],
})

const calloutRenderer: Renderer = {
  type: 'callout',
  render: ({attributes, children}) => (
    <div {...attributes} data-testid="callout">
      {children}
    </div>
  ),
}

async function createCalloutEditor() {
  const patches: Array<Patch> = []
  const keyGenerator = createTestKeyGenerator()
  const calloutKey = keyGenerator() // k0
  const blockKey = keyGenerator() // k1
  const spanKey = keyGenerator() // k2

  const span = {
    _key: spanKey,
    _type: 'span' as const,
    text: 'hello',
    marks: [] as Array<string>,
  }
  const block = {
    _key: blockKey,
    _type: 'block' as const,
    children: [span],
    markDefs: [] as Array<Record<string, unknown>>,
    style: 'normal',
  }
  const callout = {
    _key: calloutKey,
    _type: 'callout' as const,
    variant: 'note',
    content: [block],
  }

  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition: calloutSchemaDefinition,
    initialValue: [callout],
    children: (
      <>
        <RendererPlugin renderers={[calloutRenderer]} />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      </>
    ),
  })

  return {editor, locator, patches, callout, block, span}
}

// --- Table schema (depth 3 container) ---

const tableSchemaDefinition = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}],
  annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
  blockObjects: [
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

const tableRenderer: Renderer = {
  type: 'table',
  render: ({attributes, children}) => (
    <table {...attributes} data-testid="table">
      <tbody>{children}</tbody>
    </table>
  ),
}

const rowRenderer: Renderer = {
  type: 'table.row',
  render: ({attributes, children}) => <tr {...attributes}>{children}</tr>,
}

const cellRenderer: Renderer = {
  type: 'table.row.cell',
  render: ({attributes, children}) => <td {...attributes}>{children}</td>,
}

async function createTableEditor() {
  const patches: Array<Patch> = []
  const keyGenerator = createTestKeyGenerator()
  const tableKey = keyGenerator() // k0
  const rowKey = keyGenerator() // k1
  const cellKey = keyGenerator() // k2
  const blockKey = keyGenerator() // k3
  const spanKey = keyGenerator() // k4

  const span = {
    _key: spanKey,
    _type: 'span' as const,
    text: 'hello',
    marks: [] as Array<string>,
  }
  const block = {
    _key: blockKey,
    _type: 'block' as const,
    children: [span],
    markDefs: [] as Array<Record<string, unknown>>,
    style: 'normal',
  }
  const cell = {
    _key: cellKey,
    _type: 'cell' as const,
    content: [block],
  }
  const row = {
    _key: rowKey,
    _type: 'row' as const,
    cells: [cell],
  }
  const table = {
    _key: tableKey,
    _type: 'table' as const,
    rows: [row],
  }

  const {editor, locator} = await createTestEditor({
    keyGenerator,
    schemaDefinition: tableSchemaDefinition,
    initialValue: [table],
    children: (
      <>
        <RendererPlugin
          renderers={[tableRenderer, rowRenderer, cellRenderer]}
        />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      </>
    ),
  })

  return {editor, locator, patches, table, row, cell, block, span}
}

// --- Tests ---

describe('container behaviors', () => {
  describe('insert.block', () => {
    test('inserting a callout via insert.block', async () => {
      const patches: Array<Patch> = []
      const keyGenerator = createTestKeyGenerator()

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: calloutSchemaDefinition,
        children: (
          <>
            <RendererPlugin renderers={[calloutRenderer]} />
            <EventListenerPlugin
              on={(event) => {
                if (event.type === 'patch') {
                  patches.push(event.patch)
                }
              }}
            />
          </>
        ),
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toHaveLength(1)
      })

      editor.send({
        type: 'insert.block',
        block: {
          _type: 'callout',
          variant: 'note',
          content: [
            {
              _type: 'block',
              children: [{_type: 'span', text: 'callout text'}],
            },
          ],
        },
        placement: 'auto',
      })

      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        expect(value).toHaveLength(1)
        expect(value?.at(0)?._type).toBe('callout')
      })

      // k0 = default empty text block, k1 = its span
      // k2 = callout, k3 = inner span (from normalization), k4 = inner block
      expect(patches).toEqual([
        {
          type: 'setIfMissing',
          path: [],
          value: [],
          origin: 'local',
        },
        {
          type: 'insert',
          path: [0],
          position: 'before',
          items: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
            },
          ],
          origin: 'local',
        },
        {
          type: 'insert',
          path: [{_key: 'k0'}],
          position: 'before',
          items: [
            {
              _type: 'callout',
              _key: 'k2',
              variant: 'note',
              content: [
                {
                  _type: 'block',
                  children: [{_type: 'span', text: 'callout text'}],
                },
              ],
            },
          ],
          origin: 'local',
        },
        {
          type: 'unset',
          path: [{_key: 'k0'}],
          origin: 'local',
        },
        {
          type: 'set',
          path: [{_key: 'k2'}, 'content', 0, '_key'],
          value: 'k4',
          origin: 'local',
        },
        {
          type: 'set',
          path: [{_key: 'k2'}, 'content', {_key: 'k4'}, 'markDefs'],
          value: [],
          origin: 'local',
        },
        {
          type: 'set',
          path: [{_key: 'k2'}, 'content', {_key: 'k4'}, 'style'],
          value: 'normal',
          origin: 'local',
        },
      ])

      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: 'k2',
          variant: 'note',
          content: [
            {
              _type: 'block',
              _key: 'k4',
              markDefs: [],
              style: 'normal',
              children: [
                {_type: 'span', _key: 'k3', text: 'callout text', marks: []},
              ],
            },
          ],
        },
      ])
    })

    test('inserting a table via insert.block', async () => {
      const patches: Array<Patch> = []
      const keyGenerator = createTestKeyGenerator()

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: tableSchemaDefinition,
        children: (
          <>
            <RendererPlugin
              renderers={[tableRenderer, rowRenderer, cellRenderer]}
            />
            <EventListenerPlugin
              on={(event) => {
                if (event.type === 'patch') {
                  patches.push(event.patch)
                }
              }}
            />
          </>
        ),
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toHaveLength(1)
      })

      editor.send({
        type: 'insert.block',
        block: {
          _type: 'table',
          rows: [
            {
              _type: 'row',
              cells: [
                {
                  _type: 'cell',
                  content: [
                    {
                      _type: 'block',
                      children: [{_type: 'span', text: 'cell text'}],
                    },
                  ],
                },
              ],
            },
          ],
        },
        placement: 'auto',
      })

      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        expect(value).toHaveLength(1)
        expect(value?.at(0)?._type).toBe('table')
      })

      // k0 = default empty text block, k1 = its span
      // k2 = table, k3 = inner span, k4 = inner block, k5 = cell, k6 = row
      expect(patches).toEqual([
        {
          type: 'setIfMissing',
          path: [],
          value: [],
          origin: 'local',
        },
        {
          type: 'insert',
          path: [0],
          position: 'before',
          items: [
            {
              _type: 'block',
              _key: 'k0',
              style: 'normal',
              markDefs: [],
              children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
            },
          ],
          origin: 'local',
        },
        {
          type: 'insert',
          path: [{_key: 'k0'}],
          position: 'before',
          items: [
            {
              _type: 'table',
              _key: 'k2',
              rows: [
                {
                  _type: 'row',
                  cells: [
                    {
                      _type: 'cell',
                      content: [
                        {
                          _type: 'block',
                          children: [{_type: 'span', text: 'cell text'}],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          origin: 'local',
        },
        {
          type: 'unset',
          path: [{_key: 'k0'}],
          origin: 'local',
        },
        {
          type: 'set',
          path: [{_key: 'k2'}, 'rows', 0, '_key'],
          value: 'k6',
          origin: 'local',
        },
      ])

      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: 'k2',
          rows: [
            {
              _type: 'row',
              _key: 'k6',
              cells: [
                {
                  _type: 'cell',
                  _key: 'k5',
                  content: [
                    {
                      _type: 'block',
                      _key: 'k4',
                      markDefs: [],
                      style: 'normal',
                      children: [
                        {
                          _type: 'span',
                          _key: 'k3',
                          text: 'cell text',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
  })

  describe('insert.text', () => {
    test('typing inside a callout', async () => {
      const {editor, patches, callout, block, span} =
        await createCalloutEditor()

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([callout])
      })

      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [
              {_key: callout._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
            ],
            offset: 5,
          },
          focus: {
            path: [
              {_key: callout._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
            ],
            offset: 5,
          },
        },
      })

      editor.send({type: 'insert.text', text: ' world'})

      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        const calloutValue = value?.at(0) as Record<string, unknown>
        const content = calloutValue?.['content'] as Array<
          Record<string, unknown>
        >
        const children = content?.at(0)?.['children'] as Array<
          Record<string, unknown>
        >
        expect(children?.at(0)).toEqual(
          expect.objectContaining({text: 'hello world'}),
        )
      })

      expect(patches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'diffMatchPatch',
            path: [
              {_key: callout._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
              'text',
            ],
          }),
        ]),
      )
    })

    test('typing inside a table cell', async () => {
      const {editor, patches, table, row, cell, block, span} =
        await createTableEditor()

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([table])
      })

      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [
              {_key: table._key},
              'rows',
              {_key: row._key},
              'cells',
              {_key: cell._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
            ],
            offset: 5,
          },
          focus: {
            path: [
              {_key: table._key},
              'rows',
              {_key: row._key},
              'cells',
              {_key: cell._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
            ],
            offset: 5,
          },
        },
      })

      editor.send({type: 'insert.text', text: ' world'})

      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        const tableValue = value?.at(0) as Record<string, unknown>
        const rows = tableValue?.['rows'] as Array<Record<string, unknown>>
        const cells = rows?.at(0)?.['cells'] as Array<Record<string, unknown>>
        const content = cells?.at(0)?.['content'] as Array<
          Record<string, unknown>
        >
        const children = content?.at(0)?.['children'] as Array<
          Record<string, unknown>
        >
        expect(children?.at(0)).toEqual(
          expect.objectContaining({text: 'hello world'}),
        )
      })

      expect(patches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'diffMatchPatch',
            path: [
              {_key: table._key},
              'rows',
              {_key: row._key},
              'cells',
              {_key: cell._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
              'text',
            ],
          }),
        ]),
      )
    })
  })

  describe('delete', () => {
    test('backspace inside a callout', async () => {
      const {editor, patches, callout, block, span} =
        await createCalloutEditor()

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([callout])
      })

      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [
              {_key: callout._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
            ],
            offset: 5,
          },
          focus: {
            path: [
              {_key: callout._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
            ],
            offset: 5,
          },
        },
      })

      editor.send({type: 'delete', direction: 'backward'})

      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        const calloutValue = value?.at(0) as Record<string, unknown>
        const content = calloutValue?.['content'] as Array<
          Record<string, unknown>
        >
        const children = content?.at(0)?.['children'] as Array<
          Record<string, unknown>
        >
        expect(children?.at(0)).toEqual(expect.objectContaining({text: 'hell'}))
      })

      expect(patches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'diffMatchPatch',
            path: [
              {_key: callout._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
              'text',
            ],
          }),
        ]),
      )
    })

    test('backspace inside a table cell', async () => {
      const {editor, patches, table, row, cell, block, span} =
        await createTableEditor()

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([table])
      })

      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [
              {_key: table._key},
              'rows',
              {_key: row._key},
              'cells',
              {_key: cell._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
            ],
            offset: 5,
          },
          focus: {
            path: [
              {_key: table._key},
              'rows',
              {_key: row._key},
              'cells',
              {_key: cell._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
            ],
            offset: 5,
          },
        },
      })

      editor.send({type: 'delete', direction: 'backward'})

      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        const tableValue = value?.at(0) as Record<string, unknown>
        const rows = tableValue?.['rows'] as Array<Record<string, unknown>>
        const cells = rows?.at(0)?.['cells'] as Array<Record<string, unknown>>
        const content = cells?.at(0)?.['content'] as Array<
          Record<string, unknown>
        >
        const children = content?.at(0)?.['children'] as Array<
          Record<string, unknown>
        >
        expect(children?.at(0)).toEqual(expect.objectContaining({text: 'hell'}))
      })

      expect(patches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'diffMatchPatch',
            path: [
              {_key: table._key},
              'rows',
              {_key: row._key},
              'cells',
              {_key: cell._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
              'text',
            ],
          }),
        ]),
      )
    })
  })

  describe('decorator.add', () => {
    test('adding strong to text inside a callout', async () => {
      const {editor, patches, callout, block, span} =
        await createCalloutEditor()

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([callout])
      })

      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [
              {_key: callout._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
            ],
            offset: 0,
          },
          focus: {
            path: [
              {_key: callout._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
            ],
            offset: 5,
          },
        },
      })

      editor.send({type: 'decorator.add', decorator: 'strong'})

      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        const calloutValue = value?.at(0) as Record<string, unknown>
        const content = calloutValue?.['content'] as Array<
          Record<string, unknown>
        >
        const children = content?.at(0)?.['children'] as Array<
          Record<string, unknown>
        >
        expect(children?.at(0)).toEqual(
          expect.objectContaining({marks: ['strong']}),
        )
      })

      expect(patches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'set',
            path: expect.arrayContaining([{_key: span._key}]),
          }),
        ]),
      )
    })

    test('adding strong to text inside a table cell', async () => {
      const {editor, patches, table, row, cell, block, span} =
        await createTableEditor()

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([table])
      })

      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [
              {_key: table._key},
              'rows',
              {_key: row._key},
              'cells',
              {_key: cell._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
            ],
            offset: 0,
          },
          focus: {
            path: [
              {_key: table._key},
              'rows',
              {_key: row._key},
              'cells',
              {_key: cell._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
            ],
            offset: 5,
          },
        },
      })

      editor.send({type: 'decorator.add', decorator: 'strong'})

      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        const tableValue = value?.at(0) as Record<string, unknown>
        const rows = tableValue?.['rows'] as Array<Record<string, unknown>>
        const cells = rows?.at(0)?.['cells'] as Array<Record<string, unknown>>
        const content = cells?.at(0)?.['content'] as Array<
          Record<string, unknown>
        >
        const children = content?.at(0)?.['children'] as Array<
          Record<string, unknown>
        >
        expect(children?.at(0)).toEqual(
          expect.objectContaining({marks: ['strong']}),
        )
      })

      expect(patches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'set',
            path: expect.arrayContaining([{_key: span._key}]),
          }),
        ]),
      )
    })
  })

  describe('style.toggle', () => {
    test('setting style on a block inside a callout', async () => {
      const {editor, patches, callout, block, span} =
        await createCalloutEditor()

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([callout])
      })

      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [
              {_key: callout._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
            ],
            offset: 0,
          },
          focus: {
            path: [
              {_key: callout._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
            ],
            offset: 0,
          },
        },
      })

      editor.send({type: 'style.toggle', style: 'h1'})

      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        const calloutValue = value?.at(0) as Record<string, unknown>
        const content = calloutValue?.['content'] as Array<
          Record<string, unknown>
        >
        expect(content?.at(0)).toEqual(expect.objectContaining({style: 'h1'}))
      })

      expect(patches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'set',
            path: [
              {_key: callout._key},
              'content',
              {_key: block._key},
              'style',
            ],
            value: 'h1',
          }),
        ]),
      )
    })

    test('setting style on a block inside a table cell', async () => {
      const {editor, patches, table, row, cell, block, span} =
        await createTableEditor()

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([table])
      })

      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [
              {_key: table._key},
              'rows',
              {_key: row._key},
              'cells',
              {_key: cell._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
            ],
            offset: 0,
          },
          focus: {
            path: [
              {_key: table._key},
              'rows',
              {_key: row._key},
              'cells',
              {_key: cell._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
            ],
            offset: 0,
          },
        },
      })

      editor.send({type: 'style.toggle', style: 'h1'})

      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        const tableValue = value?.at(0) as Record<string, unknown>
        const rows = tableValue?.['rows'] as Array<Record<string, unknown>>
        const cells = rows?.at(0)?.['cells'] as Array<Record<string, unknown>>
        const content = cells?.at(0)?.['content'] as Array<
          Record<string, unknown>
        >
        expect(content?.at(0)).toEqual(expect.objectContaining({style: 'h1'}))
      })

      expect(patches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'set',
            path: [
              {_key: table._key},
              'rows',
              {_key: row._key},
              'cells',
              {_key: cell._key},
              'content',
              {_key: block._key},
              'style',
            ],
            value: 'h1',
          }),
        ]),
      )
    })
  })

  describe('insert.break', () => {
    test('pressing enter inside a callout splits the text block', async () => {
      const {editor, callout, block, span} = await createCalloutEditor()

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([callout])
      })

      // Place cursor at end of "hello"
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [
              {_key: callout._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
            ],
            offset: 5,
          },
          focus: {
            path: [
              {_key: callout._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
            ],
            offset: 5,
          },
        },
      })

      editor.send({type: 'insert.break'})

      // After pressing enter at end of "hello", the callout should have 2 text blocks
      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        const calloutNode = value?.at(0) as Record<string, unknown>
        const content = calloutNode?.['content'] as Array<
          Record<string, unknown>
        >
        expect(content?.length).toBe(2)
      })
    })

    test('pressing enter in the middle of text inside a callout splits correctly', async () => {
      const {editor, callout, block, span} = await createCalloutEditor()

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([callout])
      })

      // Place cursor in the middle of "hello" (after "hel")
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [
              {_key: callout._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
            ],
            offset: 3,
          },
          focus: {
            path: [
              {_key: callout._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
            ],
            offset: 3,
          },
        },
      })

      editor.send({type: 'insert.break'})

      // First block should have "hel", second block should have "lo"
      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        const calloutNode = value?.at(0) as Record<string, unknown>
        const content = calloutNode?.['content'] as Array<
          Record<string, unknown>
        >
        expect(content?.length).toBe(2)
        const firstBlock = content?.at(0) as Record<string, unknown>
        const firstChildren = firstBlock?.['children'] as Array<
          Record<string, unknown>
        >
        expect(firstChildren?.at(0)?.['text']).toBe('hel')
        const secondBlock = content?.at(1) as Record<string, unknown>
        const secondChildren = secondBlock?.['children'] as Array<
          Record<string, unknown>
        >
        expect(secondChildren?.at(0)?.['text']).toBe('lo')
      })
    })

    test('pressing enter inside a table cell splits the text block', async () => {
      const {editor, table, row, cell, block, span} = await createTableEditor()

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([table])
      })

      // Place cursor at end of "hello"
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [
              {_key: table._key},
              'rows',
              {_key: row._key},
              'cells',
              {_key: cell._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
            ],
            offset: 5,
          },
          focus: {
            path: [
              {_key: table._key},
              'rows',
              {_key: row._key},
              'cells',
              {_key: cell._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
            ],
            offset: 5,
          },
        },
      })

      editor.send({type: 'insert.break'})

      // After pressing enter at end of "hello", the cell should have 2 text blocks
      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        const tableNode = value?.at(0) as Record<string, unknown>
        const rows = tableNode?.['rows'] as Array<Record<string, unknown>>
        const rowNode = rows?.at(0) as Record<string, unknown>
        const cells = rowNode?.['cells'] as Array<Record<string, unknown>>
        const cellNode = cells?.at(0) as Record<string, unknown>
        const content = cellNode?.['content'] as Array<Record<string, unknown>>
        expect(content?.length).toBe(2)
      })
    })

    test('pressing enter in the middle of text inside a table cell splits correctly', async () => {
      const {editor, table, row, cell, block, span} = await createTableEditor()

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([table])
      })

      // Place cursor in the middle of "hello" (after "hel")
      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [
              {_key: table._key},
              'rows',
              {_key: row._key},
              'cells',
              {_key: cell._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
            ],
            offset: 3,
          },
          focus: {
            path: [
              {_key: table._key},
              'rows',
              {_key: row._key},
              'cells',
              {_key: cell._key},
              'content',
              {_key: block._key},
              'children',
              {_key: span._key},
            ],
            offset: 3,
          },
        },
      })

      editor.send({type: 'insert.break'})

      // First block should have "hel", second block should have "lo"
      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        const tableNode = value?.at(0) as Record<string, unknown>
        const rows = tableNode?.['rows'] as Array<Record<string, unknown>>
        const rowNode = rows?.at(0) as Record<string, unknown>
        const cells = rowNode?.['cells'] as Array<Record<string, unknown>>
        const cellNode = cells?.at(0) as Record<string, unknown>
        const content = cellNode?.['content'] as Array<Record<string, unknown>>
        expect(content?.length).toBe(2)
        const firstBlock = content?.at(0) as Record<string, unknown>
        const firstChildren = firstBlock?.['children'] as Array<
          Record<string, unknown>
        >
        expect(firstChildren?.at(0)?.['text']).toBe('hel')
        const secondBlock = content?.at(1) as Record<string, unknown>
        const secondChildren = secondBlock?.['children'] as Array<
          Record<string, unknown>
        >
        expect(secondChildren?.at(0)?.['text']).toBe('lo')
      })
    })
  })

  describe('arrow keys', () => {
    test('arrow down inside a callout does not insert a new block', async () => {
      const {editor, locator, callout} = await createCalloutEditor()

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([callout])
      })

      // Click into the callout text to place cursor there
      await userEvent.click(locator.getByText('hello'))

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).not.toBeNull()
      })

      await userEvent.keyboard('{ArrowDown}')

      // Value should still be just the callout with one text block
      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        expect(value?.length).toBe(1)
        const calloutNode = value?.at(0) as Record<string, unknown>
        const content = calloutNode?.['content'] as Array<
          Record<string, unknown>
        >
        expect(content?.length).toBe(1)
      })
    })

    test('arrow up inside a callout does not insert a new block', async () => {
      const {editor, locator, callout} = await createCalloutEditor()

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([callout])
      })

      // Click into the callout text to place cursor there
      await userEvent.click(locator.getByText('hello'))

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).not.toBeNull()
      })

      await userEvent.keyboard('{ArrowUp}')

      // Value should still be just the callout with one text block
      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        expect(value?.length).toBe(1)
        const calloutNode = value?.at(0) as Record<string, unknown>
        const content = calloutNode?.['content'] as Array<
          Record<string, unknown>
        >
        expect(content?.length).toBe(1)
      })
    })
  })

  describe('backspace at block boundary inside container', () => {
    test.skip('backspace at start of second text block merges with first', async () => {
      const keyGenerator = createTestKeyGenerator()
      const calloutKey = keyGenerator() // k0
      const block1Key = keyGenerator() // k1
      const span1Key = keyGenerator() // k2
      const block2Key = keyGenerator() // k3
      const span2Key = keyGenerator() // k4

      const span1 = {
        _key: span1Key,
        _type: 'span' as const,
        text: 'hello',
        marks: [] as Array<string>,
      }
      const span2 = {
        _key: span2Key,
        _type: 'span' as const,
        text: 'world',
        marks: [] as Array<string>,
      }
      const block1 = {
        _key: block1Key,
        _type: 'block' as const,
        children: [span1],
        markDefs: [] as Array<Record<string, unknown>>,
        style: 'normal',
      }
      const block2 = {
        _key: block2Key,
        _type: 'block' as const,
        children: [span2],
        markDefs: [] as Array<Record<string, unknown>>,
        style: 'normal',
      }
      const callout = {
        _key: calloutKey,
        _type: 'callout' as const,
        variant: 'note',
        content: [block1, block2],
      }

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: calloutSchemaDefinition,
        initialValue: [callout],
        children: <RendererPlugin renderers={[calloutRenderer]} />,
      })

      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        const calloutNode = value?.at(0) as Record<string, unknown>
        const content = calloutNode?.['content'] as Array<
          Record<string, unknown>
        >
        expect(content?.length).toBe(2)
      })

      // Click at start of "world"
      await userEvent.click(locator.getByText('world'))

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).not.toBeNull()
      })

      // Move to start of "world"
      await userEvent.keyboard('{Home}')

      // Backspace should merge "world" into "hello"
      await userEvent.keyboard('{Backspace}')

      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        const calloutNode = value?.at(0) as Record<string, unknown>
        const content = calloutNode?.['content'] as Array<
          Record<string, unknown>
        >
        expect(content?.length).toBe(1)
        const mergedBlock = content?.at(0) as Record<string, unknown>
        const children = mergedBlock?.['children'] as Array<
          Record<string, unknown>
        >
        expect(children?.at(0)?.['text']).toBe('helloworld')
      })
    })
  })

  describe('delete forward at block boundary inside container', () => {
    test.skip('delete forward at end of first text block merges with second', async () => {
      const keyGenerator = createTestKeyGenerator()
      const calloutKey = keyGenerator() // k0
      const block1Key = keyGenerator() // k1
      const span1Key = keyGenerator() // k2
      const block2Key = keyGenerator() // k3
      const span2Key = keyGenerator() // k4

      const span1 = {
        _key: span1Key,
        _type: 'span' as const,
        text: 'hello',
        marks: [] as Array<string>,
      }
      const span2 = {
        _key: span2Key,
        _type: 'span' as const,
        text: 'world',
        marks: [] as Array<string>,
      }
      const block1 = {
        _key: block1Key,
        _type: 'block' as const,
        children: [span1],
        markDefs: [] as Array<Record<string, unknown>>,
        style: 'normal',
      }
      const block2 = {
        _key: block2Key,
        _type: 'block' as const,
        children: [span2],
        markDefs: [] as Array<Record<string, unknown>>,
        style: 'normal',
      }
      const callout = {
        _key: calloutKey,
        _type: 'callout' as const,
        variant: 'note',
        content: [block1, block2],
      }

      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: calloutSchemaDefinition,
        initialValue: [callout],
        children: <RendererPlugin renderers={[calloutRenderer]} />,
      })

      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        const calloutNode = value?.at(0) as Record<string, unknown>
        const content = calloutNode?.['content'] as Array<
          Record<string, unknown>
        >
        expect(content?.length).toBe(2)
      })

      // Click at end of "hello"
      await userEvent.click(locator.getByText('hello'))

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).not.toBeNull()
      })

      // Move to end of "hello"
      await userEvent.keyboard('{End}')

      // Delete forward should merge "world" into "hello"
      await userEvent.keyboard('{Delete}')

      await vi.waitFor(() => {
        const value = editor.getSnapshot().context.value
        const calloutNode = value?.at(0) as Record<string, unknown>
        const content = calloutNode?.['content'] as Array<
          Record<string, unknown>
        >
        expect(content?.length).toBe(1)
        const mergedBlock = content?.at(0) as Record<string, unknown>
        const children = mergedBlock?.['children'] as Array<
          Record<string, unknown>
        >
        expect(children?.at(0)?.['text']).toBe('helloworld')
      })
    })
  })
})
