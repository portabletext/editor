import {describe, expect, test} from 'vitest'
import {userEvent} from 'vitest/browser'
import {forward} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {createTestEditor} from '../src/test/vitest'

const initialValue = [
  {
    _type: 'block',
    _key: 'k0',
    children: [{_type: 'span', _key: 'k1', text: 'foo'}],
  },
]

/**
 * Records `defaultPrevented` for the first Tab keydown that reaches `document`.
 * Listening on `document` in the bubble phase means the editor's own handler on
 * the editable element has already run by the time this fires.
 */
function recordTabPrevented() {
  const seen: Array<boolean> = []

  function listener(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      seen.push(event.defaultPrevented)
    }
  }

  document.addEventListener('keydown', listener)

  return {
    seen,
    stop: () => document.removeEventListener('keydown', listener),
  }
}

describe('repro #2271', () => {
  test('BASELINE `actions: []` prevents the native event', async () => {
    const {locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'keyboard.keydown',
              guard: ({event}) => event.originEvent.key === 'Tab',
              actions: [],
            }),
          ]}
        />
      ),
      initialValue,
    })

    await userEvent.click(locator)

    const recorder = recordTabPrevented()
    await userEvent.keyboard('{Tab}')
    recorder.stop()

    expect(recorder.seen).toEqual([true])
  })

  test('BUG `actions: [() => []]` should prevent the native event too', async () => {
    const {locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'keyboard.keydown',
              guard: ({event}) => event.originEvent.key === 'Tab',
              actions: [() => []],
            }),
          ]}
        />
      ),
      initialValue,
    })

    await userEvent.click(locator)

    const recorder = recordTabPrevented()
    await userEvent.keyboard('{Tab}')
    recorder.stop()

    expect(recorder.seen).toEqual([true])
  })

  test('REGRESSION GUARD `forward` must NOT prevent the native event', async () => {
    const {locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'keyboard.keydown',
              guard: ({event}) => event.originEvent.key === 'Tab',
              actions: [({event}) => [forward(event)]],
            }),
          ]}
        />
      ),
      initialValue,
    })

    await userEvent.click(locator)

    const recorder = recordTabPrevented()
    await userEvent.keyboard('{Tab}')
    recorder.stop()

    expect(recorder.seen).toEqual([false])
  })
})
