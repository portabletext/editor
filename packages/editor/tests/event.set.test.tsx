import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema, type Patch} from '../src'
import {EventListenerPlugin, NodePlugin} from '../src/plugins'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

describe('event.set', () => {
  test('Scenario: set on a block property', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        styles: [{name: 'normal'}, {name: 'h1'}],
      }),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          style: 'normal',
          children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    })

    editor.send({type: 'set', at: [{_key: 'b0'}, 'style'], value: 'h1'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          style: 'h1',
          children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
        },
      ])
    })
  })

  test('Scenario: undo a set on a block property', async () => {
    const initialValue = [
      {
        _key: 'b0',
        _type: 'block',
        style: 'normal',
        children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
        markDefs: [],
      },
    ]
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({
        styles: [{name: 'normal'}, {name: 'h1'}],
      }),
      initialValue,
    })

    editor.send({type: 'set', at: [{_key: 'b0'}, 'style'], value: 'h1'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          style: 'h1',
          children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test('Scenario: undo a set that creates a new block property', async () => {
    const initialValue = [
      {
        _key: 'b0',
        _type: 'block',
        style: 'normal',
        children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
        markDefs: [],
      },
    ]
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({
        lists: [{name: 'bullet'}],
      }),
      initialValue,
    })

    editor.send({type: 'set', at: [{_key: 'b0'}, 'listItem'], value: 'bullet'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          style: 'normal',
          listItem: 'bullet',
          children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test('Scenario: undo a set on a markDef property', async () => {
    const initialValue = [
      {
        _key: 'b0',
        _type: 'block',
        style: 'normal',
        children: [{_key: 's0', _type: 'span', text: 'foo', marks: ['m0']}],
        markDefs: [{_key: 'm0', _type: 'link', href: 'https://a.com'}],
      },
    ]
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
      initialValue,
    })

    editor.send({
      type: 'set',
      at: [{_key: 'b0'}, 'markDefs', {_key: 'm0'}, 'href'],
      value: 'https://b.com',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          style: 'normal',
          children: [{_key: 's0', _type: 'span', text: 'foo', marks: ['m0']}],
          markDefs: [{_key: 'm0', _type: 'link', href: 'https://b.com'}],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test('Scenario: undo a full-block replacement', async () => {
    const initialValue = [
      {
        _key: 'b0',
        _type: 'block',
        style: 'normal',
        children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
        markDefs: [],
      },
    ]
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      initialValue,
    })

    editor.send({
      type: 'set',
      at: [{_key: 'b0'}],
      value: {
        _key: 'b0',
        _type: 'block',
        style: 'normal',
        children: [{_key: 's1', _type: 'span', text: 'NEW', marks: []}],
        markDefs: [],
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          style: 'normal',
          children: [{_key: 's1', _type: 'span', text: 'NEW', marks: []}],
          markDefs: [],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test('Scenario: undo a root-level value replacement', async () => {
    const initialValue = [
      {
        _key: 'b0',
        _type: 'block',
        style: 'normal',
        children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
        markDefs: [],
      },
    ]
    const replacement = [
      {
        _key: 'b1',
        _type: 'block',
        style: 'normal',
        children: [{_key: 's1', _type: 'span', text: 'NEW', marks: []}],
        markDefs: [],
      },
    ]
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      initialValue,
    })

    editor.send({type: 'set', at: [], value: replacement})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(replacement)
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test("Scenario: undo a set of a container's children array to []", async () => {
    const initialValue = [
      {
        _key: 't0',
        _type: 'table',
        rows: [
          {
            _key: 'r0',
            _type: 'row',
            cells: [
              {
                _key: 'c0',
                _type: 'cell',
                content: [
                  {
                    _key: 'b0',
                    _type: 'block',
                    style: 'normal',
                    children: [
                      {_key: 's0', _type: 'span', text: 'foo', marks: []},
                    ],
                    markDefs: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({
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
      }),
      initialValue,
    })

    editor.send({
      type: 'set',
      at: [{_key: 't0'}, 'rows', {_key: 'r0'}, 'cells'],
      value: [],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 't0',
          _type: 'table',
          rows: [{_key: 'r0', _type: 'row', cells: []}],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })
  })

  test.each([
    {
      name: 'a keyed path',
      at: (blockKey: string, spanKey: string) => [
        {_key: blockKey},
        'children',
        {_key: spanKey},
        'text',
      ],
    },
    {name: 'an index path', at: () => [0, 'children', 0, 'text']},
  ])(
    "Scenario: set of a span's text by $name clamps a caret in the span",
    async ({at}) => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const patches: Array<Patch> = []
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            style: 'normal',
            children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
            markDefs: [],
          },
        ],
        children: (
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
        ),
      })

      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 3,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 3,
          },
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 3,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 3,
          },
          backward: false,
        })
      })

      editor.send({type: 'set', at: at(blockKey, spanKey), value: 'fo'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            style: 'normal',
            children: [{_key: spanKey, _type: 'span', text: 'fo', marks: []}],
            markDefs: [],
          },
        ])
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 2,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 2,
          },
          backward: false,
        })
        expect(patches).toEqual([
          {
            type: 'set',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, 'text'],
            value: 'fo',
            origin: 'local',
          },
        ])
      })
    },
  )

  test.each([
    {
      name: 'a keyed path',
      at: (blockKey: string, spanKey: string) => [
        {_key: blockKey},
        'children',
        {_key: spanKey},
        '_key',
      ],
    },
    {name: 'an index path', at: () => [0, 'children', 0, '_key']},
  ])(
    "Scenario: set of a span's key by $name moves a caret in the span to the new key",
    async ({at}) => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const patches: Array<Patch> = []
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _key: blockKey,
            _type: 'block',
            style: 'normal',
            children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
            markDefs: [],
          },
        ],
        children: (
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
        ),
      })

      editor.send({
        type: 'select',
        at: {
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 3,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 3,
          },
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 3,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: spanKey}],
            offset: 3,
          },
          backward: false,
        })
      })

      const newSpanKey = keyGenerator()

      editor.send({type: 'set', at: at(blockKey, spanKey), value: newSpanKey})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'block',
            style: 'normal',
            children: [
              {_key: newSpanKey, _type: 'span', text: 'foo', marks: []},
            ],
            markDefs: [],
          },
        ])
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [{_key: blockKey}, 'children', {_key: newSpanKey}],
            offset: 3,
          },
          focus: {
            path: [{_key: blockKey}, 'children', {_key: newSpanKey}],
            offset: 3,
          },
          backward: false,
        })
        expect(patches).toEqual([
          {
            type: 'set',
            path: [{_key: blockKey}, 'children', {_key: spanKey}, '_key'],
            value: newSpanKey,
            origin: 'local',
          },
        ])
      })
    },
  )

  test.each([
    {name: 'a keyed path', at: (blockKey: string) => [{_key: blockKey}]},
    {name: 'an index path', at: () => [0]},
  ])(
    'Scenario: undo and redo a block replacement by $name that changes its key',
    async ({at}) => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const replacementKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({blockObjects: [{name: 'image'}]}),
        initialValue: [{_key: blockKey, _type: 'image', title: 'foo'}],
      })

      editor.send({
        type: 'set',
        at: at(blockKey),
        value: {_key: replacementKey, _type: 'image', title: 'bar'},
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {_key: replacementKey, _type: 'image', title: 'bar'},
        ])
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {_key: blockKey, _type: 'image', title: 'foo'},
        ])
      })

      editor.send({type: 'history.redo'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {_key: replacementKey, _type: 'image', title: 'bar'},
        ])
      })
    },
  )

  test.each([
    {name: 'a keyed path', at: (blockKey: string) => [{_key: blockKey}]},
    {name: 'an index path', at: () => [0]},
  ])(
    'Scenario: undo and redo a block replacement by $name without a key',
    async ({at}) => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const patches: Array<Patch> = []
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({blockObjects: [{name: 'image'}]}),
        initialValue: [{_key: blockKey, _type: 'image', title: 'foo'}],
        children: (
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
        ),
      })

      editor.send({
        type: 'set',
        at: at(blockKey),
        value: {_type: 'image', title: 'bar'},
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {_key: 'k3', _type: 'image', title: 'bar'},
        ])
        expect(patches).toEqual([
          {
            type: 'set',
            path: [{_key: blockKey}],
            value: {_key: 'k3', _type: 'image', title: 'bar'},
            origin: 'local',
          },
        ])
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {_key: blockKey, _type: 'image', title: 'foo'},
        ])
      })

      editor.send({type: 'history.redo'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {_key: 'k3', _type: 'image', title: 'bar'},
        ])
      })
    },
  )

  test.each([
    {
      name: 'a keyed path without a key',
      at: (targetKey: string) => [{_key: targetKey}],
      ownKey: false,
    },
    {
      name: 'an index path without a key',
      at: () => [1],
      ownKey: false,
    },
    {
      name: 'a keyed path that changes its key',
      at: (targetKey: string) => [{_key: targetKey}],
      ownKey: true,
    },
    {
      name: 'an index path that changes its key',
      at: () => [1],
      ownKey: true,
    },
  ])(
    'Scenario: undo a block replacement by $name after a remote insert before it',
    async ({at, ownKey}) => {
      const keyGenerator = createTestKeyGenerator()
      const firstKey = keyGenerator()
      const targetKey = keyGenerator()
      const remoteKey = keyGenerator()
      const ownReplacementKey = keyGenerator()
      const value = ownKey
        ? {_key: ownReplacementKey, _type: 'image', title: 'baz'}
        : {_type: 'image', title: 'baz'}
      const replacementKey = ownKey ? ownReplacementKey : 'k6'
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({blockObjects: [{name: 'image'}]}),
        initialValue: [
          {_key: firstKey, _type: 'image', title: 'foo'},
          {_key: targetKey, _type: 'image', title: 'bar'},
        ],
      })

      editor.send({type: 'set', at: at(targetKey), value})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {_key: firstKey, _type: 'image', title: 'foo'},
          {_key: replacementKey, _type: 'image', title: 'baz'},
        ])
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'insert',
            origin: 'remote',
            path: [{_key: firstKey}],
            position: 'before',
            items: [{_key: remoteKey, _type: 'image', title: 'remote'}],
          },
        ],
        snapshot: [
          {_key: remoteKey, _type: 'image', title: 'remote'},
          {_key: firstKey, _type: 'image', title: 'foo'},
          {_key: replacementKey, _type: 'image', title: 'baz'},
        ],
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {_key: remoteKey, _type: 'image', title: 'remote'},
          {_key: firstKey, _type: 'image', title: 'foo'},
          {_key: replacementKey, _type: 'image', title: 'baz'},
        ])
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {_key: remoteKey, _type: 'image', title: 'remote'},
          {_key: firstKey, _type: 'image', title: 'foo'},
          {_key: targetKey, _type: 'image', title: 'bar'},
        ])
      })
    },
  )

  test('Scenario: undo a keyless item replacement by index after a remote insert before it', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({blockObjects: [{name: 'grid'}]}),
      initialValue: [{_key: blockKey, _type: 'grid', items: [{title: 'foo'}]}],
    })

    editor.send({type: 'set', at: [0, 'items', 0], value: {title: 'bar'}})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {_key: blockKey, _type: 'grid', items: [{_key: 'k3', title: 'bar'}]},
      ])
    })

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'insert',
          origin: 'remote',
          path: [{_key: blockKey}, 'items', 0],
          position: 'before',
          items: [{title: 'baz'}],
        },
      ],
      snapshot: [
        {
          _key: blockKey,
          _type: 'grid',
          items: [{title: 'baz'}, {_key: 'k3', title: 'bar'}],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'grid',
          items: [{title: 'baz'}, {_key: 'k3', title: 'bar'}],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'grid',
          items: [{title: 'baz'}, {title: 'foo'}],
        },
      ])
    })
  })

  test("Scenario: undo an item replacement by index that takes a sibling's key", async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const siblingKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({blockObjects: [{name: 'grid'}]}),
      initialValue: [
        {
          _key: blockKey,
          _type: 'grid',
          items: [{_key: siblingKey, title: 'foo'}, {title: 'bar'}],
        },
      ],
    })

    editor.send({
      type: 'set',
      at: [{_key: blockKey}, 'items', 1],
      value: {_key: siblingKey, title: 'baz'},
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'grid',
          items: [
            {_key: siblingKey, title: 'foo'},
            {_key: siblingKey, title: 'baz'},
          ],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'grid',
          items: [{_key: siblingKey, title: 'foo'}, {title: 'bar'}],
        },
      ])
    })
  })

  test('Scenario: undo an item replacement by index after a null item', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const replacementKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({blockObjects: [{name: 'grid'}]}),
      initialValue: [
        {_key: blockKey, _type: 'grid', items: [null, {title: 'foo'}]},
      ],
    })

    editor.send({
      type: 'set',
      at: [{_key: blockKey}, 'items', 1],
      value: {_key: replacementKey, title: 'bar'},
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'grid',
          items: [null, {_key: replacementKey, title: 'bar'}],
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {_key: blockKey, _type: 'grid', items: [null, {title: 'foo'}]},
      ])
    })
  })

  test.each([
    {
      name: 'a keyed path before a null item',
      at: (targetKey: string) => [{_key: targetKey}],
      sibling: 'null',
    },
    {
      name: 'an index path before a null item',
      at: () => [1],
      sibling: 'null',
    },
    {
      name: 'a keyed path whose new key a later item has',
      at: (targetKey: string) => [{_key: targetKey}],
      sibling: 'duplicate',
    },
    {
      name: 'an index path whose new key a later item has',
      at: () => [1],
      sibling: 'duplicate',
    },
  ])(
    'Scenario: undo and redo an item replacement by $name',
    async ({at, sibling}) => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const beforeKey = keyGenerator()
      const targetKey = keyGenerator()
      const replacementKey = keyGenerator()
      const lastItem =
        sibling === 'null' ? null : {_key: replacementKey, title: 'baz'}
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({blockObjects: [{name: 'grid'}]}),
        initialValue: [
          {
            _key: blockKey,
            _type: 'grid',
            items: [
              {_key: beforeKey, title: 'baz'},
              {_key: targetKey, title: 'foo'},
              lastItem,
            ],
          },
        ],
      })

      editor.send({
        type: 'set',
        at: [{_key: blockKey}, 'items', ...at(targetKey)],
        value: {_key: replacementKey, title: 'bar'},
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'grid',
            items: [
              {_key: beforeKey, title: 'baz'},
              {_key: replacementKey, title: 'bar'},
              lastItem,
            ],
          },
        ])
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'grid',
            items: [
              {_key: beforeKey, title: 'baz'},
              {_key: targetKey, title: 'foo'},
              lastItem,
            ],
          },
        ])
      })

      editor.send({type: 'history.redo'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'grid',
            items: [
              {_key: beforeKey, title: 'baz'},
              {_key: replacementKey, title: 'bar'},
              lastItem,
            ],
          },
        ])
      })
    },
  )

  test('Scenario: undo a replacement of a missing item that takes an existing key', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const siblingKey = keyGenerator()
    const missingKey = keyGenerator()
    const patches: Array<Patch> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({blockObjects: [{name: 'grid'}]}),
      initialValue: [
        {
          _key: blockKey,
          _type: 'grid',
          items: [{_key: siblingKey, title: 'foo'}],
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'set',
      at: [{_key: blockKey}, 'items', {_key: missingKey}],
      value: {_key: siblingKey, title: 'bar'},
    })

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          type: 'set',
          origin: 'local',
          path: [{_key: blockKey}, 'items', {_key: missingKey}],
          value: {_key: siblingKey, title: 'bar'},
        },
      ])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'grid',
          items: [{_key: siblingKey, title: 'foo'}],
        },
      ])
    })
  })

  test.each([
    {selector: 'an index path', sibling: 'before'},
    {selector: 'an index path', sibling: 'after'},
    {selector: 'a keyed path', sibling: 'before'},
    {selector: 'a keyed path', sibling: 'after'},
  ])(
    'Scenario: undo and redo a `_key` rename by $selector onto the key of a sibling $sibling it',
    async ({selector, sibling}) => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const targetKey = keyGenerator()
      const siblingKey = keyGenerator()
      const siblingItem = {_key: siblingKey, title: 'baz'}
      const targetItem = {_key: targetKey, title: 'foo'}
      const renamedItem = {_key: siblingKey, title: 'foo'}
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({blockObjects: [{name: 'grid'}]}),
        initialValue: [
          {
            _key: blockKey,
            _type: 'grid',
            items:
              sibling === 'before'
                ? [siblingItem, targetItem]
                : [targetItem, siblingItem],
          },
        ],
      })

      editor.send({
        type: 'set',
        at: [
          {_key: blockKey},
          'items',
          selector === 'a keyed path'
            ? {_key: targetKey}
            : sibling === 'before'
              ? 1
              : 0,
          '_key',
        ],
        value: siblingKey,
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'grid',
            items:
              sibling === 'before'
                ? [siblingItem, renamedItem]
                : [renamedItem, siblingItem],
          },
        ])
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'grid',
            items:
              sibling === 'before'
                ? [siblingItem, targetItem]
                : [targetItem, siblingItem],
          },
        ])
      })

      editor.send({type: 'history.redo'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'grid',
            items:
              sibling === 'before'
                ? [siblingItem, renamedItem]
                : [renamedItem, siblingItem],
          },
        ])
      })
    },
  )

  test.each([
    {
      name: 'a keyed path',
      at: (lastKey: string) => [{_key: lastKey}, 'alt'],
    },
    {name: 'a negative index path', at: () => [-1, 'alt']},
  ])(
    'Scenario: set by $name of a property on the last block object',
    async ({at}) => {
      const keyGenerator = createTestKeyGenerator()
      const firstKey = keyGenerator()
      const lastKey = keyGenerator()
      const patches: Array<Patch> = []
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({blockObjects: [{name: 'image'}]}),
        initialValue: [
          {_key: firstKey, _type: 'image', alt: 'foo'},
          {_key: lastKey, _type: 'image', alt: 'bar'},
        ],
        children: (
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
        ),
      })

      editor.send({type: 'set', at: at(lastKey), value: 'baz'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {_key: firstKey, _type: 'image', alt: 'foo'},
          {_key: lastKey, _type: 'image', alt: 'baz'},
        ])
        expect(patches).toEqual([
          {
            type: 'set',
            path: [{_key: lastKey}, 'alt'],
            value: 'baz',
            origin: 'local',
          },
        ])
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {_key: firstKey, _type: 'image', alt: 'foo'},
          {_key: lastKey, _type: 'image', alt: 'bar'},
        ])
      })
    },
  )

  test.each([
    {
      name: 'a keyed path',
      at: (blockKey: string, rowKey: string, itemKey: string) => [
        {_key: blockKey},
        'rows',
        {_key: rowKey},
        'items',
        {_key: itemKey},
        'title',
      ],
    },
    {
      name: 'a negative index path',
      at: (blockKey: string) => [
        {_key: blockKey},
        'rows',
        -1,
        'items',
        -1,
        'title',
      ],
    },
  ])(
    'Scenario: undo a set by $name after a remote row insert',
    async ({at}) => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const rowKey = keyGenerator()
      const itemKey = keyGenerator()
      const remoteRowKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({blockObjects: [{name: 'grid'}]}),
        initialValue: [
          {
            _key: blockKey,
            _type: 'grid',
            rows: [{_key: rowKey, items: [{_key: itemKey, title: 'foo'}]}],
          },
        ],
      })

      editor.send({
        type: 'set',
        at: at(blockKey, rowKey, itemKey),
        value: 'bar',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'grid',
            rows: [{_key: rowKey, items: [{_key: itemKey, title: 'bar'}]}],
          },
        ])
      })

      editor.send({
        type: 'patches',
        patches: [
          {
            type: 'insert',
            origin: 'remote',
            path: [{_key: blockKey}, 'rows', {_key: rowKey}],
            position: 'after',
            items: [
              {_key: remoteRowKey, items: [{_key: itemKey, title: 'baz'}]},
            ],
          },
        ],
        snapshot: [
          {
            _key: blockKey,
            _type: 'grid',
            rows: [
              {_key: rowKey, items: [{_key: itemKey, title: 'bar'}]},
              {_key: remoteRowKey, items: [{_key: itemKey, title: 'baz'}]},
            ],
          },
        ],
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'grid',
            rows: [
              {_key: rowKey, items: [{_key: itemKey, title: 'bar'}]},
              {_key: remoteRowKey, items: [{_key: itemKey, title: 'baz'}]},
            ],
          },
        ])
      })

      editor.send({type: 'history.undo'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'grid',
            rows: [
              {_key: rowKey, items: [{_key: itemKey, title: 'foo'}]},
              {_key: remoteRowKey, items: [{_key: itemKey, title: 'baz'}]},
            ],
          },
        ])
      })
    },
  )

  test.each([
    {
      name: 'a block index below the first block',
      at: [-2],
      value: {_type: 'list', alt: 'baz'},
    },
    {
      name: 'a block index past the last block',
      at: [1],
      value: {_type: 'list', alt: 'baz'},
    },
    {
      name: 'a block index below the first block',
      at: [-2, 'alt'],
      value: 'baz',
    },
    {
      name: 'a block index past the last block',
      at: [1, 'alt'],
      value: 'baz',
    },
    {
      name: 'an item index below the first item',
      at: [0, 'items', -2],
      value: {title: 'baz'},
    },
    {
      name: 'an item index past the last item',
      at: [0, 'items', 1],
      value: {title: 'baz'},
    },
    {
      name: 'an item index below the first item',
      at: [0, 'items', -2, 'title'],
      value: 'baz',
    },
    {
      name: 'an item index past the last item',
      at: [0, 'items', 1, 'title'],
      value: 'baz',
    },
  ])('Scenario: set at $at with $name changes nothing', async ({at, value}) => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const itemKey = keyGenerator()
    const patches: Array<Patch> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({blockObjects: [{name: 'list'}]}),
      initialValue: [
        {
          _key: blockKey,
          _type: 'list',
          alt: 'foo',
          items: [{_key: itemKey, title: 'foo'}],
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
    })

    editor.send({type: 'set', at, value})

    editor.send({type: 'set', at: [{_key: blockKey}, 'alt'], value: 'bar'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'list',
          alt: 'bar',
          items: [{_key: itemKey, title: 'foo'}],
        },
      ])
      expect(patches).toEqual([
        {
          type: 'set',
          path: [{_key: blockKey}, 'alt'],
          value: 'bar',
          origin: 'local',
        },
      ])
    })
  })

  test.each([
    {
      name: 'a keyed path',
      at: ({
        tableKey,
        rowKey,
        cellKey,
        blockKey,
        spanKey,
      }: {
        tableKey: string
        rowKey: string
        cellKey: string
        blockKey: string
        spanKey: string
      }) => [
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: spanKey},
        'text',
      ],
    },
    {
      name: 'an index path',
      at: () => [0, 'rows', 0, 'cells', 0, 'content', 0, 'children', 0, 'text'],
    },
    {
      name: 'a negative index path',
      at: () => [
        -1,
        'rows',
        -1,
        'cells',
        -1,
        'content',
        -1,
        'children',
        -1,
        'text',
      ],
    },
  ])(
    "Scenario: set of a span's text by $name clamps a caret in the span in a table cell",
    async ({at}) => {
      const keyGenerator = createTestKeyGenerator()
      const tableKey = keyGenerator()
      const rowKey = keyGenerator()
      const cellKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const keys = {tableKey, rowKey, cellKey, blockKey, spanKey}
      const spanPath = [
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
      const patches: Array<Patch> = []
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: tableSchemaDefinition,
        initialValue: tableCellValue(keys, 'foo'),
        children: (
          <>
            <NodePlugin nodes={tableContainers} />
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
          anchor: {path: spanPath, offset: 3},
          focus: {path: spanPath, offset: 3},
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: spanPath, offset: 3},
          focus: {path: spanPath, offset: 3},
          backward: false,
        })
      })

      editor.send({type: 'set', at: at(keys), value: 'fo'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual(
          tableCellValue(keys, 'fo'),
        )
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: spanPath, offset: 2},
          focus: {path: spanPath, offset: 2},
          backward: false,
        })
        expect(patches).toEqual([
          {
            type: 'set',
            path: [...spanPath, 'text'],
            value: 'fo',
            origin: 'local',
          },
        ])
      })
    },
  )

  test.each([
    {
      name: 'a keyed path',
      at: ({
        tableKey,
        rowKey,
        cellKey,
        calloutKey,
        blockKey,
        spanKey,
      }: {
        tableKey: string
        rowKey: string
        cellKey: string
        calloutKey: string
        blockKey: string
        spanKey: string
      }) => [
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: calloutKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: spanKey},
        'text',
      ],
    },
    {
      name: 'an index path',
      at: () => [
        0,
        'rows',
        0,
        'cells',
        0,
        'content',
        0,
        'content',
        0,
        'children',
        0,
        'text',
      ],
    },
    {
      name: 'a negative index path',
      at: () => [
        -1,
        'rows',
        -1,
        'cells',
        -1,
        'content',
        -1,
        'content',
        -1,
        'children',
        -1,
        'text',
      ],
    },
  ])(
    "Scenario: set of a span's text by $name clamps a caret in the span in a callout in a table cell",
    async ({at}) => {
      const keyGenerator = createTestKeyGenerator()
      const tableKey = keyGenerator()
      const rowKey = keyGenerator()
      const cellKey = keyGenerator()
      const calloutKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const keys = {tableKey, rowKey, cellKey, calloutKey, blockKey, spanKey}
      const spanPath = [
        {_key: tableKey},
        'rows',
        {_key: rowKey},
        'cells',
        {_key: cellKey},
        'content',
        {_key: calloutKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: spanKey},
      ]
      const patches: Array<Patch> = []
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: tableSchemaDefinition,
        initialValue: calloutInTableCellValue(keys, 'foo'),
        children: (
          <>
            <NodePlugin nodes={tableContainers} />
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
          anchor: {path: spanPath, offset: 3},
          focus: {path: spanPath, offset: 3},
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: spanPath, offset: 3},
          focus: {path: spanPath, offset: 3},
          backward: false,
        })
      })

      editor.send({type: 'set', at: at(keys), value: 'fo'})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual(
          calloutInTableCellValue(keys, 'fo'),
        )
        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {path: spanPath, offset: 2},
          focus: {path: spanPath, offset: 2},
          backward: false,
        })
        expect(patches).toEqual([
          {
            type: 'set',
            path: [...spanPath, 'text'],
            value: 'fo',
            origin: 'local',
          },
        ])
      })
    },
  )
})

const tableSchemaDefinition = defineSchema({
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

const tableContainers = [
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
  defineContainer({
    type: 'callout',
    arrayField: 'content',
    render: ({children}) => <>{children}</>,
  }),
]

function tableCellValue(
  keys: {
    tableKey: string
    rowKey: string
    cellKey: string
    blockKey: string
    spanKey: string
  },
  text: string,
) {
  return [
    {
      _key: keys.tableKey,
      _type: 'table',
      rows: [
        {
          _key: keys.rowKey,
          _type: 'row',
          cells: [
            {
              _key: keys.cellKey,
              _type: 'cell',
              content: [textBlock(keys.blockKey, keys.spanKey, text)],
            },
          ],
        },
      ],
    },
  ]
}

function calloutInTableCellValue(
  keys: {
    tableKey: string
    rowKey: string
    cellKey: string
    calloutKey: string
    blockKey: string
    spanKey: string
  },
  text: string,
) {
  return [
    {
      _key: keys.tableKey,
      _type: 'table',
      rows: [
        {
          _key: keys.rowKey,
          _type: 'row',
          cells: [
            {
              _key: keys.cellKey,
              _type: 'cell',
              content: [
                {
                  _key: keys.calloutKey,
                  _type: 'callout',
                  content: [textBlock(keys.blockKey, keys.spanKey, text)],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
}

function textBlock(blockKey: string, spanKey: string, text: string) {
  return {
    _key: blockKey,
    _type: 'block',
    style: 'normal',
    children: [{_key: spanKey, _type: 'span', text, marks: []}],
    markDefs: [],
  }
}
