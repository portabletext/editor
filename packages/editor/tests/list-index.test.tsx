import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema} from '../src'
import {createTestEditor} from '../src/test/vitest'

describe('data-list-index attribute', () => {
  test('single list item', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        lists: [{name: 'bullet'}],
      }),
    })

    await userEvent.click(locator)
    await userEvent.type(locator, 'foo')

    editor.send({
      type: 'list item.add',
      listItem: 'bullet',
    })

    const blockLocator = locator
      .element()
      .querySelector(`[data-block-key="k0"]`)

    expect(locator.getByText('foo')).toBeInTheDocument()

    await vi.waitFor(() => {
      expect(blockLocator).toHaveAttribute('data-list-index', '1')
    })
  })
})
