import {isSpan} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema} from '../src'
import {effect, execute, forward} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import type {BehaviorEvent} from '../src/behaviors/behavior.types.event'
import {IS_MAC} from '../src/internal-utils/is-hotkey'
import {getSelectionAfterText} from '../src/internal-utils/text-selection'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {createTestEditor} from '../src/test/vitest'

describe('event.insert.text', () => {
  test('Scenario: Consecutive `insert.text` events', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({keyGenerator})

    await userEvent.click(locator)

    editor.send({type: 'insert.text', text: 'foo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo'])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
        backward: false,
      })
    })

    editor.send({type: 'insert.text', text: 'bar'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foobar'])
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 6},
        focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 6},
        backward: false,
      })
    })

    editor.send({type: 'delete.backward', unit: 'character'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['fooba'])
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
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'foo ,bar, baz',
      ])
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
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo bar baz'])
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
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo bar baz'])
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
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo bar baz'])
    })
  })

  test('Scenario: Inserting text without a selection', async () => {
    const {editor} = await createTestEditor()

    editor.send({type: 'insert.text', text: 'foo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo'])
    })
  })

  test('Scenario: Inserting text at a specific position', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'helloworld'}],
        },
      ],
    })

    await userEvent.click(locator)

    editor.send({
      type: 'insert.text',
      text: ' ',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 5,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 5,
        },
      },
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['hello world'])
    })
  })
})
