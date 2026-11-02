import {isSpan} from '@portabletext/schema'
import {createTestKeyGenerator, toTextspec} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema} from '../src'
import {effect, execute, forward} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import type {BehaviorEvent} from '../src/behaviors/behavior.types.event'
import {IS_MAC} from '../src/internal-utils/is-hotkey'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {getActiveDecorators} from '../src/selectors/selector.get-active-decorators'
import {createTestEditor} from '../src/test/vitest'
import {getSelectionAfterText} from '../test-utils/text-selection'

describe('event.insert.text', () => {
  test('Scenario: Consecutive `insert.text` events', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({keyGenerator})

    await userEvent.click(locator)

    editor.send({type: 'insert.text', text: 'foo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo|')
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
        backward: false,
      })
    })

    editor.send({type: 'insert.text', text: 'bar'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foobar|')
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 6},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 6},
        backward: false,
      })
    })

    editor.send({type: 'delete.backward', unit: 'character'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: fooba|')
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 5},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 5},
        backward: false,
      })
    })
  })

  test('Scenario: `insert.text` can trigger `insert.child` events', async () => {
    const insertChildEvents: Array<BehaviorEvent> = []
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.child',
              actions: [
                ({event}) => [
                  effect(() => {
                    insertChildEvents.push(event)
                  }),
                  forward(event),
                ],
              ],
            }),
          ]}
        />
      ),
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
    })

    await userEvent.click(locator)
    await userEvent.type(locator, 'foo ')

    await userEvent.keyboard(
      IS_MAC ? '{Meta>}b{/Meta}' : '{Control>}b{/Control}',
    )
    await userEvent.type(locator, 'bar')

    await vi.waitFor(() => {
      expect(insertChildEvents).toEqual([
        {
          type: 'insert.child',
          child: {
            _type: 'span',
            text: 'b',
            marks: ['strong'],
          },
        },
      ])
    })

    await userEvent.keyboard(
      IS_MAC ? '{Meta>}b{/Meta}' : '{Control>}b{/Control}',
    )
    await userEvent.type(locator, ' baz')

    await vi.waitFor(() => {
      expect(insertChildEvents.slice(1)).toEqual([
        {
          type: 'insert.child',
          child: {
            _type: 'span',
            text: ' ',
            marks: [],
          },
        },
      ])
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo [strong:bar] baz|',
      )
    })
  })

  test('Scenario: executing `insert.text` events', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              actions: [({event}) => [execute(event)]],
            }),
          ]}
        />
      ),
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
    })

    await userEvent.click(locator)
    await userEvent.type(locator, 'foo ')

    await userEvent.keyboard(
      IS_MAC ? '{Meta>}b{/Meta}' : '{Control>}b{/Control}',
    )
    await userEvent.type(locator, 'bar')

    await userEvent.keyboard(
      IS_MAC ? '{Meta>}b{/Meta}' : '{Control>}b{/Control}',
    )
    await userEvent.type(locator, ' baz')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo bar baz|',
      )
    })
  })

  test('Scenario: executing after annotation', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const linkKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        annotations: [{name: 'link'}],
        decorators: [{name: 'strong'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'foo',
              marks: [linkKey],
            },
          ],
          markDefs: [{_key: linkKey, _type: 'link'}],
          style: 'normal',
        },
      ],
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              actions: [({event}) => [execute(event)]],
            }),
          ]}
        />
      ),
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: getSelectionAfterText(editor.getSnapshot().context, 'foo'),
    })

    await userEvent.type(locator, ' bar')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanKey, _type: 'span', text: 'foo bar', marks: [linkKey]},
          ],
          markDefs: [{_key: linkKey, _type: 'link'}],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Ignoring `insert.child` events for spans using `forward`', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.child',
              guard: ({snapshot, event}) => {
                if (isSpan(snapshot.context, event.child)) {
                  return {span: event.child}
                }

                return false
              },
              actions: [
                (_, {span}) => [
                  forward({type: 'insert.text', text: span.text}),
                ],
              ],
            }),
          ]}
        />
      ),
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
    })

    await userEvent.click(locator)
    await userEvent.type(locator, 'foo ')

    await userEvent.keyboard(
      IS_MAC ? '{Meta>}b{/Meta}' : '{Control>}b{/Control}',
    )
    await userEvent.type(locator, 'bar')

    await userEvent.keyboard(
      IS_MAC ? '{Meta>}b{/Meta}' : '{Control>}b{/Control}',
    )
    await userEvent.type(locator, ' baz')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo bar baz|',
      )
    })
  })

  test('Scenario: Ignoring `insert.child` events for spans using `execute`', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.child',
              guard: ({snapshot, event}) => {
                if (isSpan(snapshot.context, event.child)) {
                  return {span: event.child}
                }

                return false
              },
              actions: [
                (_, {span}) => [
                  execute({type: 'insert.text', text: span.text}),
                ],
              ],
            }),
          ]}
        />
      ),
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
    })

    await userEvent.click(locator)
    await userEvent.type(locator, 'foo ')

    await userEvent.keyboard(
      IS_MAC ? '{Meta>}b{/Meta}' : '{Control>}b{/Control}',
    )
    await userEvent.type(locator, 'bar')

    await userEvent.keyboard(
      IS_MAC ? '{Meta>}b{/Meta}' : '{Control>}b{/Control}',
    )
    await userEvent.type(locator, ' baz')

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo bar baz|',
      )
    })
  })

  test('Scenario: Inserting text without a selection', async () => {
    const {editor} = await createTestEditor()

    editor.send({type: 'insert.text', text: 'foo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo|')
    })
  })

  test('Scenario: Inserting text on a block object is a no-op', async () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
        ],
      }),
      initialValue: [
        {
          _key: imageKey,
          _type: 'image',
          src: 'https://example.com/image.jpg',
        },
      ],
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: imageKey}], offset: 0},
        focus: {path: [{_key: imageKey}], offset: 0},
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })

    editor.send({type: 'insert.text', text: 'foo'})

    expect(errorSpy).not.toHaveBeenCalled()
    expect(editor.getSnapshot().context.value).toEqual([
      {
        _key: imageKey,
        _type: 'image',
        src: 'https://example.com/image.jpg',
      },
    ])

    errorSpy.mockRestore()
  })

  test('Scenario: Inserting text at an inline object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanAKey = keyGenerator()
    const inlineKey = keyGenerator()
    const spanBKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [
          {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
        ],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanAKey, text: 'before', marks: []},
            {_type: 'stock-ticker', _key: inlineKey, symbol: 'AAPL'},
            {_type: 'span', _key: spanBKey, text: 'after', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: before{stock-ticker symbol="AAPL"}after',
      )
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: inlineKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: inlineKey}],
          offset: 0,
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: inlineKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: inlineKey}],
          offset: 0,
        },
        backward: false,
      })
    })

    editor.send({type: 'insert.text', text: 'hello'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: before{stock-ticker symbol="AAPL"}hello|after',
      )
    })
  })

  test('Scenario: `insert.text` at an explicit position', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          style: 'normal',
          children: [{_key: 's0', _type: 'span', text: 'hello', marks: []}],
          markDefs: [],
        },
      ],
    })

    editor.send({
      type: 'insert.text',
      at: [{_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 5,
      text: ' world',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'b0',
          _type: 'block',
          style: 'normal',
          children: [
            {_key: 's0', _type: 'span', text: 'hello world', marks: []},
          ],
          markDefs: [],
        },
      ])
    })
  })

  test('Scenario: `insert.text` at an explicit position leaves a caret on an inline object alone', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockAKey = keyGenerator()
    const fooKey = keyGenerator()
    const inlineKey = keyGenerator()
    const barKey = keyGenerator()
    const blockBKey = keyGenerator()
    const bazKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [
          {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
        ],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockAKey,
          children: [
            {_type: 'span', _key: fooKey, text: 'foo', marks: []},
            {_type: 'stock-ticker', _key: inlineKey, symbol: 'AAPL'},
            {_type: 'span', _key: barKey, text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockBKey,
          children: [{_type: 'span', _key: bazKey, text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: foo{stock-ticker symbol="AAPL"}bar\nB: baz',
      )
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockAKey}, 'children', {_key: inlineKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockAKey}, 'children', {_key: inlineKey}],
          offset: 0,
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockAKey}, 'children', {_key: inlineKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockAKey}, 'children', {_key: inlineKey}],
          offset: 0,
        },
        backward: false,
      })
    })

    editor.send({
      type: 'insert.text',
      at: [{_key: blockBKey}, 'children', {_key: bazKey}],
      offset: 3,
      text: 'qux',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockAKey,
          children: [
            {_type: 'span', _key: fooKey, text: 'foo', marks: []},
            {_type: 'stock-ticker', _key: inlineKey, symbol: 'AAPL'},
            {_type: 'span', _key: barKey, text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockBKey,
          children: [{_type: 'span', _key: bazKey, text: 'bazqux', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockAKey}, 'children', {_key: inlineKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockAKey}, 'children', {_key: inlineKey}],
          offset: 0,
        },
        backward: false,
      })
    })
  })

  test('Scenario: `insert.text` at an explicit position leaves an expanded selection alone', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockAKey = keyGenerator()
    const fooKey = keyGenerator()
    const blockBKey = keyGenerator()
    const barKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockAKey,
          children: [{_type: 'span', _key: fooKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockBKey,
          children: [{_type: 'span', _key: barKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo\nB: bar')
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockAKey}, 'children', {_key: fooKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockAKey}, 'children', {_key: fooKey}],
          offset: 3,
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockAKey}, 'children', {_key: fooKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockAKey}, 'children', {_key: fooKey}],
          offset: 3,
        },
        backward: false,
      })
    })

    editor.send({
      type: 'insert.text',
      at: [{_key: blockBKey}, 'children', {_key: barKey}],
      offset: 0,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockAKey,
          children: [{_type: 'span', _key: fooKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockBKey,
          children: [{_type: 'span', _key: barKey, text: 'bazbar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockAKey}, 'children', {_key: fooKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockAKey}, 'children', {_key: fooKey}],
          offset: 3,
        },
        backward: false,
      })
    })
  })

  test('Scenario: `insert.text` with `at` but no `offset` deletes an expanded selection first', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockAKey = keyGenerator()
    const fooKey = keyGenerator()
    const blockBKey = keyGenerator()
    const barKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockAKey,
          children: [{_type: 'span', _key: fooKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockBKey,
          children: [{_type: 'span', _key: barKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo\nB: bar')
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockAKey}, 'children', {_key: fooKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockAKey}, 'children', {_key: fooKey}],
          offset: 3,
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockAKey}, 'children', {_key: fooKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockAKey}, 'children', {_key: fooKey}],
          offset: 3,
        },
        backward: false,
      })
    })

    editor.send({
      type: 'insert.text',
      at: [{_key: blockBKey}, 'children', {_key: barKey}],
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockAKey,
          children: [{_type: 'span', _key: fooKey, text: 'baz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockBKey,
          children: [{_type: 'span', _key: barKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockAKey}, 'children', {_key: fooKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockAKey}, 'children', {_key: fooKey}],
          offset: 3,
        },
        backward: false,
      })
    })
  })

  test('Scenario: `insert.text` at an explicit position without a selection leaves the selection empty', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockAKey = keyGenerator()
    const fooKey = keyGenerator()
    const blockBKey = keyGenerator()
    const barKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockAKey,
          children: [{_type: 'span', _key: fooKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockBKey,
          children: [{_type: 'span', _key: barKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo\nB: bar')
      expect(editor.getSnapshot().context.selection).toEqual(null)
    })

    editor.send({
      type: 'insert.text',
      at: [{_key: blockAKey}, 'children', {_key: fooKey}],
      offset: 0,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockAKey,
          children: [{_type: 'span', _key: fooKey, text: 'bazfoo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockBKey,
          children: [{_type: 'span', _key: barKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual(null)
    })
  })

  test('Scenario: `insert.text` at an explicit position ignores a decorator toggled on at the caret', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockAKey = keyGenerator()
    const fooKey = keyGenerator()
    const blockBKey = keyGenerator()
    const barKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: blockAKey,
          children: [{_type: 'span', _key: fooKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockBKey,
          children: [{_type: 'span', _key: barKey, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo\nB: bar')
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockAKey}, 'children', {_key: fooKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockAKey}, 'children', {_key: fooKey}],
          offset: 3,
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockAKey}, 'children', {_key: fooKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockAKey}, 'children', {_key: fooKey}],
          offset: 3,
        },
        backward: false,
      })
    })

    editor.send({type: 'decorator.toggle', decorator: 'strong'})

    await vi.waitFor(() => {
      expect(getActiveDecorators(editor.getSnapshot())).toEqual(['strong'])
    })

    editor.send({
      type: 'insert.text',
      at: [{_key: blockBKey}, 'children', {_key: barKey}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockAKey,
          children: [{_type: 'span', _key: fooKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: blockBKey,
          children: [{_type: 'span', _key: barKey, text: 'barbaz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockAKey}, 'children', {_key: fooKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockAKey}, 'children', {_key: fooKey}],
          offset: 3,
        },
        backward: false,
      })
      expect(getActiveDecorators(editor.getSnapshot())).toEqual(['strong'])
    })
  })

  test('Scenario: `insert.text` at an explicit position maps a selection in the same span like any other edit', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: fooKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo')
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          offset: 3,
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          offset: 3,
        },
        backward: false,
      })
    })

    editor.send({type: 'decorator.toggle', decorator: 'strong'})

    await vi.waitFor(() => {
      expect(getActiveDecorators(editor.getSnapshot())).toEqual(['strong'])
    })

    editor.send({
      type: 'insert.text',
      at: [{_key: blockKey}, 'children', {_key: fooKey}],
      offset: 3,
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: fooKey, text: 'foobaz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          offset: 6,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: fooKey}],
          offset: 6,
        },
        backward: false,
      })
      expect(getActiveDecorators(editor.getSnapshot())).toEqual(['strong'])
    })
  })
})
