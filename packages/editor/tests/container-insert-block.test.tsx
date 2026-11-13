import {applyAll, type Patch} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {NodePlugin} from '../src/plugins/plugin.node'
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

const calloutContainer = [
  defineContainer({
    type: 'callout',
    arrayField: 'content',
    render: ({children}) => <>{children}</>,
  }),
]

const childrenFieldSchemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'gallery',
      fields: [
        {name: 'title', type: 'string'},
        {
          name: 'children',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'item',
              fields: [{name: 'label', type: 'string'}],
            },
          ],
        },
      ],
    },
    {
      name: 'callout',
      fields: [
        {name: 'title', type: 'string'},
        {name: 'children', type: 'array', of: [{type: 'block'}]},
      ],
    },
    {
      name: 'section',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'callout'}, {type: 'gallery'}],
        },
      ],
    },
  ],
})

const childrenFieldNodes = [
  defineContainer({
    type: 'callout',
    arrayField: 'children',
    render: ({attributes, children}) => <div {...attributes}>{children}</div>,
  }),
  defineContainer({
    type: 'section',
    arrayField: 'content',
    render: ({attributes, children}) => <div {...attributes}>{children}</div>,
  }),
]

describe('insert.block inside a container', () => {
  test('Scenario: Inserting a block with placement after adds a sibling after the focused block inside the container', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <NodePlugin nodes={calloutContainer} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 5,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 5,
        },
      },
    })

    editor.send({
      type: 'insert.block',
      block: {
        _type: 'block',
        children: [{_type: 'span', text: 'world'}],
      },
      placement: 'after',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'k5',
              children: [{_type: 'span', _key: 'k6', text: 'world', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('Scenario: Inserting a block with placement before adds a sibling before the focused block inside the container', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <NodePlugin nodes={calloutContainer} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 0,
        },
      },
    })

    editor.send({
      type: 'insert.block',
      block: {
        _type: 'block',
        children: [{_type: 'span', text: 'before'}],
      },
      placement: 'before',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: 'k5',
              children: [
                {_type: 'span', _key: 'k6', text: 'before', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('Scenario: Inserting a text block with placement auto at a caret at the end of a block merges it into that block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <NodePlugin nodes={calloutContainer} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 5,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 5,
        },
      },
    })

    editor.send({
      type: 'insert.block',
      block: {
        _type: 'block',
        children: [{_type: 'span', text: 'world'}],
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: innerSpanKey,
                  text: 'helloworld',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('Scenario: Inserting a block with placement auto into an empty block replaces it inside the container', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: '', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <NodePlugin nodes={calloutContainer} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 0,
        },
      },
    })

    editor.send({
      type: 'insert.block',
      block: {
        _type: 'block',
        children: [{_type: 'span', text: 'filled'}],
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: 'k5',
              children: [
                {_type: 'span', _key: 'k6', text: 'filled', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('Scenario: Inserting a block object with placement auto at a caret in the middle of a text block splits the block around it', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'image'},
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'image'}],
              },
            ],
          },
        ],
      }),
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: innerSpanKey,
                  text: 'helloworld',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <NodePlugin nodes={calloutContainer} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 5,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerBlockKey},
            'children',
            {_key: innerSpanKey},
          ],
          offset: 5,
        },
      },
    })

    editor.send({
      type: 'insert.block',
      block: {
        _type: 'image',
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'hello', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'image',
              _key: 'k5',
            },
            {
              _type: 'block',
              _key: 'k7',
              children: [{_type: 'span', _key: 'k6', text: 'world', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('Scenario: Inserting a gallery inside a section keeps its children', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const galleryKey = keyGenerator()
    const itemKey = keyGenerator()
    const barKey = keyGenerator()
    const barSpanKey = keyGenerator()

    const sectionKey = keyGenerator()
    const nestedPath = [
      {_key: sectionKey},
      'content',
      {_key: barKey},
      'children',
      {_key: barSpanKey},
    ]

    const initialValue = [
      section(sectionKey, [
        textBlock(fooKey, fooSpanKey, 'foo'),
        textBlock(barKey, barSpanKey, 'bar'),
      ]),
    ]
    const patches: Array<Patch> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: childrenFieldSchemaDefinition,
      initialValue,
      children: (
        <>
          <NodePlugin nodes={childrenFieldNodes} />
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
        anchor: {path: nestedPath, offset: 3},
        focus: {path: nestedPath, offset: 3},
      },
    })
    editor.send({
      type: 'insert.block',
      block: gallery(galleryKey, itemKey, 'a'),
      placement: 'after',
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'section',
          _key: sectionKey,
          content: [
            {
              _type: 'block',
              _key: fooKey,
              children: [
                {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: barKey,
              children: [
                {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'gallery',
              _key: galleryKey,
              title: 'T',
              children: [{_type: 'item', _key: itemKey, label: 'a'}],
            },
          ],
        },
      ])
      expect(applyAll(initialValue, patches)).toEqual([
        {
          _type: 'section',
          _key: sectionKey,
          content: [
            {
              _type: 'block',
              _key: fooKey,
              children: [
                {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: barKey,
              children: [
                {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'gallery',
              _key: galleryKey,
              title: 'T',
              children: [{_type: 'item', _key: itemKey, label: 'a'}],
            },
          ],
        },
      ])
    })
  })

  test('Scenario: Inserting a callout inside a section keeps its children', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooKey = keyGenerator()
    const fooSpanKey = keyGenerator()

    const barKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()
    const sectionKey = keyGenerator()
    const nestedPath = [
      {_key: sectionKey},
      'content',
      {_key: barKey},
      'children',
      {_key: barSpanKey},
    ]

    const initialValue = [
      section(sectionKey, [
        textBlock(fooKey, fooSpanKey, 'foo'),
        textBlock(barKey, barSpanKey, 'bar'),
      ]),
    ]
    const patches: Array<Patch> = []
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: childrenFieldSchemaDefinition,
      initialValue,
      children: (
        <>
          <NodePlugin nodes={childrenFieldNodes} />
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
        anchor: {path: nestedPath, offset: 3},
        focus: {path: nestedPath, offset: 3},
      },
    })
    editor.send({
      type: 'insert.block',
      block: callout(calloutKey, innerBlockKey, innerSpanKey, 'new'),
      placement: 'after',
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'section',
          _key: sectionKey,
          content: [
            {
              _type: 'block',
              _key: fooKey,
              children: [
                {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: barKey,
              children: [
                {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'callout',
              _key: calloutKey,
              title: 'T',
              children: [
                {
                  _type: 'block',
                  _key: innerBlockKey,
                  children: [
                    {_type: 'span', _key: innerSpanKey, text: 'new', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ])
      expect(applyAll(initialValue, patches)).toEqual([
        {
          _type: 'section',
          _key: sectionKey,
          content: [
            {
              _type: 'block',
              _key: fooKey,
              children: [
                {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: barKey,
              children: [
                {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'callout',
              _key: calloutKey,
              title: 'T',
              children: [
                {
                  _type: 'block',
                  _key: innerBlockKey,
                  children: [
                    {_type: 'span', _key: innerSpanKey, text: 'new', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ])
    })
    await vi.waitFor(() => {
      expect(locator.element().textContent).toEqual('foobarnew')
    })
  })
})

function textBlock(blockKey: string, spanKey: string, text: string) {
  return {
    _type: 'block',
    _key: blockKey,
    children: [{_type: 'span', _key: spanKey, text, marks: []}],
    markDefs: [],
    style: 'normal',
  }
}

function gallery(key: string, itemKey: string, label: string) {
  return {
    _type: 'gallery',
    _key: key,
    title: 'T',
    children: [{_type: 'item', _key: itemKey, label}],
  }
}

function callout(key: string, blockKey: string, spanKey: string, text: string) {
  return {
    _type: 'callout',
    _key: key,
    title: 'T',
    children: [textBlock(blockKey, spanKey, text)],
  }
}

function section(
  key: string,
  content: Array<
    | ReturnType<typeof textBlock>
    | ReturnType<typeof gallery>
    | ReturnType<typeof callout>
  >,
) {
  return {_type: 'section', _key: key, content}
}
