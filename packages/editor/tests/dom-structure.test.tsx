import {defineSchema} from '@portabletext/schema'
import {describe, expect, test, vi} from 'vitest'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

/**
 * Normalize browser-specific CSS serialization in innerHTML.
 * Webkit serializes outline:none as outline:medium and omits user-select:none.
 */
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
  test('empty placeholder block', async () => {
    await createTestEditor({
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
      const editorElement = document.querySelector('[data-slate-editor]')
      expect(editorElement).not.toEqual(null)

      expect(normalizeInnerHTML(editorElement!.innerHTML)).toEqual(
        [
          // root text block
          '<div data-slate-node="element"',
          ' data-pt-path="[_key==&quot;b0&quot;]"',
          ' class="pt-block pt-text-block pt-text-block-style-normal"',
          ' data-block-key="b0"',
          ' data-block-name="block"',
          ' data-block-type="text"',
          ' data-style="normal"',
          '>',
          // text block inner wrapper
          '<div>',
          // span
          '<span data-slate-node="text"',
          ' data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]"',
          ' data-child-key="s0"',
          ' data-child-name="span"',
          ' data-child-type="span"',
          '>',
          // leaf
          '<span data-pt-leaf="true">',
          '<span data-slate-zero-width="n" data-slate-length="0">\uFEFF<br></span>',
          '</span>',
          // /span
          '</span>',
          // /text block inner wrapper
          '</div>',
          // /root text block
          '</div>',
        ].join(''),
      )
    })
  })

  test('root text block with spans and inline objects', async () => {
    const schemaDefinition = defineSchema({
      inlineObjects: [{name: 'stock-ticker'}],
    })

    await createTestEditor({
      schemaDefinition,
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
      const editorElement = document.querySelector('[data-slate-editor]')
      expect(editorElement).not.toEqual(null)

      expect(normalizeInnerHTML(editorElement!.innerHTML)).toEqual(
        [
          // root text block
          '<div data-slate-node="element"',
          ' data-pt-path="[_key==&quot;b0&quot;]"',
          ' class="pt-block pt-text-block pt-text-block-style-normal"',
          ' data-block-key="b0"',
          ' data-block-name="block"',
          ' data-block-type="text"',
          ' data-style="normal"',
          '>',
          // text block inner wrapper
          '<div>',
          // span "hello "
          '<span data-slate-node="text"',
          ' data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]"',
          ' data-child-key="s0"',
          ' data-child-name="span"',
          ' data-child-type="span"',
          '>',
          '<span data-pt-leaf="true">',
          '<span>hello </span>',
          '</span>',
          '</span>',
          // inline stock-ticker
          '<span data-slate-node="element"',
          ' data-slate-void="true"',
          ' data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;i0&quot;]"',
          ' data-slate-inline="true"',
          ' contenteditable="false"',
          ' class="pt-inline-object"',
          ' data-child-key="i0"',
          ' data-child-name="stock-ticker"',
          ' data-child-type="object"',
          '>',
          // inline void spacer
          '<span data-pt-spacer="true" style="height: 0px; color: transparent; outline: none; position: absolute;">\uFEFF</span>',
          // inline void content
          '<span draggable="true" style="display: inline-block;">',
          '<span>[stock-ticker: i0]</span>',
          '</span>',
          '</span>',
          // span " world"
          '<span data-slate-node="text"',
          ' data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;s1&quot;]"',
          ' data-child-key="s1"',
          ' data-child-name="span"',
          ' data-child-type="span"',
          '>',
          '<span data-pt-leaf="true">',
          '<span> world</span>',
          '</span>',
          '</span>',
          // /text block inner wrapper
          '</div>',
          // /root text block
          '</div>',
        ].join(''),
      )
    })
  })

  test('root void block object (image)', async () => {
    const schemaDefinition = defineSchema({
      blockObjects: [{name: 'image'}],
    })

    await createTestEditor({
      schemaDefinition,
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: 'img0',
          _type: 'image',
        },
      ],
    })

    await vi.waitFor(() => {
      const editorElement = document.querySelector('[data-slate-editor]')
      expect(editorElement).not.toEqual(null)

      expect(normalizeInnerHTML(editorElement!.innerHTML)).toEqual(
        [
          // root text block
          '<div data-slate-node="element"',
          ' data-pt-path="[_key==&quot;b0&quot;]"',
          ' class="pt-block pt-text-block pt-text-block-style-normal"',
          ' data-block-key="b0"',
          ' data-block-name="block"',
          ' data-block-type="text"',
          ' data-style="normal"',
          '>',
          // text block inner wrapper
          '<div>',
          // span
          '<span data-slate-node="text"',
          ' data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]"',
          ' data-child-key="s0"',
          ' data-child-name="span"',
          ' data-child-type="span"',
          '>',
          '<span data-pt-leaf="true">',
          '<span>hello</span>',
          '</span>',
          '</span>',
          // /text block inner wrapper
          '</div>',
          // /root text block
          '</div>',
          // root void block object (image)
          '<div data-slate-node="element"',
          ' data-slate-void="true"',
          ' data-pt-path="[_key==&quot;img0&quot;]"',
          ' class="pt-block pt-object-block"',
          ' data-block-key="img0"',
          ' data-block-name="image"',
          ' data-block-type="object"',
          '>',
          // void spacer
          '<div data-pt-spacer="true" style="height: 0px; color: transparent; outline: none; position: absolute;">\uFEFF</div>',
          // void content
          '<div contenteditable="false" draggable="true">',
          '<div>[image: img0]</div>',
          '</div>',
          '</div>',
        ].join(''),
      )
    })
  })

  test('gallery container with void leaf children (images)', async () => {
    const schemaDefinition = defineSchema({
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
        {name: 'image'},
      ],
    })

    const galleryContainer = defineContainer({
      scope: 'gallery',
      field: 'items',
      render: ({attributes, children}) => (
        <div {...attributes} className="gallery">
          {children}
        </div>
      ),
    })

    await createTestEditor({
      schemaDefinition,
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [{_key: 's0', _type: 'span', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _key: 'g0',
          _type: 'gallery',
          items: [
            {_key: 'img0', _type: 'image'},
            {_key: 'img1', _type: 'image'},
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

      expect(normalizeInnerHTML(editorElement!.innerHTML)).toEqual(
        [
          // root text block (empty)
          '<div data-slate-node="element"',
          ' data-pt-path="[_key==&quot;b0&quot;]"',
          ' class="pt-block pt-text-block pt-text-block-style-normal"',
          ' data-block-key="b0"',
          ' data-block-name="block"',
          ' data-block-type="text"',
          ' data-style="normal"',
          '>',
          '<div>',
          '<span data-slate-node="text"',
          ' data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]"',
          ' data-child-key="s0"',
          ' data-child-name="span"',
          ' data-child-type="span"',
          '>',
          '<span data-pt-leaf="true">',
          '<span data-slate-zero-width="n" data-slate-length="0">\uFEFF<br></span>',
          '</span>',
          '</span>',
          '</div>',
          '</div>',
          // gallery container
          '<div data-pt-path="[_key==&quot;g0&quot;]"',
          ' data-pt-container=""',
          ' class="gallery"',
          '>',
          // image 1 (void block object inside gallery)
          '<div data-pt-path="[_key==&quot;g0&quot;].items[_key==&quot;img0&quot;]"',
          ' data-pt-leaf=""',
          '>',
          '<div data-pt-spacer="true" style="height: 0px; color: transparent; outline: none; position: absolute;">\uFEFF</div>',
          '<div contenteditable="false" draggable="true">',
          '<div>[image: img0]</div>',
          '</div>',
          '</div>',
          // image 2 (void block object inside gallery)
          '<div data-pt-path="[_key==&quot;g0&quot;].items[_key==&quot;img1&quot;]"',
          ' data-pt-leaf=""',
          '>',
          '<div data-pt-spacer="true" style="height: 0px; color: transparent; outline: none; position: absolute;">\uFEFF</div>',
          '<div contenteditable="false" draggable="true">',
          '<div>[image: img1]</div>',
          '</div>',
          '</div>',
          // /gallery container
          '</div>',
        ].join(''),
      )
    })
  })

  test('deep nesting: table > row > cell > text block > inline children', async () => {
    const schemaDefinition = defineSchema({
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
                                {
                                  type: 'block',
                                  of: [{type: 'stock-ticker'}],
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

    const tableContainer = defineContainer({
      scope: 'table',
      field: 'rows',
      render: ({attributes, children}) => (
        <table {...attributes}>
          <tbody>{children}</tbody>
        </table>
      ),
    })

    const rowContainer = defineContainer({
      scope: 'table.row',
      field: 'cells',
      render: ({attributes, children}) => <tr {...attributes}>{children}</tr>,
    })

    const cellContainer = defineContainer({
      scope: 'table.row.cell',
      field: 'content',
      render: ({attributes, children}) => <td {...attributes}>{children}</td>,
    })

    await createTestEditor({
      schemaDefinition,
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
                        {
                          _key: 's0',
                          _type: 'span',
                          text: 'price: ',
                          marks: [],
                        },
                        {_key: 'i0', _type: 'stock-ticker'},
                        {
                          _key: 's1',
                          _type: 'span',
                          text: ' USD',
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

      expect(normalizeInnerHTML(editorElement!.innerHTML)).toEqual(
        [
          // table container
          '<table data-pt-path="[_key==&quot;t0&quot;]"',
          ' data-pt-container=""',
          '>',
          '<tbody>',
          // row container
          '<tr data-pt-path="[_key==&quot;t0&quot;].rows[_key==&quot;r0&quot;]"',
          ' data-pt-container=""',
          '>',
          // cell container
          '<td data-pt-path="[_key==&quot;t0&quot;].rows[_key==&quot;r0&quot;].cells[_key==&quot;c0&quot;]"',
          ' data-pt-container=""',
          '>',
          // text block inside cell
          '<div data-pt-path="[_key==&quot;t0&quot;].rows[_key==&quot;r0&quot;].cells[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;]"',
          ' data-pt-container=""',
          '>',
          // span "price: "
          '<span data-slate-node="text"',
          ' data-pt-path="[_key==&quot;t0&quot;].rows[_key==&quot;r0&quot;].cells[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]"',
          ' data-child-key="s0"',
          ' data-child-name="span"',
          ' data-child-type="span"',
          '>',
          '<span data-pt-leaf="true">',
          '<span>price: </span>',
          '</span>',
          '</span>',
          // inline stock-ticker
          '<span data-slate-node="element"',
          ' data-slate-void="true"',
          ' data-pt-path="[_key==&quot;t0&quot;].rows[_key==&quot;r0&quot;].cells[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;].children[_key==&quot;i0&quot;]"',
          ' data-slate-inline="true"',
          ' contenteditable="false"',
          ' class="pt-inline-object"',
          ' data-child-key="i0"',
          ' data-child-name="stock-ticker"',
          ' data-child-type="object"',
          '>',
          '<span data-pt-spacer="true" style="height: 0px; color: transparent; outline: none; position: absolute;">\uFEFF</span>',
          '<span draggable="true" style="display: inline-block;">',
          '<span>[stock-ticker: i0]</span>',
          '</span>',
          '</span>',
          // span " USD"
          '<span data-slate-node="text"',
          ' data-pt-path="[_key==&quot;t0&quot;].rows[_key==&quot;r0&quot;].cells[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;].children[_key==&quot;s1&quot;]"',
          ' data-child-key="s1"',
          ' data-child-name="span"',
          ' data-child-type="span"',
          '>',
          '<span data-pt-leaf="true">',
          '<span> USD</span>',
          '</span>',
          '</span>',
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

  test('code block container with text blocks', async () => {
    const schemaDefinition = defineSchema({
      blockObjects: [
        {
          name: 'code',
          fields: [
            {
              name: 'lines',
              type: 'array',
              of: [{type: 'block'}],
            },
          ],
        },
      ],
    })

    const codeContainer = defineContainer({
      scope: 'code',
      field: 'lines',
      render: ({attributes, children}) => (
        <pre {...attributes}>
          <code>{children}</code>
        </pre>
      ),
    })

    await createTestEditor({
      schemaDefinition,
      initialValue: [
        {
          _key: 'c0',
          _type: 'code',
          lines: [
            {
              _key: 'l0',
              _type: 'block',
              children: [
                {
                  _key: 's0',
                  _type: 'span',
                  text: 'const x = 1',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _key: 'l1',
              _type: 'block',
              children: [
                {
                  _key: 's1',
                  _type: 'span',
                  text: 'const y = 2',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[{container: codeContainer}]} />,
    })

    await vi.waitFor(() => {
      const editorElement = document.querySelector('[data-slate-editor]')
      expect(editorElement).not.toEqual(null)

      expect(normalizeInnerHTML(editorElement!.innerHTML)).toEqual(
        [
          // code container
          '<pre data-pt-path="[_key==&quot;c0&quot;]"',
          ' data-pt-container=""',
          '>',
          '<code>',
          // line 1 text block
          '<div data-pt-path="[_key==&quot;c0&quot;].lines[_key==&quot;l0&quot;]"',
          ' data-pt-container=""',
          '>',
          '<span data-slate-node="text"',
          ' data-pt-path="[_key==&quot;c0&quot;].lines[_key==&quot;l0&quot;].children[_key==&quot;s0&quot;]"',
          ' data-child-key="s0"',
          ' data-child-name="span"',
          ' data-child-type="span"',
          '>',
          '<span data-pt-leaf="true">',
          '<span>const x = 1</span>',
          '</span>',
          '</span>',
          '</div>',
          // line 2 text block
          '<div data-pt-path="[_key==&quot;c0&quot;].lines[_key==&quot;l1&quot;]"',
          ' data-pt-container=""',
          '>',
          '<span data-slate-node="text"',
          ' data-pt-path="[_key==&quot;c0&quot;].lines[_key==&quot;l1&quot;].children[_key==&quot;s1&quot;]"',
          ' data-child-key="s1"',
          ' data-child-name="span"',
          ' data-child-type="span"',
          '>',
          '<span data-pt-leaf="true">',
          '<span>const y = 2</span>',
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
