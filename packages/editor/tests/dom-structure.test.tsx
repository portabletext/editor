import {defineSchema} from '@portabletext/schema'
import {describe, expect, test, vi} from 'vitest'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer, defineTextBlock} from '../src/renderers/renderer.types'
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
          '<div',
          ' data-slate-node="element"',
          ' data-pt-path="[_key==&quot;b0&quot;]"',
          ' class="pt-block pt-text-block pt-text-block-style-normal"',
          ' data-block-key="b0"',
          ' data-block-name="block"',
          ' data-block-type="text"',
          ' data-pt-block-type="text"',
          ' data-style="normal">',
          '<div>',
          '<span',
          ' data-slate-node="text"',
          ' data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]"',
          ' data-child-key="s0"',
          ' data-child-name="span"',
          ' data-child-type="span"',
          ' data-pt-child-type="span">',
          '<span data-slate-leaf="true" data-pt-mark="true">',
          '<span data-slate-zero-width="n" data-pt-zero-width="n">',
          '﻿',
          '<br>',
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
          '<div',
          ' data-slate-node="element"',
          ' data-pt-path="[_key==&quot;b0&quot;]"',
          ' class="pt-block pt-text-block pt-text-block-style-normal"',
          ' data-block-key="b0"',
          ' data-block-name="block"',
          ' data-block-type="text"',
          ' data-pt-block-type="text"',
          ' data-style="normal">',
          '<div>',
          '<span',
          ' data-slate-node="text"',
          ' data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]"',
          ' data-child-key="s0"',
          ' data-child-name="span"',
          ' data-child-type="span"',
          ' data-pt-child-type="span">',
          '<span data-slate-leaf="true" data-pt-mark="true">',
          '<span data-slate-string="true" data-pt-string="true">',
          'hello ',
          '</span>',
          '</span>',
          '</span>',
          '<span',
          ' data-slate-node="element"',
          ' data-slate-void="true"',
          ' data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;i0&quot;]"',
          ' contenteditable="false"',
          ' class="pt-inline-object"',
          ' data-child-key="i0"',
          ' data-child-name="stock-ticker"',
          ' data-child-type="object"',
          ' data-pt-child-type="object">',
          '<span',
          ' data-slate-spacer="true"',
          ' data-pt-spacer="true"',
          ' style="height: 0px; color: transparent; outline: none; position: absolute;">',
          '<span data-slate-node="text">',
          '<span data-slate-leaf="true" data-pt-mark="true">',
          '<span data-slate-zero-width="z" data-pt-zero-width="z">',
          '﻿',
          '</span>',
          '</span>',
          '</span>',
          '</span>',
          '<span draggable="true" style="display: inline-block;">',
          '<span>',
          '[stock-ticker: i0]',
          '</span>',
          '</span>',
          '</span>',
          '<span',
          ' data-slate-node="text"',
          ' data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;s1&quot;]"',
          ' data-child-key="s1"',
          ' data-child-name="span"',
          ' data-child-type="span"',
          ' data-pt-child-type="span">',
          '<span data-slate-leaf="true" data-pt-mark="true">',
          '<span data-slate-string="true" data-pt-string="true">',
          ' world',
          '</span>',
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
          '<div',
          ' data-slate-node="element"',
          ' data-pt-path="[_key==&quot;b0&quot;]"',
          ' class="pt-block pt-text-block pt-text-block-style-normal"',
          ' data-block-key="b0"',
          ' data-block-name="block"',
          ' data-block-type="text"',
          ' data-pt-block-type="text"',
          ' data-style="normal">',
          '<div>',
          '<span',
          ' data-slate-node="text"',
          ' data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]"',
          ' data-child-key="s0"',
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
          '<div',
          ' data-slate-node="element"',
          ' data-slate-void="true"',
          ' data-pt-path="[_key==&quot;img0&quot;]"',
          ' class="pt-block pt-object-block"',
          ' data-block-key="img0"',
          ' data-block-name="image"',
          ' data-block-type="object"',
          ' data-pt-block-type="object">',
          '<div',
          ' data-slate-spacer="true"',
          ' data-pt-spacer="true"',
          ' style="height: 0px; color: transparent; outline: none; position: absolute;">',
          '<span data-slate-node="text">',
          '<span data-slate-leaf="true" data-pt-mark="true">',
          '<span data-slate-zero-width="z" data-pt-zero-width="z">',
          '﻿',
          '</span>',
          '</span>',
          '</span>',
          '</div>',
          '<div contenteditable="false" draggable="true">',
          '<div>',
          '[image: img0]',
          '</div>',
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
    const galleryContainer = defineContainer({
      type: 'gallery',
      childField: 'items',
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
          '<div data-pt-block-type="container" data-pt-path="[_key==&quot;g0&quot;]" class="gallery">',
          '<div',
          ' data-pt-path="[_key==&quot;g0&quot;].items[_key==&quot;img0&quot;]"',
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
          '[image: img0]',
          '</div>',
          '</div>',
          '<div',
          ' data-pt-path="[_key==&quot;g0&quot;].items[_key==&quot;img1&quot;]"',
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
          '[image: img1]',
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
    const tableContainer = defineContainer({
      type: 'table',
      childField: 'rows',
      render: ({attributes, children}) => (
        <table {...attributes}>
          <tbody>{children}</tbody>
        </table>
      ),
    })
    const rowContainer = defineContainer({
      type: 'row',
      childField: 'cells',
      render: ({attributes, children}) => <tr {...attributes}>{children}</tr>,
    })
    const cellContainer = defineContainer({
      type: 'cell',
      childField: 'content',
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
          '<table data-pt-block-type="container" data-pt-path="[_key==&quot;t0&quot;]">',
          '<tbody>',
          '<tr data-pt-block-type="container" data-pt-path="[_key==&quot;t0&quot;].rows[_key==&quot;r0&quot;]">',
          '<td',
          ' data-pt-block-type="container"',
          ' data-pt-path="[_key==&quot;t0&quot;].rows[_key==&quot;r0&quot;].cells[_key==&quot;c0&quot;]">',
          '<div',
          ' data-pt-path="[_key==&quot;t0&quot;].rows[_key==&quot;r0&quot;].cells[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;]"',
          ' data-pt-block-type="text">',
          '<span',
          ' data-pt-path="[_key==&quot;t0&quot;].rows[_key==&quot;r0&quot;].cells[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]"',
          ' data-pt-child-type="span">',
          '<span data-pt-mark="true">',
          '<span data-pt-string="true">',
          'price: ',
          '</span>',
          '</span>',
          '</span>',
          '<span',
          ' data-pt-path="[_key==&quot;t0&quot;].rows[_key==&quot;r0&quot;].cells[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;].children[_key==&quot;i0&quot;]"',
          ' contenteditable="false"',
          ' data-pt-child-type="object">',
          '<span',
          ' data-pt-spacer="true"',
          ' style="height: 0px; color: transparent; outline: none; position: absolute;">',
          '<span>',
          '<span data-pt-mark="true">',
          '<span data-pt-zero-width="z">',
          '﻿',
          '</span>',
          '</span>',
          '</span>',
          '</span>',
          '<span contenteditable="false">',
          '[stock-ticker: i0]',
          '</span>',
          '</span>',
          '<span',
          ' data-pt-path="[_key==&quot;t0&quot;].rows[_key==&quot;r0&quot;].cells[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;].children[_key==&quot;s1&quot;]"',
          ' data-pt-child-type="span">',
          '<span data-pt-mark="true">',
          '<span data-pt-string="true">',
          ' USD',
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

  test('6. code block container with text blocks', async () => {
    const codeSchemaDefinition = defineSchema({
      blockObjects: [
        {
          name: 'code',
          fields: [{name: 'lines', type: 'array', of: [{type: 'block'}]}],
        },
      ],
    })
    const codeContainer = defineContainer({
      type: 'code',
      childField: 'lines',
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
          '<pre data-pt-block-type="container" data-pt-path="[_key==&quot;c0&quot;]">',
          '<code>',
          '<div data-pt-path="[_key==&quot;c0&quot;].lines[_key==&quot;l0&quot;]" data-pt-block-type="text">',
          '<span',
          ' data-pt-path="[_key==&quot;c0&quot;].lines[_key==&quot;l0&quot;].children[_key==&quot;s0&quot;]"',
          ' data-pt-child-type="span">',
          '<span data-pt-mark="true">',
          '<span data-pt-string="true">',
          'const x = 1',
          '</span>',
          '</span>',
          '</span>',
          '</div>',
          '<div data-pt-path="[_key==&quot;c0&quot;].lines[_key==&quot;l1&quot;]" data-pt-block-type="text">',
          '<span',
          ' data-pt-path="[_key==&quot;c0&quot;].lines[_key==&quot;l1&quot;].children[_key==&quot;s1&quot;]"',
          ' data-pt-child-type="span">',
          '<span data-pt-mark="true">',
          '<span data-pt-string="true">',
          'const y = 2',
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

  test('7. container DOM does not contain any `data-slate-*` attributes', async () => {
    const calloutSchemaDefinition = defineSchema({
      blockObjects: [
        {
          name: 'callout',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [
                {
                  type: 'block',
                  styles: [{name: 'h1'}, {name: 'normal'}],
                  lists: [{name: 'bullet'}],
                },
                {type: 'image'},
              ],
            },
          ],
        },
        {name: 'image'},
      ],
    })
    const calloutContainer = defineContainer({
      type: 'callout',
      childField: 'content',
      render: ({attributes, children}) => (
        <div {...attributes} className="callout">
          {children}
        </div>
      ),
    })
    await createTestEditor({
      schemaDefinition: calloutSchemaDefinition,
      initialValue: [
        {
          _key: 'c0',
          _type: 'callout',
          content: [
            {
              _key: 'b0',
              _type: 'block',
              children: [{_key: 's0', _type: 'span', text: 'hello', marks: []}],
              markDefs: [],
              style: 'h1',
            },
            {_key: 'img0', _type: 'image'},
            {
              _key: 'b1',
              _type: 'block',
              children: [{_key: 's1', _type: 'span', text: 'item', marks: []}],
              level: 1,
              listItem: 'bullet',
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[calloutContainer]} />,
    })
    await vi.waitFor(() => {
      const calloutEl = document.querySelector('.callout')
      expect(calloutEl).not.toEqual(null)
      expect(calloutEl!.innerHTML.match(/data-slate-/g)).toEqual(null)
      expect(calloutEl!.innerHTML.match(/(?<!pt-)data-block-type/g)).toEqual(
        null,
      )
      expect(calloutEl!.innerHTML.match(/(?<!pt-)data-child-type/g)).toEqual(
        null,
      )
      expect(calloutEl!.innerHTML.match(/data-style/g)).toEqual(null)
      expect(calloutEl!.innerHTML.match(/data-list-item/g)).toEqual(null)
      expect(calloutEl!.innerHTML.match(/data-level/g)).toEqual(null)
      expect(calloutEl!.innerHTML.match(/data-list-index/g)).toEqual(null)
      expect(calloutEl!.innerHTML.match(/data-block-key/g)).toEqual(null)
      expect(calloutEl!.innerHTML.match(/data-block-name/g)).toEqual(null)
      expect(calloutEl!.innerHTML.match(/data-child-key/g)).toEqual(null)
      expect(calloutEl!.innerHTML.match(/data-child-name/g)).toEqual(null)
    })
  })

  test('8. text block rendered via `defineTextBlock` inside a container emits `data-pt-block-type="text"`, not `data-slate-node="element"`', async () => {
    const calloutSchemaDefinition = defineSchema({
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
        <div {...attributes} className="callout">
          {children}
        </div>
      ),
      of: [
        defineTextBlock({
          type: 'block',
          render: ({attributes, children}) => (
            <p {...attributes} className="callout-paragraph">
              {children}
            </p>
          ),
        }),
      ],
    })
    await createTestEditor({
      schemaDefinition: calloutSchemaDefinition,
      initialValue: [
        {
          _key: 'c0',
          _type: 'callout',
          content: [
            {
              _key: 'b0',
              _type: 'block',
              children: [{_key: 's0', _type: 'span', text: 'hello', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[calloutContainer]} />,
    })
    await vi.waitFor(() => {
      const paragraph = document.querySelector('.callout-paragraph')
      expect(paragraph).not.toEqual(null)
      expect(paragraph!.getAttribute('data-pt-block-type')).toEqual('text')
      expect(paragraph!.hasAttribute('data-slate-node')).toEqual(false)
    })
  })
})
