import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {effect} from '../src/behaviors'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {createTestEditor} from '../src/test/vitest'

describe('Behavior Indexing', () => {
  test('Scenario: Behaviors are indexed and found for matching events', async () => {
    const sideEffect = vi.fn()
    const customBehavior = defineBehavior({
      on: 'custom.test',
      actions: [() => [effect(sideEffect)]],
    })

    const {editor, locator} = await createTestEditor({
      children: <BehaviorPlugin behaviors={[customBehavior]} />,
    })

    await userEvent.click(locator)

    editor.send({type: 'custom.test'})

    await vi.waitFor(() => {
      expect(sideEffect).toHaveBeenCalled()
    })
  })

  test('Scenario: Index is updated when a behavior is added', async () => {
    const sideEffectA = vi.fn()
    const sideEffectB = vi.fn()

    const behaviorA = defineBehavior({
      on: 'custom.a',
      actions: [() => [effect(sideEffectA)]],
    })

    const behaviorB = defineBehavior({
      on: 'custom.b',
      actions: [() => [effect(sideEffectB)]],
    })

    const {editor} = await createTestEditor({
      children: <BehaviorPlugin behaviors={[behaviorA]} />,
    })

    editor.send({type: 'custom.a'})

    await vi.waitFor(() => {
      expect(sideEffectA).toHaveBeenCalledTimes(1)
    })

    editor.send({type: 'custom.b'})

    await vi.waitFor(() => {
      expect(sideEffectB).not.toHaveBeenCalled()
    })

    const unregister = editor.registerBehavior({behavior: behaviorB})

    editor.send({type: 'custom.b'})

    await vi.waitFor(() => {
      expect(sideEffectB).toHaveBeenCalledTimes(1)
    })

    unregister()
  })

  test('Scenario: Index is updated when a behavior is removed', async () => {
    const sideEffect = vi.fn()
    const behavior = defineBehavior({
      on: 'custom.removable',
      actions: [() => [effect(sideEffect)]],
    })

    const {editor} = await createTestEditor({})

    const unregister = editor.registerBehavior({behavior})

    editor.send({type: 'custom.removable'})

    await vi.waitFor(() => {
      expect(sideEffect).toHaveBeenCalledTimes(1)
    })

    unregister()

    editor.send({type: 'custom.removable'})

    await vi.waitFor(() => {
      expect(sideEffect).toHaveBeenCalledTimes(1)
    })
  })

  test('Scenario: Wildcard behaviors match custom events', async () => {
    const sideEffect = vi.fn()
    const behavior = defineBehavior({
      on: '*',
      guard: ({event}) => event.type.startsWith('custom.'),
      actions: [() => [effect(sideEffect)]],
    })

    const {editor} = await createTestEditor({
      children: <BehaviorPlugin behaviors={[behavior]} />,
    })

    editor.send({type: 'custom.any'})
    editor.send({type: 'custom.other'})

    await vi.waitFor(() => {
      expect(sideEffect).toHaveBeenCalledTimes(2)
    })
  })

  test('Scenario: Namespaced behaviors match events in namespace', async () => {
    const sideEffect = vi.fn()
    const behavior = defineBehavior({
      on: 'custom.*',
      actions: [() => [effect(sideEffect)]],
    })

    const {editor} = await createTestEditor({
      children: <BehaviorPlugin behaviors={[behavior]} />,
    })

    editor.send({type: 'custom.one'})
    editor.send({type: 'custom.two'})

    await vi.waitFor(() => {
      expect(sideEffect).toHaveBeenCalledTimes(2)
    })
  })
})
