import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {createRef} from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {userEvent} from 'vitest/browser'
import {
  EditorProvider,
  PortableTextEditable,
  type RangeDecoration,
} from '../src'
import type {Editor} from '../src/editor'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'
import {LeafPlugin} from '../src/plugins/plugin.leaf'
import {defineContainer, defineLeaf} from '../src/renderers/renderer.types'
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

function formatHTML(html: string): string {
  const parts = html.replace(/></g, '>\n<').split('\n')
  let indent = 0
  return parts
    .map((part) => {
      const trimmed = part.trim()
      if (trimmed.startsWith('</')) {
        indent--
      }
      const result = '  '.repeat(indent) + trimmed
      if (
        trimmed.startsWith('<') &&
        !trimmed.startsWith('</') &&
        !trimmed.endsWith('/>') &&
        !trimmed.includes('</')
      ) {
        indent++
      }
      return result
    })
    .join('\n')
}

describe('container DOM structure', () => {
  describe('defineContainer (callout)', () => {
    test('with render', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const calloutKey = keyGenerator()

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

      await createTestEditor({
        keyGenerator,
        schemaDefinition,
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_type: 'span', _key: spanKey, text: 'hello', marks: []},
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
        const el = document.querySelector('[data-slate-editor]')
        expect(el).not.toEqual(null)
        expect(formatHTML(el!.innerHTML)).toEqual(
          formatHTML(
            [
              // root text block (UNCHANGED - still has all data-slate-* and class names)
              '<div data-slate-node="element" data-pt-path="[_key==&quot;k0&quot;]" class="pt-block pt-text-block pt-text-block-style-normal" data-block-key="k0" data-block-name="block" data-block-type="text" data-style="normal">',
              // text block inner wrapper
              '  <div>',
              // span
              '    <span data-slate-node="text" data-pt-path="[_key==&quot;k0&quot;].children[_key==&quot;k1&quot;]" data-child-key="k1" data-child-name="span" data-child-type="span">',
              // leaf
              '      <span data-slate-leaf="true">',
              '        <span data-slate-string="true">hello</span>',
              '      </span>',
              '    </span>',
              '  </div>',
              '</div>',
              // callout container (data-pt-container, no data-slate-node)
              '<div data-testid="callout" data-pt-path="[_key==&quot;k2&quot;]" data-pt-container="">',
              // text block inside callout (data-pt-container, no class, no data-block-*)
              '  <div data-pt-container="" data-pt-path="[_key==&quot;k2&quot;].content[_key==&quot;content-block&quot;]">',
              // span inside callout (data-pt-leaf, no data-slate-node, no data-child-*)
              '    <span data-pt-leaf="" data-pt-path="[_key==&quot;k2&quot;].content[_key==&quot;content-block&quot;].children[_key==&quot;content-span&quot;]">',
              '      <span data-pt-string="true">inside callout</span>',
              '    </span>',
              '  </div>',
              '</div>',
            ].join('\n'),
          ),
        )
      })
    })

    test('without render (falls back to default div)', async () => {
      const keyGenerator = createTestKeyGenerator()
      const calloutKey = keyGenerator()

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
        const el = document.querySelector('[data-slate-editor]')
        expect(el).not.toEqual(null)
        expect(formatHTML(el!.innerHTML)).toEqual(
          formatHTML(
            [
              // callout default div wrapper (data-pt-container, no data-slate-node)
              '<div data-pt-path="[_key==&quot;k0&quot;]" data-pt-container="">',
              // inner text block
              '  <div data-pt-container="" data-pt-path="[_key==&quot;k0&quot;].content[_key==&quot;content-block&quot;]">',
              // inner span
              '    <span data-pt-leaf="" data-pt-path="[_key==&quot;k0&quot;].content[_key==&quot;content-block&quot;].children[_key==&quot;content-span&quot;]">',
              '      <span data-pt-string="true">inside callout</span>',
              '    </span>',
              '  </div>',
              '</div>',
            ].join('\n'),
          ),
        )
      })
    })
  })

  describe('defineContainer (block scope - root text block override)', () => {
    test('with render', async () => {
      const blockContainer = defineContainer({
        scope: 'block',
        field: 'children',
        render: ({attributes, children}) => (
          <p {...attributes} className="custom-block">
            {children}
          </p>
        ),
      })

      await createTestEditor({
        schemaDefinition: defineSchema({
          inlineObjects: [{name: 'stock-ticker'}],
        }),
        initialValue: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_key: 's0', _type: 'span', text: 'hello ', marks: []},
              {_key: 'i0', _type: 'stock-ticker'},
              {_key: 's1', _type: 'span', text: ' world', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        children: (
          <ContainerPlugin containers={[{container: blockContainer}]} />
        ),
      })

      await vi.waitFor(() => {
        const el = document.querySelector('[data-slate-editor]')
        expect(el).not.toEqual(null)
        expect(formatHTML(normalizeInnerHTML(el!.innerHTML))).toEqual(
          formatHTML(
            [
              // root text block: overridden with <p> via block scope
              '<p data-pt-path="[_key==&quot;b0&quot;]" data-pt-container="" class="custom-block">',
              // span: s0
              '  <span data-pt-leaf="" data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]">',
              '    <span data-pt-string="true">hello </span>',
              '  </span>',
              // inline object: stock-ticker i0
              '  <span data-pt-leaf="" data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;i0&quot;]" contenteditable="false">',
              '    <span>[stock-ticker: i0]</span>',
              '    <span data-pt-spacer="">\uFEFF</span>',
              '  </span>',
              // span: s1
              '  <span data-pt-leaf="" data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;s1&quot;]">',
              '    <span data-pt-string="true"> world</span>',
              '  </span>',
              '</p>',
            ].join('\n'),
          ),
        )
      })
    })

    test('without render', async () => {
      const blockContainer = defineContainer({
        scope: 'block',
        field: 'children',
      })

      const spanLeaf = defineLeaf({
        scope: 'block.span',
        render: ({attributes, children}) => (
          <span {...attributes} className="custom-span">
            {children}
          </span>
        ),
      })

      await createTestEditor({
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _type: 'block',
            _key: 'b0',
            children: [{_key: 's0', _type: 'span', text: 'hello', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
        children: (
          <>
            <ContainerPlugin containers={[{container: blockContainer}]} />
            <LeafPlugin leaves={[{leaf: spanLeaf}]} />
          </>
        ),
      })

      await vi.waitFor(() => {
        const el = document.querySelector('[data-slate-editor]')
        expect(el).not.toEqual(null)
        expect(formatHTML(normalizeInnerHTML(el!.innerHTML))).toEqual(
          formatHTML(
            [
              // root text block: container pipeline via block scope
              '<div data-pt-path="[_key==&quot;b0&quot;]" data-pt-container="">',
              // span: s0 with custom className from block.span leaf
              '  <span data-pt-leaf="" data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]" class="custom-span">',
              '    <span data-pt-string="true">hello</span>',
              '  </span>',
              '</div>',
            ].join('\n'),
          ),
        )
      })
    })
  })

  describe('defineLeaf (span)', () => {
    test('default (no defineLeaf)', async () => {
      const calloutContainer = defineContainer({
        scope: 'callout',
        field: 'content',
        render: ({attributes, children}) => (
          <div {...attributes} className="callout">
            {children}
          </div>
        ),
      })

      await createTestEditor({
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
            _key: 'c0',
            _type: 'callout',
            content: [
              {
                _key: 'b0',
                _type: 'block',
                children: [
                  {_key: 's0', _type: 'span', text: 'hello', marks: []},
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
        const el = document.querySelector('[data-slate-editor]')
        expect(el).not.toEqual(null)
        expect(formatHTML(normalizeInnerHTML(el!.innerHTML))).toEqual(
          formatHTML(
            [
              // callout container: c0
              '<div data-pt-path="[_key==&quot;c0&quot;]" data-pt-container="" class="callout">',
              // text block: b0 (always a container, not a leaf)
              '  <div data-pt-container="" data-pt-path="[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;]">',
              // span: s0
              '    <span data-pt-leaf="" data-pt-path="[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]">',
              '      <span data-pt-string="true">hello</span>',
              '    </span>',
              '  </div>',
              '</div>',
            ].join('\n'),
          ),
        )
      })
    })

    test('with render (block.span)', async () => {
      const calloutContainer = defineContainer({
        scope: 'callout',
        field: 'content',
        render: ({attributes, children}) => (
          <div {...attributes} className="callout">
            {children}
          </div>
        ),
      })

      const customSpanLeaf = defineLeaf({
        scope: 'block.span',
        render: ({attributes, children}) => (
          <span {...attributes} className="custom-span">
            {children}
          </span>
        ),
      })

      await createTestEditor({
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
            _key: 'c0',
            _type: 'callout',
            content: [
              {
                _key: 'b0',
                _type: 'block',
                children: [
                  {_key: 's0', _type: 'span', text: 'hello', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
        children: (
          <>
            <ContainerPlugin containers={[{container: calloutContainer}]} />
            <LeafPlugin leaves={[{leaf: customSpanLeaf}]} />
          </>
        ),
      })

      await vi.waitFor(() => {
        const el = document.querySelector('[data-slate-editor]')
        expect(el).not.toEqual(null)
        expect(formatHTML(normalizeInnerHTML(el!.innerHTML))).toEqual(
          formatHTML(
            [
              // callout container: c0
              '<div data-pt-path="[_key==&quot;c0&quot;]" data-pt-container="" class="callout">',
              // text block: b0
              '  <div data-pt-container="" data-pt-path="[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;]">',
              // span: s0 with custom className from defineLeaf
              '    <span data-pt-leaf="" data-pt-path="[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]" class="custom-span">',
              '      <span data-pt-string="true">hello</span>',
              '    </span>',
              '  </div>',
              '</div>',
            ].join('\n'),
          ),
        )
      })
    })

    test('scoped specificity (callout.block.span wins over block.span)', async () => {
      const calloutContainer = defineContainer({
        scope: 'callout',
        field: 'content',
        render: ({attributes, children}) => (
          <div {...attributes} className="callout">
            {children}
          </div>
        ),
      })

      // Universal span leaf: matches any block.span
      const universalSpanLeaf = defineLeaf({
        scope: 'block.span',
        render: ({attributes, children}) => (
          <span {...attributes} className="universal-span">
            {children}
          </span>
        ),
      })

      // Scoped span leaf: matches only callout.block.span
      const scopedSpanLeaf = defineLeaf({
        scope: 'callout.block.span',
        render: ({attributes, children}) => (
          <span {...attributes} className="callout-span">
            {children}
          </span>
        ),
      })

      await createTestEditor({
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
            _key: 'c0',
            _type: 'callout',
            content: [
              {
                _key: 'b0',
                _type: 'block',
                children: [
                  {_key: 's0', _type: 'span', text: 'hello', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
        children: (
          <>
            <ContainerPlugin containers={[{container: calloutContainer}]} />
            <LeafPlugin
              leaves={[{leaf: universalSpanLeaf}, {leaf: scopedSpanLeaf}]}
            />
          </>
        ),
      })

      await vi.waitFor(() => {
        const el = document.querySelector('[data-slate-editor]')
        expect(el).not.toEqual(null)
        // The scoped leaf (callout.block.span) wins over the universal (block.span)
        expect(formatHTML(normalizeInnerHTML(el!.innerHTML))).toEqual(
          formatHTML(
            [
              // callout container: c0
              '<div data-pt-path="[_key==&quot;c0&quot;]" data-pt-container="" class="callout">',
              // text block: b0
              '  <div data-pt-container="" data-pt-path="[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;]">',
              // span: s0 with scoped className (callout-span, not universal-span)
              '    <span data-pt-leaf="" data-pt-path="[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]" class="callout-span">',
              '      <span data-pt-string="true">hello</span>',
              '    </span>',
              '  </div>',
              '</div>',
            ].join('\n'),
          ),
        )
      })
    })

    test('with decorator wrapping', async () => {
      const calloutContainer = defineContainer({
        scope: 'callout',
        field: 'content',
        render: ({attributes, children}) => (
          <div {...attributes} className="callout">
            {children}
          </div>
        ),
      })

      await createTestEditor({
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}],
          blockObjects: [
            {
              name: 'callout',
              fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
            },
          ],
        }),
        initialValue: [
          {
            _key: 'c0',
            _type: 'callout',
            content: [
              {
                _key: 'b0',
                _type: 'block',
                children: [
                  {
                    _key: 's0',
                    _type: 'span',
                    text: 'bold text',
                    marks: ['strong'],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
        editableProps: {
          renderDecorator: ({children}) => <strong>{children}</strong>,
        },
        children: (
          <ContainerPlugin containers={[{container: calloutContainer}]} />
        ),
      })

      await vi.waitFor(() => {
        const el = document.querySelector('[data-slate-editor]')
        expect(el).not.toEqual(null)
        expect(formatHTML(normalizeInnerHTML(el!.innerHTML))).toEqual(
          formatHTML(
            [
              // callout container: c0
              '<div data-pt-path="[_key==&quot;c0&quot;]" data-pt-container="" class="callout">',
              // text block: b0
              '  <div data-pt-container="" data-pt-path="[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;]">',
              // span: s0 with decorator wrapping
              '    <span data-pt-leaf="" data-pt-path="[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]">',
              '      <strong>',
              '        <span data-pt-string="true">bold text</span>',
              '      </strong>',
              '    </span>',
              '  </div>',
              '</div>',
            ].join('\n'),
          ),
        )
      })
    })

    test('with annotation wrapping', async () => {
      const calloutContainer = defineContainer({
        scope: 'callout',
        field: 'content',
        render: ({attributes, children}) => (
          <div {...attributes} className="callout">
            {children}
          </div>
        ),
      })

      await createTestEditor({
        schemaDefinition: defineSchema({
          annotations: [{name: 'link'}],
          blockObjects: [
            {
              name: 'callout',
              fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
            },
          ],
        }),
        initialValue: [
          {
            _key: 'c0',
            _type: 'callout',
            content: [
              {
                _key: 'b0',
                _type: 'block',
                children: [
                  {
                    _key: 's0',
                    _type: 'span',
                    text: 'linked text',
                    marks: ['link1'],
                  },
                ],
                markDefs: [{_key: 'link1', _type: 'link'}],
                style: 'normal',
              },
            ],
          },
        ],
        editableProps: {
          renderAnnotation: ({children}) => (
            <span data-testid="annotation">{children}</span>
          ),
        },
        children: (
          <ContainerPlugin containers={[{container: calloutContainer}]} />
        ),
      })

      await vi.waitFor(() => {
        const el = document.querySelector('[data-slate-editor]')
        expect(el).not.toEqual(null)
        expect(formatHTML(normalizeInnerHTML(el!.innerHTML))).toEqual(
          formatHTML(
            [
              // callout container: c0
              '<div data-pt-path="[_key==&quot;c0&quot;]" data-pt-container="" class="callout">',
              // text block: b0
              '  <div data-pt-container="" data-pt-path="[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;]">',
              // span: s0 with annotation wrapping
              '    <span data-pt-leaf="" data-pt-path="[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]">',
              '      <span>',
              '        <span data-testid="annotation">',
              '          <span data-pt-string="true">linked text</span>',
              '        </span>',
              '      </span>',
              '    </span>',
              '  </div>',
              '</div>',
            ].join('\n'),
          ),
        )
      })
    })

    test('with decorator and annotation wrapping (multiple marks)', async () => {
      const calloutContainer = defineContainer({
        scope: 'callout',
        field: 'content',
        render: ({attributes, children}) => (
          <div {...attributes} className="callout">
            {children}
          </div>
        ),
      })

      await createTestEditor({
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}],
          annotations: [{name: 'link'}],
          blockObjects: [
            {
              name: 'callout',
              fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
            },
          ],
        }),
        initialValue: [
          {
            _key: 'c0',
            _type: 'callout',
            content: [
              {
                _key: 'b0',
                _type: 'block',
                children: [
                  {
                    _key: 's0',
                    _type: 'span',
                    text: 'bold link',
                    marks: ['strong', 'link1'],
                  },
                ],
                markDefs: [{_key: 'link1', _type: 'link'}],
                style: 'normal',
              },
            ],
          },
        ],
        editableProps: {
          renderDecorator: ({children}) => <strong>{children}</strong>,
          renderAnnotation: ({children}) => (
            <span data-testid="annotation">{children}</span>
          ),
        },
        children: (
          <ContainerPlugin containers={[{container: calloutContainer}]} />
        ),
      })

      await vi.waitFor(() => {
        const el = document.querySelector('[data-slate-editor]')
        expect(el).not.toEqual(null)
        expect(formatHTML(normalizeInnerHTML(el!.innerHTML))).toEqual(
          formatHTML(
            [
              // callout container: c0
              '<div data-pt-path="[_key==&quot;c0&quot;]" data-pt-container="" class="callout">',
              // text block: b0
              '  <div data-pt-container="" data-pt-path="[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;]">',
              // span: s0 with decorator wrapping first, then annotation wrapping
              '    <span data-pt-leaf="" data-pt-path="[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]">',
              '      <span>',
              '        <span data-testid="annotation">',
              '          <strong>',
              '            <span data-pt-string="true">bold link</span>',
              '          </strong>',
              '        </span>',
              '      </span>',
              '    </span>',
              '  </div>',
              '</div>',
            ].join('\n'),
          ),
        )
      })
    })

    test('returning null falls back to default', async () => {
      const galleryContainer = defineContainer({
        scope: 'gallery',
        field: 'items',
        render: ({attributes, children}) => (
          <div {...attributes} className="gallery">
            {children}
          </div>
        ),
      })

      const nullLeaf = defineLeaf({
        scope: 'gallery.image',
        render: () => null,
      })

      await createTestEditor({
        schemaDefinition: defineSchema({
          blockObjects: [
            {
              name: 'gallery',
              fields: [{name: 'items', type: 'array', of: [{type: 'image'}]}],
            },
            {name: 'image'},
          ],
        }),
        initialValue: [
          {
            _key: 'g0',
            _type: 'gallery',
            items: [{_key: 'img0', _type: 'image'}],
          },
        ],
        children: (
          <>
            <ContainerPlugin containers={[{container: galleryContainer}]} />
            <LeafPlugin leaves={[{leaf: nullLeaf}]} />
          </>
        ),
      })

      await vi.waitFor(() => {
        const el = document.querySelector('[data-slate-editor]')
        expect(el).not.toEqual(null)
        // Returning null from defineLeaf falls back to default void block object rendering
        expect(formatHTML(normalizeInnerHTML(el!.innerHTML))).toEqual(
          formatHTML(
            [
              // gallery container: g0
              '<div data-pt-path="[_key==&quot;g0&quot;]" data-pt-container="" class="gallery">',
              // void block object: img0 (default rendering despite registered leaf)
              '  <div data-pt-leaf="" data-pt-path="[_key==&quot;g0&quot;].items[_key==&quot;img0&quot;]" contenteditable="false">',
              '    <div>[image: img0]</div>',
              '    <div data-pt-spacer="" style="height: 0px; color: transparent; outline: none; position: absolute;">',
              '      <span data-pt-leaf="">',
              '        <span data-pt-zero-width="z" data-pt-length="0">\uFEFF</span>',
              '      </span>',
              '    </div>',
              '  </div>',
              '</div>',
            ].join('\n'),
          ),
        )
      })
    })
  })

  describe('defineLeaf (inline object)', () => {
    test('default (no defineLeaf)', async () => {
      const calloutContainer = defineContainer({
        scope: 'callout',
        field: 'content',
        render: ({attributes, children}) => (
          <div {...attributes} className="callout">
            {children}
          </div>
        ),
      })

      await createTestEditor({
        schemaDefinition: defineSchema({
          inlineObjects: [{name: 'stock-ticker'}],
          blockObjects: [
            {
              name: 'callout',
              fields: [
                {
                  name: 'content',
                  type: 'array',
                  of: [{type: 'block', of: [{type: 'stock-ticker'}]}],
                },
              ],
            },
          ],
        }),
        initialValue: [
          {
            _key: 'c0',
            _type: 'callout',
            content: [
              {
                _key: 'b0',
                _type: 'block',
                children: [
                  {_key: 's0', _type: 'span', text: '', marks: []},
                  {_key: 'i0', _type: 'stock-ticker'},
                  {_key: 's1', _type: 'span', text: '', marks: []},
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
        const el = document.querySelector('[data-slate-editor]')
        expect(el).not.toEqual(null)
        expect(formatHTML(normalizeInnerHTML(el!.innerHTML))).toEqual(
          formatHTML(
            [
              // callout container: c0
              '<div data-pt-path="[_key==&quot;c0&quot;]" data-pt-container="" class="callout">',
              // text block: b0
              '  <div data-pt-container="" data-pt-path="[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;]">',
              // span: s0 (empty, before inline object)
              '    <span data-pt-leaf="" data-pt-path="[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]">',
              '      <span data-pt-zero-width="z" data-pt-length="0">\uFEFF</span>',
              '    </span>',
              // inline object: stock-ticker i0
              '    <span data-pt-leaf="" data-pt-path="[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;].children[_key==&quot;i0&quot;]" contenteditable="false">',
              '      <span>[stock-ticker: i0]</span>',
              '      <span data-pt-spacer="">\uFEFF</span>',
              '    </span>',
              // span: s1 (empty, last child of text block: zero-width with line break)
              '    <span data-pt-leaf="" data-pt-path="[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;].children[_key==&quot;s1&quot;]">',
              '      <span data-pt-zero-width="n" data-pt-length="0">\uFEFF<br></span>',
              '    </span>',
              '  </div>',
              '</div>',
            ].join('\n'),
          ),
        )
      })
    })

    test('with render', async () => {
      const calloutContainer = defineContainer({
        scope: 'callout',
        field: 'content',
        render: ({attributes, children}) => (
          <div {...attributes} className="callout">
            {children}
          </div>
        ),
      })

      // Inline objects live inside text blocks, so their scope includes '.block.':
      // 'callout.block.stock-ticker' not 'callout.stock-ticker'
      const customInlineLeaf = defineLeaf({
        scope: 'callout.block.stock-ticker',
        render: ({attributes, children, node}) => (
          <span {...attributes}>
            <span>[{node._type}]</span>
            {children}
          </span>
        ),
      })

      await createTestEditor({
        schemaDefinition: defineSchema({
          inlineObjects: [{name: 'stock-ticker'}],
          blockObjects: [
            {
              name: 'callout',
              fields: [
                {
                  name: 'content',
                  type: 'array',
                  of: [{type: 'block', of: [{type: 'stock-ticker'}]}],
                },
              ],
            },
          ],
        }),
        initialValue: [
          {
            _key: 'c0',
            _type: 'callout',
            content: [
              {
                _key: 'b0',
                _type: 'block',
                children: [
                  {_key: 's0', _type: 'span', text: '', marks: []},
                  {_key: 'i0', _type: 'stock-ticker'},
                  {_key: 's1', _type: 'span', text: '', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
        children: (
          <>
            <ContainerPlugin containers={[{container: calloutContainer}]} />
            <LeafPlugin leaves={[{leaf: customInlineLeaf}]} />
          </>
        ),
      })

      await vi.waitFor(() => {
        const el = document.querySelector('[data-slate-editor]')
        expect(el).not.toEqual(null)
        expect(formatHTML(normalizeInnerHTML(el!.innerHTML))).toEqual(
          formatHTML(
            [
              // callout container: c0
              '<div data-pt-path="[_key==&quot;c0&quot;]" data-pt-container="" class="callout">',
              // text block: b0
              '  <div data-pt-container="" data-pt-path="[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;]">',
              // span: s0 (empty, before inline object)
              '    <span data-pt-leaf="" data-pt-path="[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]">',
              '      <span data-pt-zero-width="z" data-pt-length="0">\uFEFF</span>',
              '    </span>',
              // inline object: stock-ticker i0 with custom render
              '    <span data-pt-leaf="" data-pt-path="[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;].children[_key==&quot;i0&quot;]" contenteditable="false">',
              '      <span>[stock-ticker]</span>',
              '      <span data-pt-spacer="">\uFEFF</span>',
              '    </span>',
              // span: s1 (empty, last child of text block: zero-width with line break)
              '    <span data-pt-leaf="" data-pt-path="[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;].children[_key==&quot;s1&quot;]">',
              '      <span data-pt-zero-width="n" data-pt-length="0">\uFEFF<br></span>',
              '    </span>',
              '  </div>',
              '</div>',
            ].join('\n'),
          ),
        )
      })
    })

    test('on root text block (block.stock-ticker)', async () => {
      const blockContainer = defineContainer({
        scope: 'block',
        field: 'children',
      })

      const stockTickerLeaf = defineLeaf({
        scope: 'block.stock-ticker',
        render: ({attributes, children, node}) => (
          <span {...attributes}>
            <span>[{node._type}]</span>
            {children}
          </span>
        ),
      })

      await createTestEditor({
        schemaDefinition: defineSchema({
          inlineObjects: [{name: 'stock-ticker'}],
        }),
        initialValue: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_key: 's0', _type: 'span', text: 'price: ', marks: []},
              {_key: 'i0', _type: 'stock-ticker'},
              {_key: 's1', _type: 'span', text: '', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        children: (
          <>
            <ContainerPlugin containers={[{container: blockContainer}]} />
            <LeafPlugin leaves={[{leaf: stockTickerLeaf}]} />
          </>
        ),
      })

      await vi.waitFor(() => {
        const el = document.querySelector('[data-slate-editor]')
        expect(el).not.toEqual(null)
        expect(formatHTML(normalizeInnerHTML(el!.innerHTML))).toEqual(
          formatHTML(
            [
              // root text block: overridden via block scope (default div)
              '<div data-pt-path="[_key==&quot;b0&quot;]" data-pt-container="">',
              // span: s0
              '  <span data-pt-leaf="" data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]">',
              '    <span data-pt-string="true">price: </span>',
              '  </span>',
              // inline object: stock-ticker i0 with custom defineLeaf render
              '  <span data-pt-leaf="" data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;i0&quot;]" contenteditable="false">',
              '    <span>[stock-ticker]</span>',
              '    <span data-pt-spacer="">\uFEFF</span>',
              '  </span>',
              // span: s1 (empty, last child: zero-width with line break)
              '  <span data-pt-leaf="" data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;s1&quot;]">',
              '    <span data-pt-zero-width="n" data-pt-length="0">\uFEFF<br></span>',
              '  </span>',
              '</div>',
            ].join('\n'),
          ),
        )
      })
    })

    test('on root text block (no defineContainer)', async () => {
      const stockTickerLeaf = defineLeaf({
        scope: 'block.stock-ticker',
        render: ({attributes, children, node}) => (
          <span {...attributes}>
            <span>[{node._type}]</span>
            {children}
          </span>
        ),
      })

      await createTestEditor({
        schemaDefinition: defineSchema({
          inlineObjects: [{name: 'stock-ticker'}],
        }),
        initialValue: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_key: 's0', _type: 'span', text: 'price: ', marks: []},
              {_key: 'i0', _type: 'stock-ticker'},
              {_key: 's1', _type: 'span', text: '', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        children: <LeafPlugin leaves={[{leaf: stockTickerLeaf}]} />,
      })

      await vi.waitFor(() => {
        const el = document.querySelector('[data-slate-editor]')
        expect(el).not.toEqual(null)
        // Root text block still renders via root pipeline
        const rootBlock = el!.querySelector(
          '[data-slate-node="element"][data-block-type="text"]',
        )
        expect(rootBlock).not.toEqual(null)
        // Inline stock-ticker renders via container pipeline with data-pt-leaf
        const ptLeaf = rootBlock!.querySelector('[data-pt-leaf]')
        expect(ptLeaf).not.toEqual(null)
        expect(ptLeaf!.textContent).toContain('[stock-ticker]')
        // Spans remain in root pipeline
        const slateSpans = rootBlock!.querySelectorAll('[data-slate-leaf]')
        expect(slateSpans.length).toEqual(2)
      })
    })
  })

  describe('defineLeaf (void block object)', () => {
    test('default (no defineLeaf)', async () => {
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
        schemaDefinition: defineSchema({
          blockObjects: [
            {
              name: 'gallery',
              fields: [{name: 'items', type: 'array', of: [{type: 'image'}]}],
            },
            {name: 'image'},
          ],
        }),
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
        children: (
          <ContainerPlugin containers={[{container: galleryContainer}]} />
        ),
      })

      await vi.waitFor(() => {
        const el = document.querySelector('[data-slate-editor]')
        expect(el).not.toEqual(null)
        expect(formatHTML(normalizeInnerHTML(el!.innerHTML))).toEqual(
          formatHTML(
            [
              // gallery container: g0
              '<div data-pt-path="[_key==&quot;g0&quot;]" data-pt-container="" class="gallery">',
              // void block object: img0
              '  <div data-pt-leaf="" data-pt-path="[_key==&quot;g0&quot;].items[_key==&quot;img0&quot;]" contenteditable="false">',
              '    <div>[image: img0]</div>',
              '    <div data-pt-spacer="" style="height: 0px; color: transparent; outline: none; position: absolute;">',
              '      <span data-pt-leaf="">',
              '        <span data-pt-zero-width="z" data-pt-length="0">\uFEFF</span>',
              '      </span>',
              '    </div>',
              '  </div>',
              // void block object: img1
              '  <div data-pt-leaf="" data-pt-path="[_key==&quot;g0&quot;].items[_key==&quot;img1&quot;]" contenteditable="false">',
              '    <div>[image: img1]</div>',
              '    <div data-pt-spacer="" style="height: 0px; color: transparent; outline: none; position: absolute;">',
              '      <span data-pt-leaf="">',
              '        <span data-pt-zero-width="z" data-pt-length="0">\uFEFF</span>',
              '      </span>',
              '    </div>',
              '  </div>',
              '</div>',
            ].join('\n'),
          ),
        )
      })
    })

    test('default (no defineLeaf) with data attributes', async () => {
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
        const el = document.querySelector('[data-slate-editor]')
        expect(el).not.toEqual(null)
        expect(formatHTML(normalizeInnerHTML(el!.innerHTML))).toEqual(
          formatHTML(
            [
              // gallery container
              '<div data-testid="gallery" data-pt-path="[_key==&quot;k0&quot;]" data-pt-container="">',
              // image 1 (void block object - data-pt-leaf, no data-slate-*)
              '  <div data-pt-leaf="" data-pt-path="[_key==&quot;k0&quot;].items[_key==&quot;img-0&quot;]" contenteditable="false">',
              '    <div>[image: img-0]</div>',
              // void spacer
              '    <div data-pt-spacer="" style="height: 0px; color: transparent; outline: none; position: absolute;">',
              '      <span data-pt-leaf="">',
              '        <span data-pt-zero-width="z" data-pt-length="0">\uFEFF</span>',
              '      </span>',
              '    </div>',
              '  </div>',
              // image 2 (void block object)
              '  <div data-pt-leaf="" data-pt-path="[_key==&quot;k0&quot;].items[_key==&quot;img-1&quot;]" contenteditable="false">',
              '    <div>[image: img-1]</div>',
              // void spacer
              '    <div data-pt-spacer="" style="height: 0px; color: transparent; outline: none; position: absolute;">',
              '      <span data-pt-leaf="">',
              '        <span data-pt-zero-width="z" data-pt-length="0">\uFEFF</span>',
              '      </span>',
              '    </div>',
              '  </div>',
              '</div>',
            ].join('\n'),
          ),
        )
      })
    })

    test('with render', async () => {
      const galleryContainer = defineContainer({
        scope: 'gallery',
        field: 'items',
        render: ({attributes, children}) => (
          <div {...attributes} className="gallery">
            {children}
          </div>
        ),
      })

      const customImageLeaf = defineLeaf({
        scope: 'gallery.image',
        render: ({attributes, children, node}) => (
          <div {...attributes}>
            <div className="custom-image">[{node._type}]</div>
            {children}
          </div>
        ),
      })

      await createTestEditor({
        schemaDefinition: defineSchema({
          blockObjects: [
            {
              name: 'gallery',
              fields: [{name: 'items', type: 'array', of: [{type: 'image'}]}],
            },
            {name: 'image'},
          ],
        }),
        initialValue: [
          {
            _key: 'g0',
            _type: 'gallery',
            items: [{_key: 'img0', _type: 'image'}],
          },
        ],
        children: (
          <>
            <ContainerPlugin containers={[{container: galleryContainer}]} />
            <LeafPlugin leaves={[{leaf: customImageLeaf}]} />
          </>
        ),
      })

      await vi.waitFor(() => {
        const el = document.querySelector('[data-slate-editor]')
        expect(el).not.toEqual(null)
        expect(formatHTML(normalizeInnerHTML(el!.innerHTML))).toEqual(
          formatHTML(
            [
              // gallery container: g0
              '<div data-pt-path="[_key==&quot;g0&quot;]" data-pt-container="" class="gallery">',
              // void block object: img0 with custom render
              '  <div data-pt-leaf="" data-pt-path="[_key==&quot;g0&quot;].items[_key==&quot;img0&quot;]" contenteditable="false">',
              '    <div class="custom-image">[image]</div>',
              '    <div data-pt-spacer="" style="height: 0px; color: transparent; outline: none; position: absolute;">',
              '      <span data-pt-leaf="">',
              '        <span data-pt-zero-width="z" data-pt-length="0">\uFEFF</span>',
              '      </span>',
              '    </div>',
              '  </div>',
              '</div>',
            ].join('\n'),
          ),
        )
      })
    })

    test('on root level (no defineContainer)', async () => {
      const imageLeaf = defineLeaf({
        scope: 'image',
        render: ({attributes, children, node}) => (
          <div {...attributes}>
            <div className="custom-image">image {node._key}</div>
            {children}
          </div>
        ),
      })

      await createTestEditor({
        schemaDefinition: defineSchema({
          blockObjects: [{name: 'image'}],
        }),
        initialValue: [
          {
            _type: 'block',
            _key: 'b0',
            children: [{_key: 's0', _type: 'span', text: 'before', marks: []}],
            markDefs: [],
            style: 'normal',
          },
          {_key: 'img0', _type: 'image'},
          {
            _type: 'block',
            _key: 'b1',
            children: [{_key: 's1', _type: 'span', text: 'after', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
        children: <LeafPlugin leaves={[{leaf: imageLeaf}]} />,
      })

      await vi.waitFor(() => {
        const el = document.querySelector('[data-slate-editor]')
        expect(el).not.toEqual(null)
        const customImage = el!.querySelector('.custom-image')
        expect(customImage).not.toEqual(null)
        // Image goes through container pipeline: data-pt-leaf
        const ptLeaf = el!.querySelector('[data-pt-leaf]')
        expect(ptLeaf).not.toEqual(null)
        // Surrounding text blocks still use root pipeline (data-slate-node)
        const slateBlocks = el!.querySelectorAll(
          '[data-slate-node="element"][data-block-type="text"]',
        )
        expect(slateBlocks.length).toEqual(2)
      })
    })
  })

  describe('deep nesting', () => {
    test('table > row > cell > text block > inline', async () => {
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
        const el = document.querySelector('[data-slate-editor]')
        expect(el).not.toEqual(null)
        expect(formatHTML(el!.innerHTML)).toEqual(
          formatHTML(
            [
              // table container
              '<table data-testid="table" data-pt-path="[_key==&quot;k0&quot;]" data-pt-container="">',
              '  <tbody>',
              // row container
              '    <tr data-testid="row" data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;row-0&quot;]" data-pt-container="">',
              // cell container
              '      <td data-testid="cell" data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;row-0&quot;].cells[_key==&quot;cell-0&quot;]" data-pt-container="">',
              // text block inside cell
              '        <div data-pt-container="" data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;row-0&quot;].cells[_key==&quot;cell-0&quot;].content[_key==&quot;block-0&quot;]">',
              // span
              '          <span data-pt-leaf="" data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;row-0&quot;].cells[_key==&quot;cell-0&quot;].content[_key==&quot;block-0&quot;].children[_key==&quot;span-0&quot;]">',
              '            <span data-pt-string="true">cell text</span>',
              '          </span>',
              '        </div>',
              '      </td>',
              '    </tr>',
              '  </tbody>',
              '</table>',
            ].join('\n'),
          ),
        )
      })
    })

    test('cell with mixed content (text blocks + void objects)', async () => {
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
            containers={[
              {container: tableContainer},
              {container: rowContainer},
              {container: cellContainer},
            ]}
          />
        ),
      })

      await vi.waitFor(() => {
        const el = document.querySelector('[data-slate-editor]')
        expect(el).not.toEqual(null)
        expect(formatHTML(normalizeInnerHTML(el!.innerHTML))).toEqual(
          formatHTML(
            [
              // table container
              '<table data-testid="table" data-pt-path="[_key==&quot;k0&quot;]" data-pt-container="">',
              '  <tbody>',
              // row container
              '    <tr data-testid="row" data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;row-0&quot;]" data-pt-container="">',
              // cell container
              '      <td data-testid="cell" data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;row-0&quot;].cells[_key==&quot;cell-0&quot;]" data-pt-container="">',
              // text block before image
              '        <div data-pt-container="" data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;row-0&quot;].cells[_key==&quot;cell-0&quot;].content[_key==&quot;block-0&quot;]">',
              '          <span data-pt-leaf="" data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;row-0&quot;].cells[_key==&quot;cell-0&quot;].content[_key==&quot;block-0&quot;].children[_key==&quot;span-0&quot;]">',
              '            <span data-pt-string="true">text before image</span>',
              '          </span>',
              '        </div>',
              // void image block object inside cell
              '        <div data-pt-leaf="" data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;row-0&quot;].cells[_key==&quot;cell-0&quot;].content[_key==&quot;img-0&quot;]" contenteditable="false">',
              '          <div>[image: img-0]</div>',
              // void spacer
              '          <div data-pt-spacer="" style="height: 0px; color: transparent; outline: none; position: absolute;">',
              '            <span data-pt-leaf="">',
              '              <span data-pt-zero-width="z" data-pt-length="0">\uFEFF</span>',
              '            </span>',
              '          </div>',
              '        </div>',
              // text block after image
              '        <div data-pt-container="" data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;row-0&quot;].cells[_key==&quot;cell-0&quot;].content[_key==&quot;block-1&quot;]">',
              '          <span data-pt-leaf="" data-pt-path="[_key==&quot;k0&quot;].rows[_key==&quot;row-0&quot;].cells[_key==&quot;cell-0&quot;].content[_key==&quot;block-1&quot;].children[_key==&quot;span-1&quot;]">',
              '            <span data-pt-string="true">text after image</span>',
              '          </span>',
              '        </div>',
              '      </td>',
              '    </tr>',
              '  </tbody>',
              '</table>',
            ].join('\n'),
          ),
        )
      })
    })

    test('code block with text blocks', async () => {
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
        scope: 'code-block',
        field: 'code',
        render: ({attributes, children}) => (
          <pre data-testid="code-block" {...attributes}>
            <code>{children}</code>
          </pre>
        ),
      })

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
        children: (
          <ContainerPlugin containers={[{container: codeBlockContainer}]} />
        ),
      })

      await vi.waitFor(() => {
        const el = document.querySelector('[data-slate-editor]')
        expect(el).not.toEqual(null)
        expect(formatHTML(el!.innerHTML)).toEqual(
          formatHTML(
            [
              // code-block container
              '<pre data-testid="code-block" data-pt-path="[_key==&quot;k0&quot;]" data-pt-container="">',
              '  <code>',
              // line 1 text block
              '    <div data-pt-container="" data-pt-path="[_key==&quot;k0&quot;].code[_key==&quot;line-0&quot;]">',
              '      <span data-pt-leaf="" data-pt-path="[_key==&quot;k0&quot;].code[_key==&quot;line-0&quot;].children[_key==&quot;span-0&quot;]">',
              '        <span data-pt-string="true">const a = 1</span>',
              '      </span>',
              '    </div>',
              // line 2 text block
              '    <div data-pt-container="" data-pt-path="[_key==&quot;k0&quot;].code[_key==&quot;line-1&quot;]">',
              '      <span data-pt-leaf="" data-pt-path="[_key==&quot;k0&quot;].code[_key==&quot;line-1&quot;].children[_key==&quot;span-1&quot;]">',
              '        <span data-pt-string="true">console.log(a)</span>',
              '      </span>',
              '    </div>',
              '  </code>',
              '</pre>',
            ].join('\n'),
          ),
        )
      })
    })
  })

  describe('edge cases', () => {
    test('container without matching defineContainer renders as void', async () => {
      const keyGenerator = createTestKeyGenerator()
      const calloutKey = keyGenerator()

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
        const el = document.querySelector('[data-slate-editor]')
        expect(el).not.toEqual(null)

        // The callout renders as a void block object, not using the custom renderer
        const calloutTestId = el!.querySelector('[data-testid="callout"]')
        expect(calloutTestId).toEqual(null)

        // Verify it renders as a void block object with contentEditable=false
        const blockObject = el!.querySelector('[data-block-type="object"]')
        expect(blockObject).not.toEqual(null)
        expect(
          blockObject!.querySelector('[contenteditable="false"]'),
        ).not.toEqual(null)
      })
    })

    test('only editable fields render in the DOM', async () => {
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
        const el = document.querySelector('[data-slate-editor]')
        expect(el).not.toEqual(null)
        expect(formatHTML(el!.innerHTML)).toEqual(
          formatHTML(
            [
              // card container
              '<div data-testid="card" data-pt-path="[_key==&quot;k0&quot;]" data-pt-container="">',
              // body text block
              '  <div data-pt-container="" data-pt-path="[_key==&quot;k0&quot;].body[_key==&quot;body-block&quot;]">',
              // body span
              '    <span data-pt-leaf="" data-pt-path="[_key==&quot;k0&quot;].body[_key==&quot;body-block&quot;].children[_key==&quot;body-span&quot;]">',
              '      <span data-pt-string="true">card body</span>',
              '    </span>',
              '  </div>',
              '</div>',
            ].join('\n'),
          ),
        )
      })
    })

    test('node prop receives raw data', async () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const calloutKey = keyGenerator()

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
            children: [
              {_type: 'span', _key: spanKey, text: 'hello', marks: []},
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

    test('block scope specificity: scoped block wins over universal', async () => {
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
        const el = document.querySelector('[data-slate-editor]')
        expect(el).not.toEqual(null)

        const universalBlock = el!.querySelector(
          '[data-testid="universal-block"]',
        )
        expect(universalBlock).not.toEqual(null)
        expect(universalBlock!.textContent).toEqual('root text')

        const calloutBlock = el!.querySelector('[data-testid="callout-block"]')
        expect(calloutBlock).not.toEqual(null)
        expect(calloutBlock!.textContent).toEqual('callout text')
      })
    })

    test('block scope specificity: universal block fallback inside container', async () => {
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
        const el = document.querySelector('[data-slate-editor]')
        expect(el).not.toEqual(null)

        const universalBlocks = el!.querySelectorAll(
          '[data-testid="universal-block"]',
        )
        expect(universalBlocks.length).toEqual(2)
        expect(universalBlocks[0]!.textContent).toEqual('root text')
        expect(universalBlocks[1]!.textContent).toEqual('callout text')
      })
    })

    test('defineLeaf without defineContainer is a no-op on root text blocks', async () => {
      const spanLeaf = defineLeaf({
        scope: 'block.span',
        render: ({attributes, children}) => (
          <span {...attributes} className="custom-span">
            {children}
          </span>
        ),
      })

      await createTestEditor({
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _type: 'block',
            _key: 'b0',
            children: [{_key: 's0', _type: 'span', text: 'hello', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
        children: <LeafPlugin leaves={[{leaf: spanLeaf}]} />,
      })

      await vi.waitFor(() => {
        const el = document.querySelector('[data-slate-editor]')
        expect(el).not.toEqual(null)
        // Root pipeline is used: data-slate-* attributes, no data-pt-*
        const ptLeaf = el!.querySelector('[data-pt-leaf]')
        expect(ptLeaf).toEqual(null)
        const customSpan = el!.querySelector('.custom-span')
        expect(customSpan).toEqual(null)
        // Root pipeline span has data-slate-leaf
        const slateLeaf = el!.querySelector('[data-slate-leaf]')
        expect(slateLeaf).not.toEqual(null)
      })
    })

    test('block scope overrides text block rendering', async () => {
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
            children: [
              {_type: 'span', _key: spanKey, text: 'hello', marks: []},
            ],
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
        const el = document.querySelector('[data-slate-editor]')
        expect(el).not.toEqual(null)
        const customBlock = el!.querySelector('[data-testid="custom-block"]')
        expect(customBlock).not.toEqual(null)
        expect(customBlock!.textContent).toEqual('hello')
      })
    })

    test('renderPlaceholder works with block scope container', async () => {
      const schemaDefinition = defineSchema({})

      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()

      const blockContainer = defineContainer({
        scope: 'block',
        field: 'children',
      })

      await createTestEditor({
        keyGenerator,
        schemaDefinition,
        initialValue: [
          {
            _type: 'block',
            _key: blockKey,
            children: [{_type: 'span', _key: spanKey, text: '', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
        editableProps: {
          renderPlaceholder: () => 'Type something...',
        },
        children: (
          <ContainerPlugin containers={[{container: blockContainer}]} />
        ),
      })

      await vi.waitFor(() => {
        const el = document.querySelector('[data-slate-editor]')
        expect(el).not.toEqual(null)
        const placeholder = el!.querySelector('[contenteditable="false"]')
        expect(placeholder).not.toEqual(null)
        expect(placeholder!.textContent).toEqual('Type something...')
      })
    })

    test('range decorations work with block scope container', async () => {
      const schemaDefinition = defineSchema({})
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const editorRef = createRef<Editor>()

      const blockContainer = defineContainer({
        scope: 'block',
        field: 'children',
      })

      const rangeDecorations: Array<RangeDecoration> = [
        {
          component: ({children}) => (
            <span data-testid="range-decoration">{children}</span>
          ),
          selection: {
            anchor: {
              path: [{_key: blockKey}, 'children', {_key: spanKey}],
              offset: 0,
            },
            focus: {
              path: [{_key: blockKey}, 'children', {_key: spanKey}],
              offset: 5,
            },
          },
        },
      ]

      await render(
        <EditorProvider
          initialConfig={{
            keyGenerator,
            schemaDefinition,
            initialValue: [
              {
                _type: 'block',
                _key: blockKey,
                children: [
                  {
                    _type: 'span',
                    _key: spanKey,
                    text: 'hello world',
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          }}
        >
          <EditorRefPlugin ref={editorRef} />
          <PortableTextEditable rangeDecorations={rangeDecorations} />
          <ContainerPlugin containers={[{container: blockContainer}]} />
        </EditorProvider>,
      )

      await vi.waitFor(() => {
        const decoration = document.querySelector(
          '[data-testid="range-decoration"]',
        )
        expect(decoration).not.toEqual(null)
        expect(decoration!.textContent).toEqual('hello')
      })
    })

    test('focused and selected props on decorator render inside container', async () => {
      const calloutContainer = defineContainer({
        scope: 'callout',
        field: 'content',
        render: ({attributes, children}) => (
          <div {...attributes} className="callout">
            {children}
          </div>
        ),
      })

      await createTestEditor({
        schemaDefinition: defineSchema({
          decorators: [{name: 'strong'}],
          blockObjects: [
            {
              name: 'callout',
              fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
            },
          ],
        }),
        initialValue: [
          {
            _key: 'c0',
            _type: 'callout',
            content: [
              {
                _key: 'b0',
                _type: 'block',
                children: [
                  {
                    _key: 's0',
                    _type: 'span',
                    text: 'bold text',
                    marks: ['strong'],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
        editableProps: {
          renderDecorator: ({children, focused, selected}) => (
            <strong
              data-testid="decorator"
              data-focused={String(focused)}
              data-selected={String(selected)}
            >
              {children}
            </strong>
          ),
        },
        children: (
          <ContainerPlugin containers={[{container: calloutContainer}]} />
        ),
      })

      const textElement = document.querySelector('[data-pt-string]')
      expect(textElement).not.toEqual(null)
      await userEvent.click(textElement!)

      await vi.waitFor(() => {
        const decorator = document.querySelector('[data-testid="decorator"]')
        expect(decorator).not.toEqual(null)
        // Selection state inside containers uses the same SelectionStateContext
        // as root-level blocks. After clicking, focused and selected reflect
        // the container pipeline's selection tracking.
        expect(decorator!.getAttribute('data-focused')).toEqual('true')
        expect(decorator!.getAttribute('data-selected')).toEqual('true')
      })
    })
  })
})
