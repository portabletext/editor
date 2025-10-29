import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import type {EditorEmittedEvent} from '../src'
import {
  effect,
  execute,
  forward,
  raise,
} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {getSelectionAfterText} from '../src/internal-utils/text-selection'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'

describe('Behavior API', () => {
  test('Scenario: Suppressing raised events while executing', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'b',
              // The insertion of 'a' is executed, which means the event
              // doesn't trigger any other Behavior from this point.
              // Hence, no infinite loop is created.
              actions: [() => [execute({type: 'insert.text', text: 'a'})]],
            }),
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [() => [raise({type: 'insert.text', text: 'b'})]],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'a')
    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['a'])
    })

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([''])
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

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([''])
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

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([''])
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

  test('Scenario: no action set cancels a native event', async () => {
    const {editor, locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'keyboard.keydown',
              actions: [],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'a')
    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([''])
    })
  })

  test('Scenario: `effect` can be used to `send` a `focus` event', async () => {
    const focusedBlurredEvents: Array<EditorEmittedEvent> = []

    const {editor, locator} = await createTestEditor({
      children: (
        <>
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'focused' || event.type === 'blurred') {
                focusedBlurredEvents.push(event)
              }
            }}
          />
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: 'custom.focus',
                actions: [
                  () => [
                    effect(({send}) => {
                      setTimeout(() => {
                        send({type: 'focus'})
                      }, 100)
                    }),
                  ],
                ],
              }),
            ]}
          />
        </>
      ),
    })

    await userEvent.click(locator)

    await vi.waitFor(() => {
      expect(focusedBlurredEvents.slice(0, 1)).toEqual([
        expect.objectContaining({type: 'focused'}),
      ])
    })

    editor.send({type: 'custom.focus'})
    editor.send({type: 'blur'})

    await vi.waitFor(() => {
      expect(focusedBlurredEvents.slice(1, 3)).toEqual([
        expect.objectContaining({type: 'blurred'}),
        expect.objectContaining({type: 'focused'}),
      ])
    })
  })

  test('Scenario: `effect` can be used to `send` a `blur` event', async () => {
    const focusedBlurredEvents: Array<EditorEmittedEvent> = []

    const {locator} = await createTestEditor({
      children: (
        <>
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'focused' || event.type === 'blurred') {
                focusedBlurredEvents.push(event)
              }
            }}
          />
          <BehaviorPlugin
            behaviors={[
              defineBehavior({
                on: 'insert.text',
                actions: [
                  ({event}) => [
                    effect(({send}) => {
                      setTimeout(() => {
                        send({type: 'blur'})
                      }, 100)
                    }),
                    forward(event),
                  ],
                ],
              }),
            ]}
          />
        </>
      ),
    })

    await userEvent.click(locator)

    await vi.waitFor(() => {
      expect(focusedBlurredEvents.slice(0, 1)).toEqual([
        expect.objectContaining({type: 'focused'}),
      ])
    })

    await userEvent.type(locator, 'a')

    await vi.waitFor(() => {
      expect(focusedBlurredEvents.slice(1)).toEqual([
        expect.objectContaining({type: 'blurred'}),
      ])
    })
  })

  test('Scenario: `execute` suppresses `raise`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.break',
              actions: [() => [execute({type: 'insert.break'})]],
            }),
            defineBehavior({
              on: 'split',
              actions: [],
            }),
          ]}
        />
      ),
      initialValue: [
        {
          _type: 'block',
          _key: keyGenerator(),
          children: [{_type: 'span', _key: keyGenerator(), text: 'foo bar'}],
        },
      ],
    })

    editor.send({
      type: 'select',
      at: getSelectionAfterText(editor.getSnapshot().context, 'foo'),
    })

    editor.send({type: 'insert.break'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo', ' bar'])
    })
  })

  test('Scenario: `forward` triggering `execute`', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.break',
              actions: [() => [forward({type: 'insert.break'})]],
            }),
            defineBehavior({
              on: 'insert.break',
              actions: [() => [execute({type: 'insert.break'})]],
            }),
            defineBehavior({
              on: 'split',
              actions: [() => []],
            }),
          ]}
        />
      ),
      initialValue: [
        {
          _type: 'block',
          _key: keyGenerator(),
          children: [{_type: 'span', _key: keyGenerator(), text: 'foo bar'}],
        },
      ],
    })

    editor.send({
      type: 'select',
      at: getSelectionAfterText(editor.getSnapshot().context, 'foo'),
    })

    editor.send({type: 'insert.break'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo', ' bar'])
    })
  })
})
