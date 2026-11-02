import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema, type Operation, type Patch} from '../src'
import {EventListenerPlugin, NodePlugin} from '../src/plugins'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

describe('event.remove.text', () => {
  test('Scenario: remove.text at an explicit position', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          style: 'normal',
          children: [
            {_key: 's0', _type: 'span', text: 'hello world', marks: []},
          ],
          markDefs: [],
        },
      ],
    })

    editor.send({
      type: 'remove.text',
      at: [{_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 5,
      text: ' world',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          style: 'normal',
          children: [{_key: 's0', _type: 'span', text: 'hello', marks: []}],
          markDefs: [],
        },
      ])
    })
  })

  test('Scenario: remove.text with empty text applies no operation', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          style: 'normal',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    })
    const operations: Array<Operation> = []
    editor.on('operation', (event) => {
      operations.push(event.operation)
    })

    editor.send({
      type: 'remove.text',
      at: [{_key: blockKey}, 'children', {_key: spanKey}],
      offset: 1,
      text: '',
    })
    editor.send({
      type: 'remove.text',
      at: [{_key: blockKey}, 'children', {_key: spanKey}],
      offset: 2,
      text: 'o',
    })

    await vi.waitFor(() => {
      expect(operations).toEqual([
        {
          type: 'remove.text',
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 2,
          text: 'o',
        },
      ])
    })
  })

  test('Scenario: remove.text with empty text leaves unnormalized siblings unmerged', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const patches: Array<Patch> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: fooBlockKey,
          _type: 'block',
          style: 'normal',
          children: [
            {_key: fooSpanKey, _type: 'span', text: 'foo', marks: []},
            {_key: barSpanKey, _type: 'span', text: 'bar', marks: []},
          ],
          markDefs: [],
        },
        {
          _key: bazBlockKey,
          _type: 'block',
          style: 'normal',
          children: [{_key: bazSpanKey, _type: 'span', text: 'baz', marks: []}],
          markDefs: [],
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'remove.text',
      at: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
      offset: 1,
      text: '',
    })
    editor.send({
      type: 'remove.text',
      at: [{_key: bazBlockKey}, 'children', {_key: bazSpanKey}],
      offset: 2,
      text: 'z',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: fooBlockKey,
          _type: 'block',
          style: 'normal',
          children: [
            {_key: fooSpanKey, _type: 'span', text: 'foo', marks: []},
            {_key: barSpanKey, _type: 'span', text: 'bar', marks: []},
          ],
          markDefs: [],
        },
        {
          _key: bazBlockKey,
          _type: 'block',
          style: 'normal',
          children: [{_key: bazSpanKey, _type: 'span', text: 'ba', marks: []}],
          markDefs: [],
        },
      ])
      expect(patches).toEqual([
        {
          type: 'diffMatchPatch',
          path: [{_key: bazBlockKey}, 'children', {_key: bazSpanKey}, 'text'],
          value: '@@ -1,3 +1,2 @@\n ba\n-z\n',
          origin: 'local',
        },
      ])
    })
  })

  test.each([
    {
      name: 'a keyed path',
      at: (blockKey: string, spanKey: string) => [
        {_key: blockKey},
        'children',
        {_key: spanKey},
      ],
    },
    {name: 'an index path', at: () => [0, 'children', 0]},
  ])(
    'Scenario: remove.text by $name maps a caret in the same span',
    async ({at}) => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const patches: Array<Patch> = []
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            style: 'normal',
            children: [
              {_key: spanKey, _type: 'span', text: 'foobar', marks: []},
            ],
            markDefs: [],
          },
        ],
        children: (
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
        ),
      })

      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 5,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 5,
          },
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 5,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 5,
          },
          backward: false,
        })
      })

      editor.send({
        type: 'remove.text',
        at: at(blockKey, spanKey),
        offset: 0,
        text: 'foo',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            style: 'normal',
            children: [{_key: spanKey, _type: 'span', text: 'bar', marks: []}],
            markDefs: [],
          },
        ])
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 2,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 2,
          },
          backward: false,
        })
        expect(patches).toEqual([
          {
            type: 'diffMatchPatch',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
            value: '@@ -1,6 +1,3 @@\n-foo\n bar\n',
            origin: 'local',
          },
        ])
      })
    },
  )

  test.each([
    {
      name: 'a keyed path',
      at: ({
        tableKey,
        rowKey,
        cellKey,
        blockKey,
        spanKey,
      }: {
        tableKey: string
        rowKey: string
        cellKey: string
        blockKey: string
        spanKey: string
      }) => [
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: spanKey},
      ],
    },
    {
      name: 'an index path',
      at: () => [0, 'rows', 0, 'cells', 0, 'content', 0, 'children', 0],
    },
    {
      name: 'a negative index path',
      at: () => [-1, 'rows', -1, 'cells', -1, 'content', -1, 'children', -1],
    },
  ])(
    'Scenario: remove.text by $name maps a caret in the same span in a table cell',
    async ({at}) => {
      const keyGenerator = createTestKeyGenerator()
      const tableKey = keyGenerator()
      const rowKey = keyGenerator()
      const cellKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const keys = {tableKey, rowKey, cellKey, blockKey, spanKey}
      const spanPath = [
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: spanKey},
      ]
      const patches: Array<Patch> = []
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: tableSchemaDefinition,
        initialValue: tableCellValue(keys, 'foobar'),
        children: (
          <>
            <NodePlugin nodes={tableContainers} />
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

      editor.send({
        type: 'select',
        at: {
          anchor: {path: spanPath, offset: 5},
          focus: {path: spanPath, offset: 5},
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: spanPath, offset: 5},
          focus: {path: spanPath, offset: 5},
          backward: false,
        })
      })

      editor.send({type: 'remove.text', at: at(keys), offset: 0, text: 'foo'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual(
          tableCellValue(keys, 'bar'),
        )
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: spanPath, offset: 2},
          focus: {path: spanPath, offset: 2},
          backward: false,
        })
        expect(patches).toEqual([
          {
            type: 'diffMatchPatch',
            path: [...spanPath, 'text'],
            value: '@@ -1,6 +1,3 @@\n-foo\n bar\n',
            origin: 'local',
          },
        ])
      })
    },
  )

  test.each([
    {
      name: 'a keyed path',
      at: ({
        tableKey,
        rowKey,
        cellKey,
        calloutKey,
        blockKey,
        spanKey,
      }: {
        tableKey: string
        rowKey: string
        cellKey: string
        calloutKey: string
        blockKey: string
        spanKey: string
      }) => [
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: calloutKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: spanKey},
      ],
    },
    {
      name: 'an index path',
      at: () => [
        0,
        'rows',
        0,
        'cells',
        0,
        'content',
        0,
        'content',
        0,
        'children',
        0,
      ],
    },
    {
      name: 'a negative index path',
      at: () => [
        -1,
        'rows',
        -1,
        'cells',
        -1,
        'content',
        -1,
        'content',
        -1,
        'children',
        -1,
      ],
    },
  ])(
    'Scenario: remove.text by $name maps a caret in the same span in a callout in a table cell',
    async ({at}) => {
      const keyGenerator = createTestKeyGenerator()
      const tableKey = keyGenerator()
      const rowKey = keyGenerator()
      const cellKey = keyGenerator()
      const calloutKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const keys = {tableKey, rowKey, cellKey, calloutKey, blockKey, spanKey}
      const spanPath = [
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: calloutKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: spanKey},
      ]
      const patches: Array<Patch> = []
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: tableSchemaDefinition,
        initialValue: calloutInTableCellValue(keys, 'foobar'),
        children: (
          <>
            <NodePlugin nodes={tableContainers} />
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

      editor.send({
        type: 'select',
        at: {
          anchor: {path: spanPath, offset: 5},
          focus: {path: spanPath, offset: 5},
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: spanPath, offset: 5},
          focus: {path: spanPath, offset: 5},
          backward: false,
        })
      })

      editor.send({type: 'remove.text', at: at(keys), offset: 0, text: 'foo'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual(
          calloutInTableCellValue(keys, 'bar'),
        )
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: spanPath, offset: 2},
          focus: {path: spanPath, offset: 2},
          backward: false,
        })
        expect(patches).toEqual([
          {
            type: 'diffMatchPatch',
            path: [...spanPath, 'text'],
            value: '@@ -1,6 +1,3 @@\n-foo\n bar\n',
            origin: 'local',
          },
        ])
      })
    },
  )
})

const tableSchemaDefinition = defineSchema({
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
                        {
                          name: 'content',
                          type: 'array',
                          of: [
                            {type: 'block'},
                            {
                              type: 'object',
                              name: 'callout',
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
        },
      ],
    },
  ],
})

const tableContainers = [
  defineContainer({
    type: 'table',
    arrayField: 'rows',
    render: ({children}) => <>{children}</>,
  }),
  defineContainer({
    type: 'row',
    arrayField: 'cells',
    render: ({children}) => <>{children}</>,
  }),
  defineContainer({
    type: 'cell',
    arrayField: 'content',
    render: ({children}) => <>{children}</>,
  }),
  defineContainer({
    type: 'callout',
    arrayField: 'content',
    render: ({children}) => <>{children}</>,
  }),
]

function tableCellValue(
  keys: {
    tableKey: string
    rowKey: string
    cellKey: string
    blockKey: string
    spanKey: string
  },
  text: string,
) {
  return [
    {
      _key: keys.tableKey,
      _type: 'table',
      rows: [
        {
          _key: keys.rowKey,
          _type: 'row',
          cells: [
            {
              _key: keys.cellKey,
              _type: 'cell',
              content: [textBlock(keys.blockKey, keys.spanKey, text)],
            },
          ],
        },
      ],
    },
  ]
}

function calloutInTableCellValue(
  keys: {
    tableKey: string
    rowKey: string
    cellKey: string
    calloutKey: string
    blockKey: string
    spanKey: string
  },
  text: string,
) {
  return [
    {
      _key: keys.tableKey,
      _type: 'table',
      rows: [
        {
          _key: keys.rowKey,
          _type: 'row',
          cells: [
            {
              _key: keys.cellKey,
              _type: 'cell',
              content: [
                {
                  _key: keys.calloutKey,
                  _type: 'callout',
                  content: [textBlock(keys.blockKey, keys.spanKey, text)],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
}

function textBlock(blockKey: string, spanKey: string, text: string) {
  return {
    _key: blockKey,
    _type: 'block',
    style: 'normal',
    children: [{_key: spanKey, _type: 'span', text, marks: []}],
    markDefs: [],
  }
}
