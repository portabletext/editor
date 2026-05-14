import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer, defineTextBlock} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

/**
 * Normalize browser-specific CSS serialization in innerHTML.
 * Webkit serializes outline:none as outline:medium and omits user-select:none.
 */
function normalizeInnerHTML(html: string): string {
  return html
    .replace(/outline: medium/g, 'outline: none')
    .replace(/ style="user-select: none;"/g, '')
}

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
  ],
})

const calloutContainer = defineContainer({
  type: 'callout',
  childField: 'content',
  render: ({attributes, children}) => (
    <div data-testid="callout" {...attributes}>
      {children}
    </div>
  ),
})

describe('container rendering', () => {
  test('callout renders with correct DOM structure', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const calloutKey = keyGenerator()

    await createTestEditor({
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
              _key: 'content-block',
              children: [
                {
                  _type: 'span',
                  _key: 'content-span',
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
      children: <ContainerPlugin containers={[calloutContainer]} />,
    })

    await vi.waitFor(() => {
      const editorElement = document.querySelector('[data-slate-editor]')
      expect(editorElement).not.toEqual(null)

      expect(editorElement!.innerHTML).toEqual(
        [
          '<div',
          ' data-slate-node="element"',
          ' data-pt-path="[_key==&quot;k0&quot;]"',
          ' class="pt-block pt-text-block pt-text-block-style-normal"',
          ' data-block-key="k0"',
          ' data-block-name="block"',
          ' data-block-type="text"',
          ' data-pt-block-type="text"',
          ' data-style="normal">',
          '<div>',
          '<span',
          ' data-slate-node="text"',
          ' data-pt-path="[_key==&quot;k0&quot;].children[_key==&quot;k1&quot;]"',
          ' data-child-key="k1"',
          ' data-child-name="span"',
          ' data-child-type="span"',
          ' data-pt-child-type="span">',
          '<span data-slate-leaf="true" data-pt-mark="true">',
          '<span data-slate-string="true" data-pt-string="true">',
          'hello',
          '</span>',
          '</span>',
          '</span>',
          '</div>',
          '</div>',
          '<div data-testid="callout" data-pt-block-type="container" data-pt-path="[_key==&quot;k2&quot;]">',
          '<div',
          ' data-pt-path="[_key==&quot;k2&quot;].content[_key==&quot;content-block&quot;]"',
          ' data-pt-block-type="text">',
          '<span',
          ' data-pt-path="[_key==&quot;k2&quot;].content[_key==&quot;content-block&quot;].children[_key==&quot;content-span&quot;]"',
          ' data-pt-child-type="span">',
          '<span data-pt-mark="true">',
          '<span data-pt-string="true">',
          'inside callout',
          '</span>',
          '</span>',
          '</span>',
          '</div>',
          '</div>',
        ].join(''),
      )
    })
  })

  test('node prop receives the raw node data', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const calloutKey = keyGenerator()

    const receivedNodes: Array<{_type: string; _key: string}> = []

    const trackingContainer = defineContainer({
      type: 'callout',
      childField: 'content',
      render: ({attributes, children, node}) => {
        receivedNodes.push({_type: node._type, _key: node._key})
        return (
          <div data-testid="callout" {...attributes}>
            {children}
          </div>
        )
      },
    })

    await createTestEditor({
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
              _key: 'content-block',
              children: [
                {
                  _type: 'span',
                  _key: 'content-span',
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
      children: <ContainerPlugin containers={[trackingContainer]} />,
    })

    await vi.waitFor(() => {
      expect(receivedNodes.at(-1)).toEqual({
        _type: 'callout',
        _key: calloutKey,
      })
    })
  })
})

describe('table with nested rows and cells', () => {
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

  const tableContainer = defineContainer({
    type: 'table',
    childField: 'rows',
    render: ({attributes, children}) => (
      <table data-testid="table" {...attributes}>
        <tbody>{children}</tbody>
      </table>
    ),
  })

  const rowContainer = defineContainer({
    type: 'row',
    childField: 'cells',
    render: ({attributes, children}) => (
      <tr data-testid="row" {...attributes}>
        {children}
      </tr>
    ),
  })

  const cellContainer = defineContainer({
    type: 'cell',
    childField: 'content',
    render: ({attributes, children}) => (
      <td data-testid="cell" {...attributes}>
        {children}
      </td>
    ),
  })

  test('renders three levels of nesting with correct DOM structure', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()

    await createTestEditor({
      keyGenerator,
      schemaDefinition: tableSchemaDefinition,
      initialValue: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: 'row-0',
              cells: [
                {
                  _type: 'cell',
                  _key: 'cell-0',
                  content: [
                    {
                      _type: 'block',
                      _key: 'block-0',
                      children: [
                        {
                          _type: 'span',
                          _key: 'span-0',
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
        <ContainerPlugin
          containers={[tableContainer, rowContainer, cellContainer]}
        />
      ),
    })

    await vi.waitFor(() => {
      const editorElement = document.querySelector('[data-slate-editor]')
      expect(editorElement).not.toEqual(null)

      expect(editorElement!.innerHTML).toEqual(
        [
          '<table data-testid="table" data-pt-block-type="container" data-pt-path="[_key==&quot;k0&quot;]">',
          '<tbody>',
          '<tr',
          ' data-testid="row"',
          ' data-pt-block-type="container"',
          ' data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;row-0&quot;]">',
          '<td',
          ' data-testid="cell"',
          ' data-pt-block-type="container"',
          ' data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;row-0&quot;].cells[_key==&quot;cell-0&quot;]">',
          '<div',
          ' data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;row-0&quot;].cells[_key==&quot;cell-0&quot;].content[_key==&quot;block-0&quot;]"',
          ' data-pt-block-type="text">',
          '<span',
          ' data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;row-0&quot;].cells[_key==&quot;cell-0&quot;].content[_key==&quot;block-0&quot;].children[_key==&quot;span-0&quot;]"',
          ' data-pt-child-type="span">',
          '<span data-pt-mark="true">',
          '<span data-pt-string="true">',
          'cell text',
          '</span>',
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
})

describe('container with non-editable fields', () => {
  const cardSchemaDefinition = defineSchema({
    blockObjects: [
      {
        name: 'card',
        fields: [
          {
            name: 'body',
            type: 'array',
            of: [{type: 'block'}],
          },
          {
            name: 'tags',
            type: 'array',
            of: [{type: 'string'}],
          },
        ],
      },
    ],
  })

  const cardContainer = defineContainer({
    type: 'card',
    childField: 'body',
    render: ({attributes, children}) => (
      <div data-testid="card" {...attributes}>
        {children}
      </div>
    ),
  })

  test('only editable fields render in the DOM', async () => {
    const keyGenerator = createTestKeyGenerator()
    const cardKey = keyGenerator()

    await createTestEditor({
      keyGenerator,
      schemaDefinition: cardSchemaDefinition,
      initialValue: [
        {
          _type: 'card',
          _key: cardKey,
          body: [
            {
              _type: 'block',
              _key: 'body-block',
              children: [
                {
                  _type: 'span',
                  _key: 'body-span',
                  text: 'card body',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
          tags: ['tag1', 'tag2'],
        },
      ],
      children: <ContainerPlugin containers={[cardContainer]} />,
    })

    await vi.waitFor(() => {
      const editorElement = document.querySelector('[data-slate-editor]')
      expect(editorElement).not.toEqual(null)

      expect(editorElement!.innerHTML).toEqual(
        [
          '<div data-testid="card" data-pt-block-type="container" data-pt-path="[_key==&quot;k0&quot;]">',
          '<div',
          ' data-pt-path="[_key==&quot;k0&quot;].body[_key==&quot;body-block&quot;]"',
          ' data-pt-block-type="text">',
          '<span',
          ' data-pt-path="[_key==&quot;k0&quot;].body[_key==&quot;body-block&quot;].children[_key==&quot;body-span&quot;]"',
          ' data-pt-child-type="span">',
          '<span data-pt-mark="true">',
          '<span data-pt-string="true">',
          'card body',
          '</span>',
          '</span>',
          '</span>',
          '</div>',
          '</div>',
        ].join(''),
      )
    })
  })
})

describe('positional block-leaf override', () => {
  test('block-leaf override in callout.of applies to text blocks inside the callout', async () => {
    // v2 equivalent of v6's "$..callout.block" scoped override. The
    // outer callout container's `of` array carries a leaf entry for
    // `type: 'block'` whose render replaces the engine default for
    // text blocks rendered as immediate children of that callout.
    //
    // Text blocks at the root keep using the engine default; only the
    // text block INSIDE the callout picks up the positional override.
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()

    await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: 'root-block',
          children: [
            {
              _type: 'span',
              _key: 'root-span',
              text: 'root text',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: 'callout-block',
              children: [
                {
                  _type: 'span',
                  _key: 'callout-span',
                  text: 'callout text',
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
        <ContainerPlugin
          containers={[
            defineContainer({
              type: 'callout',
              childField: 'content',
              render: ({attributes, children}) => (
                <div data-testid="callout" {...attributes}>
                  {children}
                </div>
              ),
              of: [
                defineTextBlock({
                  type: 'block',
                  render: ({attributes, children}) => (
                    <p data-testid="callout-block" {...attributes}>
                      {children}
                    </p>
                  ),
                }),
              ],
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      const editorElement = document.querySelector('[data-slate-editor]')
      expect(editorElement).not.toEqual(null)

      // The text block inside the callout picks up the positional override
      const calloutBlock = editorElement!.querySelector(
        '[data-testid="callout-block"]',
      )
      expect(calloutBlock).not.toEqual(null)
      expect(calloutBlock!.textContent).toEqual('callout text')

      // The text block at the root uses the engine default (no
      // data-testid="callout-block"). Its content should still be present.
      expect(editorElement!.textContent).toContain('root text')

      // And the root-level text block doesn't pass through the
      // callout-positional override (there's exactly one callout-block).
      const overrides = editorElement!.querySelectorAll(
        '[data-testid="callout-block"]',
      )
      expect(overrides.length).toEqual(1)
    })
  })
})

describe('container and renderer independence', () => {
  test('container without renderer falls back to default div', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()

    await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: 'content-block',
              children: [
                {
                  _type: 'span',
                  _key: 'content-span',
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
        <ContainerPlugin
          containers={[
            {
              ...calloutContainer,
              render: ({attributes, children}) => (
                <div {...attributes}>{children}</div>
              ),
            },
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      const editorElement = document.querySelector('[data-slate-editor]')
      expect(editorElement).not.toEqual(null)

      expect(editorElement!.innerHTML).toEqual(
        [
          '<div data-pt-block-type="container" data-pt-path="[_key==&quot;k0&quot;]">',
          '<div',
          ' data-pt-path="[_key==&quot;k0&quot;].content[_key==&quot;content-block&quot;]"',
          ' data-pt-block-type="text">',
          '<span',
          ' data-pt-path="[_key==&quot;k0&quot;].content[_key==&quot;content-block&quot;].children[_key==&quot;content-span&quot;]"',
          ' data-pt-child-type="span">',
          '<span data-pt-mark="true">',
          '<span data-pt-string="true">',
          'inside callout',
          '</span>',
          '</span>',
          '</span>',
          '</div>',
          '</div>',
        ].join(''),
      )
    })
  })

  test('renderer without container renders as void block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()

    await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: 'content-block',
              children: [
                {
                  _type: 'span',
                  _key: 'content-span',
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
      children: <ContainerPlugin containers={[]} />,
    })

    await vi.waitFor(() => {
      const editorElement = document.querySelector('[data-slate-editor]')
      expect(editorElement).not.toEqual(null)

      // The callout renders as a void block object, not using the custom renderer
      const calloutTestId = editorElement!.querySelector(
        '[data-testid="callout"]',
      )
      expect(calloutTestId).toEqual(null)

      // Verify it renders as a void block object with contentEditable=false
      const blockObject = editorElement!.querySelector(
        '[data-block-type="object"]',
      )
      expect(blockObject).not.toEqual(null)
      expect(
        blockObject!.querySelector('[contenteditable="false"]'),
      ).not.toEqual(null)
    })
  })
})

describe('code block container', () => {
  const codeBlockSchemaDefinition = defineSchema({
    blockObjects: [
      {
        name: 'code-block',
        fields: [
          {
            name: 'code',
            type: 'array',
            of: [{type: 'block'}],
          },
        ],
      },
    ],
  })

  const codeBlockContainer = defineContainer({
    type: 'code-block',
    childField: 'code',
    render: ({attributes, children}) => (
      <pre data-testid="code-block" {...attributes}>
        <code>{children}</code>
      </pre>
    ),
  })

  test('code block renders with correct DOM structure', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()

    await createTestEditor({
      keyGenerator,
      schemaDefinition: codeBlockSchemaDefinition,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          code: [
            {
              _type: 'block',
              _key: 'line-0',
              children: [
                {
                  _type: 'span',
                  _key: 'span-0',
                  text: 'const a = 1',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'line-1',
              children: [
                {
                  _type: 'span',
                  _key: 'span-1',
                  text: 'console.log(a)',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    await vi.waitFor(() => {
      const editorElement = document.querySelector('[data-slate-editor]')
      expect(editorElement).not.toEqual(null)
      expect(editorElement!.innerHTML).toEqual(
        [
          '<pre data-testid="code-block" data-pt-block-type="container" data-pt-path="[_key==&quot;k0&quot;]">',
          '<code>',
          '<div data-pt-path="[_key==&quot;k0&quot;].code[_key==&quot;line-0&quot;]" data-pt-block-type="text">',
          '<span',
          ' data-pt-path="[_key==&quot;k0&quot;].code[_key==&quot;line-0&quot;].children[_key==&quot;span-0&quot;]"',
          ' data-pt-child-type="span">',
          '<span data-pt-mark="true">',
          '<span data-pt-string="true">',
          'const a = 1',
          '</span>',
          '</span>',
          '</span>',
          '</div>',
          '<div data-pt-path="[_key==&quot;k0&quot;].code[_key==&quot;line-1&quot;]" data-pt-block-type="text">',
          '<span',
          ' data-pt-path="[_key==&quot;k0&quot;].code[_key==&quot;line-1&quot;].children[_key==&quot;span-1&quot;]"',
          ' data-pt-child-type="span">',
          '<span data-pt-mark="true">',
          '<span data-pt-string="true">',
          'console.log(a)',
          '</span>',
          '</span>',
          '</span>',
          '</div>',
          '</code>',
          '</pre>',
        ].join(''),
      )
    })
  })
})

describe('gallery with void block objects', () => {
  const gallerySchemaDefinition = defineSchema({
    blockObjects: [
      {
        name: 'gallery',
        fields: [
          {
            name: 'items',
            type: 'array',
            of: [{type: 'image'}],
          },
        ],
      },
      {
        name: 'image',
        fields: [{name: 'url', type: 'string'}],
      },
    ],
  })

  const galleryContainer = defineContainer({
    type: 'gallery',
    childField: 'items',
    render: ({attributes, children}) => (
      <div data-testid="gallery" {...attributes}>
        {children}
      </div>
    ),
  })

  test('gallery renders void block objects with correct DOM structure', async () => {
    const keyGenerator = createTestKeyGenerator()
    const galleryKey = keyGenerator()

    await createTestEditor({
      keyGenerator,
      schemaDefinition: gallerySchemaDefinition,
      initialValue: [
        {
          _type: 'gallery',
          _key: galleryKey,
          items: [
            {
              _type: 'image',
              _key: 'img-0',
              url: 'https://example.com/photo.jpg',
            },
            {
              _type: 'image',
              _key: 'img-1',
              url: 'https://example.com/photo2.jpg',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[galleryContainer]} />,
    })

    await vi.waitFor(() => {
      const editorElement = document.querySelector('[data-slate-editor]')
      expect(editorElement).not.toEqual(null)
      expect(normalizeInnerHTML(editorElement!.innerHTML)).toEqual(
        [
          '<div data-testid="gallery" data-pt-block-type="container" data-pt-path="[_key==&quot;k0&quot;]">',
          '<div',
          ' data-pt-path="[_key==&quot;k0&quot;].items[_key==&quot;img-0&quot;]"',
          ' data-pt-block-type="object">',
          '<div',
          ' data-pt-spacer="true"',
          ' style="height: 0px; color: transparent; outline: none; position: absolute;">',
          '<span>',
          '<span data-pt-mark="true">',
          '<span data-pt-zero-width="z">',
          '﻿',
          '</span>',
          '</span>',
          '</span>',
          '</div>',
          '<div contenteditable="false">',
          '[image: img-0]',
          '</div>',
          '</div>',
          '<div',
          ' data-pt-path="[_key==&quot;k0&quot;].items[_key==&quot;img-1&quot;]"',
          ' data-pt-block-type="object">',
          '<div',
          ' data-pt-spacer="true"',
          ' style="height: 0px; color: transparent; outline: none; position: absolute;">',
          '<span>',
          '<span data-pt-mark="true">',
          '<span data-pt-zero-width="z">',
          '﻿',
          '</span>',
          '</span>',
          '</span>',
          '</div>',
          '<div contenteditable="false">',
          '[image: img-1]',
          '</div>',
          '</div>',
          '</div>',
        ].join(''),
      )
    })
  })
})

describe('cell with mixed content', () => {
  const mixedSchemaDefinition = defineSchema({
    blockObjects: [
      {
        name: 'image',
        fields: [{name: 'url', type: 'string'}],
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
  })

  const tableContainer = defineContainer({
    type: 'table',
    childField: 'rows',
    render: ({attributes, children}) => (
      <table data-testid="table" {...attributes}>
        <tbody>{children}</tbody>
      </table>
    ),
  })

  const rowContainer = defineContainer({
    type: 'row',
    childField: 'cells',
    render: ({attributes, children}) => (
      <tr data-testid="row" {...attributes}>
        {children}
      </tr>
    ),
  })

  const cellContainer = defineContainer({
    type: 'cell',
    childField: 'content',
    render: ({attributes, children}) => (
      <td data-testid="cell" {...attributes}>
        {children}
      </td>
    ),
  })

  test('cell renders both text blocks and void block objects', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()

    await createTestEditor({
      keyGenerator,
      schemaDefinition: mixedSchemaDefinition,
      initialValue: [
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: 'row-0',
              cells: [
                {
                  _type: 'cell',
                  _key: 'cell-0',
                  content: [
                    {
                      _type: 'block',
                      _key: 'block-0',
                      children: [
                        {
                          _type: 'span',
                          _key: 'span-0',
                          text: 'text before image',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                    {
                      _type: 'image',
                      _key: 'img-0',
                      url: 'https://example.com/photo.jpg',
                    },
                    {
                      _type: 'block',
                      _key: 'block-1',
                      children: [
                        {
                          _type: 'span',
                          _key: 'span-1',
                          text: 'text after image',
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
        <ContainerPlugin
          containers={[tableContainer, rowContainer, cellContainer]}
        />
      ),
    })

    await vi.waitFor(() => {
      const editorElement = document.querySelector('[data-slate-editor]')
      expect(editorElement).not.toEqual(null)
      expect(normalizeInnerHTML(editorElement!.innerHTML)).toEqual(
        [
          '<table data-testid="table" data-pt-block-type="container" data-pt-path="[_key==&quot;k0&quot;]">',
          '<tbody>',
          '<tr',
          ' data-testid="row"',
          ' data-pt-block-type="container"',
          ' data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;row-0&quot;]">',
          '<td',
          ' data-testid="cell"',
          ' data-pt-block-type="container"',
          ' data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;row-0&quot;].cells[_key==&quot;cell-0&quot;]">',
          '<div',
          ' data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;row-0&quot;].cells[_key==&quot;cell-0&quot;].content[_key==&quot;block-0&quot;]"',
          ' data-pt-block-type="text">',
          '<span',
          ' data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;row-0&quot;].cells[_key==&quot;cell-0&quot;].content[_key==&quot;block-0&quot;].children[_key==&quot;span-0&quot;]"',
          ' data-pt-child-type="span">',
          '<span data-pt-mark="true">',
          '<span data-pt-string="true">',
          'text before image',
          '</span>',
          '</span>',
          '</span>',
          '</div>',
          '<div',
          ' data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;row-0&quot;].cells[_key==&quot;cell-0&quot;].content[_key==&quot;img-0&quot;]"',
          ' data-pt-block-type="object">',
          '<div',
          ' data-pt-spacer="true"',
          ' style="height: 0px; color: transparent; outline: none; position: absolute;">',
          '<span>',
          '<span data-pt-mark="true">',
          '<span data-pt-zero-width="z">',
          '﻿',
          '</span>',
          '</span>',
          '</span>',
          '</div>',
          '<div contenteditable="false">',
          '[image: img-0]',
          '</div>',
          '</div>',
          '<div',
          ' data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;row-0&quot;].cells[_key==&quot;cell-0&quot;].content[_key==&quot;block-1&quot;]"',
          ' data-pt-block-type="text">',
          '<span',
          ' data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;row-0&quot;].cells[_key==&quot;cell-0&quot;].content[_key==&quot;block-1&quot;].children[_key==&quot;span-1&quot;]"',
          ' data-pt-child-type="span">',
          '<span data-pt-mark="true">',
          '<span data-pt-string="true">',
          'text after image',
          '</span>',
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
})

describe('self-referential containers', () => {
  const listSchema = defineSchema({
    blockObjects: [
      {
        name: 'list',
        fields: [
          {
            name: 'items',
            type: 'array',
            of: [
              {
                type: 'object',
                name: 'list-item',
                fields: [
                  {
                    name: 'content',
                    type: 'array',
                    of: [{type: 'block'}, {type: 'list'}],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  })

  const listContainer = defineContainer({
    type: 'list',
    childField: 'items',
    render: ({attributes, children}) => (
      <ul data-testid="list" {...attributes}>
        {children}
      </ul>
    ),
  })

  const listItemContainer = defineContainer({
    type: 'list-item',
    childField: 'content',
    render: ({attributes, children}) => (
      <li data-testid="list-item" {...attributes}>
        {children}
      </li>
    ),
  })

  test('list nested 3 levels deep renders all levels as containers', async () => {
    const keyGenerator = createTestKeyGenerator()
    const k = () => keyGenerator()
    const block = (text: string) => ({
      _type: 'block' as const,
      _key: k(),
      children: [{_type: 'span', _key: k(), text, marks: []}],
      markDefs: [],
      style: 'normal',
    })
    const item = (content: any[]) => ({
      _type: 'list-item',
      _key: k(),
      content,
    })
    const list = (items: any[]) => ({_type: 'list', _key: k(), items})

    // Three levels: list > list-item > list > list-item > list > list-item
    const value = [
      list([
        item([
          block('outer'),
          list([item([block('middle'), list([item([block('inner')])])])]),
        ]),
      ]),
    ]

    const {locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: listSchema,
      initialValue: value,
      children: (
        <ContainerPlugin containers={[listContainer, listItemContainer]} />
      ),
    })

    await vi.waitFor(() => {
      expect(locator.getByTestId('list').elements()).toHaveLength(3)
    })
    await vi.waitFor(() => {
      expect(locator.getByTestId('list-item').elements()).toHaveLength(3)
    })
  })
})
