import type {Patch} from '@portabletext/patches'
import {createTestKeyGenerator} from '@portabletext/test'
import {makeDiff, makePatches, stringifyPatches} from '@sanity/diff-match-patch'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema} from '../src'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}],
  styles: [{name: 'normal'}, {name: 'h1'}],
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

const containers = [
  defineContainer({
    type: 'callout',
    arrayField: 'content',
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

describe('local edits inside containers merge only the spans they touch', () => {
  test('Scenario: typing into one span of a nested block leaves an untouched same-mark pair unmerged', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const bazKey = keyGenerator()
    const patches: Array<Patch> = []

    const {editor} = await createTestEditor({
      children: (
        <>
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
          <NodePlugin nodes={containers} />
        </>
      ),
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: fooKey, text: 'foo', marks: []},
                {_type: 'span', _key: barKey, text: 'bar', marks: []},
                {_type: 'span', _key: bazKey, text: 'baz', marks: ['strong']},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: blockKey},
            'children',
            {_key: bazKey},
          ],
          offset: 3,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: blockKey},
            'children',
            {_key: bazKey},
          ],
          offset: 3,
        },
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'diffMatchPatch',
          path: [
            {_key: calloutKey},
            'content',
            {_key: blockKey},
            'children',
            {_key: bazKey},
            'text',
          ],
          value: stringifyPatches(makePatches(makeDiff('baz', 'baz!'))),
          origin: 'local',
        },
      ])
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: calloutKey,
        content: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_type: 'span', _key: fooKey, text: 'foo', marks: []},
              {_type: 'span', _key: barKey, text: 'bar', marks: []},
              {_type: 'span', _key: bazKey, text: 'baz!', marks: ['strong']},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
  })

  test('Scenario: typing into a span of a nested block merges it with its same-mark neighbour', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const bazKey = keyGenerator()
    const patches: Array<Patch> = []

    const {editor} = await createTestEditor({
      children: (
        <>
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
          <NodePlugin nodes={containers} />
        </>
      ),
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: fooKey, text: 'foo', marks: []},
                {_type: 'span', _key: barKey, text: 'bar', marks: []},
                {_type: 'span', _key: bazKey, text: 'baz', marks: ['strong']},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: blockKey},
            'children',
            {_key: barKey},
          ],
          offset: 3,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: blockKey},
            'children',
            {_key: barKey},
          ],
          offset: 3,
        },
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'diffMatchPatch',
          path: [
            {_key: calloutKey},
            'content',
            {_key: blockKey},
            'children',
            {_key: barKey},
            'text',
          ],
          value: stringifyPatches(makePatches(makeDiff('bar', 'bar!'))),
          origin: 'local',
        },
        {
          type: 'diffMatchPatch',
          path: [
            {_key: calloutKey},
            'content',
            {_key: blockKey},
            'children',
            {_key: fooKey},
            'text',
          ],
          value: stringifyPatches(makePatches(makeDiff('foo', 'foobar!'))),
          origin: 'local',
        },
        {
          type: 'unset',
          path: [
            {_key: calloutKey},
            'content',
            {_key: blockKey},
            'children',
            {_key: barKey},
          ],
          origin: 'local',
        },
      ])
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: calloutKey,
        content: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_type: 'span', _key: fooKey, text: 'foobar!', marks: []},
              {_type: 'span', _key: bazKey, text: 'baz', marks: ['strong']},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
  })

  test('Scenario: a style change on a block in a table cell leaves same-mark spans unmerged', async () => {
    const keyGenerator = createTestKeyGenerator()
    const tableKey = keyGenerator()
    const rowKey = keyGenerator()
    const cellKey = keyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const bazKey = keyGenerator()
    const patches: Array<Patch> = []

    const {editor} = await createTestEditor({
      children: (
        <>
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
          <NodePlugin nodes={containers} />
        </>
      ),
      keyGenerator,
      schemaDefinition,
      initialValue: [
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
                      _key: blockKey,
                      children: [
                        {_type: 'span', _key: fooKey, text: 'foo', marks: []},
                        {_type: 'span', _key: barKey, text: 'bar', marks: []},
                        {
                          _type: 'span',
                          _key: bazKey,
                          text: 'baz',
                          marks: ['strong'],
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
    })

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
            {_key: blockKey},
            'children',
            {_key: fooKey},
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
            {_key: blockKey},
            'children',
            {_key: fooKey},
          ],
          offset: 0,
        },
      },
    })
    editor.send({type: 'style.toggle', style: 'h1'})

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
            {_key: blockKey},
            'style',
          ],
          value: 'h1',
          origin: 'local',
        },
      ])
    })
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
                    _key: blockKey,
                    children: [
                      {_type: 'span', _key: fooKey, text: 'foo', marks: []},
                      {_type: 'span', _key: barKey, text: 'bar', marks: []},
                      {
                        _type: 'span',
                        _key: bazKey,
                        text: 'baz',
                        marks: ['strong'],
                      },
                    ],
                    markDefs: [],
                    style: 'h1',
                  },
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  test('Scenario: deleting the span between two same-mark spans of a nested block merges them', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const bazKey = keyGenerator()
    const patches: Array<Patch> = []

    const {editor} = await createTestEditor({
      children: (
        <>
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
          <NodePlugin nodes={containers} />
        </>
      ),
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: fooKey, text: 'foo', marks: []},
                {_type: 'span', _key: barKey, text: 'bar', marks: ['strong']},
                {_type: 'span', _key: bazKey, text: 'baz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
    })

    editor.send({
      type: 'delete',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: blockKey},
            'children',
            {_key: barKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: blockKey},
            'children',
            {_key: barKey},
          ],
          offset: 3,
        },
      },
    })

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'diffMatchPatch',
          path: [
            {_key: calloutKey},
            'content',
            {_key: blockKey},
            'children',
            {_key: barKey},
            'text',
          ],
          value: stringifyPatches(makePatches(makeDiff('bar', ''))),
          origin: 'local',
        },
        {
          type: 'unset',
          path: [
            {_key: calloutKey},
            'content',
            {_key: blockKey},
            'children',
            {_key: barKey},
          ],
          origin: 'local',
        },
        {
          type: 'diffMatchPatch',
          path: [
            {_key: calloutKey},
            'content',
            {_key: blockKey},
            'children',
            {_key: fooKey},
            'text',
          ],
          value: stringifyPatches(makePatches(makeDiff('foo', 'foobaz'))),
          origin: 'local',
        },
        {
          type: 'unset',
          path: [
            {_key: calloutKey},
            'content',
            {_key: blockKey},
            'children',
            {_key: bazKey},
          ],
          origin: 'local',
        },
      ])
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'callout',
        _key: calloutKey,
        content: [
          {
            _type: 'block',
            _key: blockKey,
            children: [
              {_type: 'span', _key: fooKey, text: 'foobaz', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
  })

  test('Scenario: keyless same-mark spans inserted as a block into a container merge', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const insertedBlockKey = keyGenerator()

    const {editor} = await createTestEditor({
      children: <NodePlugin nodes={containers} />,
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
    })

    editor.send({
      type: 'insert',
      at: [{_key: calloutKey}, 'content', {_key: blockKey}],
      value: {
        _type: 'block',
        _key: insertedBlockKey,
        children: [
          {_type: 'span', text: 'foo', marks: []},
          {_type: 'span', text: 'bar', marks: []},
          {_type: 'span', text: 'baz', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
      position: 'after',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: insertedBlockKey,
              children: [
                {_type: 'span', _key: 'k8', text: 'foobarbaz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('Scenario: inserting a keyless span between two same-mark spans of a nested block merges all three', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()

    const {editor} = await createTestEditor({
      children: <NodePlugin nodes={containers} />,
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: fooKey, text: 'foo', marks: []},
                {_type: 'span', _key: barKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
    })

    editor.send({
      type: 'insert',
      at: [
        {_key: calloutKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: fooKey},
      ],
      // @ts-expect-error -- the event type requires `_key`, the engine accepts a keyless span
      value: {_type: 'span', text: 'baz', marks: []},
      position: 'after',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: fooKey, text: 'foobazbar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })
})

describe('container registration merges no spans', () => {
  test('Scenario: registering a container after load leaves same-mark spans unmerged through a later edit', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const barKey = keyGenerator()
    const bazKey = keyGenerator()
    const patches: Array<Patch> = []
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: fooKey, text: 'foo', marks: []},
          {_type: 'span', _key: barKey, text: 'bar', marks: []},
          {_type: 'span', _key: bazKey, text: 'baz', marks: ['strong']},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]
    const eventListener = (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'patch') {
            patches.push(event.patch)
          }
        }}
      />
    )

    const {editor, rerender} = await createTestEditor({
      children: eventListener,
      keyGenerator,
      schemaDefinition,
      initialValue,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })

    await rerender({
      children: (
        <>
          {eventListener}
          <NodePlugin nodes={containers} />
        </>
      ),
      keyGenerator,
      schemaDefinition,
      initialValue,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: bazKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: bazKey}],
          offset: 3,
        },
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'diffMatchPatch',
          path: [{_key: blockKey}, 'children', {_key: bazKey}, 'text'],
          value: stringifyPatches(makePatches(makeDiff('baz', 'baz!'))),
          origin: 'local',
        },
      ])
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: fooKey, text: 'foo', marks: []},
          {_type: 'span', _key: barKey, text: 'bar', marks: []},
          {_type: 'span', _key: bazKey, text: 'baz!', marks: ['strong']},
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })
  test('Scenario: registering a container after load keeps an empty span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const emptyKey = keyGenerator()
    const barKey = keyGenerator()
    const patches: Array<Patch> = []
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: fooKey, text: 'foo', marks: []},
          {_type: 'span', _key: emptyKey, text: '', marks: ['em']},
          {_type: 'span', _key: barKey, text: 'bar', marks: ['strong']},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]
    const eventListener = (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'patch') {
            patches.push(event.patch)
          }
        }}
      />
    )

    const {editor, rerender} = await createTestEditor({
      children: eventListener,
      keyGenerator,
      schemaDefinition,
      initialValue,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })

    await rerender({
      children: (
        <>
          {eventListener}
          <NodePlugin nodes={containers} />
        </>
      ),
      keyGenerator,
      schemaDefinition,
      initialValue,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          offset: 0,
        },
      },
    })
    editor.send({type: 'style.toggle', style: 'h1'})

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'style'],
          value: 'h1',
          origin: 'local',
        },
      ])
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: fooKey, text: 'foo', marks: []},
          {_type: 'span', _key: emptyKey, text: '', marks: ['em']},
          {_type: 'span', _key: barKey, text: 'bar', marks: ['strong']},
        ],
        markDefs: [],
        style: 'h1',
      },
    ])
  })

  test('Scenario: unregistering a container keeps an empty span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const emptyKey = keyGenerator()
    const barKey = keyGenerator()
    const patches: Array<Patch> = []
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: fooKey, text: 'foo', marks: []},
          {_type: 'span', _key: emptyKey, text: '', marks: ['em']},
          {_type: 'span', _key: barKey, text: 'bar', marks: ['strong']},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]
    const eventListener = (
      <EventListenerPlugin
        on={(event) => {
          if (event.type === 'patch') {
            patches.push(event.patch)
          }
        }}
      />
    )

    const {editor, rerender} = await createTestEditor({
      children: (
        <>
          {eventListener}
          <NodePlugin nodes={containers} />
        </>
      ),
      keyGenerator,
      schemaDefinition,
      initialValue,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })

    await rerender({
      children: eventListener,
      keyGenerator,
      schemaDefinition,
      initialValue,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          offset: 0,
        },
      },
    })
    editor.send({type: 'style.toggle', style: 'h1'})

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'style'],
          value: 'h1',
          origin: 'local',
        },
      ])
    })
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: fooKey, text: 'foo', marks: []},
          {_type: 'span', _key: emptyKey, text: '', marks: ['em']},
          {_type: 'span', _key: barKey, text: 'bar', marks: ['strong']},
        ],
        markDefs: [],
        style: 'h1',
      },
    ])
  })
})
