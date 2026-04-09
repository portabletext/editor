import type {Patch} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {execute} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import type {InsertPlacement} from '../src/behaviors/behavior.types.event'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {RendererPlugin} from '../src/plugins/plugin.renderer'
import {getFocusBlock} from '../src/selectors/selector.get-focus-block'
import {createTestEditor} from '../src/test/vitest'

describe('event.insert.block', () => {
  test('Scenario: Inserting block with custom _key', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({}),
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [
          {
            _key: 'k1',
            _type: 'span',
            text: '',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])

    editor.send({
      type: 'insert.block',
      block: {
        _type: 'block',
        _key: 'custom key',
        children: [
          {
            _type: 'span',
            text: 'foo',
          },
        ],
      },
      placement: 'auto',
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'custom key',
        _type: 'block',
        children: [
          {
            _key: 'k2',
            _type: 'span',
            text: 'foo',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('Scenario: Inserting two blocks with same custom _key', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({}),
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [
          {
            _key: 'k1',
            _type: 'span',
            text: '',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])

    editor.send({
      type: 'insert.block',
      block: {
        _type: 'block',
        _key: 'custom key',
        children: [
          {
            _type: 'span',
            text: 'foo',
          },
        ],
      },
      placement: 'auto',
    })

    editor.send({
      type: 'insert.block',
      block: {
        _type: 'block',
        _key: 'custom key',
        children: [
          {
            _type: 'span',
            text: 'bar',
          },
        ],
      },
      placement: 'after',
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'custom key',
        _type: 'block',
        children: [
          {
            _key: 'k2',
            _type: 'span',
            text: 'foo',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
      {
        _key: 'k4',
        _type: 'block',
        children: [
          {
            _key: 'k3',
            _type: 'span',
            text: 'bar',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('Scenario: Stripping unknown text block props', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({lists: [{name: 'bullet'}]}),
    })

    editor.send({
      type: 'insert.block',
      block: {
        _type: 'block',
        children: [
          {
            _type: 'span',
            text: 'foo',
          },
        ],
        foo: 'bar', // <-- unknown prop
        baz: {
          fizz: 'buzz',
        }, // <-- unknown prop
        listItem: 'bullet', // <-- known prop, in the schema
        level: 1, // <-- known prop that doesn't need to be in the schema
        style: 'h1', // <-- known prop, but not in the schema
      },
      placement: 'after',
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [
          {
            _key: 'k1',
            _type: 'span',
            text: '',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
      {
        _key: 'k2',
        _type: 'block',
        children: [
          {
            _key: 'k3',
            _type: 'span',
            text: 'foo',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
        listItem: 'bullet',
        level: 1,
      },
    ])
  })

  test('Scenario: Stripping unknown span props', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({}),
    })

    editor.send({
      type: 'insert.block',
      block: {
        _type: 'block',
        children: [
          {
            _type: 'span',
            text: 'foo',
            foo: 'bar', // <-- unknown prop
            baz: {
              fizz: 'buzz',
            }, // <-- unknown prop
          },
        ],
      },
      placement: 'after',
    })

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [
          {
            _key: 'k1',
            _type: 'span',
            text: '',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
      {
        _key: 'k2',
        _type: 'block',
        children: [
          {
            _key: 'k3',
            _type: 'span',
            text: 'foo',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('Scenario: Inserting block in an empty editor', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({}),
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior<{placement: InsertPlacement; text: string}>({
              on: 'custom.insert',
              actions: [
                ({snapshot, event}) => {
                  const focusBlock = getFocusBlock(snapshot)

                  if (!focusBlock) {
                    return []
                  }

                  return [
                    execute({
                      type: 'delete.block',
                      at: focusBlock.path,
                    }),
                    execute({
                      type: 'insert.block',
                      block: {
                        _key: snapshot.context.keyGenerator(),
                        _type: snapshot.context.schema.block.name,
                        children: [
                          {
                            _key: snapshot.context.keyGenerator(),
                            _type: 'span',
                            text: event.text,
                          },
                        ],
                      },
                      placement: event.placement,
                      select: 'end',
                    }),
                  ]
                },
              ],
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [
            {
              _key: 'k1',
              _type: 'span',
              marks: [],
              text: '',
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({type: 'focus'})
    editor.send({
      type: 'custom.insert',
      placement: 'auto',
      text: 'foo',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k2',
          _type: 'block',
          children: [
            {
              _key: 'k3',
              _type: 'span',
              marks: [],
              text: 'foo',
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({type: 'focus'})
    editor.send({
      type: 'custom.insert',
      placement: 'auto',
      text: 'bar',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k4',
          _type: 'block',
          children: [
            {
              _key: 'k5',
              _type: 'span',
              marks: [],
              text: 'bar',
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({type: 'focus'})
    editor.send({
      type: 'custom.insert',
      placement: 'auto',
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k6',
          _type: 'block',
          children: [
            {
              _key: 'k7',
              _type: 'span',
              marks: [],
              text: 'baz',
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Inserting block with lonely inline object', async () => {
    const patches: Array<Patch> = []
    const {editor} = await createTestEditor({
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
      schemaDefinition: defineSchema({
        inlineObjects: [
          {
            name: 'stock-ticker',
            fields: [{name: 'symbol', type: 'string'}],
          },
        ],
      }),
    })

    editor.send({
      type: 'insert.block',
      block: {
        _type: 'block',
        children: [{_type: 'stock-ticker', symbol: 'AAPL'}],
        style: 'normal',
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        ',{stock-ticker},',
      ])
    })

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          origin: 'local',
          path: [],
          type: 'setIfMissing',
          value: [],
        },
        {
          origin: 'local',
          path: [0],
          type: 'insert',
          position: 'before',
          items: [
            {
              _type: 'block',
              _key: 'k0',
              children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          origin: 'local',
          type: 'insert',
          position: 'before',
          path: [{_key: 'k0'}],
          items: [
            {
              _type: 'block',
              _key: 'k2',
              children: [
                {_type: 'span', _key: 'k4', text: '', marks: []},
                {_type: 'stock-ticker', _key: 'k3', symbol: 'AAPL'},
                {_type: 'span', _key: 'k5', text: '', marks: []},
              ],
              style: 'normal',
            },
          ],
        },
        {
          origin: 'local',
          type: 'unset',
          path: [{_key: 'k0'}],
        },
        {
          origin: 'local',
          type: 'set',
          path: [{_key: 'k2'}, 'markDefs'],
          value: [],
        },
      ])
    })
  })

  test('Scenario: Inserting block with two inline objects', async () => {
    const patches: Array<Patch> = []
    const {editor} = await createTestEditor({
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
      schemaDefinition: defineSchema({
        inlineObjects: [
          {
            name: 'stock-ticker',
            fields: [{name: 'symbol', type: 'string'}],
          },
        ],
      }),
    })

    editor.send({
      type: 'insert.block',
      block: {
        _type: 'block',
        children: [
          {_type: 'stock-ticker', symbol: 'AAPL'},
          {_type: 'stock-ticker', symbol: 'GOOG'},
        ],
        style: 'normal',
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        ',{stock-ticker},,{stock-ticker},',
      ])
    })

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          origin: 'local',
          path: [],
          type: 'setIfMissing',
          value: [],
        },
        {
          origin: 'local',
          path: [0],
          type: 'insert',
          position: 'before',
          items: [
            {
              _type: 'block',
              _key: 'k0',
              children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          origin: 'local',
          type: 'insert',
          position: 'before',
          path: [{_key: 'k0'}],
          items: [
            {
              _type: 'block',
              _key: 'k2',
              children: [
                {_type: 'span', _key: 'k5', text: '', marks: []},
                {_type: 'stock-ticker', _key: 'k3', symbol: 'AAPL'},
                {_type: 'span', _key: 'k6', text: '', marks: []},
                {_type: 'stock-ticker', _key: 'k4', symbol: 'GOOG'},
                {_type: 'span', _key: 'k7', text: '', marks: []},
              ],
              style: 'normal',
            },
          ],
        },
        {
          origin: 'local',
          type: 'unset',
          path: [{_key: 'k0'}],
        },
        {
          origin: 'local',
          type: 'set',
          path: [{_key: 'k2'}, 'markDefs'],
          value: [],
        },
      ])
    })
  })

  test('Scenario: Inserting text block into empty heading replaces it', async () => {
    const keyGenerator = createTestKeyGenerator()
    const headingKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        styles: [{name: 'normal'}, {name: 'h1'}],
      }),
      initialValue: [
        {
          _key: headingKey,
          _type: 'block',
          style: 'h1',
          children: [
            {_key: keyGenerator(), _type: 'span', text: '', marks: []},
          ],
          markDefs: [],
        },
      ],
    })

    const block = {
      _key: keyGenerator(),
      _type: 'block',
      children: [{_key: keyGenerator(), _type: 'span', text: 'foo', marks: []}],
      style: 'normal',
      markDefs: [],
    }

    editor.send({
      type: 'insert.block',
      block,
      placement: 'auto',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([block])
    })
  })

  test('Scenario: Inserting text block into empty blockquote replaces it', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        styles: [{name: 'normal'}, {name: 'blockquote'}],
      }),
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'block',
          style: 'blockquote',
          children: [
            {_key: keyGenerator(), _type: 'span', text: '', marks: []},
          ],
          markDefs: [],
        },
      ],
    })

    const block = {
      _key: keyGenerator(),
      _type: 'block',
      style: 'normal',
      children: [
        {
          _key: keyGenerator(),
          _type: 'span',
          text: 'foo',
          marks: [],
        },
      ],
      markDefs: [],
    }

    editor.send({
      type: 'insert.block',
      block,
      placement: 'auto',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([block])
    })
  })

  describe('empty list item replacement', () => {
    test('without selection, without `at` - list properties NOT inherited', async () => {
      const keyGenerator = createTestKeyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          lists: [{name: 'bullet'}, {name: 'number'}],
        }),
        initialValue: [
          {
            _key: keyGenerator(),
            _type: 'block',
            style: 'normal',
            children: [
              {_key: keyGenerator(), _type: 'span', text: '', marks: []},
            ],
            markDefs: [],
            listItem: 'bullet',
            level: 1,
          },
        ],
      })

      const block = {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        children: [
          {
            _key: keyGenerator(),
            _type: 'span',
            text: 'foo',
            marks: [],
          },
        ],
        markDefs: [],
      }
      editor.send({
        type: 'insert.block',
        block,
        placement: 'auto',
      })

      await vi.waitFor(() => {
        // No selection or `at` means inheritListProperties behavior doesn't fire
        expect(editor.getSnapshot().context.value).toEqual([block])
      })
    })

    test('with selection, without `at` - list properties inherited', async () => {
      const keyGenerator = createTestKeyGenerator()
      const listBlockKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          lists: [{name: 'bullet'}],
        }),
        initialValue: [
          {
            _key: listBlockKey,
            _type: 'block',
            style: 'normal',
            children: [
              {_key: keyGenerator(), _type: 'span', text: '', marks: []},
            ],
            markDefs: [],
            listItem: 'bullet',
            level: 1,
          },
        ],
      })

      const block = {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
        ],
        markDefs: [],
      }

      editor.send({
        type: 'select',
        at: {
          anchor: {path: [{_key: listBlockKey}], offset: 0},
          focus: {path: [{_key: listBlockKey}], offset: 0},
        },
      })

      editor.send({
        type: 'insert.block',
        block,
        placement: 'auto',
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            ...block,
            level: 1,
            listItem: 'bullet',
          },
        ])
      })
    })

    test('without selection, with `at` - list properties inherited', async () => {
      const keyGenerator = createTestKeyGenerator()
      const listBlockKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          styles: [{name: 'normal'}, {name: 'h1'}],
          lists: [{name: 'bullet'}],
        }),
        initialValue: [
          {
            _key: listBlockKey,
            _type: 'block',
            style: 'normal',
            children: [
              {_key: keyGenerator(), _type: 'span', text: '', marks: []},
            ],
            markDefs: [],
            listItem: 'bullet',
            level: 1,
          },
        ],
      })

      const block = {
        _key: keyGenerator(),
        _type: 'block',
        style: 'h1',
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
        ],
        markDefs: [],
      }

      editor.send({
        type: 'insert.block',
        block,
        placement: 'auto',
        at: {
          anchor: {path: [{_key: listBlockKey}], offset: 0},
          focus: {path: [{_key: listBlockKey}], offset: 0},
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            ...block,
            level: 1,
            listItem: 'bullet',
          },
        ])
      })
    })

    test('with selection, with `at` - `at` takes precedence', async () => {
      const keyGenerator = createTestKeyGenerator()
      const listBlockKey = keyGenerator()
      const normalBlockKey = keyGenerator()
      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
          lists: [{name: 'bullet'}],
        }),
        initialValue: [
          {
            _key: listBlockKey,
            _type: 'block',
            style: 'normal',
            children: [
              {_key: keyGenerator(), _type: 'span', text: '', marks: []},
            ],
            markDefs: [],
            listItem: 'bullet',
            level: 1,
          },
          {
            _key: normalBlockKey,
            _type: 'block',
            style: 'normal',
            children: [
              {_key: keyGenerator(), _type: 'span', text: '', marks: []},
            ],
            markDefs: [],
          },
        ],
      })

      const block = {
        _key: keyGenerator(),
        _type: 'block',
        style: 'normal',
        children: [
          {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
        ],
        markDefs: [],
      }

      // Selection is on normal block (no list properties)
      editor.send({
        type: 'select',
        at: {
          anchor: {path: [{_key: normalBlockKey}], offset: 0},
          focus: {path: [{_key: normalBlockKey}], offset: 0},
        },
      })

      // But `at` points to list block
      editor.send({
        type: 'insert.block',
        block,
        placement: 'auto',
        at: {
          anchor: {path: [{_key: listBlockKey}], offset: 0},
          focus: {path: [{_key: listBlockKey}], offset: 0},
        },
      })

      await vi.waitFor(() => {
        // `at` takes precedence, so list properties are inherited from list block
        expect(editor.getSnapshot().context.value).toEqual([
          {
            ...block,
            level: 1,
            listItem: 'bullet',
          },
          {
            _key: normalBlockKey,
            _type: 'block',
            style: 'normal',
            children: [
              {_key: expect.any(String), _type: 'span', text: '', marks: []},
            ],
            markDefs: [],
          },
        ])
      })
    })
  })

  test('Scenario: Inserting block after block object using at prop', async () => {
    const keyGenerator = createTestKeyGenerator()
    const imageAKey = keyGenerator()
    const imageBKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
        ],
      }),
      initialValue: [
        {
          _key: imageAKey,
          _type: 'image',
          src: 'https://example.com/image-a.jpg',
        },
        {
          _key: imageBKey,
          _type: 'image',
          src: 'https://example.com/image-b.jpg',
        },
      ],
    })

    const imageCKey = keyGenerator()

    editor.send({
      type: 'insert.block',
      block: {
        _key: imageCKey,
        _type: 'image',
        src: 'https://example.com/image-c.jpg',
      },
      placement: 'auto',
      select: 'none',
      at: {
        anchor: {path: [{_key: imageAKey}], offset: 0},
        focus: {path: [{_key: imageAKey}], offset: 0},
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: imageAKey,
          _type: 'image',
          src: 'https://example.com/image-a.jpg',
        },
        {
          _key: imageCKey,
          _type: 'image',
          src: 'https://example.com/image-c.jpg',
        },
        {
          _key: imageBKey,
          _type: 'image',
          src: 'https://example.com/image-b.jpg',
        },
      ])
    })
  })

  test('Scenario: Inserting block object in middle of text block with select=start', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
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

    editor.send({
      type: 'insert.block',
      block: {
        _type: 'image',
      },
      placement: 'auto',
      select: 'start',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'image',
          _key: 'k4',
        },
        {
          _type: 'block',
          _key: 'k6',
          markDefs: [],
          style: 'normal',
          children: [{_type: 'span', _key: 'k5', marks: [], text: 'bar'}],
        },
      ])

      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: 'k4'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'k4'}],
          offset: 0,
        },
        backward: false,
      })
    })
  })

  test('Scenario: Inserting block object in middle of text block with select=end', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
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

    editor.send({
      type: 'insert.block',
      block: {
        _type: 'image',
      },
      placement: 'auto',
      select: 'end',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'image',
          _key: 'k4',
        },
        {
          _type: 'block',
          _key: 'k6',
          markDefs: [],
          style: 'normal',
          children: [{_type: 'span', _key: 'k5', marks: [], text: 'bar'}],
        },
      ])

      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: 'k4'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'k4'}],
          offset: 0,
        },
        backward: false,
      })
    })
  })

  test('Scenario: Inserting block object with expanded selection covering entire block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
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

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 6,
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 6,
        },
        backward: false,
      })
    })

    editor.send({
      type: 'insert.block',
      block: {_type: 'image'},
      placement: 'auto',
      select: 'start',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'image',
          _key: 'k4',
        },
      ])

      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: 'k4'}], offset: 0},
        focus: {path: [{_key: 'k4'}], offset: 0},
        backward: false,
      })
    })
  })

  test('Scenario: Inserting block object with expanded selection starting at block start', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
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

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 0,
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
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 3,
        },
        backward: false,
      })
    })

    editor.send({
      type: 'insert.block',
      block: {_type: 'image'},
      placement: 'auto',
      select: 'start',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'image',
          _key: 'k4',
        },
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])

      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: 'k4'}], offset: 0},
        focus: {path: [{_key: 'k4'}], offset: 0},
        backward: false,
      })
    })
  })

  test('Scenario: Inserting block object with expanded selection ending at block end', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
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

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 6,
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
          offset: 6,
        },
        backward: false,
      })
    })

    editor.send({
      type: 'insert.block',
      block: {_type: 'image'},
      placement: 'auto',
      select: 'start',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'image',
          _key: 'k4',
        },
      ])

      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: 'k4'}], offset: 0},
        focus: {path: [{_key: 'k4'}], offset: 0},
        backward: false,
      })
    })
  })

  test('Scenario: Inserting text block with expanded selection in middle of block', async () => {
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
          children: [{_type: 'span', _key: spanKey, text: 'foobar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 2,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 4,
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 2,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 4,
        },
        backward: false,
      })
    })

    editor.send({
      type: 'insert.block',
      block: {_type: 'block', children: [{_type: 'span', text: 'new'}]},
      placement: 'auto',
      select: 'start',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'fonewar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
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
    })
  })

  test('Scenario: Inserting block object with expanded selection in middle of block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
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

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 2,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 4,
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 2,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 4,
        },
        backward: false,
      })
    })

    editor.send({
      type: 'insert.block',
      block: {_type: 'image'},
      placement: 'auto',
      select: 'start',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'image',
          _key: 'k4',
        },
      ])

      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: 'k4'}], offset: 0},
        focus: {path: [{_key: 'k4'}], offset: 0},
        backward: false,
      })
    })
  })

  test('Scenario: Inserting block object with cross-block expanded selection', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockAKey = keyGenerator()
    const spanAKey = keyGenerator()
    const blockBKey = keyGenerator()
    const spanBKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockAKey,
          children: [{_type: 'span', _key: spanAKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockBKey,
          children: [{_type: 'span', _key: spanBKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: blockBKey}, 'children', {_key: spanBKey}],
          offset: 2,
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: blockBKey}, 'children', {_key: spanBKey}],
          offset: 2,
        },
        backward: false,
      })
    })

    editor.send({
      type: 'insert.block',
      block: {_type: 'image'},
      placement: 'auto',
      select: 'start',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockAKey,
          children: [{_type: 'span', _key: spanAKey, text: 'fr', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'image',
          _key: 'k6',
        },
      ])

      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: 'k6'}], offset: 0},
        focus: {path: [{_key: 'k6'}], offset: 0},
        backward: false,
      })
    })
  })

  test('Scenario: Inserting text block with expanded selection covering entire block', async () => {
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
          children: [{_type: 'span', _key: spanKey, text: 'foobar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 6,
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 6,
        },
        backward: false,
      })
    })

    editor.send({
      type: 'insert.block',
      block: {_type: 'block', children: [{_type: 'span', text: 'replacement'}]},
      placement: 'auto',
      select: 'start',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k4',
          children: [
            {
              _type: 'span',
              _key: 'k5',
              text: 'replacement',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])

      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: 'k4'}, 'children', {_key: 'k5'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'k4'}, 'children', {_key: 'k5'}],
          offset: 0,
        },
        backward: false,
      })
    })
  })

  test('Scenario: Inserting text block with expanded selection starting at block start', async () => {
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
          children: [{_type: 'span', _key: spanKey, text: 'foobar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 0,
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
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 3,
        },
        backward: false,
      })
    })

    editor.send({
      type: 'insert.block',
      block: {_type: 'block', children: [{_type: 'span', text: 'new'}]},
      placement: 'auto',
      select: 'start',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'newbar',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])

      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 0,
        },
        backward: false,
      })
    })
  })

  test('Scenario: Inserting text block with expanded selection ending at block end', async () => {
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
          children: [{_type: 'span', _key: spanKey, text: 'foobar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
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
          offset: 6,
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
          offset: 6,
        },
        backward: false,
      })
    })

    editor.send({
      type: 'insert.block',
      block: {_type: 'block', children: [{_type: 'span', text: 'new'}]},
      placement: 'auto',
      select: 'start',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'foonew',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])

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
  })

  test('Scenario: Inserting text block with cross-block expanded selection', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockAKey = keyGenerator()
    const spanAKey = keyGenerator()
    const blockBKey = keyGenerator()
    const spanBKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: blockAKey,
          children: [{_type: 'span', _key: spanAKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockBKey,
          children: [{_type: 'span', _key: spanBKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: blockBKey}, 'children', {_key: spanBKey}],
          offset: 2,
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: blockBKey}, 'children', {_key: spanBKey}],
          offset: 2,
        },
        backward: false,
      })
    })

    editor.send({
      type: 'insert.block',
      block: {_type: 'block', children: [{_type: 'span', text: 'new'}]},
      placement: 'auto',
      select: 'start',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockAKey,
          children: [
            {
              _type: 'span',
              _key: spanAKey,
              text: 'fnewr',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])

      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
          offset: 1,
        },
        focus: {
          path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
          offset: 1,
        },
        backward: false,
      })
    })
  })

  test('Scenario: Inserting text block with expanded selection and select=end', async () => {
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
          children: [{_type: 'span', _key: spanKey, text: 'foobar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 2,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 4,
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 2,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 4,
        },
        backward: false,
      })
    })

    editor.send({
      type: 'insert.block',
      block: {_type: 'block', children: [{_type: 'span', text: 'new'}]},
      placement: 'auto',
      select: 'end',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'fonewar',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])

      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 5,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 5,
        },
        backward: false,
      })
    })
  })

  test('Scenario: Inserting text block with placement=before', async () => {
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
          children: [
            {_type: 'span', _key: spanKey, text: 'existing', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 4,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 4,
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 4,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 4,
        },
        backward: false,
      })
    })

    editor.send({
      type: 'insert.block',
      block: {_type: 'block', children: [{_type: 'span', text: 'before'}]},
      placement: 'before',
      select: 'start',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k4',
          children: [{_type: 'span', _key: 'k5', text: 'before', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'existing', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])

      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: 'k4'}, 'children', {_key: 'k5'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'k4'}, 'children', {_key: 'k5'}],
          offset: 0,
        },
        backward: false,
      })
    })
  })

  describe('containers', () => {
    const calloutSchemaDefinition = defineSchema({
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
      ],
    })

    function CalloutRenderer({
      attributes,
      children,
    }: {
      attributes: Record<string, unknown>
      children: React.ReactNode
    }) {
      return <div {...attributes}>{children}</div>
    }

    test('insert.break at end of text block inside container', async () => {
      const keyGenerator = createTestKeyGenerator()
      const calloutKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: calloutSchemaDefinition,
        initialValue: [
          {
            _type: 'callout',
            _key: calloutKey,
            content: [
              {
                _type: 'block',
                _key: blockKey,
                children: [
                  {_type: 'span', _key: spanKey, text: 'hello', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
        children: (
          <RendererPlugin
            renderers={[{renderer: {type: 'callout', render: CalloutRenderer}}]}
          />
        ),
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
              {_key: spanKey},
            ],
            offset: 5,
          },
          focus: {
            path: [
              {_key: calloutKey},
              'content',
              {_key: blockKey},
              'children',
              {_key: spanKey},
            ],
            offset: 5,
          },
        },
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).not.toBeNull()
      })

      editor.send({type: 'insert.break'})

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
                  {_type: 'span', _key: spanKey, text: 'hello', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
              {
                _type: 'block',
                _key: 'k5',
                children: [
                  {
                    _type: 'span',
                    _key: 'k6',
                    text: '',
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [
              {_key: calloutKey},
              'content',
              {_key: 'k5'},
              'children',
              {_key: 'k6'},
            ],
            offset: 0,
          },
          focus: {
            path: [
              {_key: calloutKey},
              'content',
              {_key: 'k5'},
              'children',
              {_key: 'k6'},
            ],
            offset: 0,
          },
          backward: false,
        })
      })
    })

    test('insert.break in middle of text block inside container', async () => {
      const keyGenerator = createTestKeyGenerator()
      const calloutKey = keyGenerator()
      const blockKey = keyGenerator()
      const spanKey = keyGenerator()

      const {editor} = await createTestEditor({
        keyGenerator,
        schemaDefinition: calloutSchemaDefinition,
        initialValue: [
          {
            _type: 'callout',
            _key: calloutKey,
            content: [
              {
                _type: 'block',
                _key: blockKey,
                children: [
                  {
                    _type: 'span',
                    _key: spanKey,
                    text: 'hello world',
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
        children: (
          <RendererPlugin
            renderers={[{renderer: {type: 'callout', render: CalloutRenderer}}]}
          />
        ),
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
              {_key: spanKey},
            ],
            offset: 5,
          },
          focus: {
            path: [
              {_key: calloutKey},
              'content',
              {_key: blockKey},
              'children',
              {_key: spanKey},
            ],
            offset: 5,
          },
        },
      })

      await vi.waitFor(() => {
        const sel = editor.getSnapshot().context.selection
        expect(sel).not.toBeNull()
        expect(sel!.anchor.offset).toBe(5)
      })

      editor.send({type: 'insert.break'})

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
                  {
                    _type: 'span',
                    _key: spanKey,
                    text: 'hello world',
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
              {
                _type: 'block',
                _key: 'k5',
                children: [
                  {
                    _type: 'span',
                    _key: 'k6',
                    text: '',
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ])

        expect(editor.getSnapshot().context.selection).toEqual({
          anchor: {
            path: [
              {_key: calloutKey},
              'content',
              {_key: 'k5'},
              'children',
              {_key: 'k6'},
            ],
            offset: 0,
          },
          focus: {
            path: [
              {_key: calloutKey},
              'content',
              {_key: 'k5'},
              'children',
              {_key: 'k6'},
            ],
            offset: 0,
          },
          backward: false,
        })
      })
    })
  })
})
