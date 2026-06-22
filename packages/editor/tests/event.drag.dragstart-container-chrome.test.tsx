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

describe('chrome drag', () => {
  test('Scenario: dragging a callout chrome drops the whole callout', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const lineKey = keyGenerator()
    const spanKey = keyGenerator()
    const trailingBlockKey = keyGenerator()
    const trailingSpanKey = keyGenerator()

    const calloutContainer = defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({attributes, children}) => (
        <aside {...attributes}>
          <span contentEditable={false} data-testid="chrome-icon">
            !
          </span>
          {children}
        </aside>
      ),
    })

    const {locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
      initialValue: [
        {
          _key: calloutKey,
          _type: 'callout',
          content: [
            {
              _key: lineKey,
              _type: 'block',
              children: [
                {_key: spanKey, _type: 'span', text: 'note', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _key: trailingBlockKey,
          _type: 'block',
          children: [
            {_key: trailingSpanKey, _type: 'span', text: 'foo', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={[calloutContainer]} />,
    })

    await userEvent.click(locator)

    const icon = locator.element().querySelector('[data-testid="chrome-icon"]')
    assert(icon)
    const rect = icon.getBoundingClientRect()

    const dataTransfer = new DataTransfer()
    icon.dispatchEvent(
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
          _key: calloutKey,
          _type: 'callout',
          content: [
            {
              _key: lineKey,
              _type: 'block',
              children: [
                {_key: spanKey, _type: 'span', text: 'note', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('Scenario: dragging a code-block chrome and dropping after a trailing block moves the code-block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const line1Key = keyGenerator()
    const line1SpanKey = keyGenerator()
    const line2Key = keyGenerator()
    const line2SpanKey = keyGenerator()
    const trailingBlockKey = keyGenerator()
    const trailingSpanKey = keyGenerator()

    const codeBlockContainer = defineContainer({
      type: 'code-block',
      arrayField: 'lines',
      render: ({attributes, children}) => (
        <pre {...attributes}>
          <span contentEditable={false} data-testid="code-chrome">
            ::
          </span>
          {children}
        </pre>
      ),
    })

    const {locator, editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'code-block',
            fields: [{name: 'lines', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
      initialValue: [
        {
          _key: codeBlockKey,
          _type: 'code-block',
          lines: [
            {
              _key: line1Key,
              _type: 'block',
              children: [
                {_key: line1SpanKey, _type: 'span', text: 'a', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _key: line2Key,
              _type: 'block',
              children: [
                {_key: line2SpanKey, _type: 'span', text: 'b', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _key: trailingBlockKey,
          _type: 'block',
          children: [
            {_key: trailingSpanKey, _type: 'span', text: 'tail', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={[codeBlockContainer]} />,
    })

    await userEvent.click(locator)

    const chrome = locator
      .element()
      .querySelector('[data-testid="code-chrome"]')
    assert(chrome)
    const rect = chrome.getBoundingClientRect()

    const dataTransfer = new DataTransfer()
    chrome.dispatchEvent(
      new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      }),
    )

    await vi.waitFor(() => {
      const ghostWithPre = document.body.querySelector('[data-dragged] pre')
      assert(ghostWithPre, 'Expected the drag ghost to contain a <pre>')
    })

    const dragSelection = {
      anchor: {path: [{_key: codeBlockKey}], offset: 0},
      focus: {path: [{_key: codeBlockKey}], offset: 0},
    }

    const serialized = converterPortableText.serialize({
      snapshot: {
        ...editor.getSnapshot(),
        context: {
          ...editor.getSnapshot().context,
          selection: dragSelection,
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
    const dropDataTransfer = new DataTransfer()
    dropDataTransfer.setData(serialized.mimeType, serialized.data)

    const trailingSpanPath = [
      {_key: trailingBlockKey},
      'children',
      {_key: trailingSpanKey},
    ]
    editor.send({
      type: 'drag.drop',
      originEvent: {dataTransfer: dropDataTransfer},
      dragOrigin: {selection: dragSelection},
      position: {
        block: 'end',
        isEditor: false,
        isContainer: false,
        selection: {
          anchor: {path: trailingSpanPath, offset: 4},
          focus: {path: trailingSpanPath, offset: 4},
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: trailingBlockKey,
          _type: 'block',
          children: [
            {_key: trailingSpanKey, _type: 'span', text: 'tail', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: codeBlockKey,
          _type: 'code-block',
          lines: [
            {
              _key: line1Key,
              _type: 'block',
              children: [
                {_key: line1SpanKey, _type: 'span', text: 'a', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _key: line2Key,
              _type: 'block',
              children: [
                {_key: line2SpanKey, _type: 'span', text: 'b', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })

    // The caret lands on the dropped code-block (end of its last line), not at
    // the top of the document. Pinning this against the validate-selection
    // fix that prevents toDOMRange races from resetting model selection.
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [
          {_key: codeBlockKey},
          'lines',
          {_key: line2Key},
          'children',
          {_key: line2SpanKey},
        ],
        offset: 1,
      },
      focus: {
        path: [
          {_key: codeBlockKey},
          'lines',
          {_key: line2Key},
          'children',
          {_key: line2SpanKey},
        ],
        offset: 1,
      },
      backward: false,
    })
  })

  test('Scenario: dragging an image from inside a table cell drops just the image, not the whole table', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const imageKey = keyGenerator()
    const trailingBlockKey = keyGenerator()
    const trailingSpanKey = keyGenerator()

    const cellContainer = defineContainer({
      type: 'cell',
      arrayField: 'content',
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
          {name: 'image'},
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
                  _key: cellKey,
                  _type: 'cell',
                  content: [{_key: imageKey, _type: 'image'}],
                },
              ],
            },
          ],
        },
        {
          _key: trailingBlockKey,
          _type: 'block',
          children: [
            {_key: trailingSpanKey, _type: 'span', text: 'tail', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={[tableContainer]} />,
    })

    const imagePath = [
      {_key: tableKey},
      'rows',
      {_key: rowKey},
      'cells',
      {_key: cellKey},
      'content',
      {_key: imageKey},
    ]
    editor.send({
      type: 'select',
      at: {
        anchor: {path: imagePath, offset: 0},
        focus: {path: imagePath, offset: 0},
      },
    })

    const dragSelection = editor.getSnapshot().context.selection
    assert(dragSelection !== null)

    const serialized = converterPortableText.serialize({
      snapshot: editor.getSnapshot(),
      event: {type: 'serialize', originEvent: 'drag.dragstart'},
    })
    if (serialized.type === 'serialization.failure') {
      assert.fail(serialized.reason)
    }

    expect(safeParse(serialized.data)).toEqual([
      {_key: imageKey, _type: 'image'},
    ])
  })

  test('Scenario: dragging a code-block chrome and dropping into an empty table cell moves the lines without leaving an empty code block behind', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const line1Key = keyGenerator()
    const line1SpanKey = keyGenerator()
    const line2Key = keyGenerator()
    const line2SpanKey = keyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const cellBlockKey = keyGenerator()
    const cellSpanKey = keyGenerator()

    const codeBlockContainer = defineContainer({
      type: 'code-block',
      arrayField: 'lines',
      render: ({attributes, children}) => (
        <pre {...attributes}>
          <span contentEditable={false} data-testid="code-chrome">
            ::
          </span>
          {children}
        </pre>
      ),
    })
    const cellContainer = defineContainer({
      type: 'cell',
      arrayField: 'content',
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

    const {locator, editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'code-block',
            fields: [{name: 'lines', type: 'array', of: [{type: 'block'}]}],
          },
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
      }),
      initialValue: [
        {
          _key: codeBlockKey,
          _type: 'code-block',
          lines: [
            {
              _key: line1Key,
              _type: 'block',
              children: [
                {_key: line1SpanKey, _type: 'span', text: 'a', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _key: line2Key,
              _type: 'block',
              children: [
                {_key: line2SpanKey, _type: 'span', text: 'b', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
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
      children: <NodePlugin nodes={[codeBlockContainer, tableContainer]} />,
    })

    await userEvent.click(locator)

    const chrome = locator
      .element()
      .querySelector('[data-testid="code-chrome"]')
    assert(chrome)
    const rect = chrome.getBoundingClientRect()

    const dataTransfer = new DataTransfer()
    chrome.dispatchEvent(
      new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      }),
    )

    const dragSelection = {
      anchor: {path: [{_key: codeBlockKey}], offset: 0},
      focus: {path: [{_key: codeBlockKey}], offset: 0},
    }

    const serialized = converterPortableText.serialize({
      snapshot: {
        ...editor.getSnapshot(),
        context: {
          ...editor.getSnapshot().context,
          selection: dragSelection,
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
    const dropDataTransfer = new DataTransfer()
    dropDataTransfer.setData(serialized.mimeType, serialized.data)

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
      originEvent: {dataTransfer: dropDataTransfer},
      dragOrigin: {selection: dragSelection},
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
      const value = editor.getSnapshot().context.value
      expect(value).toEqual([
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
                      _key: line1Key,
                      _type: 'block',
                      children: [
                        {
                          _key: line1SpanKey,
                          _type: 'span',
                          text: 'a',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                    {
                      _key: line2Key,
                      _type: 'block',
                      children: [
                        {
                          _key: line2SpanKey,
                          _type: 'span',
                          text: 'b',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
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

  test('Scenario: dropping an image onto an empty table cell chrome moves the image into the cell', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellAKey = keyGenerator()
    const cellAParaKey = keyGenerator()
    const cellASpanKey = keyGenerator()
    const imageKey = keyGenerator()
    const cellBKey = keyGenerator()
    const cellBParaKey = keyGenerator()
    const cellBSpanKey = keyGenerator()

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
      render: ({attributes, children}) => (
        <div {...attributes} data-testid="table-chrome">
          {children}
        </div>
      ),
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
                  _key: cellAKey,
                  _type: 'cell',
                  content: [
                    {
                      _key: cellAParaKey,
                      _type: 'block',
                      children: [
                        {
                          _key: cellASpanKey,
                          _type: 'span',
                          text: 'before',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                    {_key: imageKey, _type: 'image', src: 'x.png'},
                  ],
                },
                {
                  _key: cellBKey,
                  _type: 'cell',
                  content: [
                    {
                      _key: cellBParaKey,
                      _type: 'block',
                      children: [
                        {
                          _key: cellBSpanKey,
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

    const imagePath = [
      {_key: tableKey},
      'rows',
      {_key: rowKey},
      'cells',
      {_key: cellAKey},
      'content',
      {_key: imageKey},
    ]
    const cellBPath = [
      {_key: tableKey},
      'rows',
      {_key: rowKey},
      'cells',
      {_key: cellBKey},
    ]

    const dragSelection = {
      anchor: {path: imagePath, offset: 0},
      focus: {path: imagePath, offset: 0},
    }

    const serialized = converterPortableText.serialize({
      snapshot: {
        ...editor.getSnapshot(),
        context: {
          ...editor.getSnapshot().context,
          selection: dragSelection,
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
    const dropDataTransfer = new DataTransfer()
    dropDataTransfer.setData(serialized.mimeType, serialized.data)

    editor.send({
      type: 'drag.drop',
      originEvent: {dataTransfer: dropDataTransfer},
      dragOrigin: {selection: dragSelection},
      position: {
        block: 'start',
        isEditor: false,
        isContainer: true,
        selection: {
          anchor: {path: cellBPath, offset: 0},
          focus: {path: cellBPath, offset: 0},
        },
      },
    })

    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value
      expect(value).toEqual([
        {
          _key: tableKey,
          _type: 'table',
          rows: [
            {
              _key: rowKey,
              _type: 'row',
              cells: [
                {
                  _key: cellAKey,
                  _type: 'cell',
                  content: [
                    {
                      _key: cellAParaKey,
                      _type: 'block',
                      children: [
                        {
                          _key: cellASpanKey,
                          _type: 'span',
                          text: 'before',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                  ],
                },
                {
                  _key: cellBKey,
                  _type: 'cell',
                  content: [
                    {_type: 'image', _key: imageKey, src: 'x.png'},
                    {
                      _key: cellBParaKey,
                      _type: 'block',
                      children: [
                        {
                          _key: cellBSpanKey,
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
      ])
    })
  })

  test('Scenario: dragging a container chrome with an expanded selection covering a preceding block drops both blocks together', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const calloutKey = keyGenerator()
    const calloutInnerKey = keyGenerator()
    const calloutSpanKey = keyGenerator()
    const trailingBlockKey = keyGenerator()
    const trailingSpanKey = keyGenerator()

    const calloutContainer = defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({attributes, children}) => (
        <aside {...attributes}>
          <span contentEditable={false} data-testid="callout-chrome">
            !
          </span>
          {children}
        </aside>
      ),
    })

    const {locator, editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
      initialValue: [
        {
          _key: fooBlockKey,
          _type: 'block',
          children: [{_key: fooSpanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: calloutKey,
          _type: 'callout',
          content: [
            {
              _key: calloutInnerKey,
              _type: 'block',
              children: [
                {_key: calloutSpanKey, _type: 'span', text: 'call', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _key: trailingBlockKey,
          _type: 'block',
          children: [
            {_key: trailingSpanKey, _type: 'span', text: 'tail', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={[calloutContainer]} />,
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: calloutInnerKey},
            'children',
            {_key: calloutSpanKey},
          ],
          offset: 4,
        },
      },
    })

    const chrome = locator
      .element()
      .querySelector('[data-testid="callout-chrome"]')
    assert(chrome)
    const rect = chrome.getBoundingClientRect()

    const dataTransfer = new DataTransfer()
    chrome.dispatchEvent(
      new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      }),
    )

    await vi.waitFor(() => {
      assert(
        dataTransfer.getData('application/x-portable-text'),
        'Expected the drag to carry a portable-text payload',
      )
    })

    const dropDataTransfer = new DataTransfer()
    dropDataTransfer.setData(
      'application/x-portable-text',
      dataTransfer.getData('application/x-portable-text'),
    )

    const trailingSpanPath = [
      {_key: trailingBlockKey},
      'children',
      {_key: trailingSpanKey},
    ]
    editor.send({
      type: 'drag.drop',
      originEvent: {dataTransfer: dropDataTransfer},
      dragOrigin: {
        selection: {
          anchor: {
            path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
            offset: 0,
          },
          focus: {
            path: [
              {_key: calloutKey},
              'content',
              {_key: calloutInnerKey},
              'children',
              {_key: calloutSpanKey},
            ],
            offset: 4,
          },
        },
      },
      position: {
        block: 'end',
        isEditor: false,
        isContainer: false,
        selection: {
          anchor: {path: trailingSpanPath, offset: 4},
          focus: {path: trailingSpanPath, offset: 4},
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: trailingBlockKey,
          _type: 'block',
          children: [
            {_key: trailingSpanKey, _type: 'span', text: 'tail', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: fooBlockKey,
          _type: 'block',
          children: [{_key: fooSpanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: calloutKey,
          _type: 'callout',
          content: [
            {
              _key: calloutInnerKey,
              _type: 'block',
              children: [
                {_key: calloutSpanKey, _type: 'span', text: 'call', marks: []},
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
