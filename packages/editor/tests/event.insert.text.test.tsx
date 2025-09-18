import {isSpan} from '@portabletext/schema'
import {getTersePt} from '@portabletext/test'
import {userEvent} from '@vitest/browser/context'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema} from '../src'
import {
  defineBehavior,
  effect,
  execute,
  forward,
  type BehaviorEvent,
} from '../src/behaviors'
import {IS_MAC} from '../src/internal-utils/is-hotkey'
import {createTestEditor} from '../src/internal-utils/test-editor'
import {BehaviorPlugin} from '../src/plugins'

describe('event.insert.text', () => {
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
})
