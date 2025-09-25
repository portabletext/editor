import {getTersePt} from '@portabletext/test'
import {userEvent} from '@vitest/browser/context'
import {describe, expect, test, vi} from 'vitest'
import {getSelectionAfterText} from '../internal-utils/text-selection'
import {createTestEditor} from '../test/vitest'
import {validateSelectionMachine} from './validate-selection-machine'

describe(validateSelectionMachine.id, () => {
  test('Scenario: Does not validate selection while Slate has pending operations', async () => {
    const {editor, locator} = await createTestEditor()

    await userEvent.click(locator)

    editor.send({type: 'insert.text', text: 'foo'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo'])
      expect(editor.getSnapshot().context.selection).toEqual(
        getSelectionAfterText(editor.getSnapshot().context, 'foo'),
      )
    })

    // This event is being sent in before "foo" has been inserted in the DOM
    // This means that when the MutationObserver is finally triggered for the
    // "foo" insertion, "bar" will be in the Slate state but not in the DOM.
    // This causes the selection to be out of sync and this is why we need to
    // make sure the selection is not validated before Slate has committed all
    // pending operations.
    editor.send({type: 'insert.text', text: 'bar'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foobar'])
      expect(editor.getSnapshot().context.selection).toEqual(
        getSelectionAfterText(editor.getSnapshot().context, 'foobar'),
      )
    })

    editor.send({type: 'delete.backward', unit: 'character'})

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['fooba'])
      expect(editor.getSnapshot().context.selection).toEqual(
        getSelectionAfterText(editor.getSnapshot().context, 'fooba'),
      )
    })
  })
})
