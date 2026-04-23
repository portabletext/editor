import {defineSchema} from '@portabletext/schema'
import {describe, expect, test, vi} from 'vitest'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

function normalizeInnerHTML(html: string): string {
  return html
    .replace(/outline: medium/g, 'outline: none')
    .replace(/ style="user-select: none;"/g, '')
    .replace(
      /style="display: inline-block;" draggable="true"/g,
      'draggable="true" style="display: inline-block;"',
    )
}

describe('DOM structure', () => {
  test('1. empty placeholder block', async () => {
    await createTestEditor({
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })
    await vi.waitFor(() => {
      const el = document.querySelector('[data-slate-editor]')
      expect(el).not.toEqual(null)
      expect(normalizeInnerHTML(el!.innerHTML)).toEqual(
        [
          // text block: b0
          '<div data-slate-node="element"',
          ' data-pt-path="[_key==&quot;b0&quot;]"',
          ' class="pt-block pt-text-block pt-text-block-style-normal"',
          ' data-block-key="b0"',
          ' data-block-name="block"',
          ' data-block-type="text"',
          ' data-style="normal">',
          '<div>',
          // span: s0 (empty)
          '<span data-slate-node="text"',
          ' data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]"',
          ' data-child-key="s0"',
          ' data-child-name="span"',
          ' data-child-type="span">',
          '<span data-slate-leaf="true">',
          '<span data-slate-zero-width="n" data-slate-length="0">',
          '\uFEFF<br>',
          '</span>',
          '</span>',
          '</span>',
          '</div>',
          '</div>',
        ].join(''),
      )
    })
  })

  test('2. root text block with spans and inline objects', async () => {
    await createTestEditor({
      schemaDefinition: defineSchema({
        inlineObjects: [{name: 'stock-ticker'}],
      }),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [
            {_key: 's0', _type: 'span', text: 'hello ', marks: []},
            {_key: 'i0', _type: 'stock-ticker'},
            {_key: 's1', _type: 'span', text: ' world', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })
    await vi.waitFor(() => {
      const el = document.querySelector('[data-slate-editor]')
      expect(el).not.toEqual(null)
      expect(normalizeInnerHTML(el!.innerHTML)).toEqual(
        [
          // text block: b0
          '<div data-slate-node="element"',
          ' data-pt-path="[_key==&quot;b0&quot;]"',
          ' class="pt-block pt-text-block pt-text-block-style-normal"',
          ' data-block-key="b0"',
          ' data-block-name="block"',
          ' data-block-type="text"',
          ' data-style="normal">',
          '<div>',
          // span: hello
          '<span data-slate-node="text"',
          ' data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]"',
          ' data-child-key="s0"',
          ' data-child-name="span"',
          ' data-child-type="span">',
          '<span data-slate-leaf="true">',
          '<span data-slate-string="true">hello </span>',
          '</span>',
          '</span>',
          // inline void: stock-ticker
          '<span data-slate-node="element"',
          ' data-slate-void="true"',
          ' data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;i0&quot;]"',
          ' data-slate-inline="true"',
          ' contenteditable="false"',
          ' class="pt-inline-object"',
          ' data-child-key="i0"',
          ' data-child-name="stock-ticker"',
          ' data-child-type="object">',
          // spacer
          '<span data-slate-spacer="true"',
          ' style="height: 0px; color: transparent; outline: none; position: absolute;">',
          '<span data-slate-node="text">',
          '<span data-slate-leaf="true">',
          '<span data-slate-zero-width="z" data-slate-length="0">\uFEFF</span>',
          '</span>',
          '</span>',
          '</span>',
          // inline object render
          '<span draggable="true" style="display: inline-block;">',
          '<span>[stock-ticker: i0]</span>',
          '</span>',
          '</span>',
          // span: world
          '<span data-slate-node="text"',
          ' data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;s1&quot;]"',
          ' data-child-key="s1"',
          ' data-child-name="span"',
          ' data-child-type="span">',
          '<span data-slate-leaf="true">',
          '<span data-slate-string="true"> world</span>',
          '</span>',
          '</span>',
          '</div>',
          '</div>',
        ].join(''),
      )
    })
  })

  test('3. root void block object (image)', async () => {
    await createTestEditor({
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {_key: 'img0', _type: 'image'},
      ],
    })
    await vi.waitFor(() => {
      const el = document.querySelector('[data-slate-editor]')
      expect(el).not.toEqual(null)
      expect(normalizeInnerHTML(el!.innerHTML)).toEqual(
        [
          // text block: b0
          '<div data-slate-node="element"',
          ' data-pt-path="[_key==&quot;b0&quot;]"',
          ' class="pt-block pt-text-block pt-text-block-style-normal"',
          ' data-block-key="b0"',
          ' data-block-name="block"',
          ' data-block-type="text"',
          ' data-style="normal">',
          '<div>',
          // span: hello
          '<span data-slate-node="text"',
          ' data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]"',
          ' data-child-key="s0"',
          ' data-child-name="span"',
          ' data-child-type="span">',
          '<span data-slate-leaf="true">',
          '<span data-slate-string="true">hello</span>',
          '</span>',
          '</span>',
          '</div>',
          '</div>',
          // void block object: image
          '<div data-slate-node="element"',
          ' data-slate-void="true"',
          ' data-pt-path="[_key==&quot;img0&quot;]"',
          ' class="pt-block pt-object-block"',
          ' data-block-key="img0"',
          ' data-block-name="image"',
          ' data-block-type="object">',
          // spacer
          '<div data-slate-spacer="true"',
          ' style="height: 0px; color: transparent; outline: none; position: absolute;">',
          '<span data-slate-node="text">',
          '<span data-slate-leaf="true">',
          '<span data-slate-zero-width="z" data-slate-length="0">\uFEFF</span>',
          '</span>',
          '</span>',
          '</div>',
          // block object render
          '<div contenteditable="false" draggable="true">',
          '<div>[image: img0]</div>',
          '</div>',
          '</div>',
        ].join(''),
      )
    })
  })

  test('4. gallery container with void leaf children', async () => {
    const gallerySchemaDefinition = defineSchema({
      blockObjects: [
        {
          name: 'gallery',
          fields: [{name: 'items', type: 'array', of: [{type: 'image'}]}],
        },
        {name: 'image'},
      ],
    })
    const galleryContainer = defineContainer<typeof gallerySchemaDefinition>({
      scope: '$..gallery',
      field: 'items',
      render: ({attributes, children}) => (
        <div {...attributes} className="gallery">
          {children}
        </div>
      ),
    })
    await createTestEditor({
      schemaDefinition: gallerySchemaDefinition,
      initialValue: [
        {
          _key: 'g0',
          _type: 'gallery',
          items: [
            {_key: 'img0', _type: 'image'},
            {_key: 'img1', _type: 'image'},
          ],
        },
      ],
      children: <ContainerPlugin containers={[galleryContainer]} />,
    })
    await vi.waitFor(() => {
      const el = document.querySelector('[data-slate-editor]')
      expect(el).not.toEqual(null)
      expect(normalizeInnerHTML(el!.innerHTML)).toEqual(
        [
          // gallery container: g0
          '<div data-block-type="container"',
          ' data-pt-path="[_key==&quot;g0&quot;]"',
          ' class="gallery">',
          // void leaf: img0
          '<div data-slate-node="element"',
          ' data-slate-void="true"',
          ' data-pt-path="[_key==&quot;g0&quot;].items[_key==&quot;img0&quot;]"',
          ' class="pt-block pt-object-block"',
          ' data-block-key="img0"',
          ' data-block-name="image"',
          ' data-block-type="object">',
          // spacer
          '<div data-slate-spacer="true"',
          ' style="height: 0px; color: transparent; outline: none; position: absolute;">',
          '<span data-slate-node="text">',
          '<span data-slate-leaf="true">',
          '<span data-slate-zero-width="z" data-slate-length="0">\uFEFF</span>',
          '</span>',
          '</span>',
          '</div>',
          // image render
          '<div contenteditable="false" draggable="true">',
          '<div>[image: img0]</div>',
          '</div>',
          '</div>',
          // void leaf: img1
          '<div data-slate-node="element"',
          ' data-slate-void="true"',
          ' data-pt-path="[_key==&quot;g0&quot;].items[_key==&quot;img1&quot;]"',
          ' class="pt-block pt-object-block"',
          ' data-block-key="img1"',
          ' data-block-name="image"',
          ' data-block-type="object">',
          // spacer
          '<div data-slate-spacer="true"',
          ' style="height: 0px; color: transparent; outline: none; position: absolute;">',
          '<span data-slate-node="text">',
          '<span data-slate-leaf="true">',
          '<span data-slate-zero-width="z" data-slate-length="0">\uFEFF</span>',
          '</span>',
          '</span>',
          '</div>',
          // image render
          '<div contenteditable="false" draggable="true">',
          '<div>[image: img1]</div>',
          '</div>',
          '</div>',
          '</div>',
        ].join(''),
      )
    })
  })

  test('5. deep nesting: table > row > cell > text block > inline', async () => {
    const tableSchemaDefinition = defineSchema({
      inlineObjects: [{name: 'stock-ticker'}],
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
                              of: [
                                {type: 'block', of: [{type: 'stock-ticker'}]},
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
    const tableContainer = defineContainer<typeof tableSchemaDefinition>({
      scope: '$..table',
      field: 'rows',
      render: ({attributes, children}) => (
        <table {...attributes}>
          <tbody>{children}</tbody>
        </table>
      ),
    })
    const rowContainer = defineContainer<typeof tableSchemaDefinition>({
      scope: '$..table.row',
      field: 'cells',
      render: ({attributes, children}) => <tr {...attributes}>{children}</tr>,
    })
    const cellContainer = defineContainer<typeof tableSchemaDefinition>({
      scope: '$..table.row.cell',
      field: 'content',
      render: ({attributes, children}) => <td {...attributes}>{children}</td>,
    })
    await createTestEditor({
      schemaDefinition: tableSchemaDefinition,
      initialValue: [
        {
          _key: 't0',
          _type: 'table',
          rows: [
            {
              _key: 'r0',
              _type: 'row',
              cells: [
                {
                  _key: 'c0',
                  _type: 'cell',
                  content: [
                    {
                      _key: 'b0',
                      _type: 'block',
                      children: [
                        {_key: 's0', _type: 'span', text: 'price: ', marks: []},
                        {_key: 'i0', _type: 'stock-ticker'},
                        {_key: 's1', _type: 'span', text: ' USD', marks: []},
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
      const el = document.querySelector('[data-slate-editor]')
      expect(el).not.toEqual(null)
      expect(normalizeInnerHTML(el!.innerHTML)).toEqual(
        [
          // table container: t0
          '<table data-block-type="container"',
          ' data-pt-path="[_key==&quot;t0&quot;]">',
          '<tbody>',
          // row: r0
          '<tr data-block-type="container"',
          ' data-pt-path="[_key==&quot;t0&quot;].rows[_key==&quot;r0&quot;]">',
          // cell: c0
          '<td data-block-type="container"',
          ' data-pt-path="[_key==&quot;t0&quot;].rows[_key==&quot;r0&quot;].cells[_key==&quot;c0&quot;]">',
          // text block: b0
          '<div data-slate-node="element"',
          ' data-pt-path="[_key==&quot;t0&quot;].rows[_key==&quot;r0&quot;].cells[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;]"',
          ' class="pt-block pt-text-block pt-text-block-style-normal"',
          ' data-block-key="b0"',
          ' data-block-name="block"',
          ' data-block-type="text"',
          ' data-style="normal">',
          '<div>',
          // span: price:
          '<span data-slate-node="text"',
          ' data-pt-path="[_key==&quot;t0&quot;].rows[_key==&quot;r0&quot;].cells[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]"',
          ' data-child-key="s0"',
          ' data-child-name="span"',
          ' data-child-type="span">',
          '<span data-slate-leaf="true">',
          '<span data-slate-string="true">price: </span>',
          '</span>',
          '</span>',
          // inline void: stock-ticker
          '<span data-slate-node="element"',
          ' data-slate-void="true"',
          ' data-pt-path="[_key==&quot;t0&quot;].rows[_key==&quot;r0&quot;].cells[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;].children[_key==&quot;i0&quot;]"',
          ' data-slate-inline="true"',
          ' contenteditable="false"',
          ' class="pt-inline-object"',
          ' data-child-key="i0"',
          ' data-child-name="stock-ticker"',
          ' data-child-type="object">',
          // spacer
          '<span data-slate-spacer="true"',
          ' style="height: 0px; color: transparent; outline: none; position: absolute;">',
          '<span data-slate-node="text">',
          '<span data-slate-leaf="true">',
          '<span data-slate-zero-width="z" data-slate-length="0">\uFEFF</span>',
          '</span>',
          '</span>',
          '</span>',
          // inline object render
          '<span draggable="true" style="display: inline-block;">',
          '<span>[stock-ticker: i0]</span>',
          '</span>',
          '</span>',
          // span: USD
          '<span data-slate-node="text"',
          ' data-pt-path="[_key==&quot;t0&quot;].rows[_key==&quot;r0&quot;].cells[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;].children[_key==&quot;s1&quot;]"',
          ' data-child-key="s1"',
          ' data-child-name="span"',
          ' data-child-type="span">',
          '<span data-slate-leaf="true">',
          '<span data-slate-string="true"> USD</span>',
          '</span>',
          '</span>',
          '</div>',
          '</div>',
          '</td>',
          '</tr>',
          '</tbody>',
          '</table>',
        ].join(''),
      )
    })
  })

  test('6. code block container with text blocks', async () => {
    const codeSchemaDefinition = defineSchema({
      blockObjects: [
        {
          name: 'code',
          fields: [{name: 'lines', type: 'array', of: [{type: 'block'}]}],
        },
      ],
    })
    const codeContainer = defineContainer<typeof codeSchemaDefinition>({
      scope: '$..code',
      field: 'lines',
      render: ({attributes, children}) => (
        <pre {...attributes}>
          <code>{children}</code>
        </pre>
      ),
    })
    await createTestEditor({
      schemaDefinition: codeSchemaDefinition,
      initialValue: [
        {
          _key: 'c0',
          _type: 'code',
          lines: [
            {
              _key: 'l0',
              _type: 'block',
              children: [
                {_key: 's0', _type: 'span', text: 'const x = 1', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _key: 'l1',
              _type: 'block',
              children: [
                {_key: 's1', _type: 'span', text: 'const y = 2', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[codeContainer]} />,
    })
    await vi.waitFor(() => {
      const el = document.querySelector('[data-slate-editor]')
      expect(el).not.toEqual(null)
      expect(normalizeInnerHTML(el!.innerHTML)).toEqual(
        [
          // code container: c0
          '<pre data-block-type="container"',
          ' data-pt-path="[_key==&quot;c0&quot;]">',
          '<code>',
          // line: l0
          '<div data-slate-node="element"',
          ' data-pt-path="[_key==&quot;c0&quot;].lines[_key==&quot;l0&quot;]"',
          ' class="pt-block pt-text-block pt-text-block-style-normal"',
          ' data-block-key="l0"',
          ' data-block-name="block"',
          ' data-block-type="text"',
          ' data-style="normal">',
          '<div>',
          // span: const x = 1
          '<span data-slate-node="text"',
          ' data-pt-path="[_key==&quot;c0&quot;].lines[_key==&quot;l0&quot;].children[_key==&quot;s0&quot;]"',
          ' data-child-key="s0"',
          ' data-child-name="span"',
          ' data-child-type="span">',
          '<span data-slate-leaf="true">',
          '<span data-slate-string="true">const x = 1</span>',
          '</span>',
          '</span>',
          '</div>',
          '</div>',
          // line: l1
          '<div data-slate-node="element"',
          ' data-pt-path="[_key==&quot;c0&quot;].lines[_key==&quot;l1&quot;]"',
          ' class="pt-block pt-text-block pt-text-block-style-normal"',
          ' data-block-key="l1"',
          ' data-block-name="block"',
          ' data-block-type="text"',
          ' data-style="normal">',
          '<div>',
          // span: const y = 2
          '<span data-slate-node="text"',
          ' data-pt-path="[_key==&quot;c0&quot;].lines[_key==&quot;l1&quot;].children[_key==&quot;s1&quot;]"',
          ' data-child-key="s1"',
          ' data-child-name="span"',
          ' data-child-type="span">',
          '<span data-slate-leaf="true">',
          '<span data-slate-string="true">const y = 2</span>',
          '</span>',
          '</span>',
          '</div>',
          '</div>',
          '</code>',
          '</pre>',
        ].join(''),
      )
    })
  })
})
