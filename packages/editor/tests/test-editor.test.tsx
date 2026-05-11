import {expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {createTestEditor} from '../src/test/vitest'
import {toTextspec} from '../test-utils/to-textspec'

/**
 * Regression test for `createTestEditor`'s locator scoping.
 *
 * Each call to `createTestEditor` mounts its own editor into a fresh
 * container via `render()`. The returned locator must target that
 * specific editor instance - not any other `[role="textbox"]` that
 * happens to live in the same document, in document order.
 *
 * Before the fix, the function discarded the scoped locator from
 * `render()` and built a document-wide `page.getByRole('textbox')`
 * lookup, so any second editor in the DOM would be addressed by the
 * first call's locator. Vitest's iframe-per-test isolation kept this
 * latent in CI; embedders that share a DOM across editors hit it.
 */

test('returns a locator scoped to the rendered editor', async () => {
  const first = await createTestEditor()
  const second = await createTestEditor()

  await userEvent.type(first.locator, 'first')
  await userEvent.type(second.locator, 'second')

  await vi.waitFor(() => {
    expect(toTextspec(first.editor.getSnapshot().context)).toEqual('B: first|')
  })

  expect(toTextspec(second.editor.getSnapshot().context)).toEqual('B: second|')
})
