import {createTestKeyGenerator} from '@portabletext/test'
import {assert, describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema} from '../src'
import {converterPortableText} from '../src/converters/converter.portable-text'
import {safeParse} from '../src/internal-utils/safe-json'
import {NodePlugin} from '../src/plugins/plugin.node'
import {
  defineBlockObject,
  defineContainer,
} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

describe('event.drag.drop', () => {
  test('Scenario: dragstart on an inline object drags only the inline object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const stockTickerKey = keyGenerator()
    const barKey = keyGenerator()

    const {locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [
          {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
        ],
      }),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: fooKey, _type: 'span', text: 'foo', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey, symbol: 'AAPL'},
            {_key: barKey, _type: 'span', text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await userEvent.click(locator)

    // Unlike the other drag scenarios in this file, this one dispatches a
    // real DOM `dragstart` rather than sending a hand-built `position`. The
    // wire payload it produces is the observable proof of what the
    // dragstart handler decided to carry.
    const draggableElement = locator
      .element()
      .querySelector('[data-pt-inline="object"] [draggable="true"]')
    assert(draggableElement, 'Expected the inline object to have a drag source')

    const rect = draggableElement.getBoundingClientRect()
    const dataTransfer = new DataTransfer()
    draggableElement.dispatchEvent(
      new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      }),
    )

    await vi.waitFor(() => {
      const ptData = dataTransfer.getData('application/x-portable-text')
      const blocks = safeParse(ptData)
      expect(blocks).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_type: 'stock-ticker', _key: stockTickerKey, symbol: 'AAPL'},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: dropping an inline object inside another text block moves the inline without duplicating its surrounding text', async () => {
    const keyGenerator = createTestKeyGenerator()
    const sourceBlockKey = keyGenerator()
    const fooKey = keyGenerator()
    const stockTickerKey = keyGenerator()
    const barKey = keyGenerator()
    const destBlockKey = keyGenerator()
    const destSpanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [
          {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
        ],
      }),
      initialValue: [
        {
          _key: sourceBlockKey,
          _type: 'block',
          children: [
            {_key: fooKey, _type: 'span', text: 'foo', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey, symbol: 'AAPL'},
            {_key: barKey, _type: 'span', text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: destBlockKey,
          _type: 'block',
          children: [
            {_key: destSpanKey, _type: 'span', text: 'baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    const stockTickerSelection = {
      anchor: {
        path: [{_key: sourceBlockKey}, 'children', {_key: stockTickerKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: sourceBlockKey}, 'children', {_key: stockTickerKey}],
        offset: 0,
      },
    }

    const serialized = converterPortableText.serialize({
      snapshot: {
        ...editor.getSnapshot(),
        context: {
          ...editor.getSnapshot().context,
          selection: stockTickerSelection,
        },
      },
      event: {
        type: 'serialize',
        originEvent: 'drag.dragstart',
      },
    })
    if (serialized.type === 'serialization.failure') {
      assert.fail(serialized.reason)
    }

    const dataTransfer = new DataTransfer()
    dataTransfer.setData(serialized.mimeType, serialized.data)

    editor.send({
      type: 'drag.drop',
      originEvent: {dataTransfer},
      dragOrigin: {selection: stockTickerSelection},
      position: {
        block: 'start',
        isEditor: false,
        isContainer: false,
        selection: {
          anchor: {
            path: [{_key: destBlockKey}, 'children', {_key: destSpanKey}],
            offset: 0,
          },
          focus: {
            path: [{_key: destBlockKey}, 'children', {_key: destSpanKey}],
            offset: 0,
          },
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: sourceBlockKey,
          _type: 'block',
          children: [{_key: fooKey, _type: 'span', text: 'foobar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: destBlockKey,
          _type: 'block',
          children: [
            {_key: 'k8', _type: 'span', text: '', marks: []},
            {_key: stockTickerKey, _type: 'stock-ticker', symbol: 'AAPL'},
            {_key: 'k9', _type: 'span', text: 'baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: dropping an inline object selects it at the destination, not the caret after it', async () => {
    const keyGenerator = createTestKeyGenerator()
    const sourceBlockKey = keyGenerator()
    const fooKey = keyGenerator()
    const stockTickerKey = keyGenerator()
    const barKey = keyGenerator()
    const destBlockKey = keyGenerator()
    const destSpanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [
          {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
        ],
      }),
      initialValue: [
        {
          _key: sourceBlockKey,
          _type: 'block',
          children: [
            {_key: fooKey, _type: 'span', text: 'foo', marks: []},
            {_type: 'stock-ticker', _key: stockTickerKey, symbol: 'AAPL'},
            {_key: barKey, _type: 'span', text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: destBlockKey,
          _type: 'block',
          children: [
            {_key: destSpanKey, _type: 'span', text: 'baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    const stockTickerSelection = {
      anchor: {
        path: [{_key: sourceBlockKey}, 'children', {_key: stockTickerKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: sourceBlockKey}, 'children', {_key: stockTickerKey}],
        offset: 0,
      },
    }

    const serialized = converterPortableText.serialize({
      snapshot: {
        ...editor.getSnapshot(),
        context: {
          ...editor.getSnapshot().context,
          selection: stockTickerSelection,
        },
      },
      event: {type: 'serialize', originEvent: 'drag.dragstart'},
    })
    if (serialized.type === 'serialization.failure') {
      assert.fail(serialized.reason)
    }
    const dataTransfer = new DataTransfer()
    dataTransfer.setData(serialized.mimeType, serialized.data)

    editor.send({
      type: 'drag.drop',
      originEvent: {dataTransfer},
      dragOrigin: {selection: stockTickerSelection},
      position: {
        block: 'start',
        isEditor: false,
        isContainer: false,
        selection: {
          anchor: {
            path: [{_key: destBlockKey}, 'children', {_key: destSpanKey}],
            offset: 0,
          },
          focus: {
            path: [{_key: destBlockKey}, 'children', {_key: destSpanKey}],
            offset: 0,
          },
        },
      },
    })

    // The moved inline object keeps its `_key`. After the drop, the selection
    // should be collapsed on the object itself (path ending at the object's
    // key), mirroring what inserting an inline object does, not on the span
    // that follows it.
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: destBlockKey}, 'children', {_key: stockTickerKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: destBlockKey}, 'children', {_key: stockTickerKey}],
          offset: 0,
        },
        backward: false,
      })
    })
  })

  test('Scenario: Dragging inline object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const stockTicketKey = keyGenerator()
    const barKey = keyGenerator()

    const {locator, editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [
          {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
        ],
      }),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {
              _key: fooKey,
              _type: 'span',
              text: 'foo',
              marks: [],
            },
            {
              _type: 'stock-ticker',
              _key: stockTicketKey,
              symbol: 'AAPL',
            },
            {
              _key: barKey,
              _type: 'span',
              text: 'bar',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    const stockTickerSelection = {
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: stockTicketKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: blockKey}, 'children', {_key: stockTicketKey}],
        offset: 0,
      },
    }

    await userEvent.click(locator)
    editor.send({type: 'select', at: stockTickerSelection})

    await vi.waitFor(() => {
      const selection = editor.getSnapshot().context.selection
      expect(selection).toEqual({
        ...stockTickerSelection,
        backward: false,
      })
    })

    const json = converterPortableText.serialize({
      snapshot: editor.getSnapshot(),
      event: {
        type: 'serialize',
        originEvent: 'drag.dragstart',
      },
    })

    if (json.type === 'serialization.failure') {
      assert.fail(json.reason)
    }

    const dataTransfer = new DataTransfer()
    dataTransfer.setData(json.mimeType, json.data)

    editor.send({
      type: 'drag.drop',
      originEvent: {
        dataTransfer,
      },
      dragOrigin: {selection: stockTickerSelection},
      position: {
        block: 'end',
        isEditor: false,
        isContainer: false,
        selection: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: barKey}],
            offset: 3,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: barKey}],
            offset: 3,
          },
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: fooKey, _type: 'span', text: 'foobar', marks: []},
            {_key: stockTicketKey, _type: 'stock-ticker', symbol: 'AAPL'},
            {_key: 'k7', _type: 'span', text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Dragging block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const imageKey = keyGenerator()

    const {locator, editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
        ],
      }),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo bar baz'}],
        },
        {
          _key: imageKey,
          _type: 'image',
          src: 'https://example.com/image.jpg',
        },
      ],
    })

    const imageSelection = {
      anchor: {
        path: [{_key: imageKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: imageKey}],
        offset: 0,
      },
    }

    await userEvent.click(locator)
    editor.send({type: 'select', at: imageSelection})

    await vi.waitFor(() => {
      const selection = editor.getSnapshot().context.selection
      expect(selection).toEqual({
        ...imageSelection,
        backward: false,
      })
    })

    const json = converterPortableText.serialize({
      snapshot: editor.getSnapshot(),
      event: {
        type: 'serialize',
        originEvent: 'drag.dragstart',
      },
    })

    if (json.type === 'serialization.failure') {
      assert.fail(json.reason)
    }

    const dataTransfer = new DataTransfer()
    dataTransfer.setData(json.mimeType, json.data)

    editor.send({
      type: 'drag.drop',
      originEvent: {
        dataTransfer,
      },
      dragOrigin: {selection: imageSelection},
      position: {
        block: 'start',
        isEditor: false,
        isContainer: false,
        selection: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 0,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 0,
          },
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: imageKey,
          _type: 'image',
          src: 'https://example.com/image.jpg',
        },
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanKey, _type: 'span', text: 'foo bar baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Dragging a block-object between cells of a multi-row table moves it (does not duplicate)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const row1Key = keyGenerator()
    const r1c1Key = keyGenerator()
    const r1c1BlockKey = keyGenerator()
    const r1c1SpanKey = keyGenerator()
    const r1c2Key = keyGenerator()
    const r1c2BlockKey = keyGenerator()
    const r1c2SpanKey = keyGenerator()
    const r1c3Key = keyGenerator()
    const r1c3BlockKey = keyGenerator()
    const r1c3SpanKey = keyGenerator()
    const row2Key = keyGenerator()
    const r2c1Key = keyGenerator()
    const r2c1BlockKey = keyGenerator()
    const r2c1SpanKey = keyGenerator()
    const r2c2Key = keyGenerator()
    const imageKey = keyGenerator()
    const r2c3Key = keyGenerator()
    const r2c3BlockKey = keyGenerator()
    const r2c3SpanKey = keyGenerator()

    const emptyTextBlock = (blockKey: string, spanKey: string) => ({
      _key: blockKey,
      _type: 'block' as const,
      style: 'normal',
      markDefs: [],
      children: [{_key: spanKey, _type: 'span', text: '', marks: []}],
    })

    const {locator, editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
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
                                of: [{type: 'block'}, {type: 'image'}],
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
      }),
      initialValue: [
        {
          _key: tableKey,
          _type: 'table',
          rows: [
            {
              _key: row1Key,
              _type: 'row',
              cells: [
                {
                  _key: r1c1Key,
                  _type: 'cell',
                  content: [emptyTextBlock(r1c1BlockKey, r1c1SpanKey)],
                },
                {
                  _key: r1c2Key,
                  _type: 'cell',
                  content: [emptyTextBlock(r1c2BlockKey, r1c2SpanKey)],
                },
                {
                  _key: r1c3Key,
                  _type: 'cell',
                  content: [emptyTextBlock(r1c3BlockKey, r1c3SpanKey)],
                },
              ],
            },
            {
              _key: row2Key,
              _type: 'row',
              cells: [
                {
                  _key: r2c1Key,
                  _type: 'cell',
                  content: [emptyTextBlock(r2c1BlockKey, r2c1SpanKey)],
                },
                {
                  _key: r2c2Key,
                  _type: 'cell',
                  content: [
                    {
                      _key: imageKey,
                      _type: 'image',
                      src: 'https://example.com/image.jpg',
                    },
                  ],
                },
                {
                  _key: r2c3Key,
                  _type: 'cell',
                  content: [emptyTextBlock(r2c3BlockKey, r2c3SpanKey)],
                },
              ],
            },
          ],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'table',
              arrayField: 'rows',
              render: ({attributes, children}) => (
                <div {...attributes}>{children}</div>
              ),
              of: [
                defineContainer({
                  type: 'row',
                  arrayField: 'cells',
                  render: ({attributes, children}) => (
                    <div {...attributes}>{children}</div>
                  ),
                  of: [
                    defineContainer({
                      type: 'cell',
                      arrayField: 'content',
                      render: ({attributes, children}) => (
                        <div {...attributes}>{children}</div>
                      ),
                    }),
                  ],
                }),
              ],
            }),
          ]}
        />
      ),
    })

    const imagePath = [
      {_key: tableKey},
      'rows',
      {_key: row2Key},
      'cells',
      {_key: r2c2Key},
      'content',
      {_key: imageKey},
    ]
    const imageSelection = {
      anchor: {path: imagePath, offset: 0},
      focus: {path: imagePath, offset: 0},
    }

    await userEvent.click(locator)
    editor.send({type: 'select', at: imageSelection})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        ...imageSelection,
        backward: false,
      })
    })

    const json = converterPortableText.serialize({
      snapshot: editor.getSnapshot(),
      event: {type: 'serialize', originEvent: 'drag.dragstart'},
    })
    if (json.type === 'serialization.failure') {
      assert.fail(json.reason)
    }
    const dataTransfer = new DataTransfer()
    dataTransfer.setData(json.mimeType, json.data)

    const dropPath = [
      {_key: tableKey},
      'rows',
      {_key: row2Key},
      'cells',
      {_key: r2c3Key},
      'content',
      {_key: r2c3BlockKey},
      'children',
      {_key: r2c3SpanKey},
    ]
    editor.send({
      type: 'drag.drop',
      originEvent: {dataTransfer},
      dragOrigin: {selection: imageSelection},
      position: {
        block: 'end',
        isEditor: false,
        isContainer: true,
        selection: {
          anchor: {path: dropPath, offset: 0},
          focus: {path: dropPath, offset: 0},
        },
      },
    })

    await vi.waitFor(() => {
      // After the drop, the image lives in the destination cell. The source
      // cell holds an engine-inserted empty placeholder block. All other
      // cells are unchanged.
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: tableKey,
          _type: 'table',
          rows: [
            {
              _key: row1Key,
              _type: 'row',
              cells: [
                {
                  _key: r1c1Key,
                  _type: 'cell',
                  content: [emptyTextBlock(r1c1BlockKey, r1c1SpanKey)],
                },
                {
                  _key: r1c2Key,
                  _type: 'cell',
                  content: [emptyTextBlock(r1c2BlockKey, r1c2SpanKey)],
                },
                {
                  _key: r1c3Key,
                  _type: 'cell',
                  content: [emptyTextBlock(r1c3BlockKey, r1c3SpanKey)],
                },
              ],
            },
            {
              _key: row2Key,
              _type: 'row',
              cells: [
                {
                  _key: r2c1Key,
                  _type: 'cell',
                  content: [emptyTextBlock(r2c1BlockKey, r2c1SpanKey)],
                },
                {
                  _key: r2c2Key,
                  _type: 'cell',
                  content: [
                    {
                      _key: 'k22',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k23', _type: 'span', text: '', marks: []},
                      ],
                    },
                  ],
                },
                {
                  _key: r2c3Key,
                  _type: 'cell',
                  content: [
                    emptyTextBlock(r2c3BlockKey, r2c3SpanKey),
                    {
                      _key: imageKey,
                      _type: 'image',
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

  test('Scenario: Dragging a multi-block selection (text + image + text) inside a cell drags the whole selection', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const c1Key = keyGenerator()
    const c1b1Key = keyGenerator()
    const c1b1SpanKey = keyGenerator()
    const c1ImageKey = keyGenerator()
    const c1b2Key = keyGenerator()
    const c1b2SpanKey = keyGenerator()
    const c2Key = keyGenerator()
    const c2BlockKey = keyGenerator()
    const c2SpanKey = keyGenerator()

    const {locator, editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
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
                                of: [{type: 'block'}, {type: 'image'}],
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
      }),
      initialValue: [
        {
          _key: tableKey,
          _type: 'table',
          rows: [
            {
              _key: rowKey,
              _type: 'row',
              cells: [
                {
                  _key: c1Key,
                  _type: 'cell',
                  content: [
                    {
                      _key: c1b1Key,
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: c1b1SpanKey,
                          _type: 'span',
                          text: 'foo',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _key: c1ImageKey,
                      _type: 'image',
                      src: 'https://example.com/image.jpg',
                    },
                    {
                      _key: c1b2Key,
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: c1b2SpanKey,
                          _type: 'span',
                          text: 'bar',
                          marks: [],
                        },
                      ],
                    },
                  ],
                },
                {
                  _key: c2Key,
                  _type: 'cell',
                  content: [
                    {
                      _key: c2BlockKey,
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: c2SpanKey, _type: 'span', text: '', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'table',
              arrayField: 'rows',
              render: ({attributes, children}) => (
                <div {...attributes}>{children}</div>
              ),
              of: [
                defineContainer({
                  type: 'row',
                  arrayField: 'cells',
                  render: ({attributes, children}) => (
                    <div {...attributes}>{children}</div>
                  ),
                  of: [
                    defineContainer({
                      type: 'cell',
                      arrayField: 'content',
                      render: ({attributes, children}) => (
                        <div {...attributes}>{children}</div>
                      ),
                    }),
                  ],
                }),
              ],
            }),
          ]}
        />
      ),
    })

    // Selection spans all three blocks inside cell 1: from the start of
    // `foo` to the end of `bar`.
    const c1b1SpanPath = [
      {_key: tableKey},
      'rows',
      {_key: rowKey},
      'cells',
      {_key: c1Key},
      'content',
      {_key: c1b1Key},
      'children',
      {_key: c1b1SpanKey},
    ]
    const c1b2SpanPath = [
      {_key: tableKey},
      'rows',
      {_key: rowKey},
      'cells',
      {_key: c1Key},
      'content',
      {_key: c1b2Key},
      'children',
      {_key: c1b2SpanKey},
    ]
    const selection = {
      anchor: {path: c1b1SpanPath, offset: 0},
      focus: {path: c1b2SpanPath, offset: 3},
    }

    await userEvent.click(locator)
    editor.send({type: 'select', at: selection})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        ...selection,
        backward: false,
      })
    })

    // Drag handle is the image: `dragOrigin.selection` is collapsed on the
    // image. This mirrors the DOM dragstart event when the user grabs the
    // image while a multi-block selection is active.
    const imagePath = [
      {_key: tableKey},
      'rows',
      {_key: rowKey},
      'cells',
      {_key: c1Key},
      'content',
      {_key: c1ImageKey},
    ]
    const imageOriginSelection = {
      anchor: {path: imagePath, offset: 0},
      focus: {path: imagePath, offset: 0},
    }

    const json = converterPortableText.serialize({
      snapshot: editor.getSnapshot(),
      event: {type: 'serialize', originEvent: 'drag.dragstart'},
    })
    if (json.type === 'serialization.failure') {
      assert.fail(json.reason)
    }
    const dataTransfer = new DataTransfer()
    dataTransfer.setData(json.mimeType, json.data)

    const dropPath = [
      {_key: tableKey},
      'rows',
      {_key: rowKey},
      'cells',
      {_key: c2Key},
      'content',
      {_key: c2BlockKey},
      'children',
      {_key: c2SpanKey},
    ]
    editor.send({
      type: 'drag.drop',
      originEvent: {dataTransfer},
      dragOrigin: {selection: imageOriginSelection},
      position: {
        block: 'end',
        isEditor: false,
        isContainer: true,
        selection: {
          anchor: {path: dropPath, offset: 0},
          focus: {path: dropPath, offset: 0},
        },
      },
    })

    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value
      const rows = (
        value[0] as unknown as {
          rows: Array<{cells: Array<{content: Array<{_type: string}>}>}>
        }
      ).rows
      const cell1Content = rows[0]!.cells[0]!.content
      const cell2Content = rows[0]!.cells[1]!.content

      // Cell 1 should be left with a single empty placeholder block: the
      // text+image+text selection was dragged out wholesale.
      expect(cell1Content.length).toBe(1)
      expect(cell1Content[0]?._type).toBe('block')

      // Cell 2 should hold its original empty placeholder followed by the
      // three dragged blocks in order.
      expect(cell2Content.map((b) => b._type)).toEqual([
        'block',
        'block',
        'image',
        'block',
      ])
    })
  })

  test('Scenario: dragging a block-object into a cell whose schema also lists the same _type as an inline-object stays a block, not an inline', async () => {
    const keyGenerator = createTestKeyGenerator()
    const rootBlockKey = keyGenerator()
    const rootSpanKey = keyGenerator()
    const rootImageKey = keyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const cellBlockKey = keyGenerator()
    const cellSpanKey = keyGenerator()

    const imageLeaf = defineBlockObject({type: 'image'})
    const cellContainer = defineContainer({
      type: 'cell',
      arrayField: 'content',
      of: [imageLeaf],
    })
    const rowContainer = defineContainer({
      type: 'row',
      arrayField: 'cells',
      of: [cellContainer],
    })
    const tableContainer = defineContainer({
      type: 'table',
      arrayField: 'rows',
      of: [rowContainer],
    })

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
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
                                    name: 'image',
                                    fields: [{name: 'src', type: 'string'}],
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
        inlineObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
        ],
      }),
      initialValue: [
        {
          _key: rootBlockKey,
          _type: 'block',
          children: [
            {_key: rootSpanKey, _type: 'span', text: 'foo', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: rootImageKey,
          _type: 'image',
          src: 'https://example.com/image.jpg',
        },
        {
          _key: tableKey,
          _type: 'table',
          rows: [
            {
              _key: rowKey,
              _type: 'row',
              cells: [
                {
                  _key: cellKey,
                  _type: 'cell',
                  content: [
                    {
                      _key: cellBlockKey,
                      _type: 'block',
                      children: [
                        {
                          _key: cellSpanKey,
                          _type: 'span',
                          text: '',
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
      children: <NodePlugin nodes={[tableContainer]} />,
    })

    const imageSelection = {
      anchor: {path: [{_key: rootImageKey}], offset: 0},
      focus: {path: [{_key: rootImageKey}], offset: 0},
    }
    editor.send({type: 'select', at: imageSelection})

    const json = converterPortableText.serialize({
      snapshot: editor.getSnapshot(),
      event: {type: 'serialize', originEvent: 'drag.dragstart'},
    })
    if (json.type === 'serialization.failure') {
      assert.fail(json.reason)
    }
    const dataTransfer = new DataTransfer()
    dataTransfer.setData(json.mimeType, json.data)

    const cellSpanPath = [
      {_key: tableKey},
      'rows',
      {_key: rowKey},
      'cells',
      {_key: cellKey},
      'content',
      {_key: cellBlockKey},
      'children',
      {_key: cellSpanKey},
    ]
    editor.send({
      type: 'drag.drop',
      originEvent: {dataTransfer},
      dragOrigin: {selection: imageSelection},
      position: {
        block: 'start',
        isEditor: false,
        isContainer: false,
        selection: {
          anchor: {path: cellSpanPath, offset: 0},
          focus: {path: cellSpanPath, offset: 0},
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: rootBlockKey,
          _type: 'block',
          children: [
            {_key: rootSpanKey, _type: 'span', text: 'foo', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: tableKey,
          _type: 'table',
          rows: [
            {
              _key: rowKey,
              _type: 'row',
              cells: [
                {
                  _key: cellKey,
                  _type: 'cell',
                  content: [
                    {
                      _key: rootImageKey,
                      _type: 'image',
                      src: 'https://example.com/image.jpg',
                    },
                    {
                      _key: cellBlockKey,
                      _type: 'block',
                      children: [
                        {_key: cellSpanKey, _type: 'span', text: '', marks: []},
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
      ])
    })
  })
})
