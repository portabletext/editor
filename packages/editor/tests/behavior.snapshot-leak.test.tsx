import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {createTestEditor} from '../src/test/vitest'

/**
 * Behaviors are the consumer-facing extension surface. The snapshot they
 * receive must not expose internal slate-engine state. Capture the actual
 * snapshot object that lands inside a guard and an action, then assert
 * the exact set of own keys.
 */
describe('Snapshot leak surface', () => {
  test('Scenario: guard receives a snapshot with the expected keys', async () => {
    const captured: Array<object> = []

    const {locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({snapshot, event}) => {
                if (event.text === 'a') {
                  captured.push(snapshot)
                }
                return true
              },
              actions: [],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'a')

    await vi.waitFor(() => {
      expect(captured.length).toBeGreaterThan(0)
    })

    const snapshot = captured[0]! as {context: object}

    expect(Object.keys(snapshot).sort()).toEqual([
      'blockIndexMap',
      'context',
      'decoratorState',
    ])
    expect(Object.keys(snapshot.context).sort()).toEqual([
      'containers',
      'converters',
      'keyGenerator',
      'readOnly',
      'schema',
      'selection',
      'value',
    ])
  })

  test('Scenario: action receives a snapshot with the expected keys', async () => {
    const captured: Array<object> = []

    const {locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'insert.text',
              guard: ({event}) => event.text === 'a',
              actions: [
                ({snapshot}) => {
                  captured.push(snapshot)
                  return []
                },
              ],
            }),
          ]}
        />
      ),
    })

    await userEvent.type(locator, 'a')

    await vi.waitFor(() => {
      expect(captured.length).toBeGreaterThan(0)
    })

    const snapshot = captured[0]! as {context: object}

    expect(Object.keys(snapshot).sort()).toEqual([
      'blockIndexMap',
      'context',
      'decoratorState',
    ])
    expect(Object.keys(snapshot.context).sort()).toEqual([
      'containers',
      'converters',
      'keyGenerator',
      'readOnly',
      'schema',
      'selection',
      'value',
    ])
  })
})
