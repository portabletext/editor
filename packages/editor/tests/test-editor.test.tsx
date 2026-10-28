import {toTextspec} from '@portabletext/test'
import {expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {createTestEditor} from '../src/test/vitest'

test('Scenario: Each test editor gets a locator scoped to its own rendered editor', async () => {
  const first = await createTestEditor()
  const second = await createTestEditor()

  await userEvent.type(first.locator, 'first')
  await userEvent.type(second.locator, 'second')

  await vi.waitFor(() => {
    expect(toTextspec(first.editor.getSnapshot().context)).toEqual('B: first|')
  })

  expect(toTextspec(second.editor.getSnapshot().context)).toEqual('B: second|')
})
