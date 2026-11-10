import type {Patch} from '@portabletext/patches'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, onTestFinished, test, vi} from 'vitest'
import {defineBehavior, raise} from '../src/behaviors'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
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
          of: [{type: 'block'}, {type: 'callout'}],
        },
      ],
    },
    {
      name: 'note',
      fields: [
        {
          name: 'body',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [{name: 'normal'}],
              decorators: [{name: 'em'}],
            },
          ],
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
  styles: [{name: 'normal'}, {name: 'h1'}],
})

const containers = [
  defineContainer({
    type: 'callout',
    arrayField: 'content',
    render: ({children}) => <>{children}</>,
  }),
  defineContainer({
    type: 'note',
    arrayField: 'body',
    render: ({children}) => <>{children}</>,
  }),
  defineContainer({
    type: 'table',
    arrayField: 'rows',
    render: ({children}) => <>{children}</>,
  }),
  defineContainer({
    type: 'row',
    arrayField: 'cells',
    render: ({children}) => <>{children}</>,
  }),
  defineContainer({
    type: 'cell',
    arrayField: 'content',
    render: ({children}) => <>{children}</>,
  }),
]

describe('event.set non-object', () => {
  test('Scenario: set a block to `null` in root removes it', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: fooBlockKey,
        children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: barBlockKey,
        children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: bazBlockKey,
        children: [{_type: 'span', _key: bazSpanKey, text: 'baz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]
    const {editor, patches} = await createEditor(keyGenerator, initialValue)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
          offset: 1,
        },
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({type: 'set', at: [{_key: barBlockKey}], value: null})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: fooBlockKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: bazBlockKey,
          children: [{_type: 'span', _key: bazSpanKey, text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {type: 'unset', path: [{_key: barBlockKey}], origin: 'local'},
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: bazBlockKey}, 'children', {_key: bazSpanKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: bazBlockKey}, 'children', {_key: bazSpanKey}],
          offset: 0,
        },
        backward: false,
      })
    })
  })

  test('Scenario: set a block to `null` in callout removes it', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'callout',
        _key: calloutKey,
        content: [
          {
            _type: 'block',
            _key: fooBlockKey,
            children: [
              {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: barBlockKey,
            children: [
              {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: bazBlockKey,
            children: [
              {_type: 'span', _key: bazSpanKey, text: 'baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ]
    const {editor, patches} = await createEditor(keyGenerator, initialValue)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: barBlockKey},
            'children',
            {_key: barSpanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: barBlockKey},
            'children',
            {_key: barSpanKey},
          ],
          offset: 1,
        },
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'set',
      at: [{_key: calloutKey}, 'content', {_key: barBlockKey}],
      value: null,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: fooBlockKey,
              children: [
                {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: bazBlockKey,
              children: [
                {_type: 'span', _key: bazSpanKey, text: 'baz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
      expect(patches).toEqual([
        {
          type: 'unset',
          path: [{_key: calloutKey}, 'content', {_key: barBlockKey}],
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: bazBlockKey},
            'children',
            {_key: bazSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: bazBlockKey},
            'children',
            {_key: bazSpanKey},
          ],
          offset: 0,
        },
        backward: false,
      })
    })
  })

  test('Scenario: set a block to `null` in callout in callout removes it', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const innerCalloutKey = keyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'callout',
        _key: calloutKey,
        content: [
          {
            _type: 'callout',
            _key: innerCalloutKey,
            content: [
              {
                _type: 'block',
                _key: fooBlockKey,
                children: [
                  {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
              {
                _type: 'block',
                _key: barBlockKey,
                children: [
                  {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
              {
                _type: 'block',
                _key: bazBlockKey,
                children: [
                  {_type: 'span', _key: bazSpanKey, text: 'baz', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    ]
    const {editor, patches} = await createEditor(keyGenerator, initialValue)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerCalloutKey},
            'content',
            {_key: barBlockKey},
            'children',
            {_key: barSpanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerCalloutKey},
            'content',
            {_key: barBlockKey},
            'children',
            {_key: barSpanKey},
          ],
          offset: 1,
        },
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'set',
      at: [
        {_key: calloutKey},
        'content',
        {_key: innerCalloutKey},
        'content',
        {_key: barBlockKey},
      ],
      value: null,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'callout',
              _key: innerCalloutKey,
              content: [
                {
                  _type: 'block',
                  _key: fooBlockKey,
                  children: [
                    {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: bazBlockKey,
                  children: [
                    {_type: 'span', _key: bazSpanKey, text: 'baz', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ])
      expect(patches).toEqual([
        {
          type: 'unset',
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerCalloutKey},
            'content',
            {_key: barBlockKey},
          ],
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerCalloutKey},
            'content',
            {_key: bazBlockKey},
            'children',
            {_key: bazSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerCalloutKey},
            'content',
            {_key: bazBlockKey},
            'children',
            {_key: bazSpanKey},
          ],
          offset: 0,
        },
        backward: false,
      })
    })
  })

  test('Scenario: set a block to `null` in note body removes it', async () => {
    const keyGenerator = createTestKeyGenerator()
    const noteKey = keyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'note',
        _key: noteKey,
        body: [
          {
            _type: 'block',
            _key: fooBlockKey,
            children: [
              {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: barBlockKey,
            children: [
              {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: bazBlockKey,
            children: [
              {_type: 'span', _key: bazSpanKey, text: 'baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ]
    const {editor, patches} = await createEditor(keyGenerator, initialValue)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: noteKey},
            'body',
            {_key: barBlockKey},
            'children',
            {_key: barSpanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: noteKey},
            'body',
            {_key: barBlockKey},
            'children',
            {_key: barSpanKey},
          ],
          offset: 1,
        },
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'set',
      at: [{_key: noteKey}, 'body', {_key: barBlockKey}],
      value: null,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'note',
          _key: noteKey,
          body: [
            {
              _type: 'block',
              _key: fooBlockKey,
              children: [
                {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: bazBlockKey,
              children: [
                {_type: 'span', _key: bazSpanKey, text: 'baz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
      expect(patches).toEqual([
        {
          type: 'unset',
          path: [{_key: noteKey}, 'body', {_key: barBlockKey}],
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: noteKey},
            'body',
            {_key: bazBlockKey},
            'children',
            {_key: bazSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: noteKey},
            'body',
            {_key: bazBlockKey},
            'children',
            {_key: bazSpanKey},
          ],
          offset: 0,
        },
        backward: false,
      })
    })
  })

  test('Scenario: set a block to `null` in table cell removes it', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'table',
        _key: tableKey,
        rows: [
          {
            _type: 'row',
            _key: rowKey,
            cells: [
              {
                _type: 'cell',
                _key: cellKey,
                content: [
                  {
                    _type: 'block',
                    _key: fooBlockKey,
                    children: [
                      {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                  {
                    _type: 'block',
                    _key: barBlockKey,
                    children: [
                      {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                  {
                    _type: 'block',
                    _key: bazBlockKey,
                    children: [
                      {_type: 'span', _key: bazSpanKey, text: 'baz', marks: []},
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
    ]
    const {editor, patches} = await createEditor(keyGenerator, initialValue)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: barBlockKey},
            'children',
            {_key: barSpanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: barBlockKey},
            'children',
            {_key: barSpanKey},
          ],
          offset: 1,
        },
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'set',
      at: [
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: barBlockKey},
      ],
      value: null,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: fooBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: fooSpanKey,
                          text: 'foo',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                    {
                      _type: 'block',
                      _key: bazBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: bazSpanKey,
                          text: 'baz',
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
      ])
      expect(patches).toEqual([
        {
          type: 'unset',
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: barBlockKey},
          ],
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: bazBlockKey},
            'children',
            {_key: bazSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: bazBlockKey},
            'children',
            {_key: bazSpanKey},
          ],
          offset: 0,
        },
        backward: false,
      })
    })
  })

  test('Scenario: set a block to a string at the root removes it', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: fooBlockKey,
        children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: barBlockKey,
        children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: bazBlockKey,
        children: [{_type: 'span', _key: bazSpanKey, text: 'baz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]
    const {editor, patches} = await createEditor(keyGenerator, initialValue)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
          offset: 1,
        },
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({type: 'set', at: [{_key: barBlockKey}], value: 'x'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: fooBlockKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: bazBlockKey,
          children: [{_type: 'span', _key: bazSpanKey, text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {type: 'unset', path: [{_key: barBlockKey}], origin: 'local'},
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: bazBlockKey}, 'children', {_key: bazSpanKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: bazBlockKey}, 'children', {_key: bazSpanKey}],
          offset: 0,
        },
        backward: false,
      })
    })
  })

  test('Scenario: set the last block to `null` in root moves the caret to the end of the previous block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: fooBlockKey,
        children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: barBlockKey,
        children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: bazBlockKey,
        children: [{_type: 'span', _key: bazSpanKey, text: 'baz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]
    const {editor, patches} = await createEditor(keyGenerator, initialValue)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: bazBlockKey}, 'children', {_key: bazSpanKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: bazBlockKey}, 'children', {_key: bazSpanKey}],
          offset: 1,
        },
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({type: 'set', at: [{_key: bazBlockKey}], value: null})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: fooBlockKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: barBlockKey,
          children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {type: 'unset', path: [{_key: bazBlockKey}], origin: 'local'},
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
          offset: 3,
        },
        backward: false,
      })
    })
  })

  test('Scenario: set the last block to `null` in callout moves the caret to the end of the previous block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'callout',
        _key: calloutKey,
        content: [
          {
            _type: 'block',
            _key: fooBlockKey,
            children: [
              {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: barBlockKey,
            children: [
              {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: bazBlockKey,
            children: [
              {_type: 'span', _key: bazSpanKey, text: 'baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ]
    const {editor, patches} = await createEditor(keyGenerator, initialValue)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: bazBlockKey},
            'children',
            {_key: bazSpanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: bazBlockKey},
            'children',
            {_key: bazSpanKey},
          ],
          offset: 1,
        },
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'set',
      at: [{_key: calloutKey}, 'content', {_key: bazBlockKey}],
      value: null,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: fooBlockKey,
              children: [
                {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: barBlockKey,
              children: [
                {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
      expect(patches).toEqual([
        {
          type: 'unset',
          path: [{_key: calloutKey}, 'content', {_key: bazBlockKey}],
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: barBlockKey},
            'children',
            {_key: barSpanKey},
          ],
          offset: 3,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: barBlockKey},
            'children',
            {_key: barSpanKey},
          ],
          offset: 3,
        },
        backward: false,
      })
    })
  })

  test('Scenario: set the only span of a block to `null` in root removes it and normalization re-creates an empty one', async () => {
    const keyGenerator = createTestKeyGenerator()
    const oneBlockKey = keyGenerator()
    const oneSpanKey = keyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const twoBlockKey = keyGenerator()
    const twoSpanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: oneBlockKey,
        children: [{_type: 'span', _key: oneSpanKey, text: 'one', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: fooBlockKey,
        children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: twoBlockKey,
        children: [{_type: 'span', _key: twoSpanKey, text: 'two', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]
    const {editor, patches} = await createEditor(keyGenerator, initialValue)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
          offset: 1,
        },
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'set',
      at: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
      value: null,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: oneBlockKey,
          children: [{_type: 'span', _key: oneSpanKey, text: 'one', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: fooBlockKey,
          children: [{_type: 'span', _key: 'k8', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: twoBlockKey,
          children: [{_type: 'span', _key: twoSpanKey, text: 'two', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          type: 'unset',
          path: [{_key: fooBlockKey}, 'children', {_key: fooSpanKey}],
          origin: 'local',
        },
        {
          type: 'setIfMissing',
          path: [{_key: fooBlockKey}, 'children'],
          value: [],
          origin: 'local',
        },
        {
          type: 'insert',
          path: [{_key: fooBlockKey}, 'children', 0],
          position: 'before',
          items: [{_type: 'span', _key: 'k8', text: '', marks: []}],
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: twoBlockKey}, 'children', {_key: twoSpanKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: twoBlockKey}, 'children', {_key: twoSpanKey}],
          offset: 0,
        },
        backward: false,
      })
    })
  })

  test('Scenario: set the only span of a block to `null` in table cell removes it and normalization re-creates an empty one', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const oneBlockKey = keyGenerator()
    const oneSpanKey = keyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const twoBlockKey = keyGenerator()
    const twoSpanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'table',
        _key: tableKey,
        rows: [
          {
            _type: 'row',
            _key: rowKey,
            cells: [
              {
                _type: 'cell',
                _key: cellKey,
                content: [
                  {
                    _type: 'block',
                    _key: oneBlockKey,
                    children: [
                      {_type: 'span', _key: oneSpanKey, text: 'one', marks: []},
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                  {
                    _type: 'block',
                    _key: fooBlockKey,
                    children: [
                      {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                  {
                    _type: 'block',
                    _key: twoBlockKey,
                    children: [
                      {_type: 'span', _key: twoSpanKey, text: 'two', marks: []},
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
    ]
    const {editor, patches} = await createEditor(keyGenerator, initialValue)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: fooBlockKey},
            'children',
            {_key: fooSpanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: fooBlockKey},
            'children',
            {_key: fooSpanKey},
          ],
          offset: 1,
        },
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'set',
      at: [
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: fooBlockKey},
        'children',
        {_key: fooSpanKey},
      ],
      value: null,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: oneBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: oneSpanKey,
                          text: 'one',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                    {
                      _type: 'block',
                      _key: fooBlockKey,
                      children: [
                        {_type: 'span', _key: 'k11', text: '', marks: []},
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                    {
                      _type: 'block',
                      _key: twoBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: twoSpanKey,
                          text: 'two',
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
      ])
      expect(patches).toEqual([
        {
          type: 'unset',
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: fooBlockKey},
            'children',
            {_key: fooSpanKey},
          ],
          origin: 'local',
        },
        {
          type: 'setIfMissing',
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: fooBlockKey},
            'children',
          ],
          value: [],
          origin: 'local',
        },
        {
          type: 'insert',
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: fooBlockKey},
            'children',
            0,
          ],
          position: 'before',
          items: [{_type: 'span', _key: 'k11', text: '', marks: []}],
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: twoBlockKey},
            'children',
            {_key: twoSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: twoBlockKey},
            'children',
            {_key: twoSpanKey},
          ],
          offset: 0,
        },
        backward: false,
      })
    })
  })

  test('Scenario: a Behavior that raises a block `set` to `null` removes the block in root', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: fooBlockKey,
        children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: barBlockKey,
        children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: bazBlockKey,
        children: [{_type: 'span', _key: bazSpanKey, text: 'baz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]
    const {editor, patches} = await createEditor(keyGenerator, initialValue, [
      defineBehavior({
        on: 'insert.text',
        guard: ({event}) => event.text === '!',
        actions: [
          () => [raise({type: 'set', at: [{_key: barBlockKey}], value: null})],
        ],
      }),
    ])
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
          offset: 1,
        },
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({type: 'insert.text', text: '!'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: fooBlockKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: bazBlockKey,
          children: [{_type: 'span', _key: bazSpanKey, text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {type: 'unset', path: [{_key: barBlockKey}], origin: 'local'},
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: bazBlockKey}, 'children', {_key: bazSpanKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: bazBlockKey}, 'children', {_key: bazSpanKey}],
          offset: 0,
        },
        backward: false,
      })
    })
  })

  test('Scenario: a Behavior that raises a block `set` to `null` removes the block in table cell', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'table',
        _key: tableKey,
        rows: [
          {
            _type: 'row',
            _key: rowKey,
            cells: [
              {
                _type: 'cell',
                _key: cellKey,
                content: [
                  {
                    _type: 'block',
                    _key: fooBlockKey,
                    children: [
                      {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                  {
                    _type: 'block',
                    _key: barBlockKey,
                    children: [
                      {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                  {
                    _type: 'block',
                    _key: bazBlockKey,
                    children: [
                      {_type: 'span', _key: bazSpanKey, text: 'baz', marks: []},
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
    ]
    const {editor, patches} = await createEditor(keyGenerator, initialValue, [
      defineBehavior({
        on: 'insert.text',
        guard: ({event}) => event.text === '!',
        actions: [
          () => [
            raise({
              type: 'set',
              at: [
                {_key: tableKey},
                'rows',
                {_key: rowKey},
                'cells',
                {_key: cellKey},
                'content',
                {_key: barBlockKey},
              ],
              value: null,
            }),
          ],
        ],
      }),
    ])
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: barBlockKey},
            'children',
            {_key: barSpanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: barBlockKey},
            'children',
            {_key: barSpanKey},
          ],
          offset: 1,
        },
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({type: 'insert.text', text: '!'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: fooBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: fooSpanKey,
                          text: 'foo',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                    {
                      _type: 'block',
                      _key: bazBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: bazSpanKey,
                          text: 'baz',
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
      ])
      expect(patches).toEqual([
        {
          type: 'unset',
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: barBlockKey},
          ],
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: bazBlockKey},
            'children',
            {_key: bazSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: bazBlockKey},
            'children',
            {_key: bazSpanKey},
          ],
          offset: 0,
        },
        backward: false,
      })
    })
  })

  test('Scenario: undo a block `set` to `null` in root restores the block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: fooBlockKey,
        children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: barBlockKey,
        children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: bazBlockKey,
        children: [{_type: 'span', _key: bazSpanKey, text: 'baz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]
    const {editor, patches} = await createEditor(keyGenerator, initialValue)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
          offset: 1,
        },
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({type: 'set', at: [{_key: barBlockKey}], value: null})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: fooBlockKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: bazBlockKey,
          children: [{_type: 'span', _key: bazSpanKey, text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {type: 'unset', path: [{_key: barBlockKey}], origin: 'local'},
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: bazBlockKey}, 'children', {_key: bazSpanKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: bazBlockKey}, 'children', {_key: bazSpanKey}],
          offset: 0,
        },
        backward: false,
      })
    })
    patches.length = 0
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: fooBlockKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: barBlockKey,
          children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: bazBlockKey,
          children: [{_type: 'span', _key: bazSpanKey, text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          type: 'insert',
          path: [{_key: fooBlockKey}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: barBlockKey,
              children: [
                {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: barBlockKey}, 'children', {_key: barSpanKey}],
          offset: 1,
        },
        backward: false,
      })
    })
  })

  test('Scenario: undo a block `set` to `null` in callout restores the block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'callout',
        _key: calloutKey,
        content: [
          {
            _type: 'block',
            _key: fooBlockKey,
            children: [
              {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: barBlockKey,
            children: [
              {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: bazBlockKey,
            children: [
              {_type: 'span', _key: bazSpanKey, text: 'baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ]
    const {editor, patches} = await createEditor(keyGenerator, initialValue)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: barBlockKey},
            'children',
            {_key: barSpanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: barBlockKey},
            'children',
            {_key: barSpanKey},
          ],
          offset: 1,
        },
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'set',
      at: [{_key: calloutKey}, 'content', {_key: barBlockKey}],
      value: null,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: fooBlockKey,
              children: [
                {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: bazBlockKey,
              children: [
                {_type: 'span', _key: bazSpanKey, text: 'baz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
      expect(patches).toEqual([
        {
          type: 'unset',
          path: [{_key: calloutKey}, 'content', {_key: barBlockKey}],
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: bazBlockKey},
            'children',
            {_key: bazSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: bazBlockKey},
            'children',
            {_key: bazSpanKey},
          ],
          offset: 0,
        },
        backward: false,
      })
    })
    patches.length = 0
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: fooBlockKey,
              children: [
                {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: barBlockKey,
              children: [
                {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: bazBlockKey,
              children: [
                {_type: 'span', _key: bazSpanKey, text: 'baz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
      expect(patches).toEqual([
        {
          type: 'setIfMissing',
          path: [{_key: calloutKey}, 'content'],
          value: [],
          origin: 'local',
        },
        {
          type: 'insert',
          path: [{_key: calloutKey}, 'content', {_key: fooBlockKey}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: barBlockKey,
              children: [
                {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: barBlockKey},
            'children',
            {_key: barSpanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: barBlockKey},
            'children',
            {_key: barSpanKey},
          ],
          offset: 1,
        },
        backward: false,
      })
    })
  })

  test('Scenario: set a block to `null` addressed by index in callout removes it', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'callout',
        _key: calloutKey,
        content: [
          {
            _type: 'block',
            _key: fooBlockKey,
            children: [
              {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: barBlockKey,
            children: [
              {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'block',
            _key: bazBlockKey,
            children: [
              {_type: 'span', _key: bazSpanKey, text: 'baz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ]
    const {editor, patches} = await createEditor(keyGenerator, initialValue)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: barBlockKey},
            'children',
            {_key: barSpanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: barBlockKey},
            'children',
            {_key: barSpanKey},
          ],
          offset: 1,
        },
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({type: 'set', at: [0, 'content', 1], value: null})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: fooBlockKey,
              children: [
                {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: bazBlockKey,
              children: [
                {_type: 'span', _key: bazSpanKey, text: 'baz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
      expect(patches).toEqual([
        {
          type: 'unset',
          path: [{_key: calloutKey}, 'content', {_key: barBlockKey}],
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: bazBlockKey},
            'children',
            {_key: bazSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: bazBlockKey},
            'children',
            {_key: bazSpanKey},
          ],
          offset: 0,
        },
        backward: false,
      })
    })
    patches.length = 0
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: fooBlockKey,
              children: [
                {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: barBlockKey,
              children: [
                {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: bazBlockKey,
              children: [
                {_type: 'span', _key: bazSpanKey, text: 'baz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
      expect(patches).toEqual([
        {
          type: 'setIfMissing',
          path: [{_key: calloutKey}, 'content'],
          value: [],
          origin: 'local',
        },
        {
          type: 'insert',
          path: [{_key: calloutKey}, 'content', {_key: fooBlockKey}],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: barBlockKey,
              children: [
                {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: barBlockKey},
            'children',
            {_key: barSpanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: barBlockKey},
            'children',
            {_key: barSpanKey},
          ],
          offset: 1,
        },
        backward: false,
      })
    })
    patches.length = 0
    editor.send({type: 'history.redo'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: fooBlockKey,
              children: [
                {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: bazBlockKey,
              children: [
                {_type: 'span', _key: bazSpanKey, text: 'baz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
      expect(patches).toEqual([
        {
          type: 'unset',
          path: [{_key: calloutKey}, 'content', {_key: barBlockKey}],
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: bazBlockKey},
            'children',
            {_key: bazSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: bazBlockKey},
            'children',
            {_key: bazSpanKey},
          ],
          offset: 0,
        },
        backward: false,
      })
    })
  })

  test('Scenario: set a block to `null` addressed by index in callout in callout removes it', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const innerCalloutKey = keyGenerator()
    const foo2BlockKey = keyGenerator()
    const foo2SpanKey = keyGenerator()
    const bar2BlockKey = keyGenerator()
    const bar2SpanKey = keyGenerator()
    const baz2BlockKey = keyGenerator()
    const baz2SpanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'callout',
        _key: calloutKey,
        content: [
          {
            _type: 'block',
            _key: fooBlockKey,
            children: [
              {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'callout',
            _key: innerCalloutKey,
            content: [
              {
                _type: 'block',
                _key: foo2BlockKey,
                children: [
                  {_type: 'span', _key: foo2SpanKey, text: 'foo2', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
              {
                _type: 'block',
                _key: bar2BlockKey,
                children: [
                  {_type: 'span', _key: bar2SpanKey, text: 'bar2', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
              {
                _type: 'block',
                _key: baz2BlockKey,
                children: [
                  {_type: 'span', _key: baz2SpanKey, text: 'baz2', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    ]
    const {editor, patches} = await createEditor(keyGenerator, initialValue)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerCalloutKey},
            'content',
            {_key: bar2BlockKey},
            'children',
            {_key: bar2SpanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerCalloutKey},
            'content',
            {_key: bar2BlockKey},
            'children',
            {_key: bar2SpanKey},
          ],
          offset: 1,
        },
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({type: 'set', at: [0, 'content', 1, 'content', 1], value: null})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: fooBlockKey,
              children: [
                {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'callout',
              _key: innerCalloutKey,
              content: [
                {
                  _type: 'block',
                  _key: foo2BlockKey,
                  children: [
                    {_type: 'span', _key: foo2SpanKey, text: 'foo2', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: baz2BlockKey,
                  children: [
                    {_type: 'span', _key: baz2SpanKey, text: 'baz2', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ])
      expect(patches).toEqual([
        {
          type: 'unset',
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerCalloutKey},
            'content',
            {_key: bar2BlockKey},
          ],
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerCalloutKey},
            'content',
            {_key: baz2BlockKey},
            'children',
            {_key: baz2SpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerCalloutKey},
            'content',
            {_key: baz2BlockKey},
            'children',
            {_key: baz2SpanKey},
          ],
          offset: 0,
        },
        backward: false,
      })
    })
    patches.length = 0
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: fooBlockKey,
              children: [
                {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'callout',
              _key: innerCalloutKey,
              content: [
                {
                  _type: 'block',
                  _key: foo2BlockKey,
                  children: [
                    {_type: 'span', _key: foo2SpanKey, text: 'foo2', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: bar2BlockKey,
                  children: [
                    {_type: 'span', _key: bar2SpanKey, text: 'bar2', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: baz2BlockKey,
                  children: [
                    {_type: 'span', _key: baz2SpanKey, text: 'baz2', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ])
      expect(patches).toEqual([
        {
          type: 'setIfMissing',
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerCalloutKey},
            'content',
          ],
          value: [],
          origin: 'local',
        },
        {
          type: 'insert',
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerCalloutKey},
            'content',
            {_key: foo2BlockKey},
          ],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: bar2BlockKey,
              children: [
                {_type: 'span', _key: bar2SpanKey, text: 'bar2', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerCalloutKey},
            'content',
            {_key: bar2BlockKey},
            'children',
            {_key: bar2SpanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerCalloutKey},
            'content',
            {_key: bar2BlockKey},
            'children',
            {_key: bar2SpanKey},
          ],
          offset: 1,
        },
        backward: false,
      })
    })
    patches.length = 0
    editor.send({type: 'history.redo'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: fooBlockKey,
              children: [
                {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'callout',
              _key: innerCalloutKey,
              content: [
                {
                  _type: 'block',
                  _key: foo2BlockKey,
                  children: [
                    {_type: 'span', _key: foo2SpanKey, text: 'foo2', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
                {
                  _type: 'block',
                  _key: baz2BlockKey,
                  children: [
                    {_type: 'span', _key: baz2SpanKey, text: 'baz2', marks: []},
                  ],
                  markDefs: [],
                  style: 'normal',
                },
              ],
            },
          ],
        },
      ])
      expect(patches).toEqual([
        {
          type: 'unset',
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerCalloutKey},
            'content',
            {_key: bar2BlockKey},
          ],
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerCalloutKey},
            'content',
            {_key: baz2BlockKey},
            'children',
            {_key: baz2SpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: innerCalloutKey},
            'content',
            {_key: baz2BlockKey},
            'children',
            {_key: baz2SpanKey},
          ],
          offset: 0,
        },
        backward: false,
      })
    })
  })

  test('Scenario: set a block to `null` addressed by index in table cell removes it', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'table',
        _key: tableKey,
        rows: [
          {
            _type: 'row',
            _key: rowKey,
            cells: [
              {
                _type: 'cell',
                _key: cellKey,
                content: [
                  {
                    _type: 'block',
                    _key: fooBlockKey,
                    children: [
                      {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                  {
                    _type: 'block',
                    _key: barBlockKey,
                    children: [
                      {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                  {
                    _type: 'block',
                    _key: bazBlockKey,
                    children: [
                      {_type: 'span', _key: bazSpanKey, text: 'baz', marks: []},
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
    ]
    const {editor, patches} = await createEditor(keyGenerator, initialValue)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: barBlockKey},
            'children',
            {_key: barSpanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: barBlockKey},
            'children',
            {_key: barSpanKey},
          ],
          offset: 1,
        },
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'set',
      at: [0, 'rows', 0, 'cells', 0, 'content', 1],
      value: null,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: fooBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: fooSpanKey,
                          text: 'foo',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                    {
                      _type: 'block',
                      _key: bazBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: bazSpanKey,
                          text: 'baz',
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
      ])
      expect(patches).toEqual([
        {
          type: 'unset',
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: barBlockKey},
          ],
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: bazBlockKey},
            'children',
            {_key: bazSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: bazBlockKey},
            'children',
            {_key: bazSpanKey},
          ],
          offset: 0,
        },
        backward: false,
      })
    })
    patches.length = 0
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: fooBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: fooSpanKey,
                          text: 'foo',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                    {
                      _type: 'block',
                      _key: barBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: barSpanKey,
                          text: 'bar',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                    {
                      _type: 'block',
                      _key: bazBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: bazSpanKey,
                          text: 'baz',
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
      ])
      expect(patches).toEqual([
        {
          type: 'setIfMissing',
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
          ],
          value: [],
          origin: 'local',
        },
        {
          type: 'insert',
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: fooBlockKey},
          ],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: barBlockKey,
              children: [
                {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: barBlockKey},
            'children',
            {_key: barSpanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: barBlockKey},
            'children',
            {_key: barSpanKey},
          ],
          offset: 1,
        },
        backward: false,
      })
    })
    patches.length = 0
    editor.send({type: 'history.redo'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: fooBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: fooSpanKey,
                          text: 'foo',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                    {
                      _type: 'block',
                      _key: bazBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: bazSpanKey,
                          text: 'baz',
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
      ])
      expect(patches).toEqual([
        {
          type: 'unset',
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: barBlockKey},
          ],
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: bazBlockKey},
            'children',
            {_key: bazSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: bazBlockKey},
            'children',
            {_key: bazSpanKey},
          ],
          offset: 0,
        },
        backward: false,
      })
    })
  })

  test('Scenario: set a block to `null` addressed by a mix of keys and indexes in table cell removes it', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'table',
        _key: tableKey,
        rows: [
          {
            _type: 'row',
            _key: rowKey,
            cells: [
              {
                _type: 'cell',
                _key: cellKey,
                content: [
                  {
                    _type: 'block',
                    _key: fooBlockKey,
                    children: [
                      {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                  {
                    _type: 'block',
                    _key: barBlockKey,
                    children: [
                      {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                  {
                    _type: 'block',
                    _key: bazBlockKey,
                    children: [
                      {_type: 'span', _key: bazSpanKey, text: 'baz', marks: []},
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
    ]
    const {editor, patches} = await createEditor(keyGenerator, initialValue)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: barBlockKey},
            'children',
            {_key: barSpanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: barBlockKey},
            'children',
            {_key: barSpanKey},
          ],
          offset: 1,
        },
      },
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })
    editor.send({
      type: 'set',
      at: [
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        0,
        'content',
        {_key: barBlockKey},
      ],
      value: null,
    })
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: fooBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: fooSpanKey,
                          text: 'foo',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                    {
                      _type: 'block',
                      _key: bazBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: bazSpanKey,
                          text: 'baz',
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
      ])
      expect(patches).toEqual([
        {
          type: 'unset',
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: barBlockKey},
          ],
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: bazBlockKey},
            'children',
            {_key: bazSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: bazBlockKey},
            'children',
            {_key: bazSpanKey},
          ],
          offset: 0,
        },
        backward: false,
      })
    })
    patches.length = 0
    editor.send({type: 'history.undo'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: fooBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: fooSpanKey,
                          text: 'foo',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                    {
                      _type: 'block',
                      _key: barBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: barSpanKey,
                          text: 'bar',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                    {
                      _type: 'block',
                      _key: bazBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: bazSpanKey,
                          text: 'baz',
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
      ])
      expect(patches).toEqual([
        {
          type: 'setIfMissing',
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
          ],
          value: [],
          origin: 'local',
        },
        {
          type: 'insert',
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: fooBlockKey},
          ],
          position: 'after',
          items: [
            {
              _type: 'block',
              _key: barBlockKey,
              children: [
                {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: barBlockKey},
            'children',
            {_key: barSpanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: barBlockKey},
            'children',
            {_key: barSpanKey},
          ],
          offset: 1,
        },
        backward: false,
      })
    })
    patches.length = 0
    editor.send({type: 'history.redo'})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: fooBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: fooSpanKey,
                          text: 'foo',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                    {
                      _type: 'block',
                      _key: bazBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: bazSpanKey,
                          text: 'baz',
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
      ])
      expect(patches).toEqual([
        {
          type: 'unset',
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: barBlockKey},
          ],
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: bazBlockKey},
            'children',
            {_key: bazSpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: bazBlockKey},
            'children',
            {_key: bazSpanKey},
          ],
          offset: 0,
        },
        backward: false,
      })
    })
  })

  test('Scenario: set to `null` at index -1 in root behaves as before', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    onTestFinished(() => consoleError.mockRestore())
    const {editor, patches} = await createEditor(keyGenerator, [
      {
        _type: 'block',
        _key: fooBlockKey,
        children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: barBlockKey,
        children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: bazBlockKey,
        children: [{_type: 'span', _key: bazSpanKey, text: 'baz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    editor.send({type: 'set', at: [-1], value: null})
    await vi.waitFor(() => {
      expect(patches).toEqual([
        {type: 'set', path: [-1], value: null, origin: 'local'},
      ])
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: fooBlockKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: barBlockKey,
          children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: bazBlockKey,
          children: [{_type: 'span', _key: bazSpanKey, text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    expect(consoleError).not.toHaveBeenCalled()
  })

  test('Scenario: set to `null` at index -2 in root behaves as before', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    onTestFinished(() => consoleError.mockRestore())
    const {editor, patches} = await createEditor(keyGenerator, [
      {
        _type: 'block',
        _key: fooBlockKey,
        children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: barBlockKey,
        children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: bazBlockKey,
        children: [{_type: 'span', _key: bazSpanKey, text: 'baz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    editor.send({type: 'set', at: [-2], value: null})
    await vi.waitFor(() => {
      expect(patches).toEqual([
        {type: 'set', path: [-2], value: null, origin: 'local'},
      ])
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: fooBlockKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: barBlockKey,
          children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: bazBlockKey,
          children: [{_type: 'span', _key: bazSpanKey, text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    expect(consoleError).not.toHaveBeenCalled()
  })

  test('Scenario: set to `null` at index 1.5 in root changes nothing', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    onTestFinished(() => consoleError.mockRestore())
    const {editor, patches} = await createEditor(keyGenerator, [
      {
        _type: 'block',
        _key: fooBlockKey,
        children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: barBlockKey,
        children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: bazBlockKey,
        children: [{_type: 'span', _key: bazSpanKey, text: 'baz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    editor.send({type: 'set', at: [1.5], value: null})
    // A `set` to `[]` always emits a patch, so once it shows up the event before it has been handled
    editor.send({type: 'set', at: [{_key: fooBlockKey}], value: []})

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: fooBlockKey}],
          value: [],
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: fooBlockKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: barBlockKey,
          children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: bazBlockKey,
          children: [{_type: 'span', _key: bazSpanKey, text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    expect(consoleError).not.toHaveBeenCalled()
  })

  test('Scenario: set to `null` at index -1 in table cell behaves as before', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    onTestFinished(() => consoleError.mockRestore())
    const {editor, patches} = await createEditor(keyGenerator, [
      {
        _type: 'table',
        _key: tableKey,
        rows: [
          {
            _type: 'row',
            _key: rowKey,
            cells: [
              {
                _type: 'cell',
                _key: cellKey,
                content: [
                  {
                    _type: 'block',
                    _key: fooBlockKey,
                    children: [
                      {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                  {
                    _type: 'block',
                    _key: barBlockKey,
                    children: [
                      {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                  {
                    _type: 'block',
                    _key: bazBlockKey,
                    children: [
                      {_type: 'span', _key: bazSpanKey, text: 'baz', marks: []},
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
    editor.send({
      type: 'set',
      at: [
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        -1,
      ],
      value: null,
    })
    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'set',
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            -1,
          ],
          value: null,
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: fooBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: fooSpanKey,
                          text: 'foo',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                    {
                      _type: 'block',
                      _key: barBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: barSpanKey,
                          text: 'bar',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                    {
                      _type: 'block',
                      _key: bazBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: bazSpanKey,
                          text: 'baz',
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
      ])
    })
    expect(consoleError).not.toHaveBeenCalled()
  })

  test('Scenario: set to `null` at index -2 in table cell behaves as before', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    onTestFinished(() => consoleError.mockRestore())
    const {editor, patches} = await createEditor(keyGenerator, [
      {
        _type: 'table',
        _key: tableKey,
        rows: [
          {
            _type: 'row',
            _key: rowKey,
            cells: [
              {
                _type: 'cell',
                _key: cellKey,
                content: [
                  {
                    _type: 'block',
                    _key: fooBlockKey,
                    children: [
                      {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                  {
                    _type: 'block',
                    _key: barBlockKey,
                    children: [
                      {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                  {
                    _type: 'block',
                    _key: bazBlockKey,
                    children: [
                      {_type: 'span', _key: bazSpanKey, text: 'baz', marks: []},
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
    editor.send({
      type: 'set',
      at: [
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        -2,
      ],
      value: null,
    })
    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'set',
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            -2,
          ],
          value: null,
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: fooBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: fooSpanKey,
                          text: 'foo',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                    {
                      _type: 'block',
                      _key: barBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: barSpanKey,
                          text: 'bar',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                    {
                      _type: 'block',
                      _key: bazBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: bazSpanKey,
                          text: 'baz',
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
      ])
    })
    expect(consoleError).not.toHaveBeenCalled()
  })

  test('Scenario: set to `null` at index 1.5 in table cell changes nothing', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    onTestFinished(() => consoleError.mockRestore())
    const {editor, patches} = await createEditor(keyGenerator, [
      {
        _type: 'table',
        _key: tableKey,
        rows: [
          {
            _type: 'row',
            _key: rowKey,
            cells: [
              {
                _type: 'cell',
                _key: cellKey,
                content: [
                  {
                    _type: 'block',
                    _key: fooBlockKey,
                    children: [
                      {_type: 'span', _key: fooSpanKey, text: 'foo', marks: []},
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                  {
                    _type: 'block',
                    _key: barBlockKey,
                    children: [
                      {_type: 'span', _key: barSpanKey, text: 'bar', marks: []},
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                  {
                    _type: 'block',
                    _key: bazBlockKey,
                    children: [
                      {_type: 'span', _key: bazSpanKey, text: 'baz', marks: []},
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
    editor.send({
      type: 'set',
      at: [
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        1.5,
      ],
      value: null,
    })
    // A `set` to `[]` always emits a patch, so once it shows up the event before it has been handled
    editor.send({
      type: 'set',
      at: [
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: fooBlockKey},
      ],
      value: [],
    })

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'set',
          path: [
            {_key: tableKey},
            'rows',
            {_key: rowKey},
            'cells',
            {_key: cellKey},
            'content',
            {_key: fooBlockKey},
          ],
          value: [],
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'table',
          _key: tableKey,
          rows: [
            {
              _type: 'row',
              _key: rowKey,
              cells: [
                {
                  _type: 'cell',
                  _key: cellKey,
                  content: [
                    {
                      _type: 'block',
                      _key: fooBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: fooSpanKey,
                          text: 'foo',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                    {
                      _type: 'block',
                      _key: barBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: barSpanKey,
                          text: 'bar',
                          marks: [],
                        },
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                    {
                      _type: 'block',
                      _key: bazBlockKey,
                      children: [
                        {
                          _type: 'span',
                          _key: bazSpanKey,
                          text: 'baz',
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
      ])
    })
    expect(consoleError).not.toHaveBeenCalled()
  })

  test('Scenario: set a span to `null` under an ancestor at index -1 behaves as before', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    onTestFinished(() => consoleError.mockRestore())
    const {editor, patches} = await createEditor(keyGenerator, [
      {
        _type: 'block',
        _key: fooBlockKey,
        children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    editor.send({
      type: 'set',
      at: [-1, 'children', {_key: fooSpanKey}],
      value: null,
    })
    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'set',
          path: [-1, 'children', {_key: fooSpanKey}],
          value: null,
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: fooBlockKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    expect(consoleError).not.toHaveBeenCalled()
  })

  test('Scenario: set a span to `null` under an ancestor at index 0.5 changes nothing', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    onTestFinished(() => consoleError.mockRestore())
    const {editor, patches} = await createEditor(keyGenerator, [
      {
        _type: 'block',
        _key: fooBlockKey,
        children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    editor.send({
      type: 'set',
      at: [0.5, 'children', {_key: fooSpanKey}],
      value: null,
    })
    // A `set` to `[]` always emits a patch, so once it shows up the event before it has been handled
    editor.send({type: 'set', at: [{_key: fooBlockKey}], value: []})

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: fooBlockKey}],
          value: [],
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: fooBlockKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    expect(consoleError).not.toHaveBeenCalled()
  })

  test('Scenario: set a span to `null` under an ancestor at NaN changes nothing', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    onTestFinished(() => consoleError.mockRestore())
    const {editor, patches} = await createEditor(keyGenerator, [
      {
        _type: 'block',
        _key: fooBlockKey,
        children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ])
    editor.send({
      type: 'set',
      at: [NaN, 'children', {_key: fooSpanKey}],
      value: null,
    })
    // A `set` to `[]` always emits a patch, so once it shows up the event before it has been handled
    editor.send({type: 'set', at: [{_key: fooBlockKey}], value: []})

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: fooBlockKey}],
          value: [],
          origin: 'local',
        },
      ])
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: fooBlockKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
    expect(consoleError).not.toHaveBeenCalled()
  })

  test('Scenario: set a block to `[]` leaves the value unchanged', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: fooBlockKey,
        children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: barBlockKey,
        children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: bazBlockKey,
        children: [{_type: 'span', _key: bazSpanKey, text: 'baz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]
    const {editor, patches} = await createEditor(keyGenerator, initialValue)

    editor.send({type: 'set', at: [{_key: barBlockKey}], value: []})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: fooBlockKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: barBlockKey,
          children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: bazBlockKey,
          children: [{_type: 'span', _key: bazSpanKey, text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: barBlockKey}],
          value: [],
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: set a block that is not in the value changes nothing', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const missingKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: fooBlockKey,
        children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: barBlockKey,
        children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: bazBlockKey,
        children: [{_type: 'span', _key: bazSpanKey, text: 'baz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]
    const {editor, patches} = await createEditor(keyGenerator, initialValue)

    editor.send({type: 'set', at: [{_key: missingKey}], value: null})

    // A `set` to `[]` always emits a patch, so once it shows up the event before it has been handled
    editor.send({type: 'set', at: [{_key: fooBlockKey}], value: []})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: fooBlockKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: barBlockKey,
          children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: bazBlockKey,
          children: [{_type: 'span', _key: bazSpanKey, text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: fooBlockKey}],
          value: [],
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: set a block property to a string is unchanged', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barBlockKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazBlockKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: fooBlockKey,
        children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: barBlockKey,
        children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: bazBlockKey,
        children: [{_type: 'span', _key: bazSpanKey, text: 'baz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]
    const {editor, patches} = await createEditor(keyGenerator, initialValue)

    editor.send({type: 'set', at: [{_key: barBlockKey}, 'style'], value: 'h1'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: fooBlockKey,
          children: [{_type: 'span', _key: fooSpanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: barBlockKey,
          children: [{_type: 'span', _key: barSpanKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'h1',
        },
        {
          _type: 'block',
          _key: bazBlockKey,
          children: [{_type: 'span', _key: bazSpanKey, text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: barBlockKey}, 'style'],
          value: 'h1',
          origin: 'local',
        },
      ])
    })
  })
})

async function createEditor(
  keyGenerator: ReturnType<typeof createTestKeyGenerator>,
  initialValue: Array<PortableTextBlock>,
  behaviors: Array<ReturnType<typeof defineBehavior>> = [],
) {
  const patches: Array<Patch> = []
  const {editor} = await createTestEditor({
    keyGenerator,
    schemaDefinition,
    initialValue,
    children: (
      <>
        <NodePlugin nodes={containers} />
        <BehaviorPlugin behaviors={behaviors} />
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

  return {editor, patches}
}
