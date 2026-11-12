import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}],
  annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
  blockObjects: [
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'callout'}],
        },
      ],
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
                        {name: 'content', type: 'array', of: [{type: 'block'}]},
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

const nodes = [
  defineContainer({type: 'callout', arrayField: 'content'}),
  defineContainer({type: 'table', arrayField: 'rows'}),
  defineContainer({type: 'row', arrayField: 'cells'}),
  defineContainer({type: 'cell', arrayField: 'content'}),
]

describe('a range the host kept whose span has gone', () => {
  test('Scenario: select at a range whose span has gone deselects, and Backspace changes nothing (root)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
          ],
        },
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
          ],
        },
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'baz', marks: []},
            {
              _key: keyGenerator(),
              _type: 'span',
              text: 'qux',
              marks: ['strong'],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 0},
        focus: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 3},
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
        },
        {
          _key: 'k2',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k3', _type: 'span', text: 'bar', marks: []}],
        },
        {
          _key: 'k4',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k5', _type: 'span', text: 'bazqux', marks: []}],
        },
      ])
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 1},
        focus: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 2},
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.selection).toBeNull()
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
      },
      {
        _key: 'k2',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k3', _type: 'span', text: 'bar', marks: []}],
      },
      {
        _key: 'k4',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k5', _type: 'span', text: 'bazqux', marks: []}],
      },
    ])
  })

  test('Scenario: delete at a range whose span has gone changes nothing (root)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
          ],
        },
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
          ],
        },
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'baz', marks: []},
            {
              _key: keyGenerator(),
              _type: 'span',
              text: 'qux',
              marks: ['strong'],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 0},
        focus: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 3},
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
        },
        {
          _key: 'k2',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k3', _type: 'span', text: 'bar', marks: []}],
        },
        {
          _key: 'k4',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k5', _type: 'span', text: 'bazqux', marks: []}],
        },
      ])
    })
    editor.send({
      type: 'delete',
      at: {
        anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 1},
        focus: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 2},
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
      },
      {
        _key: 'k2',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k3', _type: 'span', text: 'bar', marks: []}],
      },
      {
        _key: 'k4',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k5', _type: 'span', text: 'bazqux', marks: []}],
      },
    ])
  })

  test('Scenario: decorator.add at a range whose span has gone changes nothing (root)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
          ],
        },
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
          ],
        },
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'baz', marks: []},
            {
              _key: keyGenerator(),
              _type: 'span',
              text: 'qux',
              marks: ['strong'],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 0},
        focus: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 3},
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
        },
        {
          _key: 'k2',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k3', _type: 'span', text: 'bar', marks: []}],
        },
        {
          _key: 'k4',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k5', _type: 'span', text: 'bazqux', marks: []}],
        },
      ])
    })
    editor.send({
      type: 'decorator.add',
      decorator: 'strong',
      at: {
        anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 1},
        focus: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 2},
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
      },
      {
        _key: 'k2',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k3', _type: 'span', text: 'bar', marks: []}],
      },
      {
        _key: 'k4',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k5', _type: 'span', text: 'bazqux', marks: []}],
      },
    ])
  })

  test('Scenario: the selection prop at a span a collaborator removed deselects, and Backspace changes nothing (root)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const options = {
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
          ],
        },
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
          ],
        },
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'baz', marks: []},
            {
              _key: keyGenerator(),
              _type: 'span',
              text: 'qux',
              marks: ['strong'],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    }
    const {editor, rerender} = await createTestEditor(options)
    const unsetValue = [
      {
        _key: 'k0',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
      },
      {
        _key: 'k2',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k3', _type: 'span', text: 'bar', marks: []}],
      },
      {
        _key: 'k4',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k5', _type: 'span', text: 'baz', marks: []}],
      },
    ]

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k4'}, 'children', {_key: 'k6'}],
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(unsetValue)
    })
    await rerender({
      ...options,
      editableProps: {
        selection: {
          anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 1},
          focus: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 2},
          backward: false,
        },
      },
    })
    expect(editor.getSnapshot().context.selection).toBeNull()
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    expect(editor.getSnapshot().context.value).toEqual(unsetValue)
  })

  test('Scenario: select at a range whose span has gone deselects, and Backspace changes nothing (callout)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'callout',
          content: [
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
              ],
            },
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
              ],
            },
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'baz', marks: []},
                {
                  _key: keyGenerator(),
                  _type: 'span',
                  text: 'qux',
                  marks: ['strong'],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k2', _type: 'span', text: 'foo', marks: []}],
            },
            {
              _key: 'k3',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k4', _type: 'span', text: 'bar', marks: []}],
            },
            {
              _key: 'k5',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: 'k6', _type: 'span', text: 'bazqux', marks: []},
              ],
            },
          ],
        },
      ])
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k6'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 2,
        },
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.selection).toBeNull()
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'callout',
        content: [
          {
            _key: 'k1',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_key: 'k2', _type: 'span', text: 'foo', marks: []}],
          },
          {
            _key: 'k3',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_key: 'k4', _type: 'span', text: 'bar', marks: []}],
          },
          {
            _key: 'k5',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_key: 'k6', _type: 'span', text: 'bazqux', marks: []}],
          },
        ],
      },
    ])
  })

  test('Scenario: delete at a range whose span has gone changes nothing (callout)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'callout',
          content: [
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
              ],
            },
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
              ],
            },
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'baz', marks: []},
                {
                  _key: keyGenerator(),
                  _type: 'span',
                  text: 'qux',
                  marks: ['strong'],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k2', _type: 'span', text: 'foo', marks: []}],
            },
            {
              _key: 'k3',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k4', _type: 'span', text: 'bar', marks: []}],
            },
            {
              _key: 'k5',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: 'k6', _type: 'span', text: 'bazqux', marks: []},
              ],
            },
          ],
        },
      ])
    })
    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k6'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 2,
        },
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'callout',
        content: [
          {
            _key: 'k1',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_key: 'k2', _type: 'span', text: 'foo', marks: []}],
          },
          {
            _key: 'k3',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_key: 'k4', _type: 'span', text: 'bar', marks: []}],
          },
          {
            _key: 'k5',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_key: 'k6', _type: 'span', text: 'bazqux', marks: []}],
          },
        ],
      },
    ])
  })

  test('Scenario: decorator.add at a range whose span has gone changes nothing (callout)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'callout',
          content: [
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
              ],
            },
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
              ],
            },
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'baz', marks: []},
                {
                  _key: keyGenerator(),
                  _type: 'span',
                  text: 'qux',
                  marks: ['strong'],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k2', _type: 'span', text: 'foo', marks: []}],
            },
            {
              _key: 'k3',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k4', _type: 'span', text: 'bar', marks: []}],
            },
            {
              _key: 'k5',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: 'k6', _type: 'span', text: 'bazqux', marks: []},
              ],
            },
          ],
        },
      ])
    })
    editor.send({
      type: 'decorator.add',
      decorator: 'strong',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k6'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 2,
        },
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'callout',
        content: [
          {
            _key: 'k1',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_key: 'k2', _type: 'span', text: 'foo', marks: []}],
          },
          {
            _key: 'k3',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_key: 'k4', _type: 'span', text: 'bar', marks: []}],
          },
          {
            _key: 'k5',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_key: 'k6', _type: 'span', text: 'bazqux', marks: []}],
          },
        ],
      },
    ])
  })

  test('Scenario: the selection prop at a span a collaborator removed deselects, and Backspace changes nothing (callout)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const options = {
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'callout',
          content: [
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
              ],
            },
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
              ],
            },
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'baz', marks: []},
                {
                  _key: keyGenerator(),
                  _type: 'span',
                  text: 'qux',
                  marks: ['strong'],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    }
    const {editor, rerender} = await createTestEditor(options)
    const unsetValue = [
      {
        _key: 'k0',
        _type: 'callout',
        content: [
          {
            _key: 'k1',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_key: 'k2', _type: 'span', text: 'foo', marks: []}],
          },
          {
            _key: 'k3',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_key: 'k4', _type: 'span', text: 'bar', marks: []}],
          },
          {
            _key: 'k5',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_key: 'k6', _type: 'span', text: 'baz', marks: []}],
          },
        ],
      },
    ]

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(unsetValue)
    })
    await rerender({
      ...options,
      editableProps: {
        selection: {
          anchor: {
            path: [
              {_key: 'k0'},
              'content',
              {_key: 'k5'},
              'children',
              {_key: 'k6'},
            ],
            offset: 1,
          },
          focus: {
            path: [
              {_key: 'k0'},
              'content',
              {_key: 'k5'},
              'children',
              {_key: 'k7'},
            ],
            offset: 2,
          },
          backward: false,
        },
      },
    })
    expect(editor.getSnapshot().context.selection).toBeNull()
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    expect(editor.getSnapshot().context.value).toEqual(unsetValue)
  })

  test('Scenario: select at a range whose span has gone deselects, and Backspace changes nothing (nested callout)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'callout',
          content: [
            {
              _key: keyGenerator(),
              _type: 'callout',
              content: [
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'foo',
                      marks: [],
                    },
                  ],
                },
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'bar',
                      marks: [],
                    },
                  ],
                },
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'baz',
                      marks: [],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'qux',
                      marks: ['strong'],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'callout',
              content: [
                {
                  _key: 'k2',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k3', _type: 'span', text: 'foo', marks: []},
                  ],
                },
                {
                  _key: 'k4',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k5', _type: 'span', text: 'bar', marks: []},
                  ],
                },
                {
                  _key: 'k6',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k7', _type: 'span', text: 'bazqux', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k7'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 2,
        },
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.selection).toBeNull()
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'callout',
        content: [
          {
            _key: 'k1',
            _type: 'callout',
            content: [
              {
                _key: 'k2',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [{_key: 'k3', _type: 'span', text: 'foo', marks: []}],
              },
              {
                _key: 'k4',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [{_key: 'k5', _type: 'span', text: 'bar', marks: []}],
              },
              {
                _key: 'k6',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [
                  {_key: 'k7', _type: 'span', text: 'bazqux', marks: []},
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  test('Scenario: delete at a range whose span has gone changes nothing (nested callout)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'callout',
          content: [
            {
              _key: keyGenerator(),
              _type: 'callout',
              content: [
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'foo',
                      marks: [],
                    },
                  ],
                },
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'bar',
                      marks: [],
                    },
                  ],
                },
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'baz',
                      marks: [],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'qux',
                      marks: ['strong'],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'callout',
              content: [
                {
                  _key: 'k2',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k3', _type: 'span', text: 'foo', marks: []},
                  ],
                },
                {
                  _key: 'k4',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k5', _type: 'span', text: 'bar', marks: []},
                  ],
                },
                {
                  _key: 'k6',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k7', _type: 'span', text: 'bazqux', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k7'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 2,
        },
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'callout',
        content: [
          {
            _key: 'k1',
            _type: 'callout',
            content: [
              {
                _key: 'k2',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [{_key: 'k3', _type: 'span', text: 'foo', marks: []}],
              },
              {
                _key: 'k4',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [{_key: 'k5', _type: 'span', text: 'bar', marks: []}],
              },
              {
                _key: 'k6',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [
                  {_key: 'k7', _type: 'span', text: 'bazqux', marks: []},
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  test('Scenario: decorator.add at a range whose span has gone changes nothing (nested callout)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'callout',
          content: [
            {
              _key: keyGenerator(),
              _type: 'callout',
              content: [
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'foo',
                      marks: [],
                    },
                  ],
                },
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'bar',
                      marks: [],
                    },
                  ],
                },
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'baz',
                      marks: [],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'qux',
                      marks: ['strong'],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'callout',
              content: [
                {
                  _key: 'k2',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k3', _type: 'span', text: 'foo', marks: []},
                  ],
                },
                {
                  _key: 'k4',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k5', _type: 'span', text: 'bar', marks: []},
                  ],
                },
                {
                  _key: 'k6',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k7', _type: 'span', text: 'bazqux', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({
      type: 'decorator.add',
      decorator: 'strong',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k7'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 2,
        },
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'callout',
        content: [
          {
            _key: 'k1',
            _type: 'callout',
            content: [
              {
                _key: 'k2',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [{_key: 'k3', _type: 'span', text: 'foo', marks: []}],
              },
              {
                _key: 'k4',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [{_key: 'k5', _type: 'span', text: 'bar', marks: []}],
              },
              {
                _key: 'k6',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [
                  {_key: 'k7', _type: 'span', text: 'bazqux', marks: []},
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  test('Scenario: the selection prop at a span a collaborator removed deselects, and Backspace changes nothing (nested callout)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const options = {
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'callout',
          content: [
            {
              _key: keyGenerator(),
              _type: 'callout',
              content: [
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'foo',
                      marks: [],
                    },
                  ],
                },
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'bar',
                      marks: [],
                    },
                  ],
                },
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'baz',
                      marks: [],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'qux',
                      marks: ['strong'],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    }
    const {editor, rerender} = await createTestEditor(options)
    const unsetValue = [
      {
        _key: 'k0',
        _type: 'callout',
        content: [
          {
            _key: 'k1',
            _type: 'callout',
            content: [
              {
                _key: 'k2',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [{_key: 'k3', _type: 'span', text: 'foo', marks: []}],
              },
              {
                _key: 'k4',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [{_key: 'k5', _type: 'span', text: 'bar', marks: []}],
              },
              {
                _key: 'k6',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [{_key: 'k7', _type: 'span', text: 'baz', marks: []}],
              },
            ],
          },
        ],
      },
    ]

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(unsetValue)
    })
    await rerender({
      ...options,
      editableProps: {
        selection: {
          anchor: {
            path: [
              {_key: 'k0'},
              'content',
              {_key: 'k1'},
              'content',
              {_key: 'k6'},
              'children',
              {_key: 'k7'},
            ],
            offset: 1,
          },
          focus: {
            path: [
              {_key: 'k0'},
              'content',
              {_key: 'k1'},
              'content',
              {_key: 'k6'},
              'children',
              {_key: 'k8'},
            ],
            offset: 2,
          },
          backward: false,
        },
      },
    })
    expect(editor.getSnapshot().context.selection).toBeNull()
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    expect(editor.getSnapshot().context.value).toEqual(unsetValue)
  })

  test('Scenario: select at a range whose span has gone deselects, and Backspace changes nothing (table cell)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'table',
          rows: [
            {
              _key: keyGenerator(),
              _type: 'row',
              cells: [
                {
                  _key: keyGenerator(),
                  _type: 'cell',
                  content: [
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'foo',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'bar',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'baz',
                          marks: [],
                        },
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'qux',
                          marks: ['strong'],
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
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'table',
          rows: [
            {
              _key: 'k1',
              _type: 'row',
              cells: [
                {
                  _key: 'k2',
                  _type: 'cell',
                  content: [
                    {
                      _key: 'k3',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k4', _type: 'span', text: 'foo', marks: []},
                      ],
                    },
                    {
                      _key: 'k5',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k6', _type: 'span', text: 'bar', marks: []},
                      ],
                    },
                    {
                      _key: 'k7',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k8', _type: 'span', text: 'bazqux', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k8'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 2,
        },
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.selection).toBeNull()
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'table',
        rows: [
          {
            _key: 'k1',
            _type: 'row',
            cells: [
              {
                _key: 'k2',
                _type: 'cell',
                content: [
                  {
                    _key: 'k3',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_key: 'k4', _type: 'span', text: 'foo', marks: []},
                    ],
                  },
                  {
                    _key: 'k5',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_key: 'k6', _type: 'span', text: 'bar', marks: []},
                    ],
                  },
                  {
                    _key: 'k7',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_key: 'k8', _type: 'span', text: 'bazqux', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  test('Scenario: delete at a range whose span has gone changes nothing (table cell)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'table',
          rows: [
            {
              _key: keyGenerator(),
              _type: 'row',
              cells: [
                {
                  _key: keyGenerator(),
                  _type: 'cell',
                  content: [
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'foo',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'bar',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'baz',
                          marks: [],
                        },
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'qux',
                          marks: ['strong'],
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
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'table',
          rows: [
            {
              _key: 'k1',
              _type: 'row',
              cells: [
                {
                  _key: 'k2',
                  _type: 'cell',
                  content: [
                    {
                      _key: 'k3',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k4', _type: 'span', text: 'foo', marks: []},
                      ],
                    },
                    {
                      _key: 'k5',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k6', _type: 'span', text: 'bar', marks: []},
                      ],
                    },
                    {
                      _key: 'k7',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k8', _type: 'span', text: 'bazqux', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k8'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 2,
        },
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'table',
        rows: [
          {
            _key: 'k1',
            _type: 'row',
            cells: [
              {
                _key: 'k2',
                _type: 'cell',
                content: [
                  {
                    _key: 'k3',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_key: 'k4', _type: 'span', text: 'foo', marks: []},
                    ],
                  },
                  {
                    _key: 'k5',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_key: 'k6', _type: 'span', text: 'bar', marks: []},
                    ],
                  },
                  {
                    _key: 'k7',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_key: 'k8', _type: 'span', text: 'bazqux', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  test('Scenario: decorator.add at a range whose span has gone changes nothing (table cell)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'table',
          rows: [
            {
              _key: keyGenerator(),
              _type: 'row',
              cells: [
                {
                  _key: keyGenerator(),
                  _type: 'cell',
                  content: [
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'foo',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'bar',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'baz',
                          marks: [],
                        },
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'qux',
                          marks: ['strong'],
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
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'table',
          rows: [
            {
              _key: 'k1',
              _type: 'row',
              cells: [
                {
                  _key: 'k2',
                  _type: 'cell',
                  content: [
                    {
                      _key: 'k3',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k4', _type: 'span', text: 'foo', marks: []},
                      ],
                    },
                    {
                      _key: 'k5',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k6', _type: 'span', text: 'bar', marks: []},
                      ],
                    },
                    {
                      _key: 'k7',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k8', _type: 'span', text: 'bazqux', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({
      type: 'decorator.add',
      decorator: 'strong',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k8'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 2,
        },
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'table',
        rows: [
          {
            _key: 'k1',
            _type: 'row',
            cells: [
              {
                _key: 'k2',
                _type: 'cell',
                content: [
                  {
                    _key: 'k3',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_key: 'k4', _type: 'span', text: 'foo', marks: []},
                    ],
                  },
                  {
                    _key: 'k5',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_key: 'k6', _type: 'span', text: 'bar', marks: []},
                    ],
                  },
                  {
                    _key: 'k7',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_key: 'k8', _type: 'span', text: 'bazqux', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  test('Scenario: the selection prop at a span a collaborator removed deselects, and Backspace changes nothing (table cell)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const options = {
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'table',
          rows: [
            {
              _key: keyGenerator(),
              _type: 'row',
              cells: [
                {
                  _key: keyGenerator(),
                  _type: 'cell',
                  content: [
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'foo',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'bar',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'baz',
                          marks: [],
                        },
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'qux',
                          marks: ['strong'],
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
      children: <NodePlugin nodes={nodes} />,
    }
    const {editor, rerender} = await createTestEditor(options)
    const unsetValue = [
      {
        _key: 'k0',
        _type: 'table',
        rows: [
          {
            _key: 'k1',
            _type: 'row',
            cells: [
              {
                _key: 'k2',
                _type: 'cell',
                content: [
                  {
                    _key: 'k3',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_key: 'k4', _type: 'span', text: 'foo', marks: []},
                    ],
                  },
                  {
                    _key: 'k5',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_key: 'k6', _type: 'span', text: 'bar', marks: []},
                    ],
                  },
                  {
                    _key: 'k7',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_key: 'k8', _type: 'span', text: 'baz', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]

    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(unsetValue)
    })
    await rerender({
      ...options,
      editableProps: {
        selection: {
          anchor: {
            path: [
              {_key: 'k0'},
              'rows',
              {_key: 'k1'},
              'cells',
              {_key: 'k2'},
              'content',
              {_key: 'k7'},
              'children',
              {_key: 'k8'},
            ],
            offset: 1,
          },
          focus: {
            path: [
              {_key: 'k0'},
              'rows',
              {_key: 'k1'},
              'cells',
              {_key: 'k2'},
              'content',
              {_key: 'k7'},
              'children',
              {_key: 'k9'},
            ],
            offset: 2,
          },
          backward: false,
        },
      },
    })
    expect(editor.getSnapshot().context.selection).toBeNull()
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    expect(editor.getSnapshot().context.value).toEqual(unsetValue)
  })

  test('Scenario: annotation.add at a range whose span has gone changes nothing (root)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
          ],
        },
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
          ],
        },
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'baz', marks: []},
            {
              _key: keyGenerator(),
              _type: 'span',
              text: 'qux',
              marks: ['strong'],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 0},
        focus: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 3},
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
        },
        {
          _key: 'k2',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k3', _type: 'span', text: 'bar', marks: []}],
        },
        {
          _key: 'k4',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k5', _type: 'span', text: 'bazqux', marks: []}],
        },
      ])
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'annotation.add',
      annotation: {name: 'link', value: {href: 'https://example.com'}},
      at: {
        anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 1},
        focus: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 2},
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
      },
      {
        _key: 'k2',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k3', _type: 'span', text: 'bar', marks: []}],
      },
      {
        _key: 'k4',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k5', _type: 'span', text: 'bazqux', marks: []}],
      },
    ])
  })

  test('Scenario: annotation.add at a range whose span has gone changes nothing (callout)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'callout',
          content: [
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
              ],
            },
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
              ],
            },
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'baz', marks: []},
                {
                  _key: keyGenerator(),
                  _type: 'span',
                  text: 'qux',
                  marks: ['strong'],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k2', _type: 'span', text: 'foo', marks: []}],
            },
            {
              _key: 'k3',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k4', _type: 'span', text: 'bar', marks: []}],
            },
            {
              _key: 'k5',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: 'k6', _type: 'span', text: 'bazqux', marks: []},
              ],
            },
          ],
        },
      ])
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'children',
            {_key: 'k2'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'children',
            {_key: 'k2'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'annotation.add',
      annotation: {name: 'link', value: {href: 'https://example.com'}},
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k6'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 2,
        },
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'callout',
        content: [
          {
            _key: 'k1',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_key: 'k2', _type: 'span', text: 'foo', marks: []}],
          },
          {
            _key: 'k3',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_key: 'k4', _type: 'span', text: 'bar', marks: []}],
          },
          {
            _key: 'k5',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_key: 'k6', _type: 'span', text: 'bazqux', marks: []}],
          },
        ],
      },
    ])
  })

  test('Scenario: annotation.add at a range whose span has gone changes nothing (nested callout)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'callout',
          content: [
            {
              _key: keyGenerator(),
              _type: 'callout',
              content: [
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'foo',
                      marks: [],
                    },
                  ],
                },
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'bar',
                      marks: [],
                    },
                  ],
                },
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'baz',
                      marks: [],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'qux',
                      marks: ['strong'],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'callout',
              content: [
                {
                  _key: 'k2',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k3', _type: 'span', text: 'foo', marks: []},
                  ],
                },
                {
                  _key: 'k4',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k5', _type: 'span', text: 'bar', marks: []},
                  ],
                },
                {
                  _key: 'k6',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k7', _type: 'span', text: 'bazqux', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k2'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k2'},
            'children',
            {_key: 'k3'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'annotation.add',
      annotation: {name: 'link', value: {href: 'https://example.com'}},
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k7'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 2,
        },
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'callout',
        content: [
          {
            _key: 'k1',
            _type: 'callout',
            content: [
              {
                _key: 'k2',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [{_key: 'k3', _type: 'span', text: 'foo', marks: []}],
              },
              {
                _key: 'k4',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [{_key: 'k5', _type: 'span', text: 'bar', marks: []}],
              },
              {
                _key: 'k6',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [
                  {_key: 'k7', _type: 'span', text: 'bazqux', marks: []},
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  test('Scenario: annotation.add at a range whose span has gone changes nothing (table cell)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'table',
          rows: [
            {
              _key: keyGenerator(),
              _type: 'row',
              cells: [
                {
                  _key: keyGenerator(),
                  _type: 'cell',
                  content: [
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'foo',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'bar',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'baz',
                          marks: [],
                        },
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'qux',
                          marks: ['strong'],
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
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'table',
          rows: [
            {
              _key: 'k1',
              _type: 'row',
              cells: [
                {
                  _key: 'k2',
                  _type: 'cell',
                  content: [
                    {
                      _key: 'k3',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k4', _type: 'span', text: 'foo', marks: []},
                      ],
                    },
                    {
                      _key: 'k5',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k6', _type: 'span', text: 'bar', marks: []},
                      ],
                    },
                    {
                      _key: 'k7',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k8', _type: 'span', text: 'bazqux', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'annotation.add',
      annotation: {name: 'link', value: {href: 'https://example.com'}},
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k8'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 2,
        },
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'table',
        rows: [
          {
            _key: 'k1',
            _type: 'row',
            cells: [
              {
                _key: 'k2',
                _type: 'cell',
                content: [
                  {
                    _key: 'k3',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_key: 'k4', _type: 'span', text: 'foo', marks: []},
                    ],
                  },
                  {
                    _key: 'k5',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_key: 'k6', _type: 'span', text: 'bar', marks: []},
                    ],
                  },
                  {
                    _key: 'k7',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_key: 'k8', _type: 'span', text: 'bazqux', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  test('Scenario: annotation.remove at a range whose span has gone leaves the link in place (callout)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'callout',
          content: [
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
              ],
            },
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
              ],
            },
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'baz', marks: []},
                {
                  _key: keyGenerator(),
                  _type: 'span',
                  text: 'qux',
                  marks: ['strong'],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k2', _type: 'span', text: 'foo', marks: []}],
            },
            {
              _key: 'k3',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k4', _type: 'span', text: 'bar', marks: []}],
            },
            {
              _key: 'k5',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: 'k6', _type: 'span', text: 'bazqux', marks: []},
              ],
            },
          ],
        },
      ])
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'children',
            {_key: 'k2'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'children',
            {_key: 'k2'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'annotation.add',
      annotation: {name: 'link', value: {href: 'https://example.com'}},
    })
    const linked = [
      {
        _key: 'k0',
        _type: 'callout',
        content: [
          {
            _key: 'k1',
            _type: 'block',
            style: 'normal',
            markDefs: [
              {_key: 'k10', _type: 'link', href: 'https://example.com'},
            ],
            children: [
              {_key: 'k2', _type: 'span', text: 'foo', marks: ['k10']},
            ],
          },
          {
            _key: 'k3',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_key: 'k4', _type: 'span', text: 'bar', marks: []}],
          },
          {
            _key: 'k5',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_key: 'k6', _type: 'span', text: 'bazqux', marks: []}],
          },
        ],
      },
    ]
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(linked)
    })
    editor.send({
      type: 'annotation.remove',
      annotation: {name: 'link'},
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.value).toEqual(linked)
  })

  test('Scenario: annotation.remove at a range whose span has gone leaves the link in place (nested callout)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'callout',
          content: [
            {
              _key: keyGenerator(),
              _type: 'callout',
              content: [
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'foo',
                      marks: [],
                    },
                  ],
                },
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'bar',
                      marks: [],
                    },
                  ],
                },
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'baz',
                      marks: [],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'qux',
                      marks: ['strong'],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'callout',
              content: [
                {
                  _key: 'k2',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k3', _type: 'span', text: 'foo', marks: []},
                  ],
                },
                {
                  _key: 'k4',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k5', _type: 'span', text: 'bar', marks: []},
                  ],
                },
                {
                  _key: 'k6',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k7', _type: 'span', text: 'bazqux', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k2'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k2'},
            'children',
            {_key: 'k3'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'annotation.add',
      annotation: {name: 'link', value: {href: 'https://example.com'}},
    })
    const linked = [
      {
        _key: 'k0',
        _type: 'callout',
        content: [
          {
            _key: 'k1',
            _type: 'callout',
            content: [
              {
                _key: 'k2',
                _type: 'block',
                style: 'normal',
                markDefs: [
                  {_key: 'k11', _type: 'link', href: 'https://example.com'},
                ],
                children: [
                  {_key: 'k3', _type: 'span', text: 'foo', marks: ['k11']},
                ],
              },
              {
                _key: 'k4',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [{_key: 'k5', _type: 'span', text: 'bar', marks: []}],
              },
              {
                _key: 'k6',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [
                  {_key: 'k7', _type: 'span', text: 'bazqux', marks: []},
                ],
              },
            ],
          },
        ],
      },
    ]
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(linked)
    })
    editor.send({
      type: 'annotation.remove',
      annotation: {name: 'link'},
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.value).toEqual(linked)
  })

  test('Scenario: annotation.remove at a range whose span has gone leaves the link in place (table cell)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'table',
          rows: [
            {
              _key: keyGenerator(),
              _type: 'row',
              cells: [
                {
                  _key: keyGenerator(),
                  _type: 'cell',
                  content: [
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'foo',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'bar',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'baz',
                          marks: [],
                        },
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'qux',
                          marks: ['strong'],
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
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'table',
          rows: [
            {
              _key: 'k1',
              _type: 'row',
              cells: [
                {
                  _key: 'k2',
                  _type: 'cell',
                  content: [
                    {
                      _key: 'k3',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k4', _type: 'span', text: 'foo', marks: []},
                      ],
                    },
                    {
                      _key: 'k5',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k6', _type: 'span', text: 'bar', marks: []},
                      ],
                    },
                    {
                      _key: 'k7',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k8', _type: 'span', text: 'bazqux', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'annotation.add',
      annotation: {name: 'link', value: {href: 'https://example.com'}},
    })
    const linked = [
      {
        _key: 'k0',
        _type: 'table',
        rows: [
          {
            _key: 'k1',
            _type: 'row',
            cells: [
              {
                _key: 'k2',
                _type: 'cell',
                content: [
                  {
                    _key: 'k3',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [
                      {_key: 'k12', _type: 'link', href: 'https://example.com'},
                    ],
                    children: [
                      {_key: 'k4', _type: 'span', text: 'foo', marks: ['k12']},
                    ],
                  },
                  {
                    _key: 'k5',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_key: 'k6', _type: 'span', text: 'bar', marks: []},
                    ],
                  },
                  {
                    _key: 'k7',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_key: 'k8', _type: 'span', text: 'bazqux', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(linked)
    })
    editor.send({
      type: 'annotation.remove',
      annotation: {name: 'link'},
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.value).toEqual(linked)
  })

  test('Scenario: insert.block before a range whose span has gone inserts nothing (root)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
          ],
        },
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
          ],
        },
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'baz', marks: []},
            {
              _key: keyGenerator(),
              _type: 'span',
              text: 'qux',
              marks: ['strong'],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 0},
        focus: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 3},
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
        },
        {
          _key: 'k2',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k3', _type: 'span', text: 'bar', marks: []}],
        },
        {
          _key: 'k4',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k5', _type: 'span', text: 'bazqux', marks: []}],
        },
      ])
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'insert.block',
      block: {_type: 'block', children: [{_type: 'span', text: 'new'}]},
      placement: 'before',
      at: {
        anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 0},
        focus: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 3},
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
      },
      {
        _key: 'k2',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k3', _type: 'span', text: 'bar', marks: []}],
      },
      {
        _key: 'k4',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k5', _type: 'span', text: 'bazqux', marks: []}],
      },
    ])
  })

  test('Scenario: insert.block after a range whose span has gone inserts nothing (root)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
          ],
        },
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
          ],
        },
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'baz', marks: []},
            {
              _key: keyGenerator(),
              _type: 'span',
              text: 'qux',
              marks: ['strong'],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 0},
        focus: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 3},
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
        },
        {
          _key: 'k2',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k3', _type: 'span', text: 'bar', marks: []}],
        },
        {
          _key: 'k4',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k5', _type: 'span', text: 'bazqux', marks: []}],
        },
      ])
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'insert.block',
      block: {_type: 'block', children: [{_type: 'span', text: 'new'}]},
      placement: 'after',
      at: {
        anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 0},
        focus: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 3},
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
      },
      {
        _key: 'k2',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k3', _type: 'span', text: 'bar', marks: []}],
      },
      {
        _key: 'k4',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k5', _type: 'span', text: 'bazqux', marks: []}],
      },
    ])
  })

  test('Scenario: insert.block auto a range whose span has gone inserts nothing (root)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
          ],
        },
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
          ],
        },
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'baz', marks: []},
            {
              _key: keyGenerator(),
              _type: 'span',
              text: 'qux',
              marks: ['strong'],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 0},
        focus: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 3},
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
        },
        {
          _key: 'k2',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k3', _type: 'span', text: 'bar', marks: []}],
        },
        {
          _key: 'k4',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k5', _type: 'span', text: 'bazqux', marks: []}],
        },
      ])
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'insert.block',
      block: {_type: 'block', children: [{_type: 'span', text: 'new'}]},
      placement: 'auto',
      at: {
        anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 0},
        focus: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 3},
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
      },
      {
        _key: 'k2',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k3', _type: 'span', text: 'bar', marks: []}],
      },
      {
        _key: 'k4',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: 'k5', _type: 'span', text: 'bazqux', marks: []}],
      },
    ])
  })

  test('Scenario: insert.block before a range whose span has gone inserts nothing (callout)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'callout',
          content: [
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
              ],
            },
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
              ],
            },
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'baz', marks: []},
                {
                  _key: keyGenerator(),
                  _type: 'span',
                  text: 'qux',
                  marks: ['strong'],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k2', _type: 'span', text: 'foo', marks: []}],
            },
            {
              _key: 'k3',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k4', _type: 'span', text: 'bar', marks: []}],
            },
            {
              _key: 'k5',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: 'k6', _type: 'span', text: 'bazqux', marks: []},
              ],
            },
          ],
        },
      ])
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'children',
            {_key: 'k2'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'children',
            {_key: 'k2'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'insert.block',
      block: {_type: 'block', children: [{_type: 'span', text: 'new'}]},
      placement: 'before',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'callout',
        content: [
          {
            _key: 'k1',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_key: 'k2', _type: 'span', text: 'foo', marks: []}],
          },
          {
            _key: 'k3',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_key: 'k4', _type: 'span', text: 'bar', marks: []}],
          },
          {
            _key: 'k5',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_key: 'k6', _type: 'span', text: 'bazqux', marks: []}],
          },
        ],
      },
    ])
  })

  test('Scenario: insert.block after a range whose span has gone inserts nothing (callout)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'callout',
          content: [
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
              ],
            },
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
              ],
            },
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'baz', marks: []},
                {
                  _key: keyGenerator(),
                  _type: 'span',
                  text: 'qux',
                  marks: ['strong'],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k2', _type: 'span', text: 'foo', marks: []}],
            },
            {
              _key: 'k3',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k4', _type: 'span', text: 'bar', marks: []}],
            },
            {
              _key: 'k5',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: 'k6', _type: 'span', text: 'bazqux', marks: []},
              ],
            },
          ],
        },
      ])
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'children',
            {_key: 'k2'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'children',
            {_key: 'k2'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'insert.block',
      block: {_type: 'block', children: [{_type: 'span', text: 'new'}]},
      placement: 'after',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'callout',
        content: [
          {
            _key: 'k1',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_key: 'k2', _type: 'span', text: 'foo', marks: []}],
          },
          {
            _key: 'k3',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_key: 'k4', _type: 'span', text: 'bar', marks: []}],
          },
          {
            _key: 'k5',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_key: 'k6', _type: 'span', text: 'bazqux', marks: []}],
          },
        ],
      },
    ])
  })

  test('Scenario: insert.block auto a range whose span has gone inserts nothing (callout)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'callout',
          content: [
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
              ],
            },
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
              ],
            },
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'baz', marks: []},
                {
                  _key: keyGenerator(),
                  _type: 'span',
                  text: 'qux',
                  marks: ['strong'],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k2', _type: 'span', text: 'foo', marks: []}],
            },
            {
              _key: 'k3',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k4', _type: 'span', text: 'bar', marks: []}],
            },
            {
              _key: 'k5',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: 'k6', _type: 'span', text: 'bazqux', marks: []},
              ],
            },
          ],
        },
      ])
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'children',
            {_key: 'k2'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'children',
            {_key: 'k2'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'insert.block',
      block: {_type: 'block', children: [{_type: 'span', text: 'new'}]},
      placement: 'auto',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'callout',
        content: [
          {
            _key: 'k1',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_key: 'k2', _type: 'span', text: 'foo', marks: []}],
          },
          {
            _key: 'k3',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_key: 'k4', _type: 'span', text: 'bar', marks: []}],
          },
          {
            _key: 'k5',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [{_key: 'k6', _type: 'span', text: 'bazqux', marks: []}],
          },
        ],
      },
    ])
  })

  test('Scenario: insert.block before a range whose span has gone inserts nothing (nested callout)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'callout',
          content: [
            {
              _key: keyGenerator(),
              _type: 'callout',
              content: [
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'foo',
                      marks: [],
                    },
                  ],
                },
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'bar',
                      marks: [],
                    },
                  ],
                },
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'baz',
                      marks: [],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'qux',
                      marks: ['strong'],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'callout',
              content: [
                {
                  _key: 'k2',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k3', _type: 'span', text: 'foo', marks: []},
                  ],
                },
                {
                  _key: 'k4',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k5', _type: 'span', text: 'bar', marks: []},
                  ],
                },
                {
                  _key: 'k6',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k7', _type: 'span', text: 'bazqux', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k2'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k2'},
            'children',
            {_key: 'k3'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'insert.block',
      block: {_type: 'block', children: [{_type: 'span', text: 'new'}]},
      placement: 'before',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'callout',
        content: [
          {
            _key: 'k1',
            _type: 'callout',
            content: [
              {
                _key: 'k2',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [{_key: 'k3', _type: 'span', text: 'foo', marks: []}],
              },
              {
                _key: 'k4',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [{_key: 'k5', _type: 'span', text: 'bar', marks: []}],
              },
              {
                _key: 'k6',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [
                  {_key: 'k7', _type: 'span', text: 'bazqux', marks: []},
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  test('Scenario: insert.block after a range whose span has gone inserts nothing (nested callout)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'callout',
          content: [
            {
              _key: keyGenerator(),
              _type: 'callout',
              content: [
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'foo',
                      marks: [],
                    },
                  ],
                },
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'bar',
                      marks: [],
                    },
                  ],
                },
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'baz',
                      marks: [],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'qux',
                      marks: ['strong'],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'callout',
              content: [
                {
                  _key: 'k2',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k3', _type: 'span', text: 'foo', marks: []},
                  ],
                },
                {
                  _key: 'k4',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k5', _type: 'span', text: 'bar', marks: []},
                  ],
                },
                {
                  _key: 'k6',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k7', _type: 'span', text: 'bazqux', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k2'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k2'},
            'children',
            {_key: 'k3'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'insert.block',
      block: {_type: 'block', children: [{_type: 'span', text: 'new'}]},
      placement: 'after',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'callout',
        content: [
          {
            _key: 'k1',
            _type: 'callout',
            content: [
              {
                _key: 'k2',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [{_key: 'k3', _type: 'span', text: 'foo', marks: []}],
              },
              {
                _key: 'k4',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [{_key: 'k5', _type: 'span', text: 'bar', marks: []}],
              },
              {
                _key: 'k6',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [
                  {_key: 'k7', _type: 'span', text: 'bazqux', marks: []},
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  test('Scenario: insert.block auto a range whose span has gone inserts nothing (nested callout)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'callout',
          content: [
            {
              _key: keyGenerator(),
              _type: 'callout',
              content: [
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'foo',
                      marks: [],
                    },
                  ],
                },
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'bar',
                      marks: [],
                    },
                  ],
                },
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'baz',
                      marks: [],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'qux',
                      marks: ['strong'],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'callout',
              content: [
                {
                  _key: 'k2',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k3', _type: 'span', text: 'foo', marks: []},
                  ],
                },
                {
                  _key: 'k4',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k5', _type: 'span', text: 'bar', marks: []},
                  ],
                },
                {
                  _key: 'k6',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k7', _type: 'span', text: 'bazqux', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k2'},
            'children',
            {_key: 'k3'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k2'},
            'children',
            {_key: 'k3'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'insert.block',
      block: {_type: 'block', children: [{_type: 'span', text: 'new'}]},
      placement: 'auto',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'callout',
        content: [
          {
            _key: 'k1',
            _type: 'callout',
            content: [
              {
                _key: 'k2',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [{_key: 'k3', _type: 'span', text: 'foo', marks: []}],
              },
              {
                _key: 'k4',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [{_key: 'k5', _type: 'span', text: 'bar', marks: []}],
              },
              {
                _key: 'k6',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [
                  {_key: 'k7', _type: 'span', text: 'bazqux', marks: []},
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  test('Scenario: insert.block before a range whose span has gone inserts nothing (table cell)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'table',
          rows: [
            {
              _key: keyGenerator(),
              _type: 'row',
              cells: [
                {
                  _key: keyGenerator(),
                  _type: 'cell',
                  content: [
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'foo',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'bar',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'baz',
                          marks: [],
                        },
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'qux',
                          marks: ['strong'],
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
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'table',
          rows: [
            {
              _key: 'k1',
              _type: 'row',
              cells: [
                {
                  _key: 'k2',
                  _type: 'cell',
                  content: [
                    {
                      _key: 'k3',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k4', _type: 'span', text: 'foo', marks: []},
                      ],
                    },
                    {
                      _key: 'k5',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k6', _type: 'span', text: 'bar', marks: []},
                      ],
                    },
                    {
                      _key: 'k7',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k8', _type: 'span', text: 'bazqux', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'insert.block',
      block: {_type: 'block', children: [{_type: 'span', text: 'new'}]},
      placement: 'before',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'table',
        rows: [
          {
            _key: 'k1',
            _type: 'row',
            cells: [
              {
                _key: 'k2',
                _type: 'cell',
                content: [
                  {
                    _key: 'k3',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_key: 'k4', _type: 'span', text: 'foo', marks: []},
                    ],
                  },
                  {
                    _key: 'k5',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_key: 'k6', _type: 'span', text: 'bar', marks: []},
                    ],
                  },
                  {
                    _key: 'k7',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_key: 'k8', _type: 'span', text: 'bazqux', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  test('Scenario: insert.block after a range whose span has gone inserts nothing (table cell)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'table',
          rows: [
            {
              _key: keyGenerator(),
              _type: 'row',
              cells: [
                {
                  _key: keyGenerator(),
                  _type: 'cell',
                  content: [
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'foo',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'bar',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'baz',
                          marks: [],
                        },
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'qux',
                          marks: ['strong'],
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
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'table',
          rows: [
            {
              _key: 'k1',
              _type: 'row',
              cells: [
                {
                  _key: 'k2',
                  _type: 'cell',
                  content: [
                    {
                      _key: 'k3',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k4', _type: 'span', text: 'foo', marks: []},
                      ],
                    },
                    {
                      _key: 'k5',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k6', _type: 'span', text: 'bar', marks: []},
                      ],
                    },
                    {
                      _key: 'k7',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k8', _type: 'span', text: 'bazqux', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'insert.block',
      block: {_type: 'block', children: [{_type: 'span', text: 'new'}]},
      placement: 'after',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'table',
        rows: [
          {
            _key: 'k1',
            _type: 'row',
            cells: [
              {
                _key: 'k2',
                _type: 'cell',
                content: [
                  {
                    _key: 'k3',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_key: 'k4', _type: 'span', text: 'foo', marks: []},
                    ],
                  },
                  {
                    _key: 'k5',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_key: 'k6', _type: 'span', text: 'bar', marks: []},
                    ],
                  },
                  {
                    _key: 'k7',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_key: 'k8', _type: 'span', text: 'bazqux', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  test('Scenario: insert.block auto a range whose span has gone inserts nothing (table cell)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'table',
          rows: [
            {
              _key: keyGenerator(),
              _type: 'row',
              cells: [
                {
                  _key: keyGenerator(),
                  _type: 'cell',
                  content: [
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'foo',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'bar',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'baz',
                          marks: [],
                        },
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'qux',
                          marks: ['strong'],
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
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'table',
          rows: [
            {
              _key: 'k1',
              _type: 'row',
              cells: [
                {
                  _key: 'k2',
                  _type: 'cell',
                  content: [
                    {
                      _key: 'k3',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k4', _type: 'span', text: 'foo', marks: []},
                      ],
                    },
                    {
                      _key: 'k5',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k6', _type: 'span', text: 'bar', marks: []},
                      ],
                    },
                    {
                      _key: 'k7',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k8', _type: 'span', text: 'bazqux', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k4'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'insert.block',
      block: {_type: 'block', children: [{_type: 'span', text: 'new'}]},
      placement: 'auto',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'table',
        rows: [
          {
            _key: 'k1',
            _type: 'row',
            cells: [
              {
                _key: 'k2',
                _type: 'cell',
                content: [
                  {
                    _key: 'k3',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_key: 'k4', _type: 'span', text: 'foo', marks: []},
                    ],
                  },
                  {
                    _key: 'k5',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_key: 'k6', _type: 'span', text: 'bar', marks: []},
                    ],
                  },
                  {
                    _key: 'k7',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {_key: 'k8', _type: 'span', text: 'bazqux', marks: []},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  test('Scenario: a collaborator removes the span under the selection, then Backspace (root)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
          ],
        },
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
          ],
        },
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'baz', marks: []},
            {
              _key: keyGenerator(),
              _type: 'span',
              text: 'qux',
              marks: ['strong'],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 1},
        focus: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 2},
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k4'}, 'children', {_key: 'k6'}],
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
        },
        {
          _key: 'k2',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k3', _type: 'span', text: 'bar', marks: []}],
        },
        {
          _key: 'k4',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k5', _type: 'span', text: 'baz', marks: []}],
        },
      ])
    })
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
        },
        {
          _key: 'k2',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k3', _type: 'span', text: 'bar', marks: []}],
        },
        {
          _key: 'k4',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k5', _type: 'span', text: 'b', marks: []}],
        },
      ])
    })
  })

  test('Scenario: a collaborator removes the span under the selection, then bold (root)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
          ],
        },
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
          ],
        },
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'baz', marks: []},
            {
              _key: keyGenerator(),
              _type: 'span',
              text: 'qux',
              marks: ['strong'],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 1},
        focus: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 2},
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k4'}, 'children', {_key: 'k6'}],
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
        },
        {
          _key: 'k2',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k3', _type: 'span', text: 'bar', marks: []}],
        },
        {
          _key: 'k4',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k5', _type: 'span', text: 'baz', marks: []}],
        },
      ])
    })
    editor.send({type: 'decorator.toggle', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
        },
        {
          _key: 'k2',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k3', _type: 'span', text: 'bar', marks: []}],
        },
        {
          _key: 'k4',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: 'k5', _type: 'span', text: 'b', marks: []},
            {_key: 'k9', _type: 'span', text: 'az', marks: ['strong']},
          ],
        },
      ])
    })
  })

  test('Scenario: unbold merges the span away, undo, redo, then Backspace (root)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
          ],
        },
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
          ],
        },
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'baz', marks: []},
            {
              _key: keyGenerator(),
              _type: 'span',
              text: 'qux',
              marks: ['strong'],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 0},
        focus: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 3},
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
        },
        {
          _key: 'k2',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k3', _type: 'span', text: 'bar', marks: []}],
        },
        {
          _key: 'k4',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k5', _type: 'span', text: 'bazqux', marks: []}],
        },
      ])
    })
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
        },
        {
          _key: 'k2',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k3', _type: 'span', text: 'bar', marks: []}],
        },
        {
          _key: 'k4',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: 'k5', _type: 'span', text: 'baz', marks: []},
            {_key: 'k6', _type: 'span', text: 'qux', marks: ['strong']},
          ],
        },
      ])
    })
    editor.send({type: 'history.redo'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
        },
        {
          _key: 'k2',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k3', _type: 'span', text: 'bar', marks: []}],
        },
        {
          _key: 'k4',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k5', _type: 'span', text: 'bazqux', marks: []}],
        },
      ])
    })
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
        },
        {
          _key: 'k2',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k3', _type: 'span', text: 'bar', marks: []}],
        },
        {
          _key: 'k4',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k5', _type: 'span', text: 'bazqu', marks: []}],
        },
      ])
    })
  })

  test('Scenario: bold splits the span, undo, then Backspace (root)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
          ],
        },
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
          ],
        },
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: keyGenerator(), _type: 'span', text: 'baz', marks: []},
            {
              _key: keyGenerator(),
              _type: 'span',
              text: 'qux',
              marks: ['strong'],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 1},
        focus: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 2},
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({type: 'decorator.add', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
        },
        {
          _key: 'k2',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k3', _type: 'span', text: 'bar', marks: []}],
        },
        {
          _key: 'k4',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: 'k5', _type: 'span', text: 'b', marks: []},
            {_key: 'k10', _type: 'span', text: 'a', marks: ['strong']},
            {_key: 'k9', _type: 'span', text: 'z', marks: []},
            {_key: 'k6', _type: 'span', text: 'qux', marks: ['strong']},
          ],
        },
      ])
    })
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
        },
        {
          _key: 'k2',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k3', _type: 'span', text: 'bar', marks: []}],
        },
        {
          _key: 'k4',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: 'k5', _type: 'span', text: 'baz', marks: []},
            {_key: 'k6', _type: 'span', text: 'qux', marks: ['strong']},
          ],
        },
      ])
    })
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
        },
        {
          _key: 'k2',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'k3', _type: 'span', text: 'bar', marks: []}],
        },
        {
          _key: 'k4',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {_key: 'k5', _type: 'span', text: 'bz', marks: []},
            {_key: 'k6', _type: 'span', text: 'qux', marks: ['strong']},
          ],
        },
      ])
    })
  })

  test('Scenario: a collaborator removes the span under the selection, then Backspace (callout)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'callout',
          content: [
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
              ],
            },
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
              ],
            },
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'baz', marks: []},
                {
                  _key: keyGenerator(),
                  _type: 'span',
                  text: 'qux',
                  marks: ['strong'],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k6'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 2,
        },
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k2', _type: 'span', text: 'foo', marks: []}],
            },
            {
              _key: 'k3',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k4', _type: 'span', text: 'bar', marks: []}],
            },
            {
              _key: 'k5',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k6', _type: 'span', text: 'baz', marks: []}],
            },
          ],
        },
      ])
    })
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k2', _type: 'span', text: 'foo', marks: []}],
            },
            {
              _key: 'k3',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k4', _type: 'span', text: 'bar', marks: []}],
            },
            {
              _key: 'k5',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k6', _type: 'span', text: 'b', marks: []}],
            },
          ],
        },
      ])
    })
  })

  test('Scenario: a collaborator removes the span under the selection, then bold (callout)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'callout',
          content: [
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
              ],
            },
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
              ],
            },
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'baz', marks: []},
                {
                  _key: keyGenerator(),
                  _type: 'span',
                  text: 'qux',
                  marks: ['strong'],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k6'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 2,
        },
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k2', _type: 'span', text: 'foo', marks: []}],
            },
            {
              _key: 'k3',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k4', _type: 'span', text: 'bar', marks: []}],
            },
            {
              _key: 'k5',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k6', _type: 'span', text: 'baz', marks: []}],
            },
          ],
        },
      ])
    })
    editor.send({type: 'decorator.toggle', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k2', _type: 'span', text: 'foo', marks: []}],
            },
            {
              _key: 'k3',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k4', _type: 'span', text: 'bar', marks: []}],
            },
            {
              _key: 'k5',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: 'k6', _type: 'span', text: 'b', marks: []},
                {_key: 'k10', _type: 'span', text: 'az', marks: ['strong']},
              ],
            },
          ],
        },
      ])
    })
  })

  test('Scenario: unbold merges the span away, undo, redo, then Backspace (callout)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'callout',
          content: [
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
              ],
            },
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
              ],
            },
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'baz', marks: []},
                {
                  _key: keyGenerator(),
                  _type: 'span',
                  text: 'qux',
                  marks: ['strong'],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k2', _type: 'span', text: 'foo', marks: []}],
            },
            {
              _key: 'k3',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k4', _type: 'span', text: 'bar', marks: []}],
            },
            {
              _key: 'k5',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: 'k6', _type: 'span', text: 'bazqux', marks: []},
              ],
            },
          ],
        },
      ])
    })
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k2', _type: 'span', text: 'foo', marks: []}],
            },
            {
              _key: 'k3',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k4', _type: 'span', text: 'bar', marks: []}],
            },
            {
              _key: 'k5',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: 'k6', _type: 'span', text: 'baz', marks: []},
                {_key: 'k7', _type: 'span', text: 'qux', marks: ['strong']},
              ],
            },
          ],
        },
      ])
    })
    editor.send({type: 'history.redo'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k2', _type: 'span', text: 'foo', marks: []}],
            },
            {
              _key: 'k3',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k4', _type: 'span', text: 'bar', marks: []}],
            },
            {
              _key: 'k5',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: 'k6', _type: 'span', text: 'bazqux', marks: []},
              ],
            },
          ],
        },
      ])
    })
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k2', _type: 'span', text: 'foo', marks: []}],
            },
            {
              _key: 'k3',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k4', _type: 'span', text: 'bar', marks: []}],
            },
            {
              _key: 'k5',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k6', _type: 'span', text: 'bazqu', marks: []}],
            },
          ],
        },
      ])
    })
  })

  test('Scenario: bold splits the span, undo, then Backspace (callout)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'callout',
          content: [
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
              ],
            },
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
              ],
            },
            {
              _key: keyGenerator(),
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: keyGenerator(), _type: 'span', text: 'baz', marks: []},
                {
                  _key: keyGenerator(),
                  _type: 'span',
                  text: 'qux',
                  marks: ['strong'],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k6'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k5'},
            'children',
            {_key: 'k6'},
          ],
          offset: 2,
        },
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({type: 'decorator.add', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k2', _type: 'span', text: 'foo', marks: []}],
            },
            {
              _key: 'k3',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k4', _type: 'span', text: 'bar', marks: []}],
            },
            {
              _key: 'k5',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: 'k6', _type: 'span', text: 'b', marks: []},
                {_key: 'k11', _type: 'span', text: 'a', marks: ['strong']},
                {_key: 'k10', _type: 'span', text: 'z', marks: []},
                {_key: 'k7', _type: 'span', text: 'qux', marks: ['strong']},
              ],
            },
          ],
        },
      ])
    })
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k2', _type: 'span', text: 'foo', marks: []}],
            },
            {
              _key: 'k3',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k4', _type: 'span', text: 'bar', marks: []}],
            },
            {
              _key: 'k5',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: 'k6', _type: 'span', text: 'baz', marks: []},
                {_key: 'k7', _type: 'span', text: 'qux', marks: ['strong']},
              ],
            },
          ],
        },
      ])
    })
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k2', _type: 'span', text: 'foo', marks: []}],
            },
            {
              _key: 'k3',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [{_key: 'k4', _type: 'span', text: 'bar', marks: []}],
            },
            {
              _key: 'k5',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {_key: 'k6', _type: 'span', text: 'bz', marks: []},
                {_key: 'k7', _type: 'span', text: 'qux', marks: ['strong']},
              ],
            },
          ],
        },
      ])
    })
  })

  test('Scenario: a collaborator removes the span under the selection, then Backspace (nested callout)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'callout',
          content: [
            {
              _key: keyGenerator(),
              _type: 'callout',
              content: [
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'foo',
                      marks: [],
                    },
                  ],
                },
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'bar',
                      marks: [],
                    },
                  ],
                },
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'baz',
                      marks: [],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'qux',
                      marks: ['strong'],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k7'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 2,
        },
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'callout',
              content: [
                {
                  _key: 'k2',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k3', _type: 'span', text: 'foo', marks: []},
                  ],
                },
                {
                  _key: 'k4',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k5', _type: 'span', text: 'bar', marks: []},
                  ],
                },
                {
                  _key: 'k6',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k7', _type: 'span', text: 'baz', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'callout',
              content: [
                {
                  _key: 'k2',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k3', _type: 'span', text: 'foo', marks: []},
                  ],
                },
                {
                  _key: 'k4',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k5', _type: 'span', text: 'bar', marks: []},
                  ],
                },
                {
                  _key: 'k6',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [{_key: 'k7', _type: 'span', text: 'b', marks: []}],
                },
              ],
            },
          ],
        },
      ])
    })
  })

  test('Scenario: a collaborator removes the span under the selection, then bold (nested callout)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'callout',
          content: [
            {
              _key: keyGenerator(),
              _type: 'callout',
              content: [
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'foo',
                      marks: [],
                    },
                  ],
                },
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'bar',
                      marks: [],
                    },
                  ],
                },
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'baz',
                      marks: [],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'qux',
                      marks: ['strong'],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k7'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 2,
        },
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'callout',
              content: [
                {
                  _key: 'k2',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k3', _type: 'span', text: 'foo', marks: []},
                  ],
                },
                {
                  _key: 'k4',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k5', _type: 'span', text: 'bar', marks: []},
                  ],
                },
                {
                  _key: 'k6',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k7', _type: 'span', text: 'baz', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({type: 'decorator.toggle', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'callout',
              content: [
                {
                  _key: 'k2',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k3', _type: 'span', text: 'foo', marks: []},
                  ],
                },
                {
                  _key: 'k4',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k5', _type: 'span', text: 'bar', marks: []},
                  ],
                },
                {
                  _key: 'k6',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k7', _type: 'span', text: 'b', marks: []},
                    {_key: 'k11', _type: 'span', text: 'az', marks: ['strong']},
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
  })

  test('Scenario: unbold merges the span away, undo, redo, then Backspace (nested callout)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'callout',
          content: [
            {
              _key: keyGenerator(),
              _type: 'callout',
              content: [
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'foo',
                      marks: [],
                    },
                  ],
                },
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'bar',
                      marks: [],
                    },
                  ],
                },
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'baz',
                      marks: [],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'qux',
                      marks: ['strong'],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k8'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'callout',
              content: [
                {
                  _key: 'k2',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k3', _type: 'span', text: 'foo', marks: []},
                  ],
                },
                {
                  _key: 'k4',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k5', _type: 'span', text: 'bar', marks: []},
                  ],
                },
                {
                  _key: 'k6',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k7', _type: 'span', text: 'bazqux', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'callout',
              content: [
                {
                  _key: 'k2',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k3', _type: 'span', text: 'foo', marks: []},
                  ],
                },
                {
                  _key: 'k4',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k5', _type: 'span', text: 'bar', marks: []},
                  ],
                },
                {
                  _key: 'k6',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k7', _type: 'span', text: 'baz', marks: []},
                    {_key: 'k8', _type: 'span', text: 'qux', marks: ['strong']},
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({type: 'history.redo'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'callout',
              content: [
                {
                  _key: 'k2',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k3', _type: 'span', text: 'foo', marks: []},
                  ],
                },
                {
                  _key: 'k4',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k5', _type: 'span', text: 'bar', marks: []},
                  ],
                },
                {
                  _key: 'k6',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k7', _type: 'span', text: 'bazqux', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'callout',
              content: [
                {
                  _key: 'k2',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k3', _type: 'span', text: 'foo', marks: []},
                  ],
                },
                {
                  _key: 'k4',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k5', _type: 'span', text: 'bar', marks: []},
                  ],
                },
                {
                  _key: 'k6',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k7', _type: 'span', text: 'bazqu', marks: []},
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
  })

  test('Scenario: bold splits the span, undo, then Backspace (nested callout)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'callout',
          content: [
            {
              _key: keyGenerator(),
              _type: 'callout',
              content: [
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'foo',
                      marks: [],
                    },
                  ],
                },
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'bar',
                      marks: [],
                    },
                  ],
                },
                {
                  _key: keyGenerator(),
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'baz',
                      marks: [],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'span',
                      text: 'qux',
                      marks: ['strong'],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k7'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k6'},
            'children',
            {_key: 'k7'},
          ],
          offset: 2,
        },
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({type: 'decorator.add', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'callout',
              content: [
                {
                  _key: 'k2',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k3', _type: 'span', text: 'foo', marks: []},
                  ],
                },
                {
                  _key: 'k4',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k5', _type: 'span', text: 'bar', marks: []},
                  ],
                },
                {
                  _key: 'k6',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k7', _type: 'span', text: 'b', marks: []},
                    {_key: 'k12', _type: 'span', text: 'a', marks: ['strong']},
                    {_key: 'k11', _type: 'span', text: 'z', marks: []},
                    {_key: 'k8', _type: 'span', text: 'qux', marks: ['strong']},
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'callout',
              content: [
                {
                  _key: 'k2',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k3', _type: 'span', text: 'foo', marks: []},
                  ],
                },
                {
                  _key: 'k4',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k5', _type: 'span', text: 'bar', marks: []},
                  ],
                },
                {
                  _key: 'k6',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k7', _type: 'span', text: 'baz', marks: []},
                    {_key: 'k8', _type: 'span', text: 'qux', marks: ['strong']},
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'callout',
              content: [
                {
                  _key: 'k2',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k3', _type: 'span', text: 'foo', marks: []},
                  ],
                },
                {
                  _key: 'k4',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k5', _type: 'span', text: 'bar', marks: []},
                  ],
                },
                {
                  _key: 'k6',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {_key: 'k7', _type: 'span', text: 'bz', marks: []},
                    {_key: 'k8', _type: 'span', text: 'qux', marks: ['strong']},
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
  })

  test('Scenario: a collaborator removes the span under the selection, then Backspace (table cell)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'table',
          rows: [
            {
              _key: keyGenerator(),
              _type: 'row',
              cells: [
                {
                  _key: keyGenerator(),
                  _type: 'cell',
                  content: [
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'foo',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'bar',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'baz',
                          marks: [],
                        },
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'qux',
                          marks: ['strong'],
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
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k8'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 2,
        },
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'table',
          rows: [
            {
              _key: 'k1',
              _type: 'row',
              cells: [
                {
                  _key: 'k2',
                  _type: 'cell',
                  content: [
                    {
                      _key: 'k3',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k4', _type: 'span', text: 'foo', marks: []},
                      ],
                    },
                    {
                      _key: 'k5',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k6', _type: 'span', text: 'bar', marks: []},
                      ],
                    },
                    {
                      _key: 'k7',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k8', _type: 'span', text: 'baz', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'table',
          rows: [
            {
              _key: 'k1',
              _type: 'row',
              cells: [
                {
                  _key: 'k2',
                  _type: 'cell',
                  content: [
                    {
                      _key: 'k3',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k4', _type: 'span', text: 'foo', marks: []},
                      ],
                    },
                    {
                      _key: 'k5',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k6', _type: 'span', text: 'bar', marks: []},
                      ],
                    },
                    {
                      _key: 'k7',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k8', _type: 'span', text: 'b', marks: []},
                      ],
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

  test('Scenario: a collaborator removes the span under the selection, then bold (table cell)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'table',
          rows: [
            {
              _key: keyGenerator(),
              _type: 'row',
              cells: [
                {
                  _key: keyGenerator(),
                  _type: 'cell',
                  content: [
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'foo',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'bar',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'baz',
                          marks: [],
                        },
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'qux',
                          marks: ['strong'],
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
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k8'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 2,
        },
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'apply',
      patches: [
        {
          type: 'unset',
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          origin: 'remote',
        },
      ],
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'table',
          rows: [
            {
              _key: 'k1',
              _type: 'row',
              cells: [
                {
                  _key: 'k2',
                  _type: 'cell',
                  content: [
                    {
                      _key: 'k3',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k4', _type: 'span', text: 'foo', marks: []},
                      ],
                    },
                    {
                      _key: 'k5',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k6', _type: 'span', text: 'bar', marks: []},
                      ],
                    },
                    {
                      _key: 'k7',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k8', _type: 'span', text: 'baz', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({type: 'decorator.toggle', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'table',
          rows: [
            {
              _key: 'k1',
              _type: 'row',
              cells: [
                {
                  _key: 'k2',
                  _type: 'cell',
                  content: [
                    {
                      _key: 'k3',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k4', _type: 'span', text: 'foo', marks: []},
                      ],
                    },
                    {
                      _key: 'k5',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k6', _type: 'span', text: 'bar', marks: []},
                      ],
                    },
                    {
                      _key: 'k7',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k8', _type: 'span', text: 'b', marks: []},
                        {
                          _key: 'k12',
                          _type: 'span',
                          text: 'az',
                          marks: ['strong'],
                        },
                      ],
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

  test('Scenario: unbold merges the span away, undo, redo, then Backspace (table cell)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'table',
          rows: [
            {
              _key: keyGenerator(),
              _type: 'row',
              cells: [
                {
                  _key: keyGenerator(),
                  _type: 'cell',
                  content: [
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'foo',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'bar',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'baz',
                          marks: [],
                        },
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'qux',
                          marks: ['strong'],
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
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k9'},
          ],
          offset: 3,
        },
        backward: false,
      },
    })
    editor.send({type: 'decorator.remove', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'table',
          rows: [
            {
              _key: 'k1',
              _type: 'row',
              cells: [
                {
                  _key: 'k2',
                  _type: 'cell',
                  content: [
                    {
                      _key: 'k3',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k4', _type: 'span', text: 'foo', marks: []},
                      ],
                    },
                    {
                      _key: 'k5',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k6', _type: 'span', text: 'bar', marks: []},
                      ],
                    },
                    {
                      _key: 'k7',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k8', _type: 'span', text: 'bazqux', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'table',
          rows: [
            {
              _key: 'k1',
              _type: 'row',
              cells: [
                {
                  _key: 'k2',
                  _type: 'cell',
                  content: [
                    {
                      _key: 'k3',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k4', _type: 'span', text: 'foo', marks: []},
                      ],
                    },
                    {
                      _key: 'k5',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k6', _type: 'span', text: 'bar', marks: []},
                      ],
                    },
                    {
                      _key: 'k7',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k8', _type: 'span', text: 'baz', marks: []},
                        {
                          _key: 'k9',
                          _type: 'span',
                          text: 'qux',
                          marks: ['strong'],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({type: 'history.redo'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'table',
          rows: [
            {
              _key: 'k1',
              _type: 'row',
              cells: [
                {
                  _key: 'k2',
                  _type: 'cell',
                  content: [
                    {
                      _key: 'k3',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k4', _type: 'span', text: 'foo', marks: []},
                      ],
                    },
                    {
                      _key: 'k5',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k6', _type: 'span', text: 'bar', marks: []},
                      ],
                    },
                    {
                      _key: 'k7',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k8', _type: 'span', text: 'bazqux', marks: []},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'table',
          rows: [
            {
              _key: 'k1',
              _type: 'row',
              cells: [
                {
                  _key: 'k2',
                  _type: 'cell',
                  content: [
                    {
                      _key: 'k3',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k4', _type: 'span', text: 'foo', marks: []},
                      ],
                    },
                    {
                      _key: 'k5',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k6', _type: 'span', text: 'bar', marks: []},
                      ],
                    },
                    {
                      _key: 'k7',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k8', _type: 'span', text: 'bazqu', marks: []},
                      ],
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

  test('Scenario: bold splits the span, undo, then Backspace (table cell)', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'table',
          rows: [
            {
              _key: keyGenerator(),
              _type: 'row',
              cells: [
                {
                  _key: keyGenerator(),
                  _type: 'cell',
                  content: [
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'foo',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'bar',
                          marks: [],
                        },
                      ],
                    },
                    {
                      _key: keyGenerator(),
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'baz',
                          marks: [],
                        },
                        {
                          _key: keyGenerator(),
                          _type: 'span',
                          text: 'qux',
                          marks: ['strong'],
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
      children: <NodePlugin nodes={nodes} />,
    })
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k8'},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'rows',
            {_key: 'k1'},
            'cells',
            {_key: 'k2'},
            'content',
            {_key: 'k7'},
            'children',
            {_key: 'k8'},
          ],
          offset: 2,
        },
        backward: false,
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({type: 'decorator.add', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'table',
          rows: [
            {
              _key: 'k1',
              _type: 'row',
              cells: [
                {
                  _key: 'k2',
                  _type: 'cell',
                  content: [
                    {
                      _key: 'k3',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k4', _type: 'span', text: 'foo', marks: []},
                      ],
                    },
                    {
                      _key: 'k5',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k6', _type: 'span', text: 'bar', marks: []},
                      ],
                    },
                    {
                      _key: 'k7',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k8', _type: 'span', text: 'b', marks: []},
                        {
                          _key: 'k13',
                          _type: 'span',
                          text: 'a',
                          marks: ['strong'],
                        },
                        {_key: 'k12', _type: 'span', text: 'z', marks: []},
                        {
                          _key: 'k9',
                          _type: 'span',
                          text: 'qux',
                          marks: ['strong'],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'table',
          rows: [
            {
              _key: 'k1',
              _type: 'row',
              cells: [
                {
                  _key: 'k2',
                  _type: 'cell',
                  content: [
                    {
                      _key: 'k3',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k4', _type: 'span', text: 'foo', marks: []},
                      ],
                    },
                    {
                      _key: 'k5',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k6', _type: 'span', text: 'bar', marks: []},
                      ],
                    },
                    {
                      _key: 'k7',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k8', _type: 'span', text: 'baz', marks: []},
                        {
                          _key: 'k9',
                          _type: 'span',
                          text: 'qux',
                          marks: ['strong'],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'table',
          rows: [
            {
              _key: 'k1',
              _type: 'row',
              cells: [
                {
                  _key: 'k2',
                  _type: 'cell',
                  content: [
                    {
                      _key: 'k3',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k4', _type: 'span', text: 'foo', marks: []},
                      ],
                    },
                    {
                      _key: 'k5',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k6', _type: 'span', text: 'bar', marks: []},
                      ],
                    },
                    {
                      _key: 'k7',
                      _type: 'block',
                      style: 'normal',
                      markDefs: [],
                      children: [
                        {_key: 'k8', _type: 'span', text: 'bz', marks: []},
                        {
                          _key: 'k9',
                          _type: 'span',
                          text: 'qux',
                          marks: ['strong'],
                        },
                      ],
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
