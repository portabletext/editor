import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema, type Patch, type Path} from '../src'
import {EventListenerPlugin} from '../src/plugins'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

describe('event.insert', () => {
  test('Scenario: insert a node into an array', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
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

    editor.send({
      type: 'insert',
      at: [{_key: 'b0'}, 'children', {_key: 's0'}],
      value: {_key: 's1', _type: 'span', text: 'bar', marks: ['strong']},
      position: 'after',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          style: 'normal',
          children: [
            {_key: 's0', _type: 'span', text: 'foo', marks: []},
            {_key: 's1', _type: 'span', text: 'bar', marks: ['strong']},
          ],
          markDefs: [],
        },
      ])
    })
  })

  test.each([
    {
      name: 'a keyed path',
      at: (keys: {fooBlockKey: string; barBlockKey: string}) => [
        {_key: keys.fooBlockKey},
      ],
    },
    {name: 'an index path', at: () => [0]},
  ])(
    'Scenario: insert after a block by $name leaves a caret in a later block alone',
    async ({at}) => {
      const keyGenerator = createTestKeyGenerator()
      const fooBlockKey = keyGenerator()
      const fooSpanKey = keyGenerator()
      const barBlockKey = keyGenerator()
      const barSpanKey = keyGenerator()
      const bazBlockKey = keyGenerator()
      const bazSpanKey = keyGenerator()
      const patches: Array<Patch> = []
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _key: fooBlockKey,
            _type: 'block',
            style: 'normal',
            children: [
              {_key: fooSpanKey, _type: 'span', text: 'foo', marks: []},
            ],
            markDefs: [],
          },
          {
            _key: barBlockKey,
            _type: 'block',
            style: 'normal',
            children: [
              {_key: barSpanKey, _type: 'span', text: 'bar', marks: []},
            ],
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

      editor.send({
        type: 'insert',
        at: at({fooBlockKey, barBlockKey}),
        position: 'after',
        value: {
          _key: bazBlockKey,
          _type: 'block',
          style: 'normal',
          children: [{_key: bazSpanKey, _type: 'span', text: 'baz', marks: []}],
          markDefs: [],
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: fooBlockKey,
            _type: 'block',
            style: 'normal',
            children: [
              {_key: fooSpanKey, _type: 'span', text: 'foo', marks: []},
            ],
            markDefs: [],
          },
          {
            _key: bazBlockKey,
            _type: 'block',
            style: 'normal',
            children: [
              {_key: bazSpanKey, _type: 'span', text: 'baz', marks: []},
            ],
            markDefs: [],
          },
          {
            _key: barBlockKey,
            _type: 'block',
            style: 'normal',
            children: [
              {_key: barSpanKey, _type: 'span', text: 'bar', marks: []},
            ],
            markDefs: [],
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
        expect(patches).toEqual([
          {
            type: 'insert',
            path: [{_key: fooBlockKey}],
            position: 'after',
            items: [
              {
                _key: bazBlockKey,
                _type: 'block',
                style: 'normal',
                children: [
                  {_key: bazSpanKey, _type: 'span', text: 'baz', marks: []},
                ],
                markDefs: [],
              },
            ],
            origin: 'local',
          },
        ])
      })
    },
  )

  test.each([
    {
      name: 'a keyed path',
      at: (keys: {fooBlockKey: string; barBlockKey: string}) => [
        {_key: keys.barBlockKey},
      ],
    },
    {name: 'an index path', at: () => [1]},
  ])(
    'Scenario: insert before a block by $name leaves a caret in a later block alone',
    async ({at}) => {
      const keyGenerator = createTestKeyGenerator()
      const fooBlockKey = keyGenerator()
      const fooSpanKey = keyGenerator()
      const barBlockKey = keyGenerator()
      const barSpanKey = keyGenerator()
      const bazBlockKey = keyGenerator()
      const bazSpanKey = keyGenerator()
      const patches: Array<Patch> = []
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: [
          {
            _key: fooBlockKey,
            _type: 'block',
            style: 'normal',
            children: [
              {_key: fooSpanKey, _type: 'span', text: 'foo', marks: []},
            ],
            markDefs: [],
          },
          {
            _key: barBlockKey,
            _type: 'block',
            style: 'normal',
            children: [
              {_key: barSpanKey, _type: 'span', text: 'bar', marks: []},
            ],
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

      editor.send({
        type: 'insert',
        at: at({fooBlockKey, barBlockKey}),
        position: 'before',
        value: {
          _key: bazBlockKey,
          _type: 'block',
          style: 'normal',
          children: [{_key: bazSpanKey, _type: 'span', text: 'baz', marks: []}],
          markDefs: [],
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: fooBlockKey,
            _type: 'block',
            style: 'normal',
            children: [
              {_key: fooSpanKey, _type: 'span', text: 'foo', marks: []},
            ],
            markDefs: [],
          },
          {
            _key: bazBlockKey,
            _type: 'block',
            style: 'normal',
            children: [
              {_key: bazSpanKey, _type: 'span', text: 'baz', marks: []},
            ],
            markDefs: [],
          },
          {
            _key: barBlockKey,
            _type: 'block',
            style: 'normal',
            children: [
              {_key: barSpanKey, _type: 'span', text: 'bar', marks: []},
            ],
            markDefs: [],
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
        expect(patches).toEqual([
          {
            type: 'insert',
            path: [{_key: barBlockKey}],
            position: 'before',
            items: [
              {
                _key: bazBlockKey,
                _type: 'block',
                style: 'normal',
                children: [
                  {_key: bazSpanKey, _type: 'span', text: 'baz', marks: []},
                ],
                markDefs: [],
              },
            ],
            origin: 'local',
          },
        ])
      })
    },
  )

  test.each([
    {
      name: 'a keyed path',
      at: (blockKey: string) => [{_key: blockKey}, 'items', 0],
    },
    {name: 'an index path', at: () => [0, 'items', 0]},
  ])(
    'Scenario: insert by $name into an empty object array field',
    async ({at}) => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const itemKey = keyGenerator()
      const patches: Array<Patch> = []
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({blockObjects: [{name: 'list'}]}),
        initialValue: [{_key: blockKey, _type: 'list', items: []}],
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
        type: 'insert',
        at: at(blockKey),
        position: 'before',
        value: {_key: itemKey, _type: 'item', title: 'foo'},
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'list',
            items: [{_key: itemKey, _type: 'item', title: 'foo'}],
          },
        ])
        expect(patches).toEqual([
          {
            type: 'setIfMissing',
            path: [{_key: blockKey}, 'items'],
            value: [],
            origin: 'local',
          },
          {
            type: 'insert',
            path: [{_key: blockKey}, 'items', 0],
            position: 'before',
            items: [{_key: itemKey, _type: 'item', title: 'foo'}],
            origin: 'local',
          },
        ])
      })
    },
  )

  test.each([
    {
      name: 'a keyed path',
      at: (blockKey: string, lastItemKey: string) => [
        {_key: blockKey},
        'items',
        {_key: lastItemKey},
      ],
    },
    {
      name: 'a negative item index path',
      at: (blockKey: string) => [{_key: blockKey}, 'items', -1],
    },
    {
      name: 'a negative index path',
      at: () => [-1, 'items', -1],
    },
  ])(
    'Scenario: insert by $name after the last item in an object array field',
    async ({at}) => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const fooItemKey = keyGenerator()
      const barItemKey = keyGenerator()
      const bazItemKey = keyGenerator()
      const patches: Array<Patch> = []
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({blockObjects: [{name: 'list'}]}),
        initialValue: [
          {
            _key: blockKey,
            _type: 'list',
            items: [
              {_key: fooItemKey, _type: 'item', title: 'foo'},
              {_key: barItemKey, _type: 'item', title: 'bar'},
            ],
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
        type: 'insert',
        at: at(blockKey, barItemKey),
        position: 'after',
        value: {_key: bazItemKey, _type: 'item', title: 'baz'},
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'list',
            items: [
              {_key: fooItemKey, _type: 'item', title: 'foo'},
              {_key: barItemKey, _type: 'item', title: 'bar'},
              {_key: bazItemKey, _type: 'item', title: 'baz'},
            ],
          },
        ])
        expect(patches).toEqual([
          {
            type: 'setIfMissing',
            path: [{_key: blockKey}, 'items'],
            value: [],
            origin: 'local',
          },
          {
            type: 'insert',
            path: [{_key: blockKey}, 'items', {_key: barItemKey}],
            position: 'after',
            items: [{_key: bazItemKey, _type: 'item', title: 'baz'}],
            origin: 'local',
          },
        ])
      })
    },
  )

  test.each([
    {
      name: 'a keyed path',
      at: (blockKey: string, itemKey: string) => [
        {_key: blockKey},
        'items',
        {_key: itemKey},
      ],
    },
    {name: 'an index path', at: () => [0, 'items', 0]},
    {name: 'a negative index path', at: () => [-1, 'items', -1]},
  ])(
    'Scenario: insert by $name of a node whose key a sibling uses generates a new key',
    async ({at}) => {
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
            items: [{_key: itemKey, _type: 'item', title: 'foo'}],
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
        type: 'insert',
        at: at(blockKey, itemKey),
        position: 'after',
        value: {_key: itemKey, _type: 'item', title: 'bar'},
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: blockKey,
            _type: 'list',
            items: [
              {_key: itemKey, _type: 'item', title: 'foo'},
              {_key: 'k4', _type: 'item', title: 'bar'},
            ],
          },
        ])
        expect(patches).toEqual([
          {
            type: 'setIfMissing',
            path: [{_key: blockKey}, 'items'],
            value: [],
            origin: 'local',
          },
          {
            type: 'insert',
            path: [{_key: blockKey}, 'items', {_key: itemKey}],
            position: 'after',
            items: [{_key: 'k4', _type: 'item', title: 'bar'}],
            origin: 'local',
          },
        ])
      })
    },
  )

  test.each([
    {
      name: 'a block object in a table cell',
      listPath: (keys: NestedKeys): Path => [
        ...nestedCellPath(keys),
        'content',
        {_key: keys.list},
      ],
      wrap: (_keys: NestedKeys, list: object) => list,
    },
    {
      name: 'a block object in a callout in a table cell',
      listPath: (keys: NestedKeys): Path => [
        ...nestedCellPath(keys),
        'content',
        {_key: keys.callout},
        'content',
        {_key: keys.list},
      ],
      wrap: (keys: NestedKeys, list: object) => ({
        _key: keys.callout,
        _type: 'callout',
        content: [list],
      }),
    },
  ])(
    'Scenario: insert into an object array field of $name of a node whose key a sibling uses generates a new key',
    async ({listPath, wrap}) => {
      const keyGenerator = createTestKeyGenerator()
      const keys = createNestedKeys(keyGenerator)
      const patches: Array<Patch> = []
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: nestedTableSchema,
        initialValue: [
          nestedTable(
            keys,
            wrap(keys, {
              _key: keys.list,
              _type: 'list',
              items: [{_key: keys.item, _type: 'item', title: 'foo'}],
            }),
          ),
        ],
        children: (
          <>
            <NodePlugin nodes={nestedTableContainers} />
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
      const itemsPath = [...listPath(keys), 'items']

      editor.send({
        type: 'insert',
        at: [...itemsPath, {_key: keys.item}],
        position: 'after',
        value: {_key: keys.item, _type: 'item', title: 'bar'},
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          nestedTable(
            keys,
            wrap(keys, {
              _key: keys.list,
              _type: 'list',
              items: [
                {_key: keys.item, _type: 'item', title: 'foo'},
                {_key: 'k10', _type: 'item', title: 'bar'},
              ],
            }),
          ),
        ])
        expect(patches).toEqual([
          {
            type: 'setIfMissing',
            path: itemsPath,
            value: [],
            origin: 'local',
          },
          {
            type: 'insert',
            path: [...itemsPath, {_key: keys.item}],
            position: 'after',
            items: [{_key: 'k10', _type: 'item', title: 'bar'}],
            origin: 'local',
          },
        ])
      })
    },
  )

  test('Scenario: insert into an object array in an object field of a block object in a table cell of a node whose key a sibling uses generates a new key', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = createNestedKeys(keyGenerator)
    const patches: Array<Patch> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: nestedTableSchema,
      initialValue: [
        nestedTable(keys, {
          _key: keys.list,
          _type: 'list',
          meta: {items: [{_key: keys.item, _type: 'item', title: 'foo'}]},
        }),
      ],
      children: (
        <>
          <NodePlugin nodes={nestedTableContainers} />
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
    const itemsPath: Path = [
      ...nestedCellPath(keys),
      'content',
      {_key: keys.list},
      'meta',
      'items',
    ]

    editor.send({
      type: 'insert',
      at: [...itemsPath, {_key: keys.item}],
      position: 'after',
      value: {_key: keys.item, _type: 'item', title: 'bar'},
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        nestedTable(keys, {
          _key: keys.list,
          _type: 'list',
          meta: {
            items: [
              {_key: keys.item, _type: 'item', title: 'foo'},
              {_key: 'k10', _type: 'item', title: 'bar'},
            ],
          },
        }),
      ])
      expect(patches).toEqual([
        {
          type: 'setIfMissing',
          path: itemsPath,
          value: [],
          origin: 'local',
        },
        {
          type: 'insert',
          path: [...itemsPath, {_key: keys.item}],
          position: 'after',
          items: [{_key: 'k10', _type: 'item', title: 'bar'}],
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: insert into a Portable Text field of a block object in a table cell of a block whose key a sibling uses generates a new key', async () => {
    const keyGenerator = createTestKeyGenerator()
    const keys = createNestedKeys(keyGenerator)
    const bodyBlockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const patches: Array<Patch> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: nestedTableSchema,
      initialValue: [
        nestedTable(keys, {
          _key: keys.list,
          _type: 'list',
          body: [nestedTextBlock(bodyBlockKey, fooSpanKey, 'foo')],
        }),
      ],
      children: (
        <>
          <NodePlugin nodes={nestedTableContainers} />
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
    const bodyPath: Path = [
      ...nestedCellPath(keys),
      'content',
      {_key: keys.list},
      'body',
    ]

    editor.send({
      type: 'insert',
      at: [...bodyPath, {_key: bodyBlockKey}],
      position: 'after',
      value: nestedTextBlock(bodyBlockKey, barSpanKey, 'bar'),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        nestedTable(keys, {
          _key: keys.list,
          _type: 'list',
          body: [
            nestedTextBlock(bodyBlockKey, fooSpanKey, 'foo'),
            nestedTextBlock('k13', barSpanKey, 'bar'),
          ],
        }),
      ])
      expect(patches).toEqual([
        {
          type: 'setIfMissing',
          path: bodyPath,
          value: [],
          origin: 'local',
        },
        {
          type: 'insert',
          path: [...bodyPath, {_key: bodyBlockKey}],
          position: 'after',
          items: [nestedTextBlock('k13', barSpanKey, 'bar')],
          origin: 'local',
        },
      ])
    })
  })

  test('Scenario: insert into an array of strings leaves a repeated string as given', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const patches: Array<Patch> = []
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({blockObjects: [{name: 'list'}]}),
      initialValue: [{_key: blockKey, _type: 'list', tags: ['foo']}],
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
      type: 'insert',
      at: [{_key: blockKey}, 'tags', 0],
      position: 'after',
      value: 'foo' as never,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {_key: blockKey, _type: 'list', tags: ['foo', 'foo']},
      ])
      expect(patches).toEqual([
        {
          type: 'setIfMissing',
          path: [{_key: blockKey}, 'tags'],
          value: [],
          origin: 'local',
        },
        {
          type: 'insert',
          path: [{_key: blockKey}, 'tags', 0],
          position: 'after',
          items: ['foo'],
          origin: 'local',
        },
      ])
    })
  })

  test.each([
    {
      name: 'a block index below the first block',
      at: [-2],
      position: 'before' as const,
      value: (key: string) => ({
        _key: key,
        _type: 'list',
        alt: 'baz',
        items: [],
      }),
    },
    {
      name: 'a block index past the last block',
      at: [1],
      position: 'before' as const,
      value: (key: string) => ({
        _key: key,
        _type: 'list',
        alt: 'baz',
        items: [],
      }),
    },
    {
      name: 'a block index past the last block',
      at: [1],
      position: 'after' as const,
      value: (key: string) => ({
        _key: key,
        _type: 'list',
        alt: 'baz',
        items: [],
      }),
    },
    {
      name: 'an item index below the first item',
      at: [0, 'items', -2],
      position: 'before' as const,
      value: (key: string) => ({_key: key, _type: 'item', title: 'baz'}),
    },
    {
      name: 'an item index past the last item',
      at: [0, 'items', 1],
      position: 'after' as const,
      value: (key: string) => ({_key: key, _type: 'item', title: 'baz'}),
    },
  ])(
    'Scenario: insert $position $at with $name changes nothing',
    async ({at, position, value}) => {
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

      editor.send({type: 'insert', at, position, value: value(keyGenerator())})

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
    },
  )

  test.each([
    {at: [0, 'content', 0], position: 'before' as const},
    {at: [0, 'content', 0], position: 'after' as const},
    {at: [0, 'content', -1], position: 'before' as const},
    {at: [0, 'content', -1], position: 'after' as const},
  ])(
    'Scenario: insert $position $at into an empty container',
    async ({at, position}) => {
      const keyGenerator = createTestKeyGenerator()
      const boxKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()
      const emptyBoxKey = keyGenerator()
      const block = {
        _key: blockKey,
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
      }
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          blockObjects: [
            {
              name: 'box',
              fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
            },
          ],
        }),
        initialValue: [{_key: boxKey, _type: 'box', content: [block]}],
        children: (
          <NodePlugin
            nodes={[
              defineContainer({
                type: 'box',
                arrayField: 'content',
                render: ({children}) => <>{children}</>,
              }),
            ]}
          />
        ),
      })

      editor.send({
        type: 'set',
        at: [0],
        value: {_key: emptyBoxKey, _type: 'box', content: []},
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {_key: emptyBoxKey, _type: 'box', content: []},
        ])
      })

      editor.send({type: 'insert', at, position, value: block})

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {_key: emptyBoxKey, _type: 'box', content: [block]},
        ])
      })
    },
  )
})

const nestedTableSchema = defineSchema({
  blockObjects: [
    {
      name: 'list',
      fields: [
        {name: 'items', type: 'array'},
        {name: 'meta', type: 'object'},
        {
          name: 'body',
          type: 'array',
          of: [{type: 'block', decorators: [{name: 'strong'}]}],
        },
      ],
    },
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'list'}],
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
                          of: [
                            {type: 'block'},
                            {type: 'list'},
                            {type: 'callout'},
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

const nestedTableContainers = [
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
  defineContainer({type: 'callout', arrayField: 'content'}),
]

type NestedKeys = ReturnType<typeof createNestedKeys>

function createNestedKeys(keyGenerator: () => string) {
  return {
    table: keyGenerator(),
    row: keyGenerator(),
    cell: keyGenerator(),
    text: keyGenerator(),
    span: keyGenerator(),
    callout: keyGenerator(),
    list: keyGenerator(),
    item: keyGenerator(),
  }
}

function nestedCellPath(keys: NestedKeys): Path {
  return [
    {_key: keys.table},
    'rows',
    {_key: keys.row},
    'cells',
    {_key: keys.cell},
  ]
}

function nestedTable(keys: NestedKeys, cellBlockObject: object) {
  return {
    _key: keys.table,
    _type: 'table',
    rows: [
      {
        _key: keys.row,
        _type: 'row',
        cells: [
          {
            _key: keys.cell,
            _type: 'cell',
            content: [
              nestedTextBlock(keys.text, keys.span, 'baz'),
              cellBlockObject,
            ],
          },
        ],
      },
    ],
  }
}

function nestedTextBlock(blockKey: string, spanKey: string, text: string) {
  return {
    _key: blockKey,
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: [{_key: spanKey, _type: 'span', text, marks: []}],
  }
}
