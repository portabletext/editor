import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import type {EditorEmittedEvent} from '../src/editor/relay'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: foo', 'B: bar', 'B: baz^qux|'].join('\n'),
      )
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
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: |foo', 'B: bar', 'B: bazqux'].join('\n'),
      )
    })
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: foo', 'B: bar', 'B: baz^qux|'].join('\n'),
      )
    })
    editor.send({
      type: 'delete',
      at: {
        anchor: {path: [{_key: 'k4'}, 'children', {_key: 'k5'}], offset: 1},
        focus: {path: [{_key: 'k4'}, 'children', {_key: 'k6'}], offset: 2},
        backward: false,
      },
    })
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['B: foo', 'B: bar', 'B: baz^qux|'].join('\n'),
    )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: foo', 'B: bar', 'B: baz^qux|'].join('\n'),
      )
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
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['B: foo', 'B: bar', 'B: baz^qux|'].join('\n'),
    )
  })

  test('Scenario: the selection prop at a removed span preserves main fallback through Backspace (root)', async () => {
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

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k4'}, 'children', {_key: 'k6'}],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    })
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo\nB: bar\nB: baz',
      )
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
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: 'k4'}, 'children', {_key: 'k5'}],
        offset: 1,
      },
      focus: {
        path: [{_key: 'k4'}, 'children', {_key: 'k5'}],
        offset: 0,
      },
      backward: true,
    })
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo\nB: bar\nB: |az',
      )
    })
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CALLOUT:', '  B: foo', '  B: bar', '  B: baz^qux|'].join('\n'),
      )
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
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CALLOUT:', '  B: |foo', '  B: bar', '  B: bazqux'].join('\n'),
      )
    })
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CALLOUT:', '  B: foo', '  B: bar', '  B: baz^qux|'].join('\n'),
      )
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
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['CALLOUT:', '  B: foo', '  B: bar', '  B: baz^qux|'].join('\n'),
    )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CALLOUT:', '  B: foo', '  B: bar', '  B: baz^qux|'].join('\n'),
      )
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
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['CALLOUT:', '  B: foo', '  B: bar', '  B: baz^qux|'].join('\n'),
    )
  })

  test('Scenario: the selection prop at a removed span preserves main fallback through Backspace (callout)', async () => {
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

    editor.send({
      type: 'patches',
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
      snapshot: undefined,
    })
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'CALLOUT:\n  B: foo\n  B: bar\n  B: baz',
      )
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
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: 'k0'}, 'content', {_key: 'k5'}, 'children', {_key: 'k6'}],
        offset: 1,
      },
      focus: {
        path: [{_key: 'k0'}, 'content', {_key: 'k1'}, 'children', {_key: 'k2'}],
        offset: 0,
      },
      backward: true,
    })
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'CALLOUT:\n  B: |az',
      )
    })
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'CALLOUT:',
          '  CALLOUT:',
          '    B: foo',
          '    B: bar',
          '    B: baz^qux|',
        ].join('\n'),
      )
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
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'CALLOUT:',
          '  CALLOUT:',
          '    B: |foo',
          '    B: bar',
          '    B: bazqux',
        ].join('\n'),
      )
    })
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'CALLOUT:',
          '  CALLOUT:',
          '    B: foo',
          '    B: bar',
          '    B: baz^qux|',
        ].join('\n'),
      )
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
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'CALLOUT:',
        '  CALLOUT:',
        '    B: foo',
        '    B: bar',
        '    B: baz^qux|',
      ].join('\n'),
    )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'CALLOUT:',
          '  CALLOUT:',
          '    B: foo',
          '    B: bar',
          '    B: baz^qux|',
        ].join('\n'),
      )
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
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'CALLOUT:',
        '  CALLOUT:',
        '    B: foo',
        '    B: bar',
        '    B: baz^qux|',
      ].join('\n'),
    )
  })

  test('Scenario: the selection prop at a removed span preserves main fallback through Backspace (nested callout)', async () => {
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

    editor.send({
      type: 'patches',
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
      snapshot: undefined,
    })
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'CALLOUT:\n  CALLOUT:\n    B: foo\n    B: bar\n    B: baz',
      )
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
    expect(editor.getSnapshot().context.selection).toEqual({
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
          {_key: 'k2'},
          'children',
          {_key: 'k3'},
        ],
        offset: 0,
      },
      backward: true,
    })
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'CALLOUT:\n  CALLOUT:\n    B: |az',
      )
    })
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'TABLE:',
          '  ROW:',
          '    CELL:',
          '      B: foo',
          '      B: bar',
          '      B: baz^qux|',
        ].join('\n'),
      )
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
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'TABLE:',
          '  ROW:',
          '    CELL:',
          '      B: |foo',
          '      B: bar',
          '      B: bazqux',
        ].join('\n'),
      )
    })
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'TABLE:',
          '  ROW:',
          '    CELL:',
          '      B: foo',
          '      B: bar',
          '      B: baz^qux|',
        ].join('\n'),
      )
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
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'TABLE:',
        '  ROW:',
        '    CELL:',
        '      B: foo',
        '      B: bar',
        '      B: baz^qux|',
      ].join('\n'),
    )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'TABLE:',
          '  ROW:',
          '    CELL:',
          '      B: foo',
          '      B: bar',
          '      B: baz^qux|',
        ].join('\n'),
      )
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
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'TABLE:',
        '  ROW:',
        '    CELL:',
        '      B: foo',
        '      B: bar',
        '      B: baz^qux|',
      ].join('\n'),
    )
  })

  test('Scenario: the selection prop at a removed span preserves main fallback through Backspace (table cell)', async () => {
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

    editor.send({
      type: 'patches',
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
      snapshot: undefined,
    })
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'TABLE:\n  ROW:\n    CELL:\n      B: foo\n      B: bar\n      B: baz',
      )
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
    expect(editor.getSnapshot().context.selection).toEqual({
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
          {_key: 'k3'},
          'children',
          {_key: 'k4'},
        ],
        offset: 0,
      },
      backward: true,
    })
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'TABLE:\n  ROW:\n    CELL:\n      B: |az',
      )
    })
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: foo', 'B: bar', 'B: baz^qux|'].join('\n'),
      )
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
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['B: ^foo|', 'B: bar', 'B: bazqux'].join('\n'),
    )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CALLOUT:', '  B: foo', '  B: bar', '  B: baz^qux|'].join('\n'),
      )
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
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['CALLOUT:', '  B: ^foo|', '  B: bar', '  B: bazqux'].join('\n'),
    )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'CALLOUT:',
          '  CALLOUT:',
          '    B: foo',
          '    B: bar',
          '    B: baz^qux|',
        ].join('\n'),
      )
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
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'CALLOUT:',
        '  CALLOUT:',
        '    B: ^foo|',
        '    B: bar',
        '    B: bazqux',
      ].join('\n'),
    )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'TABLE:',
          '  ROW:',
          '    CELL:',
          '      B: foo',
          '      B: bar',
          '      B: baz^qux|',
        ].join('\n'),
      )
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
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'TABLE:',
        '  ROW:',
        '    CELL:',
        '      B: ^foo|',
        '      B: bar',
        '      B: bazqux',
      ].join('\n'),
    )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CALLOUT:', '  B: foo', '  B: bar', '  B: baz^qux|'].join('\n'),
      )
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
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'CALLOUT:',
          '  B: [@link href="https://example.com":^foo|]',
          '  B: bar',
          '  B: bazqux',
        ].join('\n'),
      )
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
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'CALLOUT:',
        '  B: [@link href="https://example.com":^foo|]',
        '  B: bar',
        '  B: bazqux',
      ].join('\n'),
    )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'CALLOUT:',
          '  CALLOUT:',
          '    B: foo',
          '    B: bar',
          '    B: baz^qux|',
        ].join('\n'),
      )
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
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'CALLOUT:',
          '  CALLOUT:',
          '    B: [@link href="https://example.com":^foo|]',
          '    B: bar',
          '    B: bazqux',
        ].join('\n'),
      )
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
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'CALLOUT:',
        '  CALLOUT:',
        '    B: [@link href="https://example.com":^foo|]',
        '    B: bar',
        '    B: bazqux',
      ].join('\n'),
    )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'TABLE:',
          '  ROW:',
          '    CELL:',
          '      B: foo',
          '      B: bar',
          '      B: baz^qux|',
        ].join('\n'),
      )
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
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'TABLE:',
          '  ROW:',
          '    CELL:',
          '      B: [@link href="https://example.com":^foo|]',
          '      B: bar',
          '      B: bazqux',
        ].join('\n'),
      )
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
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'TABLE:',
        '  ROW:',
        '    CELL:',
        '      B: [@link href="https://example.com":^foo|]',
        '      B: bar',
        '      B: bazqux',
      ].join('\n'),
    )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: foo', 'B: bar', 'B: baz^qux|'].join('\n'),
      )
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
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['B: ^foo|', 'B: bar', 'B: bazqux'].join('\n'),
    )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: foo', 'B: bar', 'B: baz^qux|'].join('\n'),
      )
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
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['B: ^foo|', 'B: bar', 'B: bazqux'].join('\n'),
    )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: foo', 'B: bar', 'B: baz^qux|'].join('\n'),
      )
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
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['B: ^foo|', 'B: bar', 'B: bazqux'].join('\n'),
    )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CALLOUT:', '  B: foo', '  B: bar', '  B: baz^qux|'].join('\n'),
      )
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
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['CALLOUT:', '  B: ^foo|', '  B: bar', '  B: bazqux'].join('\n'),
    )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CALLOUT:', '  B: foo', '  B: bar', '  B: baz^qux|'].join('\n'),
      )
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
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['CALLOUT:', '  B: ^foo|', '  B: bar', '  B: bazqux'].join('\n'),
    )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CALLOUT:', '  B: foo', '  B: bar', '  B: baz^qux|'].join('\n'),
      )
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
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['CALLOUT:', '  B: ^foo|', '  B: bar', '  B: bazqux'].join('\n'),
    )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'CALLOUT:',
          '  CALLOUT:',
          '    B: foo',
          '    B: bar',
          '    B: baz^qux|',
        ].join('\n'),
      )
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
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'CALLOUT:',
        '  CALLOUT:',
        '    B: ^foo|',
        '    B: bar',
        '    B: bazqux',
      ].join('\n'),
    )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'CALLOUT:',
          '  CALLOUT:',
          '    B: foo',
          '    B: bar',
          '    B: baz^qux|',
        ].join('\n'),
      )
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
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'CALLOUT:',
        '  CALLOUT:',
        '    B: ^foo|',
        '    B: bar',
        '    B: bazqux',
      ].join('\n'),
    )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'CALLOUT:',
          '  CALLOUT:',
          '    B: foo',
          '    B: bar',
          '    B: baz^qux|',
        ].join('\n'),
      )
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
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'CALLOUT:',
        '  CALLOUT:',
        '    B: ^foo|',
        '    B: bar',
        '    B: bazqux',
      ].join('\n'),
    )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'TABLE:',
          '  ROW:',
          '    CELL:',
          '      B: foo',
          '      B: bar',
          '      B: baz^qux|',
        ].join('\n'),
      )
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
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'TABLE:',
        '  ROW:',
        '    CELL:',
        '      B: ^foo|',
        '      B: bar',
        '      B: bazqux',
      ].join('\n'),
    )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'TABLE:',
          '  ROW:',
          '    CELL:',
          '      B: foo',
          '      B: bar',
          '      B: baz^qux|',
        ].join('\n'),
      )
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
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'TABLE:',
        '  ROW:',
        '    CELL:',
        '      B: ^foo|',
        '      B: bar',
        '      B: bazqux',
      ].join('\n'),
    )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'TABLE:',
          '  ROW:',
          '    CELL:',
          '      B: foo',
          '      B: bar',
          '      B: baz^qux|',
        ].join('\n'),
      )
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
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'TABLE:',
        '  ROW:',
        '    CELL:',
        '      B: ^foo|',
        '      B: bar',
        '      B: bazqux',
      ].join('\n'),
    )
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
      type: 'patches',
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k4'}, 'children', {_key: 'k6'}],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    })
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: foo', 'B: bar', 'B: b^az|'].join('\n'),
      )
    })
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: foo', 'B: bar', 'B: b|'].join('\n'),
      )
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
      type: 'patches',
      patches: [
        {
          type: 'unset',
          path: [{_key: 'k4'}, 'children', {_key: 'k6'}],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    })
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: foo', 'B: bar', 'B: b^az|'].join('\n'),
      )
    })
    editor.send({type: 'decorator.toggle', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: foo', 'B: bar', 'B: b[strong:^az|]'].join('\n'),
      )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: foo', 'B: bar', 'B: baz^qux|'].join('\n'),
      )
    })
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: foo', 'B: bar', 'B: baz[strong:qux]'].join('\n'),
      )
    })
    editor.send({type: 'history.redo'})
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: foo', 'B: bar', 'B: bazqux|'].join('\n'),
      )
    })
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: foo', 'B: bar', 'B: bazqu|'].join('\n'),
      )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: foo', 'B: bar', 'B: b[strong:^a|]z[strong:qux]'].join('\n'),
      )
    })
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: foo', 'B: bar', 'B: b^a|z[strong:qux]'].join('\n'),
      )
    })
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: foo', 'B: bar', 'B: b|z[strong:qux]'].join('\n'),
      )
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
      type: 'patches',
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
      snapshot: undefined,
    })
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CALLOUT:', '  B: foo', '  B: bar', '  B: b^az|'].join('\n'),
      )
    })
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CALLOUT:', '  B: foo', '  B: bar', '  B: b|'].join('\n'),
      )
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
      type: 'patches',
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
      snapshot: undefined,
    })
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CALLOUT:', '  B: foo', '  B: bar', '  B: b^az|'].join('\n'),
      )
    })
    editor.send({type: 'decorator.toggle', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CALLOUT:', '  B: foo', '  B: bar', '  B: b[strong:^az|]'].join('\n'),
      )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CALLOUT:', '  B: foo', '  B: bar', '  B: baz^qux|'].join('\n'),
      )
    })
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CALLOUT:', '  B: foo', '  B: bar', '  B: baz[strong:qux]'].join('\n'),
      )
    })
    editor.send({type: 'history.redo'})
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CALLOUT:', '  B: foo', '  B: bar', '  B: bazqux|'].join('\n'),
      )
    })
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CALLOUT:', '  B: foo', '  B: bar', '  B: bazqu|'].join('\n'),
      )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'CALLOUT:',
          '  B: foo',
          '  B: bar',
          '  B: b[strong:^a|]z[strong:qux]',
        ].join('\n'),
      )
    })
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CALLOUT:', '  B: foo', '  B: bar', '  B: b^a|z[strong:qux]'].join(
          '\n',
        ),
      )
    })
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CALLOUT:', '  B: foo', '  B: bar', '  B: b|z[strong:qux]'].join('\n'),
      )
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
      type: 'patches',
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
      snapshot: undefined,
    })
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'CALLOUT:',
          '  CALLOUT:',
          '    B: foo',
          '    B: bar',
          '    B: b^az|',
        ].join('\n'),
      )
    })
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'CALLOUT:',
          '  CALLOUT:',
          '    B: foo',
          '    B: bar',
          '    B: b|',
        ].join('\n'),
      )
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
      type: 'patches',
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
      snapshot: undefined,
    })
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'CALLOUT:',
          '  CALLOUT:',
          '    B: foo',
          '    B: bar',
          '    B: b^az|',
        ].join('\n'),
      )
    })
    editor.send({type: 'decorator.toggle', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'CALLOUT:',
          '  CALLOUT:',
          '    B: foo',
          '    B: bar',
          '    B: b[strong:^az|]',
        ].join('\n'),
      )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'CALLOUT:',
          '  CALLOUT:',
          '    B: foo',
          '    B: bar',
          '    B: baz^qux|',
        ].join('\n'),
      )
    })
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'CALLOUT:',
          '  CALLOUT:',
          '    B: foo',
          '    B: bar',
          '    B: baz[strong:qux]',
        ].join('\n'),
      )
    })
    editor.send({type: 'history.redo'})
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'CALLOUT:',
          '  CALLOUT:',
          '    B: foo',
          '    B: bar',
          '    B: bazqux|',
        ].join('\n'),
      )
    })
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'CALLOUT:',
          '  CALLOUT:',
          '    B: foo',
          '    B: bar',
          '    B: bazqu|',
        ].join('\n'),
      )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'CALLOUT:',
          '  CALLOUT:',
          '    B: foo',
          '    B: bar',
          '    B: b[strong:^a|]z[strong:qux]',
        ].join('\n'),
      )
    })
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'CALLOUT:',
          '  CALLOUT:',
          '    B: foo',
          '    B: bar',
          '    B: b^a|z[strong:qux]',
        ].join('\n'),
      )
    })
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'CALLOUT:',
          '  CALLOUT:',
          '    B: foo',
          '    B: bar',
          '    B: b|z[strong:qux]',
        ].join('\n'),
      )
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
      type: 'patches',
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
      snapshot: undefined,
    })
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'TABLE:',
          '  ROW:',
          '    CELL:',
          '      B: foo',
          '      B: bar',
          '      B: b^az|',
        ].join('\n'),
      )
    })
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'TABLE:',
          '  ROW:',
          '    CELL:',
          '      B: foo',
          '      B: bar',
          '      B: b|',
        ].join('\n'),
      )
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
      type: 'patches',
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
      snapshot: undefined,
    })
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'TABLE:',
          '  ROW:',
          '    CELL:',
          '      B: foo',
          '      B: bar',
          '      B: b^az|',
        ].join('\n'),
      )
    })
    editor.send({type: 'decorator.toggle', decorator: 'strong'})
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'TABLE:',
          '  ROW:',
          '    CELL:',
          '      B: foo',
          '      B: bar',
          '      B: b[strong:^az|]',
        ].join('\n'),
      )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'TABLE:',
          '  ROW:',
          '    CELL:',
          '      B: foo',
          '      B: bar',
          '      B: baz^qux|',
        ].join('\n'),
      )
    })
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'TABLE:',
          '  ROW:',
          '    CELL:',
          '      B: foo',
          '      B: bar',
          '      B: baz[strong:qux]',
        ].join('\n'),
      )
    })
    editor.send({type: 'history.redo'})
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'TABLE:',
          '  ROW:',
          '    CELL:',
          '      B: foo',
          '      B: bar',
          '      B: bazqux|',
        ].join('\n'),
      )
    })
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'TABLE:',
          '  ROW:',
          '    CELL:',
          '      B: foo',
          '      B: bar',
          '      B: bazqu|',
        ].join('\n'),
      )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'TABLE:',
          '  ROW:',
          '    CELL:',
          '      B: foo',
          '      B: bar',
          '      B: b[strong:^a|]z[strong:qux]',
        ].join('\n'),
      )
    })
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'TABLE:',
          '  ROW:',
          '    CELL:',
          '      B: foo',
          '      B: bar',
          '      B: b^a|z[strong:qux]',
        ].join('\n'),
      )
    })
    editor.send({type: 'focus'})
    await userEvent.keyboard('{Backspace}')
    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        [
          'TABLE:',
          '  ROW:',
          '    CELL:',
          '      B: foo',
          '      B: bar',
          '      B: b|z[strong:qux]',
        ].join('\n'),
      )
    })
  })
})

test('Scenario: annotation.add handles one add on linked foo when at names a gone span (root)', async () => {
  const keyGenerator = createTestKeyGenerator()
  const linkKey = keyGenerator()
  let addCount = 0
  const options = {
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        markDefs: [
          {
            _key: linkKey,
            _type: 'link',
            href: 'https://original.example',
          },
        ],
        children: [
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'foo',
            marks: [linkKey],
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'qux',
            marks: ['strong'],
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
    children: (
      <>
        {' '}
        <NodePlugin nodes={nodes} />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'annotation.add',
              guard: () => {
                addCount++
                return addCount > 20
              },
              actions: [() => []],
            }),
          ]}
        />
      </>
    ),
  }
  const {editor} = await createTestEditor(options)
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: 'k1',
          },
          'children',
          {
            _key: 'k2',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k1',
          },
          'children',
          {
            _key: 'k2',
          },
        ],
        offset: 3,
      },
      backward: false,
    },
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [
        {
          _key: 'k1',
        },
        'children',
        {
          _key: 'k2',
        },
      ],
      offset: 0,
    },
    focus: {
      path: [
        {
          _key: 'k1',
        },
        'children',
        {
          _key: 'k2',
        },
      ],
      offset: 3,
    },
    backward: false,
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k3',
          },
          'children',
          {
            _key: 'k5',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    // Textspec cannot pin unchanged `markDefs` keys or detect extra unused definitions.
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k1',
        _type: 'block',
        style: 'normal',
        markDefs: [
          {
            _key: 'k0',
            _type: 'link',
            href: 'https://original.example',
          },
        ],
        children: [
          {
            _key: 'k2',
            _type: 'span',
            text: 'foo',
            marks: ['k0'],
          },
        ],
      },
      {
        _key: 'k3',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: 'k4',
            _type: 'span',
            text: 'bar',
            marks: [],
          },
        ],
      },
      {
        _key: 'k6',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: 'k7',
            _type: 'span',
            text: 'baz',
            marks: [],
          },
          {
            _key: 'k8',
            _type: 'span',
            text: 'qux',
            marks: ['strong'],
          },
        ],
      },
    ])
  })
  editor.send({
    type: 'annotation.add',
    annotation: {name: 'link', value: {href: 'https://another.example'}},
    at: {
      anchor: {
        path: [
          {
            _key: 'k3',
          },
          'children',
          {
            _key: 'k5',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k3',
          },
          'children',
          {
            _key: 'k5',
          },
        ],
        offset: 3,
      },
      backward: false,
    },
  })
  expect(addCount).toEqual(1)
  // Textspec cannot pin unchanged `markDefs` keys or detect extra unused definitions.
  expect(editor.getSnapshot().context.value).toEqual([
    {
      _key: 'k1',
      _type: 'block',
      style: 'normal',
      markDefs: [
        {
          _key: 'k0',
          _type: 'link',
          href: 'https://original.example',
        },
      ],
      children: [
        {
          _key: 'k2',
          _type: 'span',
          text: 'foo',
          marks: ['k0'],
        },
      ],
    },
    {
      _key: 'k3',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [
        {
          _key: 'k4',
          _type: 'span',
          text: 'bar',
          marks: [],
        },
      ],
    },
    {
      _key: 'k6',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [
        {
          _key: 'k7',
          _type: 'span',
          text: 'baz',
          marks: [],
        },
        {
          _key: 'k8',
          _type: 'span',
          text: 'qux',
          marks: ['strong'],
        },
      ],
    },
  ])
})

test('Scenario: selection prop uses main fallback when a collaborator removes its span (root)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'qux',
            marks: ['strong'],
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
    children: (
      <>
        {' '}
        <NodePlugin nodes={nodes} />
      </>
    ),
  }
  const {editor, rerender} = await createTestEditor(options)
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
      },
      focus: {
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        offset: 0,
      },
      backward: false,
    },
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 0,
    },
    focus: {
      path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
      offset: 0,
    },
    backward: false,
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [{_key: 'k2'}, 'children', {_key: 'k4'}],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      'B: |foo\nB: bar\nB: baz[strong:qux]',
    )
  })
  const selectionEvents: Array<EditorEmittedEvent> = []
  const subscription = editor.on('selection', (event) => {
    selectionEvents.push(event)
  })
  await rerender({
    ...options,
    editableProps: {
      selection: {
        anchor: {
          path: [{_key: 'k2'}, 'children', {_key: 'k4'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'k2'}, 'children', {_key: 'k4'}],
          offset: 2,
        },
        backward: false,
      },
    },
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: 'k2'}, 'children', {_key: 'k3'}],
        offset: 0,
      },
      focus: {
        path: [{_key: 'k2'}, 'children', {_key: 'k3'}],
        offset: 0,
      },
      backward: false,
    })
    expect(selectionEvents).toEqual([
      {
        type: 'selection',
        selection: {
          anchor: {
            path: [{_key: 'k2'}, 'children', {_key: 'k3'}],
            offset: 0,
          },
          focus: {
            path: [{_key: 'k2'}, 'children', {_key: 'k3'}],
            offset: 0,
          },
          backward: false,
        },
      },
    ])
  })
  subscription.unsubscribe()
  editor.send({type: 'focus'})
  await userEvent.keyboard('{Backspace}')
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      'B: foo|bar\nB: baz[strong:qux]',
    )
  })
})

test('Scenario: insert.block before at a gone text block changes nothing (root)', async () => {
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
    children: (
      <>
        {' '}
        <NodePlugin nodes={nodes} />
      </>
    ),
  }
  const {editor} = await createTestEditor(options)
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: 'k0',
          },
          'children',
          {
            _key: 'k1',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k0',
          },
          'children',
          {
            _key: 'k1',
          },
        ],
        offset: 0,
      },
      backward: false,
    },
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [
        {
          _key: 'k0',
        },
        'children',
        {
          _key: 'k1',
        },
      ],
      offset: 0,
    },
    focus: {
      path: [
        {
          _key: 'k0',
        },
        'children',
        {
          _key: 'k1',
        },
      ],
      offset: 0,
    },
    backward: false,
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k2',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['B: |foo', 'B: baz[strong:qux]'].join('\n'),
    )
  })
  editor.send({
    type: 'insert.block',
    placement: 'before',
    block: {
      _type: 'block',
      children: [{_type: 'span', text: 'foo', marks: []}],
    },
    at: {
      anchor: {
        path: [
          {
            _key: 'k2',
          },
          'children',
          {
            _key: 'k3',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k2',
          },
          'children',
          {
            _key: 'k3',
          },
        ],
        offset: 3,
      },
      backward: false,
    },
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    ['B: |foo', 'B: baz[strong:qux]'].join('\n'),
  )
})

test('Scenario: insert.block after at a gone text block changes nothing (root)', async () => {
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
    children: (
      <>
        {' '}
        <NodePlugin nodes={nodes} />
      </>
    ),
  }
  const {editor} = await createTestEditor(options)
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: 'k0',
          },
          'children',
          {
            _key: 'k1',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k0',
          },
          'children',
          {
            _key: 'k1',
          },
        ],
        offset: 0,
      },
      backward: false,
    },
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [
        {
          _key: 'k0',
        },
        'children',
        {
          _key: 'k1',
        },
      ],
      offset: 0,
    },
    focus: {
      path: [
        {
          _key: 'k0',
        },
        'children',
        {
          _key: 'k1',
        },
      ],
      offset: 0,
    },
    backward: false,
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k2',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['B: |foo', 'B: baz[strong:qux]'].join('\n'),
    )
  })
  editor.send({
    type: 'insert.block',
    placement: 'after',
    block: {
      _type: 'block',
      children: [{_type: 'span', text: 'foo', marks: []}],
    },
    at: {
      anchor: {
        path: [
          {
            _key: 'k2',
          },
          'children',
          {
            _key: 'k3',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k2',
          },
          'children',
          {
            _key: 'k3',
          },
        ],
        offset: 3,
      },
      backward: false,
    },
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    ['B: |foo', 'B: baz[strong:qux]'].join('\n'),
  )
})

test('Scenario: insert.block auto at a gone text block changes nothing (root)', async () => {
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
    children: (
      <>
        {' '}
        <NodePlugin nodes={nodes} />
      </>
    ),
  }
  const {editor} = await createTestEditor(options)
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: 'k0',
          },
          'children',
          {
            _key: 'k1',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k0',
          },
          'children',
          {
            _key: 'k1',
          },
        ],
        offset: 0,
      },
      backward: false,
    },
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [
        {
          _key: 'k0',
        },
        'children',
        {
          _key: 'k1',
        },
      ],
      offset: 0,
    },
    focus: {
      path: [
        {
          _key: 'k0',
        },
        'children',
        {
          _key: 'k1',
        },
      ],
      offset: 0,
    },
    backward: false,
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k2',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['B: |foo', 'B: baz[strong:qux]'].join('\n'),
    )
  })
  editor.send({
    type: 'insert.block',
    placement: 'auto',
    block: {
      _type: 'block',
      children: [{_type: 'span', text: 'foo', marks: []}],
    },
    at: {
      anchor: {
        path: [
          {
            _key: 'k2',
          },
          'children',
          {
            _key: 'k3',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k2',
          },
          'children',
          {
            _key: 'k3',
          },
        ],
        offset: 3,
      },
      backward: false,
    },
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    ['B: |foo', 'B: baz[strong:qux]'].join('\n'),
  )
})

test('Scenario: annotation.remove inside a gone block keeps the link on foo (root)', async () => {
  const keyGenerator = createTestKeyGenerator()
  const linkKey = keyGenerator()
  const options = {
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        markDefs: [
          {
            _key: linkKey,
            _type: 'link',
            href: 'https://original.example',
          },
        ],
        children: [
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'foo',
            marks: [linkKey],
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
    children: (
      <>
        {' '}
        <NodePlugin nodes={nodes} />
      </>
    ),
  }
  const {editor} = await createTestEditor(options)
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: 'k1',
          },
          'children',
          {
            _key: 'k2',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k1',
          },
          'children',
          {
            _key: 'k2',
          },
        ],
        offset: 0,
      },
      backward: false,
    },
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [
        {
          _key: 'k1',
        },
        'children',
        {
          _key: 'k2',
        },
      ],
      offset: 0,
    },
    focus: {
      path: [
        {
          _key: 'k1',
        },
        'children',
        {
          _key: 'k2',
        },
      ],
      offset: 0,
    },
    backward: false,
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k3',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    // Textspec cannot pin unchanged `markDefs` keys or detect extra unused definitions.
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k1',
        _type: 'block',
        style: 'normal',
        markDefs: [
          {
            _key: 'k0',
            _type: 'link',
            href: 'https://original.example',
          },
        ],
        children: [
          {
            _key: 'k2',
            _type: 'span',
            text: 'foo',
            marks: ['k0'],
          },
        ],
      },
      {
        _key: 'k5',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: 'k6',
            _type: 'span',
            text: 'baz',
            marks: [],
          },
          {
            _key: 'k7',
            _type: 'span',
            text: 'qux',
            marks: ['strong'],
          },
        ],
      },
    ])
  })
  editor.send({
    type: 'annotation.remove',
    annotation: {name: 'link'},
    at: {
      anchor: {
        path: [
          {
            _key: 'k3',
          },
          'children',
          {
            _key: 'k4',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k3',
          },
          'children',
          {
            _key: 'k4',
          },
        ],
        offset: 3,
      },
      backward: false,
    },
  })
  // Textspec cannot pin unchanged `markDefs` keys or detect extra unused definitions.
  expect(editor.getSnapshot().context.value).toEqual([
    {
      _key: 'k1',
      _type: 'block',
      style: 'normal',
      markDefs: [
        {
          _key: 'k0',
          _type: 'link',
          href: 'https://original.example',
        },
      ],
      children: [
        {
          _key: 'k2',
          _type: 'span',
          text: 'foo',
          marks: ['k0'],
        },
      ],
    },
    {
      _key: 'k5',
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [
        {
          _key: 'k6',
          _type: 'span',
          text: 'baz',
          marks: [],
        },
        {
          _key: 'k7',
          _type: 'span',
          text: 'qux',
          marks: ['strong'],
        },
      ],
    },
  ])
})

test('Scenario: annotation.add handles one add on linked foo when at names a gone span (callout)', async () => {
  const keyGenerator = createTestKeyGenerator()
  const linkKey = keyGenerator()
  let addCount = 0
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
            markDefs: [
              {
                _key: linkKey,
                _type: 'link',
                href: 'https://original.example',
              },
            ],
            children: [
              {
                _key: keyGenerator(),
                _type: 'span',
                text: 'foo',
                marks: [linkKey],
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
              {
                _key: keyGenerator(),
                _type: 'span',
                text: 'qux',
                marks: ['strong'],
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
    children: (
      <>
        {' '}
        <NodePlugin nodes={nodes} />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'annotation.add',
              guard: () => {
                addCount++
                return addCount > 20
              },
              actions: [() => []],
            }),
          ]}
        />
      </>
    ),
  }
  const {editor} = await createTestEditor(options)
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k2',
          },
          'children',
          {
            _key: 'k3',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k2',
          },
          'children',
          {
            _key: 'k3',
          },
        ],
        offset: 3,
      },
      backward: false,
    },
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [
        {
          _key: 'k1',
        },
        'content',
        {
          _key: 'k2',
        },
        'children',
        {
          _key: 'k3',
        },
      ],
      offset: 0,
    },
    focus: {
      path: [
        {
          _key: 'k1',
        },
        'content',
        {
          _key: 'k2',
        },
        'children',
        {
          _key: 'k3',
        },
      ],
      offset: 3,
    },
    backward: false,
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k4',
          },
          'children',
          {
            _key: 'k6',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    // Textspec cannot pin unchanged `markDefs` keys or detect extra unused definitions.
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k1',
        _type: 'callout',
        content: [
          {
            _key: 'k2',
            _type: 'block',
            style: 'normal',
            markDefs: [
              {
                _key: 'k0',
                _type: 'link',
                href: 'https://original.example',
              },
            ],
            children: [
              {
                _key: 'k3',
                _type: 'span',
                text: 'foo',
                marks: ['k0'],
              },
            ],
          },
          {
            _key: 'k4',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _key: 'k5',
                _type: 'span',
                text: 'bar',
                marks: [],
              },
            ],
          },
          {
            _key: 'k7',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _key: 'k8',
                _type: 'span',
                text: 'baz',
                marks: [],
              },
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
    ])
  })
  editor.send({
    type: 'annotation.add',
    annotation: {name: 'link', value: {href: 'https://another.example'}},
    at: {
      anchor: {
        path: [
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k4',
          },
          'children',
          {
            _key: 'k6',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k4',
          },
          'children',
          {
            _key: 'k6',
          },
        ],
        offset: 3,
      },
      backward: false,
    },
  })
  expect(addCount).toEqual(1)
  // Textspec cannot pin unchanged `markDefs` keys or detect extra unused definitions.
  expect(editor.getSnapshot().context.value).toEqual([
    {
      _key: 'k1',
      _type: 'callout',
      content: [
        {
          _key: 'k2',
          _type: 'block',
          style: 'normal',
          markDefs: [
            {
              _key: 'k0',
              _type: 'link',
              href: 'https://original.example',
            },
          ],
          children: [
            {
              _key: 'k3',
              _type: 'span',
              text: 'foo',
              marks: ['k0'],
            },
          ],
        },
        {
          _key: 'k4',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {
              _key: 'k5',
              _type: 'span',
              text: 'bar',
              marks: [],
            },
          ],
        },
        {
          _key: 'k7',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {
              _key: 'k8',
              _type: 'span',
              text: 'baz',
              marks: [],
            },
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
  ])
})

test('Scenario: selection prop uses main fallback when a collaborator removes its span (callout)', async () => {
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
              {
                _key: keyGenerator(),
                _type: 'span',
                text: 'qux',
                marks: ['strong'],
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
    children: (
      <>
        {' '}
        <NodePlugin nodes={nodes} />
      </>
    ),
  }
  const {editor, rerender} = await createTestEditor(options)
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [{_key: 'k0'}, 'content', {_key: 'k1'}, 'children', {_key: 'k2'}],
        offset: 0,
      },
      focus: {
        path: [{_key: 'k0'}, 'content', {_key: 'k1'}, 'children', {_key: 'k2'}],
        offset: 0,
      },
      backward: false,
    },
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [{_key: 'k0'}, 'content', {_key: 'k1'}, 'children', {_key: 'k2'}],
      offset: 0,
    },
    focus: {
      path: [{_key: 'k0'}, 'content', {_key: 'k1'}, 'children', {_key: 'k2'}],
      offset: 0,
    },
    backward: false,
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [{_key: 'k0'}, 'content', {_key: 'k3'}, 'children', {_key: 'k5'}],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      'CALLOUT:\n  B: |foo\n  B: bar\n  B: baz[strong:qux]',
    )
  })
  const selectionEvents: Array<EditorEmittedEvent> = []
  const subscription = editor.on('selection', (event) => {
    selectionEvents.push(event)
  })
  await rerender({
    ...options,
    editableProps: {
      selection: {
        anchor: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k5'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k3'},
            'children',
            {_key: 'k5'},
          ],
          offset: 2,
        },
        backward: false,
      },
    },
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: 'k0'}, 'content', {_key: 'k1'}, 'children', {_key: 'k2'}],
        offset: 0,
      },
      focus: {
        path: [{_key: 'k0'}, 'content', {_key: 'k1'}, 'children', {_key: 'k2'}],
        offset: 0,
      },
      backward: false,
    })
    expect(selectionEvents).toEqual([
      {
        type: 'selection',
        selection: {
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
            offset: 0,
          },
        },
      },
      {
        type: 'selection',
        selection: {
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
            offset: 0,
          },
          backward: false,
        },
      },
    ])
  })
  subscription.unsubscribe()
  editor.send({type: 'focus'})
  await userEvent.keyboard('{Backspace}')
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      'CALLOUT:\n  B: |foo\n  B: bar\n  B: baz[strong:qux]',
    )
  })
})

test('Scenario: insert.block before at a gone text block changes nothing (callout)', async () => {
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
    children: (
      <>
        {' '}
        <NodePlugin nodes={nodes} />
      </>
    ),
  }
  const {editor} = await createTestEditor(options)
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k1',
          },
          'children',
          {
            _key: 'k2',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k1',
          },
          'children',
          {
            _key: 'k2',
          },
        ],
        offset: 0,
      },
      backward: false,
    },
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [
        {
          _key: 'k0',
        },
        'content',
        {
          _key: 'k1',
        },
        'children',
        {
          _key: 'k2',
        },
      ],
      offset: 0,
    },
    focus: {
      path: [
        {
          _key: 'k0',
        },
        'content',
        {
          _key: 'k1',
        },
        'children',
        {
          _key: 'k2',
        },
      ],
      offset: 0,
    },
    backward: false,
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k3',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['CALLOUT:', '  B: |foo', '  B: baz[strong:qux]'].join('\n'),
    )
  })
  editor.send({
    type: 'insert.block',
    placement: 'before',
    block: {
      _type: 'block',
      children: [{_type: 'span', text: 'foo', marks: []}],
    },
    at: {
      anchor: {
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k3',
          },
          'children',
          {
            _key: 'k4',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k3',
          },
          'children',
          {
            _key: 'k4',
          },
        ],
        offset: 3,
      },
      backward: false,
    },
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    ['CALLOUT:', '  B: |foo', '  B: baz[strong:qux]'].join('\n'),
  )
})

test('Scenario: insert.block after at a gone text block changes nothing (callout)', async () => {
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
    children: (
      <>
        {' '}
        <NodePlugin nodes={nodes} />
      </>
    ),
  }
  const {editor} = await createTestEditor(options)
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k1',
          },
          'children',
          {
            _key: 'k2',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k1',
          },
          'children',
          {
            _key: 'k2',
          },
        ],
        offset: 0,
      },
      backward: false,
    },
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [
        {
          _key: 'k0',
        },
        'content',
        {
          _key: 'k1',
        },
        'children',
        {
          _key: 'k2',
        },
      ],
      offset: 0,
    },
    focus: {
      path: [
        {
          _key: 'k0',
        },
        'content',
        {
          _key: 'k1',
        },
        'children',
        {
          _key: 'k2',
        },
      ],
      offset: 0,
    },
    backward: false,
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k3',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['CALLOUT:', '  B: |foo', '  B: baz[strong:qux]'].join('\n'),
    )
  })
  editor.send({
    type: 'insert.block',
    placement: 'after',
    block: {
      _type: 'block',
      children: [{_type: 'span', text: 'foo', marks: []}],
    },
    at: {
      anchor: {
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k3',
          },
          'children',
          {
            _key: 'k4',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k3',
          },
          'children',
          {
            _key: 'k4',
          },
        ],
        offset: 3,
      },
      backward: false,
    },
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    ['CALLOUT:', '  B: |foo', '  B: baz[strong:qux]'].join('\n'),
  )
})

test('Scenario: insert.block auto at a gone text block changes nothing (callout)', async () => {
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
    children: (
      <>
        {' '}
        <NodePlugin nodes={nodes} />
      </>
    ),
  }
  const {editor} = await createTestEditor(options)
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k1',
          },
          'children',
          {
            _key: 'k2',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k1',
          },
          'children',
          {
            _key: 'k2',
          },
        ],
        offset: 0,
      },
      backward: false,
    },
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [
        {
          _key: 'k0',
        },
        'content',
        {
          _key: 'k1',
        },
        'children',
        {
          _key: 'k2',
        },
      ],
      offset: 0,
    },
    focus: {
      path: [
        {
          _key: 'k0',
        },
        'content',
        {
          _key: 'k1',
        },
        'children',
        {
          _key: 'k2',
        },
      ],
      offset: 0,
    },
    backward: false,
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k3',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['CALLOUT:', '  B: |foo', '  B: baz[strong:qux]'].join('\n'),
    )
  })
  editor.send({
    type: 'insert.block',
    placement: 'auto',
    block: {
      _type: 'block',
      children: [{_type: 'span', text: 'foo', marks: []}],
    },
    at: {
      anchor: {
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k3',
          },
          'children',
          {
            _key: 'k4',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k3',
          },
          'children',
          {
            _key: 'k4',
          },
        ],
        offset: 3,
      },
      backward: false,
    },
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    ['CALLOUT:', '  B: |foo', '  B: baz[strong:qux]'].join('\n'),
  )
})

test('Scenario: annotation.remove inside a gone block keeps the link on foo (callout)', async () => {
  const keyGenerator = createTestKeyGenerator()
  const linkKey = keyGenerator()
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
            markDefs: [
              {
                _key: linkKey,
                _type: 'link',
                href: 'https://original.example',
              },
            ],
            children: [
              {
                _key: keyGenerator(),
                _type: 'span',
                text: 'foo',
                marks: [linkKey],
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
    children: (
      <>
        {' '}
        <NodePlugin nodes={nodes} />
      </>
    ),
  }
  const {editor} = await createTestEditor(options)
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k2',
          },
          'children',
          {
            _key: 'k3',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k2',
          },
          'children',
          {
            _key: 'k3',
          },
        ],
        offset: 0,
      },
      backward: false,
    },
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [
        {
          _key: 'k1',
        },
        'content',
        {
          _key: 'k2',
        },
        'children',
        {
          _key: 'k3',
        },
      ],
      offset: 0,
    },
    focus: {
      path: [
        {
          _key: 'k1',
        },
        'content',
        {
          _key: 'k2',
        },
        'children',
        {
          _key: 'k3',
        },
      ],
      offset: 0,
    },
    backward: false,
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k4',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    // Textspec cannot pin unchanged `markDefs` keys or detect extra unused definitions.
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k1',
        _type: 'callout',
        content: [
          {
            _key: 'k2',
            _type: 'block',
            style: 'normal',
            markDefs: [
              {
                _key: 'k0',
                _type: 'link',
                href: 'https://original.example',
              },
            ],
            children: [
              {
                _key: 'k3',
                _type: 'span',
                text: 'foo',
                marks: ['k0'],
              },
            ],
          },
          {
            _key: 'k6',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _key: 'k7',
                _type: 'span',
                text: 'baz',
                marks: [],
              },
              {
                _key: 'k8',
                _type: 'span',
                text: 'qux',
                marks: ['strong'],
              },
            ],
          },
        ],
      },
    ])
  })
  editor.send({
    type: 'annotation.remove',
    annotation: {name: 'link'},
    at: {
      anchor: {
        path: [
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k4',
          },
          'children',
          {
            _key: 'k5',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k4',
          },
          'children',
          {
            _key: 'k5',
          },
        ],
        offset: 3,
      },
      backward: false,
    },
  })
  // Textspec cannot pin unchanged `markDefs` keys or detect extra unused definitions.
  expect(editor.getSnapshot().context.value).toEqual([
    {
      _key: 'k1',
      _type: 'callout',
      content: [
        {
          _key: 'k2',
          _type: 'block',
          style: 'normal',
          markDefs: [
            {
              _key: 'k0',
              _type: 'link',
              href: 'https://original.example',
            },
          ],
          children: [
            {
              _key: 'k3',
              _type: 'span',
              text: 'foo',
              marks: ['k0'],
            },
          ],
        },
        {
          _key: 'k6',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {
              _key: 'k7',
              _type: 'span',
              text: 'baz',
              marks: [],
            },
            {
              _key: 'k8',
              _type: 'span',
              text: 'qux',
              marks: ['strong'],
            },
          ],
        },
      ],
    },
  ])
})

test('Scenario: annotation.add handles one add on linked foo when at names a gone span (nested callout)', async () => {
  const keyGenerator = createTestKeyGenerator()
  const linkKey = keyGenerator()
  let addCount = 0
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
                markDefs: [
                  {
                    _key: linkKey,
                    _type: 'link',
                    href: 'https://original.example',
                  },
                ],
                children: [
                  {
                    _key: keyGenerator(),
                    _type: 'span',
                    text: 'foo',
                    marks: [linkKey],
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
                  {
                    _key: keyGenerator(),
                    _type: 'span',
                    text: 'qux',
                    marks: ['strong'],
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
    children: (
      <>
        {' '}
        <NodePlugin nodes={nodes} />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'annotation.add',
              guard: () => {
                addCount++
                return addCount > 20
              },
              actions: [() => []],
            }),
          ]}
        />
      </>
    ),
  }
  const {editor} = await createTestEditor(options)
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'children',
          {
            _key: 'k4',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'children',
          {
            _key: 'k4',
          },
        ],
        offset: 3,
      },
      backward: false,
    },
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [
        {
          _key: 'k1',
        },
        'content',
        {
          _key: 'k2',
        },
        'content',
        {
          _key: 'k3',
        },
        'children',
        {
          _key: 'k4',
        },
      ],
      offset: 0,
    },
    focus: {
      path: [
        {
          _key: 'k1',
        },
        'content',
        {
          _key: 'k2',
        },
        'content',
        {
          _key: 'k3',
        },
        'children',
        {
          _key: 'k4',
        },
      ],
      offset: 3,
    },
    backward: false,
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
          'children',
          {
            _key: 'k7',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    // Textspec cannot pin unchanged `markDefs` keys or detect extra unused definitions.
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k1',
        _type: 'callout',
        content: [
          {
            _key: 'k2',
            _type: 'callout',
            content: [
              {
                _key: 'k3',
                _type: 'block',
                style: 'normal',
                markDefs: [
                  {
                    _key: 'k0',
                    _type: 'link',
                    href: 'https://original.example',
                  },
                ],
                children: [
                  {
                    _key: 'k4',
                    _type: 'span',
                    text: 'foo',
                    marks: ['k0'],
                  },
                ],
              },
              {
                _key: 'k5',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _key: 'k6',
                    _type: 'span',
                    text: 'bar',
                    marks: [],
                  },
                ],
              },
              {
                _key: 'k8',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _key: 'k9',
                    _type: 'span',
                    text: 'baz',
                    marks: [],
                  },
                  {
                    _key: 'k10',
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
    ])
  })
  editor.send({
    type: 'annotation.add',
    annotation: {name: 'link', value: {href: 'https://another.example'}},
    at: {
      anchor: {
        path: [
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
          'children',
          {
            _key: 'k7',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
          'children',
          {
            _key: 'k7',
          },
        ],
        offset: 3,
      },
      backward: false,
    },
  })
  expect(addCount).toEqual(1)
  // Textspec cannot pin unchanged `markDefs` keys or detect extra unused definitions.
  expect(editor.getSnapshot().context.value).toEqual([
    {
      _key: 'k1',
      _type: 'callout',
      content: [
        {
          _key: 'k2',
          _type: 'callout',
          content: [
            {
              _key: 'k3',
              _type: 'block',
              style: 'normal',
              markDefs: [
                {
                  _key: 'k0',
                  _type: 'link',
                  href: 'https://original.example',
                },
              ],
              children: [
                {
                  _key: 'k4',
                  _type: 'span',
                  text: 'foo',
                  marks: ['k0'],
                },
              ],
            },
            {
              _key: 'k5',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _key: 'k6',
                  _type: 'span',
                  text: 'bar',
                  marks: [],
                },
              ],
            },
            {
              _key: 'k8',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _key: 'k9',
                  _type: 'span',
                  text: 'baz',
                  marks: [],
                },
                {
                  _key: 'k10',
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
  ])
})

test('Scenario: selection prop uses main fallback when a collaborator removes its span (nested callout)', async () => {
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
                  {
                    _key: keyGenerator(),
                    _type: 'span',
                    text: 'qux',
                    marks: ['strong'],
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
    children: (
      <>
        {' '}
        <NodePlugin nodes={nodes} />
      </>
    ),
  }
  const {editor, rerender} = await createTestEditor(options)
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
        offset: 0,
      },
      backward: false,
    },
  })
  expect(editor.getSnapshot().context.selection).toEqual({
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
      offset: 0,
    },
    backward: false,
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {_key: 'k0'},
          'content',
          {_key: 'k1'},
          'content',
          {_key: 'k4'},
          'children',
          {_key: 'k6'},
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      'CALLOUT:\n  CALLOUT:\n    B: |foo\n    B: bar\n    B: baz[strong:qux]',
    )
  })
  const selectionEvents: Array<EditorEmittedEvent> = []
  const subscription = editor.on('selection', (event) => {
    selectionEvents.push(event)
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
            {_key: 'k4'},
            'children',
            {_key: 'k6'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'k0'},
            'content',
            {_key: 'k1'},
            'content',
            {_key: 'k4'},
            'children',
            {_key: 'k6'},
          ],
          offset: 2,
        },
        backward: false,
      },
    },
  })
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
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
        offset: 0,
      },
      backward: false,
    })
    expect(selectionEvents).toEqual([
      {
        type: 'selection',
        selection: {
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
            offset: 0,
          },
        },
      },
      {
        type: 'selection',
        selection: {
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
            offset: 0,
          },
          backward: false,
        },
      },
    ])
  })
  subscription.unsubscribe()
  editor.send({type: 'focus'})
  await userEvent.keyboard('{Backspace}')
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      'CALLOUT:\n  CALLOUT:\n    B: |foo\n    B: bar\n    B: baz[strong:qux]',
    )
  })
})

test('Scenario: insert.block before at a gone text block changes nothing (nested callout)', async () => {
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
    children: (
      <>
        {' '}
        <NodePlugin nodes={nodes} />
      </>
    ),
  }
  const {editor} = await createTestEditor(options)
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k2',
          },
          'children',
          {
            _key: 'k3',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k2',
          },
          'children',
          {
            _key: 'k3',
          },
        ],
        offset: 0,
      },
      backward: false,
    },
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [
        {
          _key: 'k0',
        },
        'content',
        {
          _key: 'k1',
        },
        'content',
        {
          _key: 'k2',
        },
        'children',
        {
          _key: 'k3',
        },
      ],
      offset: 0,
    },
    focus: {
      path: [
        {
          _key: 'k0',
        },
        'content',
        {
          _key: 'k1',
        },
        'content',
        {
          _key: 'k2',
        },
        'children',
        {
          _key: 'k3',
        },
      ],
      offset: 0,
    },
    backward: false,
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k4',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['CALLOUT:', '  CALLOUT:', '    B: |foo', '    B: baz[strong:qux]'].join(
        '\n',
      ),
    )
  })
  editor.send({
    type: 'insert.block',
    placement: 'before',
    block: {
      _type: 'block',
      children: [{_type: 'span', text: 'foo', marks: []}],
    },
    at: {
      anchor: {
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k4',
          },
          'children',
          {
            _key: 'k5',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k4',
          },
          'children',
          {
            _key: 'k5',
          },
        ],
        offset: 3,
      },
      backward: false,
    },
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    ['CALLOUT:', '  CALLOUT:', '    B: |foo', '    B: baz[strong:qux]'].join(
      '\n',
    ),
  )
})

test('Scenario: insert.block after at a gone text block changes nothing (nested callout)', async () => {
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
    children: (
      <>
        {' '}
        <NodePlugin nodes={nodes} />
      </>
    ),
  }
  const {editor} = await createTestEditor(options)
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k2',
          },
          'children',
          {
            _key: 'k3',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k2',
          },
          'children',
          {
            _key: 'k3',
          },
        ],
        offset: 0,
      },
      backward: false,
    },
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [
        {
          _key: 'k0',
        },
        'content',
        {
          _key: 'k1',
        },
        'content',
        {
          _key: 'k2',
        },
        'children',
        {
          _key: 'k3',
        },
      ],
      offset: 0,
    },
    focus: {
      path: [
        {
          _key: 'k0',
        },
        'content',
        {
          _key: 'k1',
        },
        'content',
        {
          _key: 'k2',
        },
        'children',
        {
          _key: 'k3',
        },
      ],
      offset: 0,
    },
    backward: false,
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k4',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['CALLOUT:', '  CALLOUT:', '    B: |foo', '    B: baz[strong:qux]'].join(
        '\n',
      ),
    )
  })
  editor.send({
    type: 'insert.block',
    placement: 'after',
    block: {
      _type: 'block',
      children: [{_type: 'span', text: 'foo', marks: []}],
    },
    at: {
      anchor: {
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k4',
          },
          'children',
          {
            _key: 'k5',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k4',
          },
          'children',
          {
            _key: 'k5',
          },
        ],
        offset: 3,
      },
      backward: false,
    },
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    ['CALLOUT:', '  CALLOUT:', '    B: |foo', '    B: baz[strong:qux]'].join(
      '\n',
    ),
  )
})

test('Scenario: insert.block auto at a gone text block changes nothing (nested callout)', async () => {
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
    children: (
      <>
        {' '}
        <NodePlugin nodes={nodes} />
      </>
    ),
  }
  const {editor} = await createTestEditor(options)
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k2',
          },
          'children',
          {
            _key: 'k3',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k2',
          },
          'children',
          {
            _key: 'k3',
          },
        ],
        offset: 0,
      },
      backward: false,
    },
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [
        {
          _key: 'k0',
        },
        'content',
        {
          _key: 'k1',
        },
        'content',
        {
          _key: 'k2',
        },
        'children',
        {
          _key: 'k3',
        },
      ],
      offset: 0,
    },
    focus: {
      path: [
        {
          _key: 'k0',
        },
        'content',
        {
          _key: 'k1',
        },
        'content',
        {
          _key: 'k2',
        },
        'children',
        {
          _key: 'k3',
        },
      ],
      offset: 0,
    },
    backward: false,
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k4',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['CALLOUT:', '  CALLOUT:', '    B: |foo', '    B: baz[strong:qux]'].join(
        '\n',
      ),
    )
  })
  editor.send({
    type: 'insert.block',
    placement: 'auto',
    block: {
      _type: 'block',
      children: [{_type: 'span', text: 'foo', marks: []}],
    },
    at: {
      anchor: {
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k4',
          },
          'children',
          {
            _key: 'k5',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k0',
          },
          'content',
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k4',
          },
          'children',
          {
            _key: 'k5',
          },
        ],
        offset: 3,
      },
      backward: false,
    },
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    ['CALLOUT:', '  CALLOUT:', '    B: |foo', '    B: baz[strong:qux]'].join(
      '\n',
    ),
  )
})

test('Scenario: annotation.remove inside a gone block keeps the link on foo (nested callout)', async () => {
  const keyGenerator = createTestKeyGenerator()
  const linkKey = keyGenerator()
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
                markDefs: [
                  {
                    _key: linkKey,
                    _type: 'link',
                    href: 'https://original.example',
                  },
                ],
                children: [
                  {
                    _key: keyGenerator(),
                    _type: 'span',
                    text: 'foo',
                    marks: [linkKey],
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
    children: (
      <>
        {' '}
        <NodePlugin nodes={nodes} />
      </>
    ),
  }
  const {editor} = await createTestEditor(options)
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'children',
          {
            _key: 'k4',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'children',
          {
            _key: 'k4',
          },
        ],
        offset: 0,
      },
      backward: false,
    },
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [
        {
          _key: 'k1',
        },
        'content',
        {
          _key: 'k2',
        },
        'content',
        {
          _key: 'k3',
        },
        'children',
        {
          _key: 'k4',
        },
      ],
      offset: 0,
    },
    focus: {
      path: [
        {
          _key: 'k1',
        },
        'content',
        {
          _key: 'k2',
        },
        'content',
        {
          _key: 'k3',
        },
        'children',
        {
          _key: 'k4',
        },
      ],
      offset: 0,
    },
    backward: false,
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    // Textspec cannot pin unchanged `markDefs` keys or detect extra unused definitions.
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k1',
        _type: 'callout',
        content: [
          {
            _key: 'k2',
            _type: 'callout',
            content: [
              {
                _key: 'k3',
                _type: 'block',
                style: 'normal',
                markDefs: [
                  {
                    _key: 'k0',
                    _type: 'link',
                    href: 'https://original.example',
                  },
                ],
                children: [
                  {
                    _key: 'k4',
                    _type: 'span',
                    text: 'foo',
                    marks: ['k0'],
                  },
                ],
              },
              {
                _key: 'k7',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _key: 'k8',
                    _type: 'span',
                    text: 'baz',
                    marks: [],
                  },
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
    ])
  })
  editor.send({
    type: 'annotation.remove',
    annotation: {name: 'link'},
    at: {
      anchor: {
        path: [
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
          'children',
          {
            _key: 'k6',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k1',
          },
          'content',
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
          'children',
          {
            _key: 'k6',
          },
        ],
        offset: 3,
      },
      backward: false,
    },
  })
  // Textspec cannot pin unchanged `markDefs` keys or detect extra unused definitions.
  expect(editor.getSnapshot().context.value).toEqual([
    {
      _key: 'k1',
      _type: 'callout',
      content: [
        {
          _key: 'k2',
          _type: 'callout',
          content: [
            {
              _key: 'k3',
              _type: 'block',
              style: 'normal',
              markDefs: [
                {
                  _key: 'k0',
                  _type: 'link',
                  href: 'https://original.example',
                },
              ],
              children: [
                {
                  _key: 'k4',
                  _type: 'span',
                  text: 'foo',
                  marks: ['k0'],
                },
              ],
            },
            {
              _key: 'k7',
              _type: 'block',
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _key: 'k8',
                  _type: 'span',
                  text: 'baz',
                  marks: [],
                },
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
  ])
})

test('Scenario: annotation.add handles one add on linked foo when at names a gone span (table cell)', async () => {
  const keyGenerator = createTestKeyGenerator()
  const linkKey = keyGenerator()
  let addCount = 0
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
                    markDefs: [
                      {
                        _key: linkKey,
                        _type: 'link',
                        href: 'https://original.example',
                      },
                    ],
                    children: [
                      {
                        _key: keyGenerator(),
                        _type: 'span',
                        text: 'foo',
                        marks: [linkKey],
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
                      {
                        _key: keyGenerator(),
                        _type: 'span',
                        text: 'qux',
                        marks: ['strong'],
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
    children: (
      <>
        {' '}
        <NodePlugin nodes={nodes} />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'annotation.add',
              guard: () => {
                addCount++
                return addCount > 20
              },
              actions: [() => []],
            }),
          ]}
        />
      </>
    ),
  }
  const {editor} = await createTestEditor(options)
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: 'k1',
          },
          'rows',
          {
            _key: 'k2',
          },
          'cells',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: 'k4',
          },
          'children',
          {
            _key: 'k5',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k1',
          },
          'rows',
          {
            _key: 'k2',
          },
          'cells',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: 'k4',
          },
          'children',
          {
            _key: 'k5',
          },
        ],
        offset: 3,
      },
      backward: false,
    },
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [
        {
          _key: 'k1',
        },
        'rows',
        {
          _key: 'k2',
        },
        'cells',
        {
          _key: 'k3',
        },
        'content',
        {
          _key: 'k4',
        },
        'children',
        {
          _key: 'k5',
        },
      ],
      offset: 0,
    },
    focus: {
      path: [
        {
          _key: 'k1',
        },
        'rows',
        {
          _key: 'k2',
        },
        'cells',
        {
          _key: 'k3',
        },
        'content',
        {
          _key: 'k4',
        },
        'children',
        {
          _key: 'k5',
        },
      ],
      offset: 3,
    },
    backward: false,
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k1',
          },
          'rows',
          {
            _key: 'k2',
          },
          'cells',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: 'k6',
          },
          'children',
          {
            _key: 'k8',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    // Textspec cannot pin unchanged `markDefs` keys or detect extra unused definitions.
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k1',
        _type: 'table',
        rows: [
          {
            _key: 'k2',
            _type: 'row',
            cells: [
              {
                _key: 'k3',
                _type: 'cell',
                content: [
                  {
                    _key: 'k4',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [
                      {
                        _key: 'k0',
                        _type: 'link',
                        href: 'https://original.example',
                      },
                    ],
                    children: [
                      {
                        _key: 'k5',
                        _type: 'span',
                        text: 'foo',
                        marks: ['k0'],
                      },
                    ],
                  },
                  {
                    _key: 'k6',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _key: 'k7',
                        _type: 'span',
                        text: 'bar',
                        marks: [],
                      },
                    ],
                  },
                  {
                    _key: 'k9',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _key: 'k10',
                        _type: 'span',
                        text: 'baz',
                        marks: [],
                      },
                      {
                        _key: 'k11',
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
  editor.send({
    type: 'annotation.add',
    annotation: {name: 'link', value: {href: 'https://another.example'}},
    at: {
      anchor: {
        path: [
          {
            _key: 'k1',
          },
          'rows',
          {
            _key: 'k2',
          },
          'cells',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: 'k6',
          },
          'children',
          {
            _key: 'k8',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k1',
          },
          'rows',
          {
            _key: 'k2',
          },
          'cells',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: 'k6',
          },
          'children',
          {
            _key: 'k8',
          },
        ],
        offset: 3,
      },
      backward: false,
    },
  })
  expect(addCount).toEqual(1)
  // Textspec cannot pin unchanged `markDefs` keys or detect extra unused definitions.
  expect(editor.getSnapshot().context.value).toEqual([
    {
      _key: 'k1',
      _type: 'table',
      rows: [
        {
          _key: 'k2',
          _type: 'row',
          cells: [
            {
              _key: 'k3',
              _type: 'cell',
              content: [
                {
                  _key: 'k4',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [
                    {
                      _key: 'k0',
                      _type: 'link',
                      href: 'https://original.example',
                    },
                  ],
                  children: [
                    {
                      _key: 'k5',
                      _type: 'span',
                      text: 'foo',
                      marks: ['k0'],
                    },
                  ],
                },
                {
                  _key: 'k6',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: 'k7',
                      _type: 'span',
                      text: 'bar',
                      marks: [],
                    },
                  ],
                },
                {
                  _key: 'k9',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: 'k10',
                      _type: 'span',
                      text: 'baz',
                      marks: [],
                    },
                    {
                      _key: 'k11',
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

test('Scenario: selection prop uses main fallback when a collaborator removes its span (table cell)', async () => {
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
                      {
                        _key: keyGenerator(),
                        _type: 'span',
                        text: 'qux',
                        marks: ['strong'],
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
    children: (
      <>
        {' '}
        <NodePlugin nodes={nodes} />
      </>
    ),
  }
  const {editor, rerender} = await createTestEditor(options)
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
        offset: 0,
      },
      backward: false,
    },
  })
  expect(editor.getSnapshot().context.selection).toEqual({
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
      offset: 0,
    },
    backward: false,
  })
  editor.send({
    type: 'patches',
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
          {_key: 'k5'},
          'children',
          {_key: 'k7'},
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      'TABLE:\n  ROW:\n    CELL:\n      B: |foo\n      B: bar\n      B: baz[strong:qux]',
    )
  })
  const selectionEvents: Array<EditorEmittedEvent> = []
  const subscription = editor.on('selection', (event) => {
    selectionEvents.push(event)
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
            {_key: 'k5'},
            'children',
            {_key: 'k7'},
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
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).toEqual({
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
        offset: 0,
      },
      backward: false,
    })
    expect(selectionEvents).toEqual([
      {
        type: 'selection',
        selection: {
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
            offset: 0,
          },
        },
      },
      {
        type: 'selection',
        selection: {
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
            offset: 0,
          },
          backward: false,
        },
      },
    ])
  })
  subscription.unsubscribe()
  editor.send({type: 'focus'})
  await userEvent.keyboard('{Backspace}')
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      'TABLE:\n  ROW:\n    CELL:\n      B: |foo\n      B: bar\n      B: baz[strong:qux]',
    )
  })
})

test('Scenario: insert.block before at a gone text block changes nothing (table cell)', async () => {
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
    children: (
      <>
        {' '}
        <NodePlugin nodes={nodes} />
      </>
    ),
  }
  const {editor} = await createTestEditor(options)
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: 'k0',
          },
          'rows',
          {
            _key: 'k1',
          },
          'cells',
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'children',
          {
            _key: 'k4',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k0',
          },
          'rows',
          {
            _key: 'k1',
          },
          'cells',
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'children',
          {
            _key: 'k4',
          },
        ],
        offset: 0,
      },
      backward: false,
    },
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [
        {
          _key: 'k0',
        },
        'rows',
        {
          _key: 'k1',
        },
        'cells',
        {
          _key: 'k2',
        },
        'content',
        {
          _key: 'k3',
        },
        'children',
        {
          _key: 'k4',
        },
      ],
      offset: 0,
    },
    focus: {
      path: [
        {
          _key: 'k0',
        },
        'rows',
        {
          _key: 'k1',
        },
        'cells',
        {
          _key: 'k2',
        },
        'content',
        {
          _key: 'k3',
        },
        'children',
        {
          _key: 'k4',
        },
      ],
      offset: 0,
    },
    backward: false,
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k0',
          },
          'rows',
          {
            _key: 'k1',
          },
          'cells',
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'TABLE:',
        '  ROW:',
        '    CELL:',
        '      B: |foo',
        '      B: baz[strong:qux]',
      ].join('\n'),
    )
  })
  editor.send({
    type: 'insert.block',
    placement: 'before',
    block: {
      _type: 'block',
      children: [{_type: 'span', text: 'foo', marks: []}],
    },
    at: {
      anchor: {
        path: [
          {
            _key: 'k0',
          },
          'rows',
          {
            _key: 'k1',
          },
          'cells',
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
          'children',
          {
            _key: 'k6',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k0',
          },
          'rows',
          {
            _key: 'k1',
          },
          'cells',
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
          'children',
          {
            _key: 'k6',
          },
        ],
        offset: 3,
      },
      backward: false,
    },
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    [
      'TABLE:',
      '  ROW:',
      '    CELL:',
      '      B: |foo',
      '      B: baz[strong:qux]',
    ].join('\n'),
  )
})

test('Scenario: insert.block after at a gone text block changes nothing (table cell)', async () => {
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
    children: (
      <>
        {' '}
        <NodePlugin nodes={nodes} />
      </>
    ),
  }
  const {editor} = await createTestEditor(options)
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: 'k0',
          },
          'rows',
          {
            _key: 'k1',
          },
          'cells',
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'children',
          {
            _key: 'k4',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k0',
          },
          'rows',
          {
            _key: 'k1',
          },
          'cells',
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'children',
          {
            _key: 'k4',
          },
        ],
        offset: 0,
      },
      backward: false,
    },
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [
        {
          _key: 'k0',
        },
        'rows',
        {
          _key: 'k1',
        },
        'cells',
        {
          _key: 'k2',
        },
        'content',
        {
          _key: 'k3',
        },
        'children',
        {
          _key: 'k4',
        },
      ],
      offset: 0,
    },
    focus: {
      path: [
        {
          _key: 'k0',
        },
        'rows',
        {
          _key: 'k1',
        },
        'cells',
        {
          _key: 'k2',
        },
        'content',
        {
          _key: 'k3',
        },
        'children',
        {
          _key: 'k4',
        },
      ],
      offset: 0,
    },
    backward: false,
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k0',
          },
          'rows',
          {
            _key: 'k1',
          },
          'cells',
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'TABLE:',
        '  ROW:',
        '    CELL:',
        '      B: |foo',
        '      B: baz[strong:qux]',
      ].join('\n'),
    )
  })
  editor.send({
    type: 'insert.block',
    placement: 'after',
    block: {
      _type: 'block',
      children: [{_type: 'span', text: 'foo', marks: []}],
    },
    at: {
      anchor: {
        path: [
          {
            _key: 'k0',
          },
          'rows',
          {
            _key: 'k1',
          },
          'cells',
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
          'children',
          {
            _key: 'k6',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k0',
          },
          'rows',
          {
            _key: 'k1',
          },
          'cells',
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
          'children',
          {
            _key: 'k6',
          },
        ],
        offset: 3,
      },
      backward: false,
    },
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    [
      'TABLE:',
      '  ROW:',
      '    CELL:',
      '      B: |foo',
      '      B: baz[strong:qux]',
    ].join('\n'),
  )
})

test('Scenario: insert.block auto at a gone text block changes nothing (table cell)', async () => {
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
    children: (
      <>
        {' '}
        <NodePlugin nodes={nodes} />
      </>
    ),
  }
  const {editor} = await createTestEditor(options)
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: 'k0',
          },
          'rows',
          {
            _key: 'k1',
          },
          'cells',
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'children',
          {
            _key: 'k4',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k0',
          },
          'rows',
          {
            _key: 'k1',
          },
          'cells',
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'children',
          {
            _key: 'k4',
          },
        ],
        offset: 0,
      },
      backward: false,
    },
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [
        {
          _key: 'k0',
        },
        'rows',
        {
          _key: 'k1',
        },
        'cells',
        {
          _key: 'k2',
        },
        'content',
        {
          _key: 'k3',
        },
        'children',
        {
          _key: 'k4',
        },
      ],
      offset: 0,
    },
    focus: {
      path: [
        {
          _key: 'k0',
        },
        'rows',
        {
          _key: 'k1',
        },
        'cells',
        {
          _key: 'k2',
        },
        'content',
        {
          _key: 'k3',
        },
        'children',
        {
          _key: 'k4',
        },
      ],
      offset: 0,
    },
    backward: false,
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k0',
          },
          'rows',
          {
            _key: 'k1',
          },
          'cells',
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'TABLE:',
        '  ROW:',
        '    CELL:',
        '      B: |foo',
        '      B: baz[strong:qux]',
      ].join('\n'),
    )
  })
  editor.send({
    type: 'insert.block',
    placement: 'auto',
    block: {
      _type: 'block',
      children: [{_type: 'span', text: 'foo', marks: []}],
    },
    at: {
      anchor: {
        path: [
          {
            _key: 'k0',
          },
          'rows',
          {
            _key: 'k1',
          },
          'cells',
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
          'children',
          {
            _key: 'k6',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k0',
          },
          'rows',
          {
            _key: 'k1',
          },
          'cells',
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
          'children',
          {
            _key: 'k6',
          },
        ],
        offset: 3,
      },
      backward: false,
    },
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    [
      'TABLE:',
      '  ROW:',
      '    CELL:',
      '      B: |foo',
      '      B: baz[strong:qux]',
    ].join('\n'),
  )
})

test('Scenario: annotation.remove inside a gone block keeps the link on foo (table cell)', async () => {
  const keyGenerator = createTestKeyGenerator()
  const linkKey = keyGenerator()
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
                    markDefs: [
                      {
                        _key: linkKey,
                        _type: 'link',
                        href: 'https://original.example',
                      },
                    ],
                    children: [
                      {
                        _key: keyGenerator(),
                        _type: 'span',
                        text: 'foo',
                        marks: [linkKey],
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
    children: (
      <>
        {' '}
        <NodePlugin nodes={nodes} />
      </>
    ),
  }
  const {editor} = await createTestEditor(options)
  editor.send({
    type: 'select',
    at: {
      anchor: {
        path: [
          {
            _key: 'k1',
          },
          'rows',
          {
            _key: 'k2',
          },
          'cells',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: 'k4',
          },
          'children',
          {
            _key: 'k5',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k1',
          },
          'rows',
          {
            _key: 'k2',
          },
          'cells',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: 'k4',
          },
          'children',
          {
            _key: 'k5',
          },
        ],
        offset: 0,
      },
      backward: false,
    },
  })
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {
      path: [
        {
          _key: 'k1',
        },
        'rows',
        {
          _key: 'k2',
        },
        'cells',
        {
          _key: 'k3',
        },
        'content',
        {
          _key: 'k4',
        },
        'children',
        {
          _key: 'k5',
        },
      ],
      offset: 0,
    },
    focus: {
      path: [
        {
          _key: 'k1',
        },
        'rows',
        {
          _key: 'k2',
        },
        'cells',
        {
          _key: 'k3',
        },
        'content',
        {
          _key: 'k4',
        },
        'children',
        {
          _key: 'k5',
        },
      ],
      offset: 0,
    },
    backward: false,
  })
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k1',
          },
          'rows',
          {
            _key: 'k2',
          },
          'cells',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: 'k6',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    // Textspec cannot pin unchanged `markDefs` keys or detect extra unused definitions.
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k1',
        _type: 'table',
        rows: [
          {
            _key: 'k2',
            _type: 'row',
            cells: [
              {
                _key: 'k3',
                _type: 'cell',
                content: [
                  {
                    _key: 'k4',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [
                      {
                        _key: 'k0',
                        _type: 'link',
                        href: 'https://original.example',
                      },
                    ],
                    children: [
                      {
                        _key: 'k5',
                        _type: 'span',
                        text: 'foo',
                        marks: ['k0'],
                      },
                    ],
                  },
                  {
                    _key: 'k8',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _key: 'k9',
                        _type: 'span',
                        text: 'baz',
                        marks: [],
                      },
                      {
                        _key: 'k10',
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
  editor.send({
    type: 'annotation.remove',
    annotation: {name: 'link'},
    at: {
      anchor: {
        path: [
          {
            _key: 'k1',
          },
          'rows',
          {
            _key: 'k2',
          },
          'cells',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: 'k6',
          },
          'children',
          {
            _key: 'k7',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k1',
          },
          'rows',
          {
            _key: 'k2',
          },
          'cells',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: 'k6',
          },
          'children',
          {
            _key: 'k7',
          },
        ],
        offset: 3,
      },
      backward: false,
    },
  })
  // Textspec cannot pin unchanged `markDefs` keys or detect extra unused definitions.
  expect(editor.getSnapshot().context.value).toEqual([
    {
      _key: 'k1',
      _type: 'table',
      rows: [
        {
          _key: 'k2',
          _type: 'row',
          cells: [
            {
              _key: 'k3',
              _type: 'cell',
              content: [
                {
                  _key: 'k4',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [
                    {
                      _key: 'k0',
                      _type: 'link',
                      href: 'https://original.example',
                    },
                  ],
                  children: [
                    {
                      _key: 'k5',
                      _type: 'span',
                      text: 'foo',
                      marks: ['k0'],
                    },
                  ],
                },
                {
                  _key: 'k8',
                  _type: 'block',
                  style: 'normal',
                  markDefs: [],
                  children: [
                    {
                      _key: 'k9',
                      _type: 'span',
                      text: 'baz',
                      marks: [],
                    },
                    {
                      _key: 'k10',
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

test('Scenario: insert.block before at a removed block inserts nothing (root)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k4',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['B: head', 'B: foo', 'B: baz', 'B: tail'].join('\n'),
    )
  })
  editor.send({
    type: 'insert.block',
    placement: 'before',
    at: {
      anchor: {
        path: [
          {
            _key: 'k4',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k4',
          },
        ],
        offset: 0,
      },
    },
    block: {
      _key: generatedKey0,
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [
        {
          _key: generatedKey1,
          _type: 'span',
          text: 'x',
          marks: [],
        },
      ],
    },
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    ['B: head', 'B: foo', 'B: baz', 'B: tail'].join('\n'),
  )
})

test('Scenario: insert.block after at a removed block inserts nothing (root)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k4',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['B: head', 'B: foo', 'B: baz', 'B: tail'].join('\n'),
    )
  })
  editor.send({
    type: 'insert.block',
    placement: 'after',
    at: {
      anchor: {
        path: [
          {
            _key: 'k4',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k4',
          },
        ],
        offset: 0,
      },
    },
    block: {
      _key: generatedKey0,
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [
        {
          _key: generatedKey1,
          _type: 'span',
          text: 'x',
          marks: [],
        },
      ],
    },
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    ['B: head', 'B: foo', 'B: baz', 'B: tail'].join('\n'),
  )
})

test('Scenario: insert.block auto at a removed block inserts nothing (root)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k4',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['B: head', 'B: foo', 'B: baz', 'B: tail'].join('\n'),
    )
  })
  editor.send({
    type: 'insert.block',
    placement: 'auto',
    at: {
      anchor: {
        path: [
          {
            _key: 'k4',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k4',
          },
        ],
        offset: 0,
      },
    },
    block: {
      _key: generatedKey0,
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [
        {
          _key: generatedKey1,
          _type: 'span',
          text: 'x',
          marks: [],
        },
      ],
    },
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    ['B: head', 'B: foo', 'B: baz', 'B: tail'].join('\n'),
  )
})

test('Scenario: insert.blocks auto at a key never in the document inserts nothing (root)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  const generatedKey2 = keyGenerator()
  editor.send({
    type: 'insert.blocks',
    placement: 'auto',
    at: {
      anchor: {
        path: [
          {
            _key: generatedKey0,
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: generatedKey0,
          },
        ],
        offset: 0,
      },
    },
    blocks: [
      {
        _key: generatedKey1,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey2,
            _type: 'span',
            text: 'x',
            marks: [],
          },
        ],
      },
    ],
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    ['B: head', 'B: foo', 'B: bar', 'B: baz', 'B: tail'].join('\n'),
  )
})

test('Scenario: insert.blocks before keeps later blocks in order when a middle block is cancelled (root)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.block',
              guard: ({event}) =>
                event.block._type === 'block' &&
                'children' in event.block &&
                Array.isArray(event.block.children) &&
                event.block.children.some((child) => child.text === 'y'),
              actions: [
                () => [
                  {
                    type: 'raise',
                    event: {
                      type: 'insert.block',
                      placement: 'before',
                      block: {
                        _type: 'block',
                        children: [{_type: 'span', text: 'baz'}],
                      },
                      at: {
                        anchor: {
                          path: [
                            {
                              _key: 'k4',
                            },
                          ],
                          offset: 0,
                        },
                        focus: {
                          path: [
                            {
                              _key: 'k4',
                            },
                          ],
                          offset: 0,
                        },
                      },
                    },
                  },
                ],
              ],
            }),
          ]}
        />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  const generatedKey2 = keyGenerator()
  const generatedKey3 = keyGenerator()
  const generatedKey4 = keyGenerator()
  const generatedKey5 = keyGenerator()
  editor.send({
    type: 'insert.blocks',
    placement: 'before',
    at: {
      anchor: {
        path: [
          {
            _key: 'k4',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k4',
          },
        ],
        offset: 0,
      },
    },
    blocks: [
      {
        _key: generatedKey0,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey1,
            _type: 'span',
            text: 'x',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey2,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey3,
            _type: 'span',
            text: 'y',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey4,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey5,
            _type: 'span',
            text: 'z',
            marks: [],
          },
        ],
      },
    ],
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    [
      'B: head',
      'B: foo',
      'B: x',
      'B: z|',
      'B: baz',
      'B: bar',
      'B: baz',
      'B: tail',
    ].join('\n'),
  )
})

test('Scenario: insert.blocks after keeps later blocks in order when a middle block is cancelled (root)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.block',
              guard: ({event}) =>
                event.block._type === 'block' &&
                'children' in event.block &&
                Array.isArray(event.block.children) &&
                event.block.children.some((child) => child.text === 'y'),
              actions: [() => []],
            }),
          ]}
        />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  const generatedKey2 = keyGenerator()
  const generatedKey3 = keyGenerator()
  const generatedKey4 = keyGenerator()
  const generatedKey5 = keyGenerator()
  editor.send({
    type: 'insert.blocks',
    placement: 'after',
    at: {
      anchor: {
        path: [
          {
            _key: 'k4',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k4',
          },
        ],
        offset: 0,
      },
    },
    blocks: [
      {
        _key: generatedKey0,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey1,
            _type: 'span',
            text: 'x',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey2,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey3,
            _type: 'span',
            text: 'y',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey4,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey5,
            _type: 'span',
            text: 'z',
            marks: [],
          },
        ],
      },
    ],
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    ['B: head', 'B: foo', 'B: bar', 'B: x', 'B: z|', 'B: baz', 'B: tail'].join(
      '\n',
    ),
  )
})

test('Scenario: insert.blocks auto keeps later blocks in order when a middle block is cancelled (root)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.block',
              guard: ({event}) =>
                event.block._type === 'block' &&
                'children' in event.block &&
                Array.isArray(event.block.children) &&
                event.block.children.some((child) => child.text === 'y'),
              actions: [() => []],
            }),
          ]}
        />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  const generatedKey2 = keyGenerator()
  const generatedKey3 = keyGenerator()
  const generatedKey4 = keyGenerator()
  const generatedKey5 = keyGenerator()
  editor.send({
    type: 'insert.blocks',
    placement: 'auto',
    at: {
      anchor: {
        path: [
          {
            _key: 'k4',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k4',
          },
        ],
        offset: 0,
      },
    },
    blocks: [
      {
        _key: generatedKey0,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey1,
            _type: 'span',
            text: 'x',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey2,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey3,
            _type: 'span',
            text: 'y',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey4,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey5,
            _type: 'span',
            text: 'z',
            marks: [],
          },
        ],
      },
    ],
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    ['B: head', 'B: foo', 'B: x', 'B: zbar|', 'B: baz', 'B: tail'].join('\n'),
  )
})

test('Scenario: insert.blocks auto leaves no empty block when its first block is cancelled (root)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.block',
              guard: ({event}) =>
                event.block._type === 'block' &&
                'children' in event.block &&
                Array.isArray(event.block.children) &&
                event.block.children.some((child) => child.text === 'y'),
              actions: [() => []],
            }),
          ]}
        />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  const generatedKey2 = keyGenerator()
  const generatedKey3 = keyGenerator()
  const generatedKey4 = keyGenerator()
  const generatedKey5 = keyGenerator()
  editor.send({
    type: 'insert.blocks',
    placement: 'auto',
    at: {
      anchor: {
        path: [
          {
            _key: 'k4',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k4',
          },
        ],
        offset: 0,
      },
    },
    blocks: [
      {
        _key: generatedKey0,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey1,
            _type: 'span',
            text: 'y',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey2,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey3,
            _type: 'span',
            text: 'x',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey4,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey5,
            _type: 'span',
            text: 'z',
            marks: [],
          },
        ],
      },
    ],
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    ['B: head', 'B: foo', 'B: x', 'B: zbar|', 'B: baz', 'B: tail'].join('\n'),
  )
})

test('Scenario: insert.block before at a removed block inserts nothing (callout)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
            marks: [],
          },
        ],
      },
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
            ],
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['B: head', 'CALLOUT:', '  B: foo', '  B: baz', 'B: tail'].join('\n'),
    )
  })
  editor.send({
    type: 'insert.block',
    placement: 'before',
    at: {
      anchor: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
        ],
        offset: 0,
      },
    },
    block: {
      _key: generatedKey0,
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [
        {
          _key: generatedKey1,
          _type: 'span',
          text: 'x',
          marks: [],
        },
      ],
    },
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    ['B: head', 'CALLOUT:', '  B: foo', '  B: baz', 'B: tail'].join('\n'),
  )
})

test('Scenario: insert.block after at a removed block inserts nothing (callout)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
            marks: [],
          },
        ],
      },
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
            ],
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['B: head', 'CALLOUT:', '  B: foo', '  B: baz', 'B: tail'].join('\n'),
    )
  })
  editor.send({
    type: 'insert.block',
    placement: 'after',
    at: {
      anchor: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
        ],
        offset: 0,
      },
    },
    block: {
      _key: generatedKey0,
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [
        {
          _key: generatedKey1,
          _type: 'span',
          text: 'x',
          marks: [],
        },
      ],
    },
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    ['B: head', 'CALLOUT:', '  B: foo', '  B: baz', 'B: tail'].join('\n'),
  )
})

test('Scenario: insert.block auto at a removed block inserts nothing (callout)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
            marks: [],
          },
        ],
      },
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
            ],
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['B: head', 'CALLOUT:', '  B: foo', '  B: baz', 'B: tail'].join('\n'),
    )
  })
  editor.send({
    type: 'insert.block',
    placement: 'auto',
    at: {
      anchor: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
        ],
        offset: 0,
      },
    },
    block: {
      _key: generatedKey0,
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [
        {
          _key: generatedKey1,
          _type: 'span',
          text: 'x',
          marks: [],
        },
      ],
    },
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    ['B: head', 'CALLOUT:', '  B: foo', '  B: baz', 'B: tail'].join('\n'),
  )
})

test('Scenario: insert.blocks auto at a key never in the document inserts nothing (callout)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
            marks: [],
          },
        ],
      },
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
            ],
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  const generatedKey2 = keyGenerator()
  editor.send({
    type: 'insert.blocks',
    placement: 'auto',
    at: {
      anchor: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: generatedKey0,
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: generatedKey0,
          },
        ],
        offset: 0,
      },
    },
    blocks: [
      {
        _key: generatedKey1,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey2,
            _type: 'span',
            text: 'x',
            marks: [],
          },
        ],
      },
    ],
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    ['B: head', 'CALLOUT:', '  B: foo', '  B: bar', '  B: baz', 'B: tail'].join(
      '\n',
    ),
  )
})

test('Scenario: insert.blocks before keeps later blocks in order when a middle block is cancelled (callout)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
            marks: [],
          },
        ],
      },
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
            ],
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.block',
              guard: ({event}) =>
                event.block._type === 'block' &&
                'children' in event.block &&
                Array.isArray(event.block.children) &&
                event.block.children.some((child) => child.text === 'y'),
              actions: [
                () => [
                  {
                    type: 'raise',
                    event: {
                      type: 'insert.block',
                      placement: 'before',
                      block: {
                        _type: 'block',
                        children: [{_type: 'span', text: 'baz'}],
                      },
                      at: {
                        anchor: {
                          path: [
                            {
                              _key: 'k2',
                            },
                            'content',
                            {
                              _key: 'k5',
                            },
                          ],
                          offset: 0,
                        },
                        focus: {
                          path: [
                            {
                              _key: 'k2',
                            },
                            'content',
                            {
                              _key: 'k5',
                            },
                          ],
                          offset: 0,
                        },
                      },
                    },
                  },
                ],
              ],
            }),
          ]}
        />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  const generatedKey2 = keyGenerator()
  const generatedKey3 = keyGenerator()
  const generatedKey4 = keyGenerator()
  const generatedKey5 = keyGenerator()
  editor.send({
    type: 'insert.blocks',
    placement: 'before',
    at: {
      anchor: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
        ],
        offset: 0,
      },
    },
    blocks: [
      {
        _key: generatedKey0,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey1,
            _type: 'span',
            text: 'x',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey2,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey3,
            _type: 'span',
            text: 'y',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey4,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey5,
            _type: 'span',
            text: 'z',
            marks: [],
          },
        ],
      },
    ],
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    [
      'B: head',
      'CALLOUT:',
      '  B: foo',
      '  B: x',
      '  B: z|',
      '  B: baz',
      '  B: bar',
      '  B: baz',
      'B: tail',
    ].join('\n'),
  )
})

test('Scenario: insert.blocks after keeps later blocks in order when a middle block is cancelled (callout)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
            marks: [],
          },
        ],
      },
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
            ],
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.block',
              guard: ({event}) =>
                event.block._type === 'block' &&
                'children' in event.block &&
                Array.isArray(event.block.children) &&
                event.block.children.some((child) => child.text === 'y'),
              actions: [() => []],
            }),
          ]}
        />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  const generatedKey2 = keyGenerator()
  const generatedKey3 = keyGenerator()
  const generatedKey4 = keyGenerator()
  const generatedKey5 = keyGenerator()
  editor.send({
    type: 'insert.blocks',
    placement: 'after',
    at: {
      anchor: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
        ],
        offset: 0,
      },
    },
    blocks: [
      {
        _key: generatedKey0,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey1,
            _type: 'span',
            text: 'x',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey2,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey3,
            _type: 'span',
            text: 'y',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey4,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey5,
            _type: 'span',
            text: 'z',
            marks: [],
          },
        ],
      },
    ],
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    [
      'B: head',
      'CALLOUT:',
      '  B: foo',
      '  B: bar',
      '  B: x',
      '  B: z|',
      '  B: baz',
      'B: tail',
    ].join('\n'),
  )
})

test('Scenario: insert.blocks auto keeps later blocks in order when a middle block is cancelled (callout)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
            marks: [],
          },
        ],
      },
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
            ],
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.block',
              guard: ({event}) =>
                event.block._type === 'block' &&
                'children' in event.block &&
                Array.isArray(event.block.children) &&
                event.block.children.some((child) => child.text === 'y'),
              actions: [() => []],
            }),
          ]}
        />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  const generatedKey2 = keyGenerator()
  const generatedKey3 = keyGenerator()
  const generatedKey4 = keyGenerator()
  const generatedKey5 = keyGenerator()
  editor.send({
    type: 'insert.blocks',
    placement: 'auto',
    at: {
      anchor: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
        ],
        offset: 0,
      },
    },
    blocks: [
      {
        _key: generatedKey0,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey1,
            _type: 'span',
            text: 'x',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey2,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey3,
            _type: 'span',
            text: 'y',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey4,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey5,
            _type: 'span',
            text: 'z',
            marks: [],
          },
        ],
      },
    ],
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    [
      'B: head',
      'CALLOUT:',
      '  B: foo',
      '  B: x',
      '  B: zbar|',
      '  B: baz',
      'B: tail',
    ].join('\n'),
  )
})

test('Scenario: insert.blocks auto leaves no empty block when its first block is cancelled (callout)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
            marks: [],
          },
        ],
      },
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
            ],
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.block',
              guard: ({event}) =>
                event.block._type === 'block' &&
                'children' in event.block &&
                Array.isArray(event.block.children) &&
                event.block.children.some((child) => child.text === 'y'),
              actions: [() => []],
            }),
          ]}
        />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  const generatedKey2 = keyGenerator()
  const generatedKey3 = keyGenerator()
  const generatedKey4 = keyGenerator()
  const generatedKey5 = keyGenerator()
  editor.send({
    type: 'insert.blocks',
    placement: 'auto',
    at: {
      anchor: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k5',
          },
        ],
        offset: 0,
      },
    },
    blocks: [
      {
        _key: generatedKey0,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey1,
            _type: 'span',
            text: 'y',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey2,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey3,
            _type: 'span',
            text: 'x',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey4,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey5,
            _type: 'span',
            text: 'z',
            marks: [],
          },
        ],
      },
    ],
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    [
      'B: head',
      'CALLOUT:',
      '  B: foo',
      '  B: x',
      '  B: zbar|',
      '  B: baz',
      'B: tail',
    ].join('\n'),
  )
})

test('Scenario: insert.block before at a removed block inserts nothing (nested callout)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
            marks: [],
          },
        ],
      },
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
                ],
              },
            ],
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: 'k6',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'B: head',
        'CALLOUT:',
        '  CALLOUT:',
        '    B: foo',
        '    B: baz',
        'B: tail',
      ].join('\n'),
    )
  })
  editor.send({
    type: 'insert.block',
    placement: 'before',
    at: {
      anchor: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: 'k6',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: 'k6',
          },
        ],
        offset: 0,
      },
    },
    block: {
      _key: generatedKey0,
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [
        {
          _key: generatedKey1,
          _type: 'span',
          text: 'x',
          marks: [],
        },
      ],
    },
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    [
      'B: head',
      'CALLOUT:',
      '  CALLOUT:',
      '    B: foo',
      '    B: baz',
      'B: tail',
    ].join('\n'),
  )
})

test('Scenario: insert.block after at a removed block inserts nothing (nested callout)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
            marks: [],
          },
        ],
      },
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
                ],
              },
            ],
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: 'k6',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'B: head',
        'CALLOUT:',
        '  CALLOUT:',
        '    B: foo',
        '    B: baz',
        'B: tail',
      ].join('\n'),
    )
  })
  editor.send({
    type: 'insert.block',
    placement: 'after',
    at: {
      anchor: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: 'k6',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: 'k6',
          },
        ],
        offset: 0,
      },
    },
    block: {
      _key: generatedKey0,
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [
        {
          _key: generatedKey1,
          _type: 'span',
          text: 'x',
          marks: [],
        },
      ],
    },
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    [
      'B: head',
      'CALLOUT:',
      '  CALLOUT:',
      '    B: foo',
      '    B: baz',
      'B: tail',
    ].join('\n'),
  )
})

test('Scenario: insert.block auto at a removed block inserts nothing (nested callout)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
            marks: [],
          },
        ],
      },
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
                ],
              },
            ],
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: 'k6',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'B: head',
        'CALLOUT:',
        '  CALLOUT:',
        '    B: foo',
        '    B: baz',
        'B: tail',
      ].join('\n'),
    )
  })
  editor.send({
    type: 'insert.block',
    placement: 'auto',
    at: {
      anchor: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: 'k6',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: 'k6',
          },
        ],
        offset: 0,
      },
    },
    block: {
      _key: generatedKey0,
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [
        {
          _key: generatedKey1,
          _type: 'span',
          text: 'x',
          marks: [],
        },
      ],
    },
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    [
      'B: head',
      'CALLOUT:',
      '  CALLOUT:',
      '    B: foo',
      '    B: baz',
      'B: tail',
    ].join('\n'),
  )
})

test('Scenario: insert.blocks auto at a key never in the document inserts nothing (nested callout)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
            marks: [],
          },
        ],
      },
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
                ],
              },
            ],
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  const generatedKey2 = keyGenerator()
  editor.send({
    type: 'insert.blocks',
    placement: 'auto',
    at: {
      anchor: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: generatedKey0,
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: generatedKey0,
          },
        ],
        offset: 0,
      },
    },
    blocks: [
      {
        _key: generatedKey1,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey2,
            _type: 'span',
            text: 'x',
            marks: [],
          },
        ],
      },
    ],
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    [
      'B: head',
      'CALLOUT:',
      '  CALLOUT:',
      '    B: foo',
      '    B: bar',
      '    B: baz',
      'B: tail',
    ].join('\n'),
  )
})

test('Scenario: insert.blocks before keeps later blocks in order when a middle block is cancelled (nested callout)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
            marks: [],
          },
        ],
      },
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
                ],
              },
            ],
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.block',
              guard: ({event}) =>
                event.block._type === 'block' &&
                'children' in event.block &&
                Array.isArray(event.block.children) &&
                event.block.children.some((child) => child.text === 'y'),
              actions: [
                () => [
                  {
                    type: 'raise',
                    event: {
                      type: 'insert.block',
                      placement: 'before',
                      block: {
                        _type: 'block',
                        children: [{_type: 'span', text: 'baz'}],
                      },
                      at: {
                        anchor: {
                          path: [
                            {
                              _key: 'k2',
                            },
                            'content',
                            {
                              _key: 'k3',
                            },
                            'content',
                            {
                              _key: 'k6',
                            },
                          ],
                          offset: 0,
                        },
                        focus: {
                          path: [
                            {
                              _key: 'k2',
                            },
                            'content',
                            {
                              _key: 'k3',
                            },
                            'content',
                            {
                              _key: 'k6',
                            },
                          ],
                          offset: 0,
                        },
                      },
                    },
                  },
                ],
              ],
            }),
          ]}
        />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  const generatedKey2 = keyGenerator()
  const generatedKey3 = keyGenerator()
  const generatedKey4 = keyGenerator()
  const generatedKey5 = keyGenerator()
  editor.send({
    type: 'insert.blocks',
    placement: 'before',
    at: {
      anchor: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: 'k6',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: 'k6',
          },
        ],
        offset: 0,
      },
    },
    blocks: [
      {
        _key: generatedKey0,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey1,
            _type: 'span',
            text: 'x',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey2,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey3,
            _type: 'span',
            text: 'y',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey4,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey5,
            _type: 'span',
            text: 'z',
            marks: [],
          },
        ],
      },
    ],
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    [
      'B: head',
      'CALLOUT:',
      '  CALLOUT:',
      '    B: foo',
      '    B: x',
      '    B: z|',
      '    B: baz',
      '    B: bar',
      '    B: baz',
      'B: tail',
    ].join('\n'),
  )
})

test('Scenario: insert.blocks after keeps later blocks in order when a middle block is cancelled (nested callout)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
            marks: [],
          },
        ],
      },
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
                ],
              },
            ],
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.block',
              guard: ({event}) =>
                event.block._type === 'block' &&
                'children' in event.block &&
                Array.isArray(event.block.children) &&
                event.block.children.some((child) => child.text === 'y'),
              actions: [() => []],
            }),
          ]}
        />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  const generatedKey2 = keyGenerator()
  const generatedKey3 = keyGenerator()
  const generatedKey4 = keyGenerator()
  const generatedKey5 = keyGenerator()
  editor.send({
    type: 'insert.blocks',
    placement: 'after',
    at: {
      anchor: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: 'k6',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: 'k6',
          },
        ],
        offset: 0,
      },
    },
    blocks: [
      {
        _key: generatedKey0,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey1,
            _type: 'span',
            text: 'x',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey2,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey3,
            _type: 'span',
            text: 'y',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey4,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey5,
            _type: 'span',
            text: 'z',
            marks: [],
          },
        ],
      },
    ],
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    [
      'B: head',
      'CALLOUT:',
      '  CALLOUT:',
      '    B: foo',
      '    B: bar',
      '    B: x',
      '    B: z|',
      '    B: baz',
      'B: tail',
    ].join('\n'),
  )
})

test('Scenario: insert.blocks auto keeps later blocks in order when a middle block is cancelled (nested callout)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
            marks: [],
          },
        ],
      },
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
                ],
              },
            ],
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.block',
              guard: ({event}) =>
                event.block._type === 'block' &&
                'children' in event.block &&
                Array.isArray(event.block.children) &&
                event.block.children.some((child) => child.text === 'y'),
              actions: [() => []],
            }),
          ]}
        />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  const generatedKey2 = keyGenerator()
  const generatedKey3 = keyGenerator()
  const generatedKey4 = keyGenerator()
  const generatedKey5 = keyGenerator()
  editor.send({
    type: 'insert.blocks',
    placement: 'auto',
    at: {
      anchor: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: 'k6',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: 'k6',
          },
        ],
        offset: 0,
      },
    },
    blocks: [
      {
        _key: generatedKey0,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey1,
            _type: 'span',
            text: 'x',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey2,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey3,
            _type: 'span',
            text: 'y',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey4,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey5,
            _type: 'span',
            text: 'z',
            marks: [],
          },
        ],
      },
    ],
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    [
      'B: head',
      'CALLOUT:',
      '  CALLOUT:',
      '    B: foo',
      '    B: x',
      '    B: zbar|',
      '    B: baz',
      'B: tail',
    ].join('\n'),
  )
})

test('Scenario: insert.blocks auto leaves no empty block when its first block is cancelled (nested callout)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
            marks: [],
          },
        ],
      },
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
                ],
              },
            ],
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.block',
              guard: ({event}) =>
                event.block._type === 'block' &&
                'children' in event.block &&
                Array.isArray(event.block.children) &&
                event.block.children.some((child) => child.text === 'y'),
              actions: [() => []],
            }),
          ]}
        />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  const generatedKey2 = keyGenerator()
  const generatedKey3 = keyGenerator()
  const generatedKey4 = keyGenerator()
  const generatedKey5 = keyGenerator()
  editor.send({
    type: 'insert.blocks',
    placement: 'auto',
    at: {
      anchor: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: 'k6',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: 'k6',
          },
        ],
        offset: 0,
      },
    },
    blocks: [
      {
        _key: generatedKey0,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey1,
            _type: 'span',
            text: 'y',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey2,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey3,
            _type: 'span',
            text: 'x',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey4,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey5,
            _type: 'span',
            text: 'z',
            marks: [],
          },
        ],
      },
    ],
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    [
      'B: head',
      'CALLOUT:',
      '  CALLOUT:',
      '    B: foo',
      '    B: x',
      '    B: zbar|',
      '    B: baz',
      'B: tail',
    ].join('\n'),
  )
})

test('Scenario: insert.block after at a block in a removed container inserts nothing (nested callout)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
            marks: [],
          },
        ],
      },
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
                ],
              },
            ],
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k2',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['B: head', 'B: tail'].join('\n'),
    )
  })
  editor.send({
    type: 'insert.block',
    placement: 'after',
    at: {
      anchor: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: 'k6',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k2',
          },
          'content',
          {
            _key: 'k3',
          },
          'content',
          {
            _key: 'k6',
          },
        ],
        offset: 0,
      },
    },
    block: {
      _key: generatedKey0,
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [
        {
          _key: generatedKey1,
          _type: 'span',
          text: 'x',
          marks: [],
        },
      ],
    },
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    ['B: head', 'B: tail'].join('\n'),
  )
})

test('Scenario: insert.block before at a removed block inserts nothing (table cell)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
            marks: [],
          },
        ],
      },
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
                    ],
                  },
                ],
              },
            ],
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k2',
          },
          'rows',
          {
            _key: 'k3',
          },
          'cells',
          {
            _key: 'k4',
          },
          'content',
          {
            _key: 'k7',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'B: head',
        'TABLE:',
        '  ROW:',
        '    CELL:',
        '      B: foo',
        '      B: baz',
        'B: tail',
      ].join('\n'),
    )
  })
  editor.send({
    type: 'insert.block',
    placement: 'before',
    at: {
      anchor: {
        path: [
          {
            _key: 'k2',
          },
          'rows',
          {
            _key: 'k3',
          },
          'cells',
          {
            _key: 'k4',
          },
          'content',
          {
            _key: 'k7',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k2',
          },
          'rows',
          {
            _key: 'k3',
          },
          'cells',
          {
            _key: 'k4',
          },
          'content',
          {
            _key: 'k7',
          },
        ],
        offset: 0,
      },
    },
    block: {
      _key: generatedKey0,
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [
        {
          _key: generatedKey1,
          _type: 'span',
          text: 'x',
          marks: [],
        },
      ],
    },
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    [
      'B: head',
      'TABLE:',
      '  ROW:',
      '    CELL:',
      '      B: foo',
      '      B: baz',
      'B: tail',
    ].join('\n'),
  )
})

test('Scenario: insert.block after at a removed block inserts nothing (table cell)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
            marks: [],
          },
        ],
      },
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
                    ],
                  },
                ],
              },
            ],
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k2',
          },
          'rows',
          {
            _key: 'k3',
          },
          'cells',
          {
            _key: 'k4',
          },
          'content',
          {
            _key: 'k7',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'B: head',
        'TABLE:',
        '  ROW:',
        '    CELL:',
        '      B: foo',
        '      B: baz',
        'B: tail',
      ].join('\n'),
    )
  })
  editor.send({
    type: 'insert.block',
    placement: 'after',
    at: {
      anchor: {
        path: [
          {
            _key: 'k2',
          },
          'rows',
          {
            _key: 'k3',
          },
          'cells',
          {
            _key: 'k4',
          },
          'content',
          {
            _key: 'k7',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k2',
          },
          'rows',
          {
            _key: 'k3',
          },
          'cells',
          {
            _key: 'k4',
          },
          'content',
          {
            _key: 'k7',
          },
        ],
        offset: 0,
      },
    },
    block: {
      _key: generatedKey0,
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [
        {
          _key: generatedKey1,
          _type: 'span',
          text: 'x',
          marks: [],
        },
      ],
    },
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    [
      'B: head',
      'TABLE:',
      '  ROW:',
      '    CELL:',
      '      B: foo',
      '      B: baz',
      'B: tail',
    ].join('\n'),
  )
})

test('Scenario: insert.block auto at a removed block inserts nothing (table cell)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
            marks: [],
          },
        ],
      },
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
                    ],
                  },
                ],
              },
            ],
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k2',
          },
          'rows',
          {
            _key: 'k3',
          },
          'cells',
          {
            _key: 'k4',
          },
          'content',
          {
            _key: 'k7',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'B: head',
        'TABLE:',
        '  ROW:',
        '    CELL:',
        '      B: foo',
        '      B: baz',
        'B: tail',
      ].join('\n'),
    )
  })
  editor.send({
    type: 'insert.block',
    placement: 'auto',
    at: {
      anchor: {
        path: [
          {
            _key: 'k2',
          },
          'rows',
          {
            _key: 'k3',
          },
          'cells',
          {
            _key: 'k4',
          },
          'content',
          {
            _key: 'k7',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k2',
          },
          'rows',
          {
            _key: 'k3',
          },
          'cells',
          {
            _key: 'k4',
          },
          'content',
          {
            _key: 'k7',
          },
        ],
        offset: 0,
      },
    },
    block: {
      _key: generatedKey0,
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [
        {
          _key: generatedKey1,
          _type: 'span',
          text: 'x',
          marks: [],
        },
      ],
    },
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    [
      'B: head',
      'TABLE:',
      '  ROW:',
      '    CELL:',
      '      B: foo',
      '      B: baz',
      'B: tail',
    ].join('\n'),
  )
})

test('Scenario: insert.blocks auto at a key never in the document inserts nothing (table cell)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
            marks: [],
          },
        ],
      },
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
                    ],
                  },
                ],
              },
            ],
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  const generatedKey2 = keyGenerator()
  editor.send({
    type: 'insert.blocks',
    placement: 'auto',
    at: {
      anchor: {
        path: [
          {
            _key: 'k2',
          },
          'rows',
          {
            _key: 'k3',
          },
          'cells',
          {
            _key: 'k4',
          },
          'content',
          {
            _key: generatedKey0,
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k2',
          },
          'rows',
          {
            _key: 'k3',
          },
          'cells',
          {
            _key: 'k4',
          },
          'content',
          {
            _key: generatedKey0,
          },
        ],
        offset: 0,
      },
    },
    blocks: [
      {
        _key: generatedKey1,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey2,
            _type: 'span',
            text: 'x',
            marks: [],
          },
        ],
      },
    ],
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    [
      'B: head',
      'TABLE:',
      '  ROW:',
      '    CELL:',
      '      B: foo',
      '      B: bar',
      '      B: baz',
      'B: tail',
    ].join('\n'),
  )
})

test('Scenario: insert.blocks before keeps later blocks in order when a middle block is cancelled (table cell)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
            marks: [],
          },
        ],
      },
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
                    ],
                  },
                ],
              },
            ],
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.block',
              guard: ({event}) =>
                event.block._type === 'block' &&
                'children' in event.block &&
                Array.isArray(event.block.children) &&
                event.block.children.some((child) => child.text === 'y'),
              actions: [
                () => [
                  {
                    type: 'raise',
                    event: {
                      type: 'insert.block',
                      placement: 'before',
                      block: {
                        _type: 'block',
                        children: [{_type: 'span', text: 'baz'}],
                      },
                      at: {
                        anchor: {
                          path: [
                            {
                              _key: 'k2',
                            },
                            'rows',
                            {
                              _key: 'k3',
                            },
                            'cells',
                            {
                              _key: 'k4',
                            },
                            'content',
                            {
                              _key: 'k7',
                            },
                          ],
                          offset: 0,
                        },
                        focus: {
                          path: [
                            {
                              _key: 'k2',
                            },
                            'rows',
                            {
                              _key: 'k3',
                            },
                            'cells',
                            {
                              _key: 'k4',
                            },
                            'content',
                            {
                              _key: 'k7',
                            },
                          ],
                          offset: 0,
                        },
                      },
                    },
                  },
                ],
              ],
            }),
          ]}
        />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  const generatedKey2 = keyGenerator()
  const generatedKey3 = keyGenerator()
  const generatedKey4 = keyGenerator()
  const generatedKey5 = keyGenerator()
  editor.send({
    type: 'insert.blocks',
    placement: 'before',
    at: {
      anchor: {
        path: [
          {
            _key: 'k2',
          },
          'rows',
          {
            _key: 'k3',
          },
          'cells',
          {
            _key: 'k4',
          },
          'content',
          {
            _key: 'k7',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k2',
          },
          'rows',
          {
            _key: 'k3',
          },
          'cells',
          {
            _key: 'k4',
          },
          'content',
          {
            _key: 'k7',
          },
        ],
        offset: 0,
      },
    },
    blocks: [
      {
        _key: generatedKey0,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey1,
            _type: 'span',
            text: 'x',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey2,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey3,
            _type: 'span',
            text: 'y',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey4,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey5,
            _type: 'span',
            text: 'z',
            marks: [],
          },
        ],
      },
    ],
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    [
      'B: head',
      'TABLE:',
      '  ROW:',
      '    CELL:',
      '      B: foo',
      '      B: x',
      '      B: z|',
      '      B: baz',
      '      B: bar',
      '      B: baz',
      'B: tail',
    ].join('\n'),
  )
})

test('Scenario: insert.blocks after keeps later blocks in order when a middle block is cancelled (table cell)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
            marks: [],
          },
        ],
      },
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
                    ],
                  },
                ],
              },
            ],
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.block',
              guard: ({event}) =>
                event.block._type === 'block' &&
                'children' in event.block &&
                Array.isArray(event.block.children) &&
                event.block.children.some((child) => child.text === 'y'),
              actions: [() => []],
            }),
          ]}
        />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  const generatedKey2 = keyGenerator()
  const generatedKey3 = keyGenerator()
  const generatedKey4 = keyGenerator()
  const generatedKey5 = keyGenerator()
  editor.send({
    type: 'insert.blocks',
    placement: 'after',
    at: {
      anchor: {
        path: [
          {
            _key: 'k2',
          },
          'rows',
          {
            _key: 'k3',
          },
          'cells',
          {
            _key: 'k4',
          },
          'content',
          {
            _key: 'k7',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k2',
          },
          'rows',
          {
            _key: 'k3',
          },
          'cells',
          {
            _key: 'k4',
          },
          'content',
          {
            _key: 'k7',
          },
        ],
        offset: 0,
      },
    },
    blocks: [
      {
        _key: generatedKey0,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey1,
            _type: 'span',
            text: 'x',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey2,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey3,
            _type: 'span',
            text: 'y',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey4,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey5,
            _type: 'span',
            text: 'z',
            marks: [],
          },
        ],
      },
    ],
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    [
      'B: head',
      'TABLE:',
      '  ROW:',
      '    CELL:',
      '      B: foo',
      '      B: bar',
      '      B: x',
      '      B: z|',
      '      B: baz',
      'B: tail',
    ].join('\n'),
  )
})

test('Scenario: insert.blocks auto keeps later blocks in order when a middle block is cancelled (table cell)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
            marks: [],
          },
        ],
      },
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
                    ],
                  },
                ],
              },
            ],
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.block',
              guard: ({event}) =>
                event.block._type === 'block' &&
                'children' in event.block &&
                Array.isArray(event.block.children) &&
                event.block.children.some((child) => child.text === 'y'),
              actions: [() => []],
            }),
          ]}
        />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  const generatedKey2 = keyGenerator()
  const generatedKey3 = keyGenerator()
  const generatedKey4 = keyGenerator()
  const generatedKey5 = keyGenerator()
  editor.send({
    type: 'insert.blocks',
    placement: 'auto',
    at: {
      anchor: {
        path: [
          {
            _key: 'k2',
          },
          'rows',
          {
            _key: 'k3',
          },
          'cells',
          {
            _key: 'k4',
          },
          'content',
          {
            _key: 'k7',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k2',
          },
          'rows',
          {
            _key: 'k3',
          },
          'cells',
          {
            _key: 'k4',
          },
          'content',
          {
            _key: 'k7',
          },
        ],
        offset: 0,
      },
    },
    blocks: [
      {
        _key: generatedKey0,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey1,
            _type: 'span',
            text: 'x',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey2,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey3,
            _type: 'span',
            text: 'y',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey4,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey5,
            _type: 'span',
            text: 'z',
            marks: [],
          },
        ],
      },
    ],
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    [
      'B: head',
      'TABLE:',
      '  ROW:',
      '    CELL:',
      '      B: foo',
      '      B: x',
      '      B: zbar|',
      '      B: baz',
      'B: tail',
    ].join('\n'),
  )
})

test('Scenario: insert.blocks auto leaves no empty block when its first block is cancelled (table cell)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
            marks: [],
          },
        ],
      },
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
                    ],
                  },
                ],
              },
            ],
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.block',
              guard: ({event}) =>
                event.block._type === 'block' &&
                'children' in event.block &&
                Array.isArray(event.block.children) &&
                event.block.children.some((child) => child.text === 'y'),
              actions: [() => []],
            }),
          ]}
        />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  const generatedKey2 = keyGenerator()
  const generatedKey3 = keyGenerator()
  const generatedKey4 = keyGenerator()
  const generatedKey5 = keyGenerator()
  editor.send({
    type: 'insert.blocks',
    placement: 'auto',
    at: {
      anchor: {
        path: [
          {
            _key: 'k2',
          },
          'rows',
          {
            _key: 'k3',
          },
          'cells',
          {
            _key: 'k4',
          },
          'content',
          {
            _key: 'k7',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k2',
          },
          'rows',
          {
            _key: 'k3',
          },
          'cells',
          {
            _key: 'k4',
          },
          'content',
          {
            _key: 'k7',
          },
        ],
        offset: 0,
      },
    },
    blocks: [
      {
        _key: generatedKey0,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey1,
            _type: 'span',
            text: 'y',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey2,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey3,
            _type: 'span',
            text: 'x',
            marks: [],
          },
        ],
      },
      {
        _key: generatedKey4,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: generatedKey5,
            _type: 'span',
            text: 'z',
            marks: [],
          },
        ],
      },
    ],
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    [
      'B: head',
      'TABLE:',
      '  ROW:',
      '    CELL:',
      '      B: foo',
      '      B: x',
      '      B: zbar|',
      '      B: baz',
      'B: tail',
    ].join('\n'),
  )
})

test('Scenario: insert.block after at a block in a removed container inserts nothing (table cell)', async () => {
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
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'head',
            marks: [],
          },
        ],
      },
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
                    ],
                  },
                ],
              },
            ],
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
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    children: (
      <>
        <NodePlugin nodes={nodes} />
      </>
    ),
  })
  const generatedKey0 = keyGenerator()
  const generatedKey1 = keyGenerator()
  editor.send({
    type: 'patches',
    patches: [
      {
        type: 'unset',
        path: [
          {
            _key: 'k2',
          },
        ],
        origin: 'remote',
      },
    ],
    snapshot: undefined,
  })
  await vi.waitFor(() => {
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      ['B: head', 'B: tail'].join('\n'),
    )
  })
  editor.send({
    type: 'insert.block',
    placement: 'after',
    at: {
      anchor: {
        path: [
          {
            _key: 'k2',
          },
          'rows',
          {
            _key: 'k3',
          },
          'cells',
          {
            _key: 'k4',
          },
          'content',
          {
            _key: 'k7',
          },
        ],
        offset: 0,
      },
      focus: {
        path: [
          {
            _key: 'k2',
          },
          'rows',
          {
            _key: 'k3',
          },
          'cells',
          {
            _key: 'k4',
          },
          'content',
          {
            _key: 'k7',
          },
        ],
        offset: 0,
      },
    },
    block: {
      _key: generatedKey0,
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [
        {
          _key: generatedKey1,
          _type: 'span',
          text: 'x',
          marks: [],
        },
      ],
    },
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    ['B: head', 'B: tail'].join('\n'),
  )
})

test('Scenario: held fallback: select at an out-of-range numeric child lands on the block start', async () => {
  const keyGenerator = createTestKeyGenerator()
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        markDefs: [{_key: keyGenerator(), _type: 'link', href: 'x'}],
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'foo', marks: ['k1']},
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
        ],
      },
    ],
    children: <NodePlugin nodes={nodes} />,
  })
  const point = {path: [{_key: 'k0'}, 'children', 9], offset: 0}
  editor.send({type: 'select', at: {anchor: point, focus: point}})
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k2'}], offset: 0},
    focus: {path: [{_key: 'k0'}, 'children', {_key: 'k2'}], offset: 0},
    backward: false,
  })
})

test('Scenario: held fallback: insert.block after an out-of-range numeric child lands after that block', async () => {
  const keyGenerator = createTestKeyGenerator()
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue: [
      {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        markDefs: [{_key: keyGenerator(), _type: 'link', href: 'x'}],
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'foo', marks: ['k1']},
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
        ],
      },
    ],
    children: <NodePlugin nodes={nodes} />,
  })
  const point = {path: [{_key: 'k0'}, 'children', 9], offset: 0}
  editor.send({
    type: 'insert.block',
    block: {_type: 'block', children: [{_type: 'span', text: 'foo'}]},
    placement: 'after',
    at: {anchor: point, focus: point},
  })
  expect(toTextspec(editor.getSnapshot().context)).toEqual(
    ['B: [@link href="x":foo]bar', 'B: |foo', 'B: baz'].join('\n'),
  )
})

test('Scenario: held fallback: select at a child path into an image lands on the image', async () => {
  const keyGenerator = createTestKeyGenerator()
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition: defineSchema({blockObjects: [{name: 'image'}]}),
    initialValue: [
      {_key: keyGenerator(), _type: 'image'},
      {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'baz', marks: []},
        ],
      },
    ],
    children: <NodePlugin nodes={nodes} />,
  })
  const point = {path: [{_key: 'k0'}, 'children', {_key: 'zz'}], offset: 0}
  editor.send({type: 'select', at: {anchor: point, focus: point}})
  expect(editor.getSnapshot().context.selection).toEqual({
    anchor: {path: [{_key: 'k0'}], offset: 0},
    focus: {path: [{_key: 'k0'}], offset: 0},
    backward: false,
  })
})

describe.each([
  {
    layout: 'root',
    initialValue: [
      {
        _key: 'head',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: 'head-span',
            _type: 'span',
            text: 'head',
            marks: [],
          },
        ],
      },
      {
        _key: 'foo',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: 'foo-span',
            _type: 'span',
            text: 'foo',
            marks: [],
          },
        ],
      },
      {
        _key: 'bar',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: 'bar-span',
            _type: 'span',
            text: 'bar',
            marks: [],
          },
        ],
      },
      {
        _key: 'baz',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: 'baz-span',
            _type: 'span',
            text: 'baz',
            marks: [],
          },
        ],
      },
      {
        _key: 'tail',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: 'tail-span',
            _type: 'span',
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    barPath: [{_key: 'bar'}],
    gonePoint: {
      path: [{_key: 'bar'}, 'children', {_key: 'bar-span'}],
      offset: 0,
    },
    neverPoint: {
      path: [{_key: 'never'}, 'children', {_key: 'never-span'}],
      offset: 0,
    },
    linkPoint: {
      path: [{_key: 'bar'}, 'markDefs', {_key: 'link'}],
      offset: 0,
    },
    bazPoint: {
      path: [{_key: 'baz'}, 'children', {_key: 'baz-span'}],
      offset: 1,
    },
    fallbackPoint: {
      path: [{_key: 'foo'}, 'children', {_key: 'foo-span'}],
      offset: 0,
    },
    expectedText: {
      range: 'B: head\nB: foo\nB: baz\nB: t|il',
      removed: 'B: head\nB: foo\nB: baz\nB: taX|il',
      never: 'B: head\nB: foo\nB: bar\nB: baz\nB: taX|il',
      link: 'B: head\nB: foo\nB: X|bar\nB: baz\nB: tail',
    },
  },
  {
    layout: 'callout',
    initialValue: [
      {
        _key: 'head',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: 'head-span',
            _type: 'span',
            text: 'head',
            marks: [],
          },
        ],
      },
      {
        _key: 'callout',
        _type: 'callout',
        content: [
          {
            _key: 'foo',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _key: 'foo-span',
                _type: 'span',
                text: 'foo',
                marks: [],
              },
            ],
          },
          {
            _key: 'bar',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _key: 'bar-span',
                _type: 'span',
                text: 'bar',
                marks: [],
              },
            ],
          },
          {
            _key: 'baz',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _key: 'baz-span',
                _type: 'span',
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
      {
        _key: 'tail',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: 'tail-span',
            _type: 'span',
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    barPath: [{_key: 'callout'}, 'content', {_key: 'bar'}],
    gonePoint: {
      path: [
        {_key: 'callout'},
        'content',
        {_key: 'bar'},
        'children',
        {_key: 'bar-span'},
      ],
      offset: 0,
    },
    neverPoint: {
      path: [
        {_key: 'callout'},
        'content',
        {_key: 'never'},
        'children',
        {_key: 'never-span'},
      ],
      offset: 0,
    },
    linkPoint: {
      path: [
        {_key: 'callout'},
        'content',
        {_key: 'bar'},
        'markDefs',
        {_key: 'link'},
      ],
      offset: 0,
    },
    bazPoint: {
      path: [
        {_key: 'callout'},
        'content',
        {_key: 'baz'},
        'children',
        {_key: 'baz-span'},
      ],
      offset: 1,
    },
    fallbackPoint: {
      path: [
        {_key: 'callout'},
        'content',
        {_key: 'foo'},
        'children',
        {_key: 'foo-span'},
      ],
      offset: 0,
    },
    expectedText: {
      range: 'B: head\nCALLOUT:\n  B: |az\nB: tail',
      removed: 'B: head\nCALLOUT:\n  B: X|foo\n  B: baz\nB: tail',
      never: 'B: head\nCALLOUT:\n  B: X|foo\n  B: bar\n  B: baz\nB: tail',
      link: 'B: head\nCALLOUT:\n  B: X|foo\n  B: bar\n  B: baz\nB: tail',
    },
  },
  {
    layout: 'table cell',
    initialValue: [
      {
        _key: 'head',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: 'head-span',
            _type: 'span',
            text: 'head',
            marks: [],
          },
        ],
      },
      {
        _key: 'table',
        _type: 'table',
        rows: [
          {
            _key: 'row',
            _type: 'row',
            cells: [
              {
                _key: 'cell',
                _type: 'cell',
                content: [
                  {
                    _key: 'foo',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _key: 'foo-span',
                        _type: 'span',
                        text: 'foo',
                        marks: [],
                      },
                    ],
                  },
                  {
                    _key: 'bar',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _key: 'bar-span',
                        _type: 'span',
                        text: 'bar',
                        marks: [],
                      },
                    ],
                  },
                  {
                    _key: 'baz',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _key: 'baz-span',
                        _type: 'span',
                        text: 'baz',
                        marks: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        _key: 'tail',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: 'tail-span',
            _type: 'span',
            text: 'tail',
            marks: [],
          },
        ],
      },
    ],
    barPath: [
      {_key: 'table'},
      'rows',
      {_key: 'row'},
      'cells',
      {_key: 'cell'},
      'content',
      {_key: 'bar'},
    ],
    gonePoint: {
      path: [
        {_key: 'table'},
        'rows',
        {_key: 'row'},
        'cells',
        {_key: 'cell'},
        'content',
        {_key: 'bar'},
        'children',
        {_key: 'bar-span'},
      ],
      offset: 0,
    },
    neverPoint: {
      path: [
        {_key: 'table'},
        'rows',
        {_key: 'row'},
        'cells',
        {_key: 'cell'},
        'content',
        {_key: 'never'},
        'children',
        {_key: 'never-span'},
      ],
      offset: 0,
    },
    linkPoint: {
      path: [
        {_key: 'table'},
        'rows',
        {_key: 'row'},
        'cells',
        {_key: 'cell'},
        'content',
        {_key: 'bar'},
        'markDefs',
        {_key: 'link'},
      ],
      offset: 0,
    },
    bazPoint: {
      path: [
        {_key: 'table'},
        'rows',
        {_key: 'row'},
        'cells',
        {_key: 'cell'},
        'content',
        {_key: 'baz'},
        'children',
        {_key: 'baz-span'},
      ],
      offset: 1,
    },
    fallbackPoint: {
      path: [
        {_key: 'table'},
        'rows',
        {_key: 'row'},
        'cells',
        {_key: 'cell'},
        'content',
        {_key: 'foo'},
        'children',
        {_key: 'foo-span'},
      ],
      offset: 0,
    },
    expectedText: {
      range: 'B: head\nTABLE:\n  ROW:\n    CELL:\n      B: |az\nB: tail',
      removed:
        'B: head\nTABLE:\n  ROW:\n    CELL:\n      B: X|foo\n      B: baz\nB: tail',
      never:
        'B: head\nTABLE:\n  ROW:\n    CELL:\n      B: X|foo\n      B: bar\n      B: baz\nB: tail',
      link: 'B: head\nTABLE:\n  ROW:\n    CELL:\n      B: X|foo\n      B: bar\n      B: baz\nB: tail',
    },
  },
])('main compatibility ($layout)', (row) => {
  test.each([
    {kind: 'range'},
    {kind: 'removed'},
    {kind: 'never'},
    {kind: 'link'},
  ] as const)(
    'Scenario: main compatibility selection prop $kind',
    async ({kind}) => {
      const options = {
        keyGenerator: createTestKeyGenerator(),
        schemaDefinition,
        initialValue: row.initialValue,
        children: <NodePlugin nodes={nodes} />,
      }
      const {editor, rerender, locator} = await createTestEditor(options)
      const previous = {
        path: [{_key: 'tail'}, 'children', {_key: 'tail-span'}],
        offset: 2,
      }
      editor.send({type: 'select', at: {anchor: previous, focus: previous}})
      editor.send({type: 'focus'})
      if (kind === 'range' || kind === 'removed') {
        editor.send({
          type: 'patches',
          patches: [{type: 'unset', path: row.barPath, origin: 'remote'}],
          snapshot: undefined,
        })
      }
      const target =
        kind === 'never'
          ? row.neverPoint
          : kind === 'link'
            ? row.linkPoint
            : row.gonePoint
      await rerender({
        ...options,
        editableProps: {
          selection: {
            anchor: target,
            focus: kind === 'range' ? row.bazPoint : target,
            backward: false,
          },
        },
      })
      const fallback =
        row.layout === 'root'
          ? kind === 'link'
            ? row.gonePoint
            : previous
          : row.fallbackPoint
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: fallback,
        focus:
          kind === 'range' && row.layout !== 'root' ? row.bazPoint : fallback,
        backward: false,
      })
      editor.send({type: 'focus'})
      await vi.waitFor(() => {
        expect(document.activeElement === locator.element()).toEqual(true)
        expect(window.getSelection()?.anchorNode?.textContent).toEqual(
          row.layout === 'root' ? (kind === 'link' ? 'bar' : 'tail') : 'foo',
        )
        expect(window.getSelection()?.anchorOffset).toEqual(fallback.offset)
      })
      await userEvent.keyboard(kind === 'range' ? '{Backspace}' : 'X')
      await vi.waitFor(() => {
        expect(toTextspec(editor.getSnapshot().context)).toEqual(
          row.expectedText[kind],
        )
      })
    },
  )
})

test.each([
  {
    name: 'root',
    initialValue: [
      {
        _key: 'foo',
        _type: 'block',
        style: 'normal',
        markDefs: [
          {
            _key: 'link',
            _type: 'link',
            href: 'x',
          },
        ],
        children: [
          {
            _key: 'foo-span',
            _type: 'span',
            text: 'foo',
            marks: ['link'],
          },
        ],
      },
      {
        _key: 'baz',
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _key: 'baz-span',
            _type: 'span',
            text: 'baz',
            marks: [],
          },
        ],
      },
    ],
    point: {
      path: [{_key: 'foo'}, 'markDefs', {_key: 'link'}],
      offset: 0,
    },
    expectedText: 'B: [@link href="x":foo]\nB: baz',
  },
  {
    name: 'callout',
    initialValue: [
      {
        _key: 'callout',
        _type: 'callout',
        content: [
          {
            _key: 'foo',
            _type: 'block',
            style: 'normal',
            markDefs: [
              {
                _key: 'link',
                _type: 'link',
                href: 'x',
              },
            ],
            children: [
              {
                _key: 'foo-span',
                _type: 'span',
                text: 'foo',
                marks: ['link'],
              },
            ],
          },
          {
            _key: 'baz',
            _type: 'block',
            style: 'normal',
            markDefs: [],
            children: [
              {
                _key: 'baz-span',
                _type: 'span',
                text: 'baz',
                marks: [],
              },
            ],
          },
        ],
      },
    ],
    point: {
      path: [
        {_key: 'callout'},
        'content',
        {_key: 'foo'},
        'markDefs',
        {_key: 'link'},
      ],
      offset: 0,
    },
    expectedText: 'CALLOUT:\n  B: [@link href="x":foo]\n  B: baz',
  },
  {
    name: 'nested callout',
    initialValue: [
      {
        _key: 'outer',
        _type: 'callout',
        content: [
          {
            _key: 'callout',
            _type: 'callout',
            content: [
              {
                _key: 'foo',
                _type: 'block',
                style: 'normal',
                markDefs: [
                  {
                    _key: 'link',
                    _type: 'link',
                    href: 'x',
                  },
                ],
                children: [
                  {
                    _key: 'foo-span',
                    _type: 'span',
                    text: 'foo',
                    marks: ['link'],
                  },
                ],
              },
              {
                _key: 'baz',
                _type: 'block',
                style: 'normal',
                markDefs: [],
                children: [
                  {
                    _key: 'baz-span',
                    _type: 'span',
                    text: 'baz',
                    marks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    point: {
      path: [
        {_key: 'outer'},
        'content',
        {_key: 'callout'},
        'content',
        {_key: 'foo'},
        'markDefs',
        {_key: 'link'},
      ],
      offset: 0,
    },
    expectedText:
      'CALLOUT:\n  CALLOUT:\n    B: [@link href="x":foo]\n    B: baz',
  },
  {
    name: 'table cell',
    initialValue: [
      {
        _key: 'table',
        _type: 'table',
        rows: [
          {
            _key: 'row',
            _type: 'row',
            cells: [
              {
                _key: 'cell',
                _type: 'cell',
                content: [
                  {
                    _key: 'foo',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [
                      {
                        _key: 'link',
                        _type: 'link',
                        href: 'x',
                      },
                    ],
                    children: [
                      {
                        _key: 'foo-span',
                        _type: 'span',
                        text: 'foo',
                        marks: ['link'],
                      },
                    ],
                  },
                  {
                    _key: 'baz',
                    _type: 'block',
                    style: 'normal',
                    markDefs: [],
                    children: [
                      {
                        _key: 'baz-span',
                        _type: 'span',
                        text: 'baz',
                        marks: [],
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
    point: {
      path: [
        {_key: 'table'},
        'rows',
        {_key: 'row'},
        'cells',
        {_key: 'cell'},
        'content',
        {_key: 'foo'},
        'markDefs',
        {_key: 'link'},
      ],
      offset: 0,
    },
    expectedText:
      'TABLE:\n  ROW:\n    CELL:\n      B: [@link href="x":foo]\n      B: baz',
  },
])('Scenario: link definition paths select nothing ($name)', async (row) => {
  const {editor} = await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition,
    initialValue: row.initialValue,
    children: <NodePlugin nodes={nodes} />,
  })
  for (const linkKey of ['link', 'gone']) {
    const point = {
      ...row.point,
      path: [...row.point.path.slice(0, -1), {_key: linkKey}],
    }
    const at = {anchor: point, focus: point}
    editor.send({type: 'select', at})
    expect(editor.getSnapshot().context.selection).toEqual(null)
    editor.send({type: 'delete', at})
    expect(toTextspec(editor.getSnapshot().context)).toEqual(row.expectedText)
    editor.send({
      type: 'insert.block',
      block: {_type: 'block', children: [{_type: 'span', text: 'bar'}]},
      placement: 'after',
      at,
    })
    expect(toTextspec(editor.getSnapshot().context)).toEqual(row.expectedText)

    editor.send({
      type: 'insert.blocks',
      blocks: [{_type: 'block', children: [{_type: 'span', text: 'bar'}]}],
      placement: 'after',
      at,
    })
    expect(toTextspec(editor.getSnapshot().context)).toEqual(row.expectedText)
    editor.send({
      type: 'annotation.add',
      annotation: {name: 'link', value: {href: 'x'}},
      at,
    })
    expect(toTextspec(editor.getSnapshot().context)).toEqual(row.expectedText)
    editor.send({type: 'decorator.add', decorator: 'strong', at})
    expect(toTextspec(editor.getSnapshot().context)).toEqual(row.expectedText)
    editor.send({type: 'annotation.remove', annotation: {name: 'link'}, at})
    expect(toTextspec(editor.getSnapshot().context)).toEqual(row.expectedText)
  }
})
