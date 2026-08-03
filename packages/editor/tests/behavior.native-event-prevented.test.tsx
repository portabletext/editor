import {describe, expect, test, vi} from 'vitest'
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

describe('claiming the native event', () => {
  test('Scenario: an empty `actions` array claims the native event', async () => {
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

  test('Scenario: an action set returning no actions claims the native event', async () => {
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

  test('Scenario: a `forward`-only action set leaves the native event unclaimed', async () => {
    // Passes even without the guard-time claim; it exists to catch fixes
    // that flip `forward`'s abstention into a claim.
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

  test('Scenario: a throwing action set keeps the claim on the native event', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const {locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'keyboard.keydown',
              guard: ({event}) => event.originEvent.key === 'Tab',
              actions: [
                () => {
                  throw new Error('action set crashed')
                },
              ],
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

    // The guard claimed the event; the crash is reported through
    // `console.error`, not used as a reason to hand the keystroke back
    // to the browser.
    expect(recorder.seen).toEqual([true])
    expect(consoleError).toHaveBeenCalledWith(
      new Error(
        'Evaluating actions for "keyboard.keydown" failed due to: action set crashed',
      ),
    )

    consoleError.mockRestore()
  })
})
