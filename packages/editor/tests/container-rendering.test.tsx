import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
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
  ],
})

const calloutContainer = defineContainer({
  scope: 'callout',
  field: 'content',
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
      children: (
        <ContainerPlugin containers={[{container: calloutContainer}]} />
      ),
    })

    await vi.waitFor(() => {
      const editorElement = document.querySelector('[data-slate-editor]')
      expect(editorElement).not.toEqual(null)

      expect(editorElement!.innerHTML).toEqual(
        [
          // root text block
          '<div data-slate-node="element"',
          ' data-pt-path="[_key==&quot;k0&quot;]"',
          ' class="pt-block pt-text-block pt-text-block-style-normal"',
          ' data-block-key="k0"',
          ' data-block-name="block"',
          ' data-block-type="text"',
          ' data-style="normal"',
          '>',
          // text block inner wrapper
          '<div>',
          // span
          '<span data-slate-node="text"',
          ' data-pt-path="[_key==&quot;k0&quot;].children[_key==&quot;k1&quot;]"',
          ' data-child-key="k1"',
          ' data-child-name="span"',
          ' data-child-type="span"',
          '>',
          // leaf
          '<span data-slate-leaf="true">',
          '<span data-slate-string="true">hello</span>',
          '</span>',
          // /span
          '</span>',
          // /text block inner wrapper
          '</div>',
          // /root text block
          '</div>',
          // callout container
          '<div data-testid="callout"',
          ' data-slate-node="element"',
          ' data-pt-path="[_key==&quot;k2&quot;]"',
          '>',
          // inner text block
          '<div data-slate-node="element"',
          ' data-pt-path="[_key==&quot;k2&quot;].content[_key==&quot;content-block&quot;]"',
          ' class="pt-block pt-text-block pt-text-block-style-normal"',
          ' data-block-key="content-block"',
          ' data-block-name="block"',
          ' data-block-type="text"',
          ' data-style="normal"',
          '>',
          // inner text block wrapper
          '<div>',
          // inner span
          '<span data-slate-node="text"',
          ' data-pt-path="[_key==&quot;k2&quot;].content[_key==&quot;content-block&quot;].children[_key==&quot;content-span&quot;]"',
          ' data-child-key="content-span"',
          ' data-child-name="span"',
          ' data-child-type="span"',
          '>',
          // inner leaf
          '<span data-slate-leaf="true">',
          '<span data-slate-string="true">inside callout</span>',
          '</span>',
          // /inner span
          '</span>',
          // /inner text block wrapper
          '</div>',
          // /inner text block
          '</div>',
          // /callout container
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
      scope: 'callout',
      field: 'content',
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
      children: (
        <ContainerPlugin containers={[{container: trackingContainer}]} />
      ),
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

  const tableContainer = defineContainer({
    scope: 'table',
    field: 'rows',
    render: ({attributes, children}) => (
      <table data-testid="table" {...attributes}>
        <tbody>{children}</tbody>
      </table>
    ),
  })

  const rowContainer = defineContainer({
    scope: 'table.row',
    field: 'cells',
    render: ({attributes, children}) => (
      <tr data-testid="row" {...attributes}>
        {children}
      </tr>
    ),
  })

  const cellContainer = defineContainer({
    scope: 'table.row.cell',
    field: 'content',
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
          containers={[
            {container: tableContainer},
            {container: rowContainer},
            {container: cellContainer},
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      const editorElement = document.querySelector('[data-slate-editor]')
      expect(editorElement).not.toEqual(null)

      expect(editorElement!.innerHTML).toEqual(
        [
          // table container
          '<table data-testid="table"',
          ' data-slate-node="element"',
          ' data-pt-path="[_key==&quot;k0&quot;]"',
          '>',
          '<tbody>',
          // row container
          '<tr data-testid="row"',
          ' data-slate-node="element"',
          ' data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;row-0&quot;]"',
          '>',
          // cell container
          '<td data-testid="cell"',
          ' data-slate-node="element"',
          ' data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;row-0&quot;].cells[_key==&quot;cell-0&quot;]"',
          '>',
          // text block inside cell
          '<div data-slate-node="element"',
          ' data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;row-0&quot;].cells[_key==&quot;cell-0&quot;].content[_key==&quot;block-0&quot;]"',
          ' class="pt-block pt-text-block pt-text-block-style-normal"',
          ' data-block-key="block-0"',
          ' data-block-name="block"',
          ' data-block-type="text"',
          ' data-style="normal"',
          '>',
          // text block inner wrapper
          '<div>',
          // span
          '<span data-slate-node="text"',
          ' data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;row-0&quot;].cells[_key==&quot;cell-0&quot;].content[_key==&quot;block-0&quot;].children[_key==&quot;span-0&quot;]"',
          ' data-child-key="span-0"',
          ' data-child-name="span"',
          ' data-child-type="span"',
          '>',
          // leaf
          '<span data-slate-leaf="true">',
          '<span data-slate-string="true">cell text</span>',
          '</span>',
          // /span
          '</span>',
          // /text block inner wrapper
          '</div>',
          // /text block inside cell
          '</div>',
          // /cell container
          '</td>',
          // /row container
          '</tr>',
          '</tbody>',
          // /table container
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
    scope: 'card',
    field: 'body',
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
      children: <ContainerPlugin containers={[{container: cardContainer}]} />,
    })

    await vi.waitFor(() => {
      const editorElement = document.querySelector('[data-slate-editor]')
      expect(editorElement).not.toEqual(null)

      expect(editorElement!.innerHTML).toEqual(
        [
          // card container
          '<div data-testid="card"',
          ' data-slate-node="element"',
          ' data-pt-path="[_key==&quot;k0&quot;]"',
          '>',
          // body text block
          '<div data-slate-node="element"',
          ' data-pt-path="[_key==&quot;k0&quot;].body[_key==&quot;body-block&quot;]"',
          ' class="pt-block pt-text-block pt-text-block-style-normal"',
          ' data-block-key="body-block"',
          ' data-block-name="block"',
          ' data-block-type="text"',
          ' data-style="normal"',
          '>',
          // body text block inner wrapper
          '<div>',
          // body span
          '<span data-slate-node="text"',
          ' data-pt-path="[_key==&quot;k0&quot;].body[_key==&quot;body-block&quot;].children[_key==&quot;body-span&quot;]"',
          ' data-child-key="body-span"',
          ' data-child-name="span"',
          ' data-child-type="span"',
          '>',
          // body leaf
          '<span data-slate-leaf="true">',
          '<span data-slate-string="true">card body</span>',
          '</span>',
          // /body span
          '</span>',
          // /body text block inner wrapper
          '</div>',
          // /body text block
          '</div>',
          // /card container (no tags in DOM)
          '</div>',
        ].join(''),
      )
    })
  })
})

describe('block scope and specificity', () => {
  test('block scope overrides text block rendering', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

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
      ],
      children: (
        <ContainerPlugin
          containers={[
            {
              container: defineContainer({
                scope: 'block',
                field: 'children',
                render: ({attributes, children}) => (
                  <p data-testid="custom-block" {...attributes}>
                    {children}
                  </p>
                ),
              }),
            },
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      const editorElement = document.querySelector('[data-slate-editor]')
      expect(editorElement).not.toEqual(null)
      const customBlock = editorElement!.querySelector(
        '[data-testid="custom-block"]',
      )
      expect(customBlock).not.toEqual(null)
      expect(customBlock!.textContent).toEqual('hello')
    })
  })

  test('scoped block overrides universal block inside container', async () => {
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
            {container: calloutContainer},
            {
              container: defineContainer({
                scope: 'block',
                field: 'children',
                render: ({attributes, children}) => (
                  <p data-testid="universal-block" {...attributes}>
                    {children}
                  </p>
                ),
              }),
            },
            {
              container: defineContainer({
                scope: 'callout.block',
                field: 'children',
                render: ({attributes, children}) => (
                  <p data-testid="callout-block" {...attributes}>
                    {children}
                  </p>
                ),
              }),
            },
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      const editorElement = document.querySelector('[data-slate-editor]')
      expect(editorElement).not.toEqual(null)

      const universalBlock = editorElement!.querySelector(
        '[data-testid="universal-block"]',
      )
      expect(universalBlock).not.toEqual(null)
      expect(universalBlock!.textContent).toEqual('root text')

      const calloutBlock = editorElement!.querySelector(
        '[data-testid="callout-block"]',
      )
      expect(calloutBlock).not.toEqual(null)
      expect(calloutBlock!.textContent).toEqual('callout text')
    })
  })

  test('universal block fallback applies inside container when no scoped override', async () => {
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
            {container: calloutContainer},
            {
              container: defineContainer({
                scope: 'block',
                field: 'children',
                render: ({attributes, children}) => (
                  <p data-testid="universal-block" {...attributes}>
                    {children}
                  </p>
                ),
              }),
            },
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      const editorElement = document.querySelector('[data-slate-editor]')
      expect(editorElement).not.toEqual(null)

      const universalBlocks = editorElement!.querySelectorAll(
        '[data-testid="universal-block"]',
      )
      expect(universalBlocks.length).toEqual(2)
      expect(universalBlocks[0]!.textContent).toEqual('root text')
      expect(universalBlocks[1]!.textContent).toEqual('callout text')
    })
  })
})

describe('container with only void objects', () => {
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
    scope: 'gallery',
    field: 'items',
    render: ({attributes, children}) => (
      <div data-testid="gallery" {...attributes}>
        {children}
      </div>
    ),
  })

  test('gallery renders with void block objects inside', async () => {
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
      children: (
        <ContainerPlugin containers={[{container: galleryContainer}]} />
      ),
    })

    await vi.waitFor(() => {
      const editorElement = document.querySelector('[data-slate-editor]')
      expect(editorElement).not.toEqual(null)

      // Gallery container renders with custom renderer
      const gallery = editorElement!.querySelector('[data-testid="gallery"]')
      expect(gallery).not.toEqual(null)

      // Images render as void block objects inside the gallery
      const blockObjects = gallery!.querySelectorAll(
        '[data-block-type="object"]',
      )
      expect(blockObjects.length).toEqual(2)
      expect(blockObjects[0]!.getAttribute('data-block-name')).toEqual('image')
      expect(blockObjects[1]!.getAttribute('data-block-name')).toEqual('image')

      // Void block objects have contentEditable=false
      expect(
        blockObjects[0]!.querySelector('[contenteditable="false"]'),
      ).not.toEqual(null)
      expect(
        blockObjects[1]!.querySelector('[contenteditable="false"]'),
      ).not.toEqual(null)
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
              container: {
                ...calloutContainer,
                render: ({attributes, children}) => (
                  <div {...attributes}>{children}</div>
                ),
              },
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
          // callout default div wrapper
          '<div data-slate-node="element"',
          ' data-pt-path="[_key==&quot;k0&quot;]"',
          '>',
          // inner text block
          '<div data-slate-node="element"',
          ' data-pt-path="[_key==&quot;k0&quot;].content[_key==&quot;content-block&quot;]"',
          ' class="pt-block pt-text-block pt-text-block-style-normal"',
          ' data-block-key="content-block"',
          ' data-block-name="block"',
          ' data-block-type="text"',
          ' data-style="normal"',
          '>',
          // inner text block wrapper
          '<div>',
          // inner span
          '<span data-slate-node="text"',
          ' data-pt-path="[_key==&quot;k0&quot;].content[_key==&quot;content-block&quot;].children[_key==&quot;content-span&quot;]"',
          ' data-child-key="content-span"',
          ' data-child-name="span"',
          ' data-child-type="span"',
          '>',
          // inner leaf
          '<span data-slate-leaf="true">',
          '<span data-slate-string="true">inside callout</span>',
          '</span>',
          // /inner span
          '</span>',
          // /inner text block wrapper
          '</div>',
          // /inner text block
          '</div>',
          // /callout default div wrapper
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
