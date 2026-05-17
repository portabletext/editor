import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

/**
 * Worked example from the Container API PR description: a recursive list
 * schema where lists contain list items, list items hold text blocks +
 * nested lists + code blocks, and a separate plugin owns code-block.
 *
 * Two scenarios:
 *
 * C) Code-block is declared at the top-level of the schema AND inline
 *    inside list-item.content.of. ListPlugin owns list + list-item;
 *    CodeBlockPlugin owns code-block. The two plugins do not know
 *    about each other.
 *
 * D) Code-block is declared ONLY inline inside list-item.content.of,
 *    not at the top level of the schema. Plugin still registers
 *    code-block top-level. The locked rule "registration is type-keyed;
 *    activation is position-gated" implies the global registration
 *    activates wherever the schema declares a code-block with the
 *    matching arrayField.
 *
 * Both scenarios assert that normalization walks the full chain (list ->
 * item -> code-block -> lines) and fills an empty code-block's `lines`
 * field with a placeholder text block.
 */

function schemaWithCodeBlockTopLevel() {
  return defineSchema({
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
                    of: [{type: 'block'}, {type: 'list'}, {type: 'code-block'}],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'code-block',
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
}

function schemaWithCodeBlockInlineOnly() {
  return defineSchema({
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
                    of: [
                      {type: 'block'},
                      {type: 'list'},
                      {
                        type: 'object',
                        name: 'code-block',
                        fields: [
                          {
                            name: 'lines',
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
}

function listPluginContainers() {
  return [
    defineContainer({
      type: 'list',
      arrayField: 'items',
      render: ({attributes, children}) => (
        <ul data-testid="list" {...attributes}>
          {children}
        </ul>
      ),
      of: [
        defineContainer({
          type: 'list-item',
          arrayField: 'content',
          render: ({attributes, children}) => (
            <li data-testid="list-item" {...attributes}>
              {children}
            </li>
          ),
        }),
      ],
    }),
  ]
}

function codeBlockPluginContainer() {
  return defineContainer({
    type: 'code-block',
    arrayField: 'lines',
    render: ({attributes, children}) => (
      <pre data-testid="code-block" {...attributes}>
        {children}
      </pre>
    ),
  })
}

function initialListValue(keyGenerator: () => string) {
  return [
    {
      _type: 'list',
      _key: keyGenerator(),
      items: [
        {
          _type: 'list-item',
          _key: keyGenerator(),
          content: [
            {
              _type: 'code-block',
              _key: keyGenerator(),
              lines: [],
            },
          ],
        },
      ],
    },
  ]
}

describe('Container API recursive list + cross-plugin code-block', () => {
  test('C: code-block declared top-level in schema, registered top-level by separate plugin', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: schemaWithCodeBlockTopLevel(),
      initialValue: initialListValue(keyGenerator),
      children: (
        <NodePlugin
          nodes={[...listPluginContainers(), codeBlockPluginContainer()]}
        />
      ),
    })

    const value = editor.getSnapshot().context.value as unknown as Array<{
      _type: string
      items: Array<{
        _type: string
        content: Array<{
          _type: string
          lines: Array<{
            _type: string
            children: Array<{_type: string; text: string}>
          }>
        }>
      }>
    }>

    const codeBlock = value[0]!.items[0]!.content[0]!
    expect(codeBlock._type).toEqual('code-block')
    expect(codeBlock.lines.length).toEqual(1)
    expect(codeBlock.lines[0]!._type).toEqual('block')
    expect(codeBlock.lines[0]!.children[0]!.text).toEqual('')
  })

  test('D: code-block declared inline-only in schema, still resolves via top-level plugin registration', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: schemaWithCodeBlockInlineOnly(),
      initialValue: initialListValue(keyGenerator),
      children: (
        <NodePlugin
          nodes={[...listPluginContainers(), codeBlockPluginContainer()]}
        />
      ),
    })

    const value = editor.getSnapshot().context.value as unknown as Array<{
      _type: string
      items: Array<{
        _type: string
        content: Array<{
          _type: string
          lines: Array<{
            _type: string
            children: Array<{_type: string; text: string}>
          }>
        }>
      }>
    }>

    const codeBlock = value[0]!.items[0]!.content[0]!
    expect(codeBlock._type).toEqual('code-block')
    expect(codeBlock.lines.length).toEqual(1)
    expect(codeBlock.lines[0]!._type).toEqual('block')
    expect(codeBlock.lines[0]!.children[0]!.text).toEqual('')
  })

  test('C: nested list inside list-item resolves via global fallback (recursion)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const initialValue = [
      {
        _type: 'list',
        _key: keyGenerator(),
        items: [
          {
            _type: 'list-item',
            _key: keyGenerator(),
            content: [
              {
                _type: 'list',
                _key: keyGenerator(),
                items: [
                  {
                    _type: 'list-item',
                    _key: keyGenerator(),
                    content: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: schemaWithCodeBlockTopLevel(),
      initialValue,
      children: (
        <NodePlugin
          nodes={[...listPluginContainers(), codeBlockPluginContainer()]}
        />
      ),
    })

    const value = editor.getSnapshot().context.value as unknown as Array<{
      items: Array<{
        content: Array<{
          _type: string
          items: Array<{
            _type: string
            content: Array<{_type: string; children: Array<{text: string}>}>
          }>
        }>
      }>
    }>

    const innerList = value[0]!.items[0]!.content[0]!
    expect(innerList._type).toEqual('list')
    const innerItem = innerList.items[0]!
    expect(innerItem._type).toEqual('list-item')
    expect(innerItem.content.length).toEqual(1)
    expect(innerItem.content[0]!._type).toEqual('block')
    expect(innerItem.content[0]!.children[0]!.text).toEqual('')
  })
})
