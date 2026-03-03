import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {getSelectionAfterText} from '../src/internal-utils/text-selection'
import {createTestEditor} from '../src/test/vitest'

describe('delete block object', () => {
  test.each(['{Backspace}', '{Delete}'])(
    'Deleting an image with text above using %s',
    async (button) => {
      const keyGenerator = createTestKeyGenerator()
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        initialValue: [
          {
            _type: 'block',
            _key: keyGenerator(),
            children: [
              {_type: 'span', _key: keyGenerator(), text: 'foo', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
          {
            _type: 'image',
            _key: keyGenerator(),
          },
          {
            _type: 'block',
            _key: keyGenerator(),
            children: [
              {_type: 'span', _key: keyGenerator(), text: 'b', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
        schemaDefinition: defineSchema({
          blockObjects: [{name: 'image'}],
        }),
      })

      await userEvent.click(locator)

      // Allow the editor to settle after focus
      await new Promise((resolve) => setTimeout(resolve, 100))

      editor.send({
        type: 'select',
        at: getSelectionAfterText(editor.getSnapshot().context, 'b'),
      })

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual(
          getSelectionAfterText(editor.getSnapshot().context, 'b'),
        )
      })

      // Backspace 1: delete "b"
      await userEvent.keyboard('{Backspace}')
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Backspace 2: delete empty block, select image
      await userEvent.keyboard('{Backspace}')
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Delete the image
      await userEvent.keyboard(button)
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Type replacement text
      await userEvent.type(locator, 'bar')

      await vi.waitFor(() => {
        expect(getTersePt(editor.getSnapshot().context)).toEqual(['foobar'])
      })
    },
  )
})
