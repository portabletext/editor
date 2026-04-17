import {defineSchema} from '@portabletext/schema'
import {describe, expect, test, vi} from 'vitest'
import {ContainerPlugin} from '../src/plugins/plugin.container'
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

function getEditorInnerHTML(): string {
  const el = document.querySelector('[data-slate-editor]')
  expect(el).not.toEqual(null)
  return normalizeInnerHTML(el!.innerHTML)
}

describe('defineLeaf integration', () => {
  describe('span', () => {
    test('custom render replaces default span content at root', async () => {
      await createTestEditor({
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _key: 'b0',
            _type: 'block',
            children: [{_key: 's0', _type: 'span', text: 'hello', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
        children: (
          <LeafPlugin
            leaves={[
              {
                leaf: defineLeaf({
                  scope: 'span',
                  render: ({attributes, children}) => (
                    <span {...attributes} className="custom-span">
                      {children}
                    </span>
                  ),
                }),
              },
            ]}
          />
        ),
      })

      await vi.waitFor(() => {
        expect(formatHTML(getEditorInnerHTML())).toEqual(
          formatHTML(
            [
              '<div data-slate-node="element" data-pt-path="[_key==&quot;b0&quot;]" class="pt-block pt-text-block pt-text-block-style-normal" data-block-key="b0" data-block-name="block" data-block-type="text" data-style="normal">',
              '  <div>',
              '    <span data-slate-node="text" data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]" data-child-key="s0" data-child-name="span" data-child-type="span">',
              '      <span data-slate-leaf="true" class="custom-span">',
              '        <span data-slate-string="true">hello</span>',
              '      </span>',
              '    </span>',
              '  </div>',
              '</div>',
            ].join('\n'),
          ),
        )
      })
    })

    test('custom render receives focused/selected props', async () => {
      let capturedFocused: boolean | undefined
      let capturedSelected: boolean | undefined

      await createTestEditor({
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _key: 'b0',
            _type: 'block',
            children: [{_key: 's0', _type: 'span', text: 'hi', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
        children: (
          <LeafPlugin
            leaves={[
              {
                leaf: defineLeaf({
                  scope: 'span',
                  render: ({attributes, children, focused, selected}) => {
                    capturedFocused = focused
                    capturedSelected = selected
                    return <span {...attributes}>{children}</span>
                  },
                }),
              },
            ]}
          />
        ),
      })

      await vi.waitFor(() => {
        expect(capturedFocused).toEqual(false)
        expect(capturedSelected).toEqual(false)
      })
    })

    test('render returning null falls back to default rendering', async () => {
      await createTestEditor({
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _key: 'b0',
            _type: 'block',
            children: [
              {_key: 's0', _type: 'span', text: 'fallback', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        children: (
          <LeafPlugin
            leaves={[
              {
                leaf: defineLeaf({
                  scope: 'span',
                  render: () => null,
                }),
              },
            ]}
          />
        ),
      })

      await vi.waitFor(() => {
        expect(formatHTML(getEditorInnerHTML())).toEqual(
          formatHTML(
            [
              '<div data-slate-node="element" data-pt-path="[_key==&quot;b0&quot;]" class="pt-block pt-text-block pt-text-block-style-normal" data-block-key="b0" data-block-name="block" data-block-type="text" data-style="normal">',
              '  <div>',
              '    <span data-slate-node="text" data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]" data-child-key="s0" data-child-name="span" data-child-type="span">',
              '      <span data-slate-leaf="true">',
              '        <span data-slate-string="true">fallback</span>',
              '      </span>',
              '    </span>',
              '  </div>',
              '</div>',
            ].join('\n'),
          ),
        )
      })
    })
  })

  describe('inline object', () => {
    test('custom render at root (block.stock-ticker scope)', async () => {
      await createTestEditor({
        schemaDefinition: defineSchema({
          inlineObjects: [{name: 'stock-ticker'}],
        }),
        initialValue: [
          {
            _key: 'b0',
            _type: 'block',
            children: [
              {_key: 's0', _type: 'span', text: 'pre ', marks: []},
              {_key: 'i0', _type: 'stock-ticker'},
              {_key: 's1', _type: 'span', text: ' post', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        children: (
          <LeafPlugin
            leaves={[
              {
                leaf: defineLeaf({
                  scope: 'block.stock-ticker',
                  render: ({children}) => (
                    <span className="custom-ticker">{children}</span>
                  ),
                }),
              },
            ]}
          />
        ),
      })

      await vi.waitFor(() => {
        expect(formatHTML(getEditorInnerHTML())).toEqual(
          formatHTML(
            [
              '<div data-slate-node="element" data-pt-path="[_key==&quot;b0&quot;]" class="pt-block pt-text-block pt-text-block-style-normal" data-block-key="b0" data-block-name="block" data-block-type="text" data-style="normal">',
              '  <div>',
              '    <span data-slate-node="text" data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]" data-child-key="s0" data-child-name="span" data-child-type="span">',
              '      <span data-slate-leaf="true">',
              '        <span data-slate-string="true">pre </span>',
              '      </span>',
              '    </span>',
              '    <span data-slate-node="element" data-slate-void="true" data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;i0&quot;]" data-slate-inline="true" contenteditable="false" class="pt-inline-object" data-child-key="i0" data-child-name="stock-ticker" data-child-type="object">',
              '      <span data-slate-spacer="true" style="height: 0px; color: transparent; outline: none; position: absolute;">',
              '        <span data-slate-node="text">',
              '          <span data-slate-leaf="true">',
              '            <span data-slate-zero-width="z" data-slate-length="0">﻿</span>',
              '          </span>',
              '        </span>',
              '      </span>',
              '      <span draggable="true" style="display: inline-block;">',
              '        <span class="custom-ticker">',
              '          <span>[stock-ticker: i0]</span>',
              '        </span>',
              '      </span>',
              '    </span>',
              '    <span data-slate-node="text" data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;s1&quot;]" data-child-key="s1" data-child-name="span" data-child-type="span">',
              '      <span data-slate-leaf="true">',
              '        <span data-slate-string="true"> post</span>',
              '      </span>',
              '    </span>',
              '  </div>',
              '</div>',
            ].join('\n'),
          ),
        )
      })
    })

    test('wraps default legacy shell (pt-inline-object classes preserved)', async () => {
      await createTestEditor({
        schemaDefinition: defineSchema({
          inlineObjects: [{name: 'stock-ticker'}],
        }),
        initialValue: [
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
        children: (
          <LeafPlugin
            leaves={[
              {
                leaf: defineLeaf({
                  scope: 'block.stock-ticker',
                  render: ({children}) => (
                    <span className="custom-ticker">{children}</span>
                  ),
                }),
              },
            ]}
          />
        ),
      })

      await vi.waitFor(() => {
        expect(formatHTML(getEditorInnerHTML())).toEqual(
          formatHTML(
            [
              '<div data-slate-node="element" data-pt-path="[_key==&quot;b0&quot;]" class="pt-block pt-text-block pt-text-block-style-normal" data-block-key="b0" data-block-name="block" data-block-type="text" data-style="normal">',
              '  <div>',
              '    <span data-slate-node="text" data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]" data-child-key="s0" data-child-name="span" data-child-type="span">',
              '      <span data-slate-leaf="true">',
              '        <span data-slate-zero-width="z" data-slate-length="0">﻿</span>',
              '      </span>',
              '    </span>',
              '    <span data-slate-node="element" data-slate-void="true" data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;i0&quot;]" data-slate-inline="true" contenteditable="false" class="pt-inline-object" data-child-key="i0" data-child-name="stock-ticker" data-child-type="object">',
              '      <span data-slate-spacer="true" style="height: 0px; color: transparent; outline: none; position: absolute;">',
              '        <span data-slate-node="text">',
              '          <span data-slate-leaf="true">',
              '            <span data-slate-zero-width="z" data-slate-length="0">﻿</span>',
              '          </span>',
              '        </span>',
              '      </span>',
              '      <span draggable="true" style="display: inline-block;">',
              '        <span class="custom-ticker">',
              '          <span>[stock-ticker: i0]</span>',
              '        </span>',
              '      </span>',
              '    </span>',
              '    <span data-slate-node="text" data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;s1&quot;]" data-child-key="s1" data-child-name="span" data-child-type="span">',
              '      <span data-slate-leaf="true">',
              '        <span data-slate-zero-width="n" data-slate-length="0">﻿<br></span>',
              '      </span>',
              '    </span>',
              '  </div>',
              '</div>',
            ].join('\n'),
          ),
        )
      })
    })
  })

  describe('block object', () => {
    test('custom render at root (image scope)', async () => {
      await createTestEditor({
        schemaDefinition: defineSchema({
          blockObjects: [{name: 'image'}],
        }),
        initialValue: [{_key: 'b0', _type: 'image'}],
        children: (
          <LeafPlugin
            leaves={[
              {
                leaf: defineLeaf({
                  scope: 'image',
                  render: ({children}) => (
                    <div className="custom-image">{children}</div>
                  ),
                }),
              },
            ]}
          />
        ),
      })

      await vi.waitFor(() => {
        expect(formatHTML(getEditorInnerHTML())).toEqual(
          formatHTML(
            [
              '<div data-slate-node="element" data-slate-void="true" data-pt-path="[_key==&quot;b0&quot;]" class="pt-block pt-object-block" data-block-key="b0" data-block-name="image" data-block-type="object">',
              '  <div data-slate-spacer="true" style="height: 0px; color: transparent; outline: none; position: absolute;">',
              '    <span data-slate-node="text">',
              '      <span data-slate-leaf="true">',
              '        <span data-slate-zero-width="z" data-slate-length="0">﻿</span>',
              '      </span>',
              '    </span>',
              '  </div>',
              '  <div contenteditable="false" draggable="true">',
              '    <div class="custom-image">',
              '      <div>[image: b0]</div>',
              '    </div>',
              '  </div>',
              '</div>',
            ].join('\n'),
          ),
        )
      })
    })

    test('preserves legacy shell (pt-block pt-object-block classes)', async () => {
      await createTestEditor({
        schemaDefinition: defineSchema({
          blockObjects: [{name: 'image'}],
        }),
        initialValue: [{_key: 'b0', _type: 'image'}],
        children: (
          <LeafPlugin
            leaves={[
              {
                leaf: defineLeaf({
                  scope: 'image',
                  render: ({children}) => (
                    <div className="custom-image">{children}</div>
                  ),
                }),
              },
            ]}
          />
        ),
      })

      await vi.waitFor(() => {
        expect(formatHTML(getEditorInnerHTML())).toEqual(
          formatHTML(
            [
              '<div data-slate-node="element" data-slate-void="true" data-pt-path="[_key==&quot;b0&quot;]" class="pt-block pt-object-block" data-block-key="b0" data-block-name="image" data-block-type="object">',
              '  <div data-slate-spacer="true" style="height: 0px; color: transparent; outline: none; position: absolute;">',
              '    <span data-slate-node="text">',
              '      <span data-slate-leaf="true">',
              '        <span data-slate-zero-width="z" data-slate-length="0">﻿</span>',
              '      </span>',
              '    </span>',
              '  </div>',
              '  <div contenteditable="false" draggable="true">',
              '    <div class="custom-image">',
              '      <div>[image: b0]</div>',
              '    </div>',
              '  </div>',
              '</div>',
            ].join('\n'),
          ),
        )
      })
    })
  })

  describe('scope specificity', () => {
    test('scoped span beats bare span inside matching container', async () => {
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
                  {_key: 's0', _type: 'span', text: 'inside', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
        children: (
          <>
            <ContainerPlugin
              containers={[
                {
                  container: defineContainer({
                    scope: 'callout',
                    field: 'content',
                  }),
                },
              ]}
            />
            <LeafPlugin
              leaves={[
                {
                  leaf: defineLeaf({
                    scope: 'span',
                    render: ({attributes, children}) => (
                      <span {...attributes} className="bare-span">
                        {children}
                      </span>
                    ),
                  }),
                },
                {
                  leaf: defineLeaf({
                    scope: 'callout.block.span',
                    render: ({attributes, children}) => (
                      <span {...attributes} className="scoped-span">
                        {children}
                      </span>
                    ),
                  }),
                },
              ]}
            />
          </>
        ),
      })

      await vi.waitFor(() => {
        expect(formatHTML(getEditorInnerHTML())).toEqual(
          formatHTML(
            [
              '<div data-slate-node="element" data-pt-path="[_key==&quot;c0&quot;]">',
              '  <div data-slate-node="element" data-pt-path="[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;]" class="pt-block pt-text-block pt-text-block-style-normal" data-block-key="b0" data-block-name="block" data-block-type="text" data-style="normal">',
              '    <div>',
              '      <span data-slate-node="text" data-pt-path="[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]" data-child-key="s0" data-child-name="span" data-child-type="span">',
              '        <span data-slate-leaf="true" class="scoped-span">',
              '          <span data-slate-string="true">inside</span>',
              '        </span>',
              '      </span>',
              '    </div>',
              '  </div>',
              '</div>',
            ].join('\n'),
          ),
        )
      })
    })

    test('progressive fallback: callout.block.span -> block.span', async () => {
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
                children: [{_key: 's0', _type: 'span', text: 'hi', marks: []}],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
        children: (
          <>
            <ContainerPlugin
              containers={[
                {
                  container: defineContainer({
                    scope: 'callout',
                    field: 'content',
                  }),
                },
              ]}
            />
            <LeafPlugin
              leaves={[
                {
                  leaf: defineLeaf({
                    scope: 'block.span',
                    render: ({attributes, children}) => (
                      <span {...attributes} className="fallback-span">
                        {children}
                      </span>
                    ),
                  }),
                },
              ]}
            />
          </>
        ),
      })

      await vi.waitFor(() => {
        expect(formatHTML(getEditorInnerHTML())).toEqual(
          formatHTML(
            [
              '<div data-slate-node="element" data-pt-path="[_key==&quot;c0&quot;]">',
              '  <div data-slate-node="element" data-pt-path="[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;]" class="pt-block pt-text-block pt-text-block-style-normal" data-block-key="b0" data-block-name="block" data-block-type="text" data-style="normal">',
              '    <div>',
              '      <span data-slate-node="text" data-pt-path="[_key==&quot;c0&quot;].content[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]" data-child-key="s0" data-child-name="span" data-child-type="span">',
              '        <span data-slate-leaf="true" class="fallback-span">',
              '          <span data-slate-string="true">hi</span>',
              '        </span>',
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

  describe('defineLeaf vs legacy callbacks', () => {
    test('defineLeaf on span wins over renderChild', async () => {
      await createTestEditor({
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _key: 'b0',
            _type: 'block',
            children: [{_key: 's0', _type: 'span', text: 'x', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
        editableProps: {
          renderChild: ({children}) => <>{children}</>,
        },
        children: (
          <LeafPlugin
            leaves={[
              {
                leaf: defineLeaf({
                  scope: 'span',
                  render: ({attributes, children}) => (
                    <span {...attributes} className="wins">
                      {children}
                    </span>
                  ),
                }),
              },
            ]}
          />
        ),
      })

      await vi.waitFor(() => {
        expect(formatHTML(getEditorInnerHTML())).toEqual(
          formatHTML(
            [
              '<div data-slate-node="element" data-pt-path="[_key==&quot;b0&quot;]" class="pt-block pt-text-block pt-text-block-style-normal" data-block-key="b0" data-block-name="block" data-block-type="text" data-style="normal">',
              '  <div>',
              '    <span data-slate-node="text" data-pt-path="[_key==&quot;b0&quot;].children[_key==&quot;s0&quot;]" data-child-key="s0" data-child-name="span" data-child-type="span">',
              '      <span data-slate-leaf="true" class="wins">',
              '        <span data-slate-string="true">x</span>',
              '      </span>',
              '    </span>',
              '  </div>',
              '</div>',
            ].join('\n'),
          ),
        )
      })
    })

    test('defineLeaf on block object wins over renderBlock', async () => {
      await createTestEditor({
        schemaDefinition: defineSchema({
          blockObjects: [{name: 'image'}],
        }),
        initialValue: [{_key: 'b0', _type: 'image'}],
        editableProps: {
          renderBlock: ({children}) => <>{children}</>,
        },
        children: (
          <LeafPlugin
            leaves={[
              {
                leaf: defineLeaf({
                  scope: 'image',
                  render: ({children}) => (
                    <div className="wins">{children}</div>
                  ),
                }),
              },
            ]}
          />
        ),
      })

      await vi.waitFor(() => {
        expect(formatHTML(getEditorInnerHTML())).toEqual(
          formatHTML(
            [
              '<div data-slate-node="element" data-slate-void="true" data-pt-path="[_key==&quot;b0&quot;]" class="pt-block pt-object-block" data-block-key="b0" data-block-name="image" data-block-type="object">',
              '  <div data-slate-spacer="true" style="height: 0px; color: transparent; outline: none; position: absolute;">',
              '    <span data-slate-node="text">',
              '      <span data-slate-leaf="true">',
              '        <span data-slate-zero-width="z" data-slate-length="0">﻿</span>',
              '      </span>',
              '    </span>',
              '  </div>',
              '  <div contenteditable="false" draggable="true">',
              '    <div class="wins">',
              '      <div>[image: b0]</div>',
              '    </div>',
              '  </div>',
              '</div>',
            ].join('\n'),
          ),
        )
      })
    })
  })
})
