import type {Patch} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {execute} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import type {InsertPlacement} from '../src/behaviors/behavior.types.event'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
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
          _key: 'k6',
          _type: 'block',
          children: [
            {
              _key: 'k7',
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
          _key: 'k10',
          _type: 'block',
          children: [
            {
              _key: 'k11',
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
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          origin: 'local',
          type: 'unset',
          path: [{_key: 'k0'}],
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
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          origin: 'local',
          type: 'unset',
          path: [{_key: 'k0'}],
        },
      ])
    })
  })
})
