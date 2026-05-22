import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'
import {toTextspec} from '../test-utils/to-textspec'

/**
 * Backspace at the start of an empty text block that follows a container
 * should delete the empty text block and place the caret at the END of the
 * container's last text content, not at the START of the container.
 *
 * Before this fix, the caret landed at `{path: container.path, offset: 0}`,
 * which renders as a caret at the container's leading edge. The fix is to
 * compute the end point of the container's last text-block leaf.
 */

const schemaDefinition = defineSchema({
  blockObjects: [
    {name: 'image'},
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
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

const containers = [
  defineContainer({
    type: 'callout',
    arrayField: 'content',
  }),
  defineContainer({
    type: 'table',
    arrayField: 'rows',
  }),
  defineContainer({
    type: 'row',
    arrayField: 'cells',
  }),
  defineContainer({
    type: 'cell',
    arrayField: 'content',
  }),
]

describe('Backspace before container', () => {
  test('Backspace at start of empty text block after callout lands at end of callout content', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'cb0',
              children: [{_type: 'span', _key: 'cs0', text: 'foo', marks: []}],
            },
          ],
        },
        {
          _type: 'block',
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: '', marks: []}],
        },
      ],
      children: <NodePlugin nodes={containers} />,
    })

    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: 'b0'}, 'children', {_key: 's0'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'b0'}, 'children', {_key: 's0'}],
          offset: 0,
        },
      },
    })

    editor.send({type: 'delete.backward', unit: 'character'})

    await vi.waitFor(() => {
      // Caret should be at end of "foo", inside the callout.
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CALLOUT:', '  B: foo|'].join('\n'),
      )
    })
  })

  test('Backspace at start of empty text block after callout with multi-block content lands at end of last block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'cb0',
              children: [{_type: 'span', _key: 'cs0', text: 'foo', marks: []}],
            },
            {
              _type: 'block',
              _key: 'cb1',
              children: [{_type: 'span', _key: 'cs1', text: 'bar', marks: []}],
            },
          ],
        },
        {
          _type: 'block',
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: '', marks: []}],
        },
      ],
      children: <NodePlugin nodes={containers} />,
    })

    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: 'b0'}, 'children', {_key: 's0'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'b0'}, 'children', {_key: 's0'}],
          offset: 0,
        },
      },
    })

    editor.send({type: 'delete.backward', unit: 'character'})

    await vi.waitFor(() => {
      // Caret should be at end of "bar" (last text block in callout).
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CALLOUT:', '  B: foo', '  B: bar|'].join('\n'),
      )
    })
  })

  test('Backspace at start of empty text block after table lands at end of last cell content', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {
              _type: 'row',
              _key: 'r0',
              cells: [
                {
                  _type: 'cell',
                  _key: 'ce0',
                  content: [
                    {
                      _type: 'block',
                      _key: 'tb0',
                      children: [
                        {_type: 'span', _key: 'ts0', text: 'foo', marks: []},
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: 'ce1',
                  content: [
                    {
                      _type: 'block',
                      _key: 'tb1',
                      children: [
                        {_type: 'span', _key: 'ts1', text: 'bar', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          _type: 'block',
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: '', marks: []}],
        },
      ],
      children: <NodePlugin nodes={containers} />,
    })

    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: 'b0'}, 'children', {_key: 's0'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'b0'}, 'children', {_key: 's0'}],
          offset: 0,
        },
      },
    })

    editor.send({type: 'delete.backward', unit: 'character'})

    await vi.waitFor(() => {
      // Caret should be at end of "bar" (last cell's last text block).
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'TABLE:',
          '  ROW:',
          '    CELL:',
          '      B: foo',
          '    CELL:',
          '      B: bar|',
        ].join('\n'),
      )
    })
  })

  test('Backspace at start of empty text block after void block-object focuses the block-object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {_type: 'image', _key: 'i0'},
        {
          _type: 'block',
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: '', marks: []}],
        },
      ],
      children: <NodePlugin nodes={containers} />,
    })

    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: 'b0'}, 'children', {_key: 's0'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'b0'}, 'children', {_key: 's0'}],
          offset: 0,
        },
      },
    })

    editor.send({type: 'delete.backward', unit: 'character'})

    await vi.waitFor(() => {
      // Selection should focus the void image.
      expect(toTextspec(editor.getSnapshot().context)).toEqual('^{IMAGE}|')
    })
  })

  test('Backspace at start of empty text block after table whose last cell ends in an image focuses the image', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'table',
          _key: 't0',
          rows: [
            {
              _type: 'row',
              _key: 'r0',
              cells: [
                {
                  _type: 'cell',
                  _key: 'ce0',
                  content: [
                    {
                      _type: 'block',
                      _key: 'tb0',
                      children: [
                        {_type: 'span', _key: 'ts0', text: 'foo', marks: []},
                      ],
                    },
                  ],
                },
                {
                  _type: 'cell',
                  _key: 'ce1',
                  content: [{_type: 'image', _key: 'ti0'}],
                },
              ],
            },
          ],
        },
        {
          _type: 'block',
          _key: 'b0',
          children: [{_type: 'span', _key: 's0', text: '', marks: []}],
        },
      ],
      children: <NodePlugin nodes={containers} />,
    })

    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: 'b0'}, 'children', {_key: 's0'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'b0'}, 'children', {_key: 's0'}],
          offset: 0,
        },
      },
    })

    editor.send({type: 'delete.backward', unit: 'character'})

    await vi.waitFor(() => {
      // Caret should focus the image inside the last cell.
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'TABLE:',
          '  ROW:',
          '    CELL:',
          '      B: foo',
          '    CELL:',
          '      ^{IMAGE}|',
        ].join('\n'),
      )
    })
  })
})
