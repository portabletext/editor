import {diffMatchPatch} from '@portabletext/patches'
import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema, type PortableTextBlock} from '../src'
import {IS_MAC} from '../src/internal-utils/is-hotkey'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const nestedSchemaDefinition = defineSchema({
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
                            {type: 'block'},
                            {
                              type: 'object',
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
  arrayField: 'rows',
  render: ({children}) => <>{children}</>,
  of: [
    defineContainer({
      type: 'row',
      arrayField: 'cells',
      render: ({children}) => <>{children}</>,
      of: [
        defineContainer({
          type: 'cell',
          arrayField: 'content',
          render: ({children}) => <>{children}</>,
        }),
      ],
    }),
  ],
})

describe('event.history.redo', () => {
  test('Scenario: Redo after remote patches', async () => {
    const keyGenerator = createTestKeyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
    })

    await userEvent.click(locator)

    editor.send({type: 'insert.text', text: 'hello'})

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: hello|')

    editor.send({type: 'history.undo'})

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: |')

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'diffMatchPatch',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
          value: '@@ -0,0 +1,5 @@\n+world\n',
          origin: 'remote',
        },
      ],
    })

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: world|')

    editor.send({type: 'history.redo'})

    expect(toTextspec(editor.getSnapshot().context)).toEqual('B: hello|world')
  })

  test('Scenario: Redoing a bold shortcut over part of a span restores the selection', async () => {
    const keyGenerator = createTestKeyGenerator()
    const spanKey = keyGenerator()
    const blockKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foobar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 4,
        },
      },
    })

    await userEvent.keyboard(
      IS_MAC ? '{Meta>}b{/Meta}' : '{Control>}b{/Control}',
    )

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: f[strong:^oob|]ar',
      )
    })

    editor.send({type: 'history.undo'})

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foobar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])

    editor.send({type: 'history.redo'})

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: spanKey, text: 'f', marks: []},
          {_type: 'span', _key: 'k5', text: 'oob', marks: ['strong']},
          {_type: 'span', _key: 'k4', text: 'ar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: 'k5'}],
        offset: 0,
      },
      focus: {
        path: [{_key: blockKey}, 'children', {_key: 'k5'}],
        offset: 3,
      },
      backward: false,
    })

    editor.send({type: 'insert.text', text: 'baz'})

    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      'B: f[strong:baz|]ar',
    )
  })

  test('Scenario: Redoing removing bold from part of a bold span restores the selection', async () => {
    const keyGenerator = createTestKeyGenerator()
    const spanKey = keyGenerator()
    const blockKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'foobar', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 4,
        },
      },
    })

    await userEvent.keyboard(
      IS_MAC ? '{Meta>}b{/Meta}' : '{Control>}b{/Control}',
    )

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: [strong:f]^oob[strong:|ar]',
      )
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: 'k5'}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: 'k4'}],
          offset: 0,
        },
        backward: false,
      })
    })

    editor.send({type: 'history.undo'})

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: spanKey, text: 'foobar', marks: ['strong']},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])

    editor.send({type: 'history.redo'})

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: spanKey, text: 'f', marks: ['strong']},
          {_type: 'span', _key: 'k5', text: 'oob', marks: []},
          {_type: 'span', _key: 'k4', text: 'ar', marks: ['strong']},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: 'k5'}],
        offset: 0,
      },
      focus: {
        path: [{_key: blockKey}, 'children', {_key: 'k4'}],
        offset: 0,
      },
      backward: false,
    })

    editor.send({type: 'insert.text', text: 'baz'})

    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      'B: [strong:f]baz|[strong:ar]',
    )
  })

  test('Scenario: Redoing a text deletion after a remote insert before it in the same span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: spanKey, text: 'foo bar', marks: []},
          ],
        },
      ],
    })
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    editor.send({
      type: 'delete',
      at: {
        anchor: {path: spanPath, offset: 3},
        focus: {path: spanPath, offset: 7},
      },
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo')
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo bar')
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          ...diffMatchPatch('foo bar', 'xfoo bar', [...spanPath, 'text']),
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: xfoo bar')
    })

    editor.send({type: 'history.redo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: xfoo')
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: xfoo bar')
    })
  })
  test('Scenario: Redoing a text deletion after a remote insert before it in the same span in a table cell', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = nestedKeys(keyGenerator)
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: nestedSchemaDefinition,
      initialValue: [tableWithText(keys, 'foo bar')],
      children: <NodePlugin nodes={[tableContainer]} />,
    })
    const spanPath = [
      {_key: keys.table},
      'rows',
      {_key: keys.row},
      'cells',
      {_key: keys.cell},
      'content',
      {_key: keys.block},
      'children',
      {_key: keys.span},
    ]

    editor.send({
      type: 'delete',
      at: {
        anchor: {path: spanPath, offset: 3},
        focus: {path: spanPath, offset: 7},
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        tableWithText(keys, 'foo'),
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        tableWithText(keys, 'foo bar'),
      ])
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          ...diffMatchPatch('foo bar', 'xfoo bar', [...spanPath, 'text']),
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        tableWithText(keys, 'xfoo bar'),
      ])
    })

    editor.send({type: 'history.redo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        tableWithText(keys, 'xfoo'),
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        tableWithText(keys, 'xfoo bar'),
      ])
    })
  })

  test('Scenario: Redoing a text deletion after two remote deletions before it behind multi-byte characters', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'éééééabcdefghijklmnopqrstuvwxyzfoox bar',
              marks: [],
            },
          ],
        },
      ],
    })
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    editor.send({
      type: 'delete',
      at: {
        anchor: {path: spanPath, offset: 34},
        focus: {path: spanPath, offset: 35},
      },
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: éééééabcdefghijklmnopqrstuvwxyzfoo bar',
      )
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: éééééabcdefghijklmnopqrstuvwxyzfoox bar',
      )
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          ...diffMatchPatch(
            'éééééabcdefghijklmnopqrstuvwxyzfoox bar',
            'éééééabcdefghijklmnopqrstuvwxyzx bar',
            [...spanPath, 'text'],
          ),
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: éééééabcdefghijklmnopqrstuvwxyzx bar',
      )
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          ...diffMatchPatch(
            'éééééabcdefghijklmnopqrstuvwxyzx bar',
            'ééééabcdefghijklmnopqrstuvwxyzx bar',
            [...spanPath, 'text'],
          ),
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: ééééabcdefghijklmnopqrstuvwxyzx bar',
      )
    })

    editor.send({type: 'history.redo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: ééééabcdefghijklmnopqrstuvwxyz bar',
      )
    })
  })
  test('Scenario: Redoing a text deletion after a remote insert where it was restored', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: spanKey, text: 'foo bar', marks: []},
          ],
        },
      ],
    })
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    editor.send({
      type: 'delete',
      at: {
        anchor: {path: spanPath, offset: 3},
        focus: {path: spanPath, offset: 7},
      },
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo')
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo bar')
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          ...diffMatchPatch('foo bar', 'foox bar', [...spanPath, 'text']),
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foox bar')
    })

    editor.send({type: 'history.redo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foox')
    })
  })
  test('Scenario: Redoing merged typing after a remote insert where it was undone', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
        },
      ],
    })
    const spanPath = [{_key: blockKey}, 'children', {_key: spanKey}]

    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 3},
        focus: {path: spanPath, offset: 3},
      },
    })
    editor.send({type: 'insert.text', text: 'b'})
    editor.send({type: 'insert.text', text: 'a'})
    editor.send({type: 'insert.text', text: 'r'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foobar|')
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo')
    })

    editor.send({
      type: 'apply',
      patches: [
        {
          ...diffMatchPatch('foo', 'foox', [...spanPath, 'text']),
          origin: 'remote',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foox')
    })

    editor.send({type: 'history.redo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foobar|x')
    })
  })

  test('Scenario: Redo passes a step emptied by a remote span removal', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: fooKey, text: 'foo', marks: []},
            {_type: 'span', _key: barKey, text: 'bar', marks: ['strong']},
          ],
        },
      ],
    })
    const fooPath = [{_key: blockKey}, 'children', {_key: fooKey}]
    const barPath = [{_key: blockKey}, 'children', {_key: barKey}]

    editor.send({
      type: 'delete',
      at: {
        anchor: {path: fooPath, offset: 0},
        focus: {path: fooPath, offset: 1},
      },
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: oo[strong:bar]',
      )
    })
    editor.send({
      type: 'delete',
      at: {
        anchor: {path: barPath, offset: 0},
        focus: {path: barPath, offset: 1},
      },
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: oo[strong:ar]',
      )
    })

    editor.send({type: 'history.undo'})
    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo[strong:bar]',
      )
    })

    editor.send({
      type: 'apply',
      patches: [{type: 'unset', path: fooPath, origin: 'remote'}],
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: [strong:bar]',
      )
    })

    editor.send({type: 'history.redo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: [strong:ar]')
    })
  })

  test('Scenario: Redo passes an undo step emptied by a remote span removal', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          style: 'normal',
          markDefs: [],
          children: [
            {_type: 'span', _key: fooKey, text: 'foo', marks: []},
            {_type: 'span', _key: barKey, text: 'bar', marks: ['strong']},
          ],
        },
      ],
    })
    const fooPath = [{_key: blockKey}, 'children', {_key: fooKey}]
    const barPath = [{_key: blockKey}, 'children', {_key: barKey}]

    editor.send({
      type: 'delete',
      at: {
        anchor: {path: fooPath, offset: 0},
        focus: {path: fooPath, offset: 1},
      },
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: oo[strong:bar]',
      )
    })
    editor.send({
      type: 'delete',
      at: {
        anchor: {path: barPath, offset: 0},
        focus: {path: barPath, offset: 1},
      },
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: oo[strong:ar]',
      )
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: oo[strong:bar]',
      )
    })

    editor.send({
      type: 'apply',
      patches: [{type: 'unset', path: fooPath, origin: 'remote'}],
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: [strong:bar]',
      )
    })

    editor.send({type: 'history.undo'})
    editor.send({type: 'history.redo'})
    editor.send({type: 'history.redo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: [strong:ar]')
    })
  })
})

function nestedKeys(keyGenerator: () => string) {
  return {
    table: keyGenerator(),
    row: keyGenerator(),
    cell: keyGenerator(),
    block: keyGenerator(),
    span: keyGenerator(),
  }
}

function tableWithText(
  keys: ReturnType<typeof nestedKeys>,
  text: string,
): PortableTextBlock {
  return table(keys, [textBlock(keys, text)])
}

function table(
  keys: ReturnType<typeof nestedKeys>,
  content: Array<Record<string, unknown>>,
): PortableTextBlock {
  return {
    _type: 'table',
    _key: keys.table,
    rows: [
      {
        _type: 'row',
        _key: keys.row,
        cells: [{_type: 'cell', _key: keys.cell, content}],
      },
    ],
  }
}

function textBlock(keys: ReturnType<typeof nestedKeys>, text: string) {
  return {
    _type: 'block',
    _key: keys.block,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: keys.span, text, marks: []}],
  }
}
