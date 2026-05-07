import {useSelector} from '@xstate/react'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {useEditor} from '../src/editor/use-editor'
import {createTestEditor} from '../src/test/vitest'

/**
 * The v7 release post claims `useSelector(editor, selector)` from
 * `@xstate/react` works because the editor satisfies the
 * `Pick<AnyActorRef, 'subscribe' | 'getSnapshot'>` constraint.
 *
 * At the type level the constraint is too narrow: xstate types `subscribe`
 * to also accept the deprecated function-form overload PTE deliberately
 * doesn't expose, so direct assignment fails. That's pinned in
 * `editor.subscribable.test-d.ts`.
 *
 * At runtime however, `useSelector`'s implementation only invokes
 * `actor.subscribe({next, error})` (observer-form) and `actor.getSnapshot()`,
 * both of which the editor implements. This test verifies the runtime
 * pass-through works end-to-end with a single cast at the call site.
 */
describe('useSelector(editor, ...) runtime contract', () => {
  test('Scenario: useSelector reads editor state and re-renders on mutations', async () => {
    const selectorResults: Array<number> = []

    function ValueLengthDisplay() {
      const editor = useEditor()
      const length = useSelector(editor, (snapshot) => {
        return snapshot.context.value.length
      })
      selectorResults.push(length)
      return <span data-testid="length-display">{length}</span>
    }

    const {locator} = await createTestEditor({
      initialValue: [
        {
          _key: 'b1',
          _type: 'block',
          children: [{_key: 's1', _type: 'span', text: '', marks: []}],
        },
      ],
      children: <ValueLengthDisplay />,
    })

    await userEvent.click(locator)
    await userEvent.keyboard('hello')
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard('world')

    await vi.waitFor(() => {
      // The selector observed at least one block-count change to 2.
      expect(selectorResults).toContain(2)
    })

    // Confirm the most recent selector run reflects the live value length.
    expect(selectorResults[selectorResults.length - 1]).toBe(2)
  })
})
