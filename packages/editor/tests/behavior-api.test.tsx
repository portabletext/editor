import {getTersePt} from '@portabletext/test'
import {userEvent} from '@vitest/browser/context'
import {describe, expect, test, vi} from 'vitest'
import {defineBehavior, effect, execute, forward, raise} from '../src/behaviors'
import {createTestEditor} from '../src/internal-utils/test-editor'
import {BehaviorPlugin} from '../src/plugins'

describe('Behavior API', () => {
  test('Scenario: Suppressing raised events while executing', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [() => [raise({type: 'insert.text', text: 'b'})]],
            }),
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'b',
              // The insertion of 'a' is executed, which means the event
              // doesn't trigger any other Behavior from this point.
              // Hence, no infinite loop is created.
              actions: [() => [execute({type: 'insert.text', text: 'a'})]],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'a')
    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['a'])
    })
  })

  test('Scenario: Raising one custom event as the result of raising another', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              // Raising `custom.a`
              actions: [() => [raise({type: 'custom.a'})]],
            }),
            defineBehavior({
              on: 'custom.a',
              // Raises `custom.b`
              actions: [() => [raise({type: 'custom.b'})]],
            }),
            defineBehavior({
              on: 'custom.b',
              // Which ends up executing this
              actions: [() => [execute({type: 'insert.text', text: 'b'})]],
            }),
            defineBehavior({
              on: 'custom.b',
              // But not this, of course
              actions: [() => [execute({type: 'insert.text', text: 'c'})]],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'a')
    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['b'])
    })
  })

  test('Scenario: Sending custom events', async () => {
    const {editor} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'custom.hello world',
              actions: [
                () => [execute({type: 'insert.text', text: 'Hello, world!'})],
              ],
            }),
          ]}
        />
      ),
    })

    editor.send({type: 'custom.hello world'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'Hello, world!',
      ])
    })
  })

  test('Scenario: Raised events default to their default action', async () => {
    const {editor} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'custom.hello world',
              actions: [
                // No Behavior listens for this event, so it ends up being
                // executed.
                () => [raise({type: 'insert.text', text: 'Hello, world!'})],
              ],
            }),
          ]}
        />
      ),
    })

    editor.send({type: 'custom.hello world'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'Hello, world!',
      ])
    })
  })

  test('Scenario: `forward`ing all events', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: '*',
              actions: [({event}) => [forward(event)]],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'a')
    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['a'])
    })
  })

  test('Scenario: `forward`ing all events combined with an `effect`', async () => {
    const sideEffect = vi.fn()

    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: '*',
              actions: [({event}) => [effect(sideEffect), forward(event)]],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'a')
    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['a'])
    })

    expect(sideEffect).toHaveBeenCalled()
  })

  test('Scenario: `effect` can be combined with `forward` to not alter the chain of events', async () => {
    const sideEffectA = vi.fn()
    const sideEffectB = vi.fn()

    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [
                ({event}) => [
                  // A side effect is performed
                  effect(sideEffectA),
                  // And the event is forwarded
                  forward(event),
                ],
              ],
            }),
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'b',
              actions: [
                () => [
                  // A side effect is performed without forwarding the event
                  effect(sideEffectB),
                ],
              ],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'a')
    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['a'])
    })

    expect(sideEffectA).toHaveBeenCalled()
    expect(sideEffectB).not.toHaveBeenCalled()

    await userEvent.type(locator, 'b')
    await userEvent.type(locator, 'c')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['ac'])
    })

    expect(sideEffectB).toHaveBeenCalled()
  })

  test('Scenario: Empty action sets stop event propagation', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              // Typing 'a' is swallowed
              actions: [],
            }),
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [() => [execute({type: 'insert.text', text: 'b'})]],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'a')
    await userEvent.type(locator, 'b')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['b'])
    })
  })

  test('Scenario: `forward` forwards an event to succeeding Behaviors', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [({event}) => [effect(() => {}), forward(event)]],
            }),
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [() => [execute({type: 'insert.text', text: 'b'})]],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'a')
    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['b'])
    })
  })

  test('Scenario: `forward`ing twice', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [
                ({event}) => [effect(() => {}), forward(event), forward(event)],
              ],
            }),
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [() => [execute({type: 'insert.text', text: 'b'})]],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'a')
    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['bb'])
    })
  })

  test('Scenario: Empty actions cancel the chain of events', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [],
            }),
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [() => [execute({type: 'insert.text', text: 'b'})]],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'a')
    await userEvent.type(locator, 'c')
    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['c'])
    })
  })

  test('Scenario: A lonely `forward` action does not alter the default action', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              actions: [({event}) => [forward(event)]],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'a')
    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['a'])
    })
  })

  test('Scenario: `forward`ing a native event does not cancel it', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'keyboard.keydown',
              actions: [({event}) => [forward(event)]],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'a')
    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['a'])
    })
  })
})
