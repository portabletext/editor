import {defineSchema} from '@portabletext/schema'
import {getTersePt} from '@portabletext/test'
import {userEvent} from '@vitest/browser/context'
import {describe, expect, test, vi} from 'vitest'
import {defineBehavior, execute, forward, raise} from '../src/behaviors'
import {createTestEditor} from '../src/internal-utils/test-editor'
import {BehaviorPlugin} from '../src/plugins'

describe('event.history.undo', () => {
  test('Scenario: Undoing action sets', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'x',
              actions: [
                // The 'x' is inserted in its own undo step
                ({event}) => [execute(event)],
                // And then deleted again and replaced with 'y*' in another undo step
                () => [
                  execute({type: 'delete.backward', unit: 'character'}),
                  execute({type: 'insert.text', text: 'y'}),
                  execute({type: 'insert.text', text: '*'}),
                ],
                // And finally 'z' gets its own undo step as well
                () => [execute({type: 'insert.text', text: 'z'})],
              ],
            }),
          ]}
        />
      ),
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
    })

    await userEvent.type(locator, 'x')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['y*z'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['y*'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['x'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([''])
    })
  })

  test('Scenario: Undoing raised action sets', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'x',
              actions: [
                // This gets its own undo step
                () => [execute({type: 'insert.text', text: 'y'})],
                // And this also gets its own undo step
                () => [execute({type: 'insert.text', text: 'z'})],
              ],
            }),
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [
                // Since this Behavior doesn't do any `execute` actions,
                // it will not squash the undo stack
                () => [raise({type: 'insert.text', text: 'x'})],
              ],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'a')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['yz'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['y'])
    })
  })

  test('Scenario: Undoing recursive raises', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'b',
              actions: [() => [raise({type: 'insert.text', text: 'B'})]],
            }),
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [
                () => [
                  raise({type: 'insert.text', text: 'b'}),
                  raise({type: 'insert.break'}),
                  raise({type: 'insert.text', text: 'c'}),
                ],
              ],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'a')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['B', 'c'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([''])
    })
  })

  test('Scenario: A lonely `forward` action does not squash the recursive undo stack', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [({event}) => [forward(event)]],
            }),
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [
                // 'A' is inserted in its own undo step
                () => [execute({type: 'insert.text', text: 'A'})],
                // 'B' is inserted in its own undo step
                () => [execute({type: 'insert.text', text: 'B'})],
              ],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'a')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['AB'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['A'])
    })
  })
})
