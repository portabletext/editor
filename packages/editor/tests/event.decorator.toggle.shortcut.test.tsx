import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineContainer, defineSchema} from '../src'
import {IS_MAC} from '../src/internal-utils/is-hotkey'
import {NodePlugin} from '../src/plugins/plugin.node'
import {createTestEditor} from '../src/test/vitest'

describe('decorator shortcut guard', () => {
  test('Scenario: Cmd+B intercepts when selection focus is in a container whose sub-schema does not declare strong, but the root does', async () => {
    const keyGenerator = createTestKeyGenerator()
    const paragraphSpan = {
      _key: keyGenerator(),
      _type: 'span',
      text: 'paragraph',
      marks: [],
    }
    const paragraph = {
      _key: keyGenerator(),
      _type: 'block',
      children: [paragraphSpan],
      markDefs: [],
      style: 'normal',
    }
    const codeBlockLineSpan = {
      _key: keyGenerator(),
      _type: 'span',
      text: 'code',
      marks: [],
    }
    const codeBlockLine = {
      _key: keyGenerator(),
      _type: 'block',
      children: [codeBlockLineSpan],
      markDefs: [],
      style: 'normal',
    }
    const codeBlock = {
      _key: keyGenerator(),
      _type: 'code-block',
      lines: [codeBlockLine],
    }

    const schemaDefinition = defineSchema({
      decorators: [{name: 'strong'}],
      blockObjects: [
        {
          name: 'code-block',
          fields: [
            {
              name: 'lines',
              type: 'array',
              of: [{type: 'block', styles: [{name: 'normal'}], decorators: []}],
            },
          ],
        },
      ],
    })

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [paragraph, codeBlock],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'code-block',
              arrayField: 'lines',
            }),
          ]}
        />
      ),
    })

    await userEvent.click(locator)

    // Selection: anchor in paragraph, focus in code-block-line.
    // The focus block (code-block-line) is in a container whose sub-schema
    // does NOT declare `strong` (the inline `{type: 'block', styles: [...], decorators: []}`
    // declaration explicitly empties decorators, overriding root inheritance).
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: paragraph._key},
            'children',
            {_key: paragraphSpan._key},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: codeBlock._key},
            'lines',
            {_key: codeBlockLine._key},
            'children',
            {_key: codeBlockLineSpan._key},
          ],
          offset: 4,
        },
      },
    })

    await userEvent.keyboard(
      IS_MAC ? '{Meta>}b{/Meta}' : '{Control>}b{/Control}',
    )

    // Paragraph span should be marked strong; code-block-line span should not
    // (the operation per-block-filters spans against their sub-schema).
    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value
      expect(value).toEqual([
        {
          ...paragraph,
          children: [{...paragraph.children[0], marks: ['strong']}],
        },
        codeBlock,
      ])
    })
  })

  test('Scenario: the `code` shortcut toggles a decorator only a nested container declares', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const cellSpanPath = [
      {_key: tableKey},
      'rows',
      {_key: rowKey},
      'cells',
      {_key: cellKey},
      'content',
      {_key: blockKey},
      'children',
      {_key: spanKey},
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
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
                                  {type: 'block', decorators: [{name: 'code'}]},
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
                  _key: cellKey,
                  _type: 'cell',
                  content: [
                    {
                      _key: blockKey,
                      _type: 'block',
                      children: [
                        {_key: spanKey, _type: 'span', text: 'foo', marks: []},
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
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'table',
              arrayField: 'rows',
              of: [
                defineContainer({
                  type: 'row',
                  arrayField: 'cells',
                  of: [defineContainer({type: 'cell', arrayField: 'content'})],
                }),
              ],
            }),
          ]}
        />
      ),
    })

    await userEvent.click(locator)

    const selection = {
      anchor: {path: cellSpanPath, offset: 0},
      focus: {path: cellSpanPath, offset: 3},
      backward: false,
    }
    editor.send({type: 'select', at: selection})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(selection)
    })

    await userEvent.keyboard(
      IS_MAC ? "{Meta>}'{/Meta}" : "{Control>}'{/Control}",
    )

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
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
                      _key: blockKey,
                      _type: 'block',
                      children: [
                        {
                          _key: spanKey,
                          _type: 'span',
                          text: 'foo',
                          marks: ['code'],
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
})
