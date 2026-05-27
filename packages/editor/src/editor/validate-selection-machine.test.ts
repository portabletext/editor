import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {toTextspec} from '../../test-utils/to-textspec'
import {createTestEditor} from '../test/vitest'
import {validateSelectionMachine} from './validate-selection-machine'

describe(validateSelectionMachine.id, () => {
  test('Scenario: Does not validate selection while the engine has pending operations', async () => {
    const {editor, locator} = await createTestEditor()

    await userEvent.click(locator)

    editor.send({type: 'insert.text', text: 'foo'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foo|')
    })

    // This event is being sent in before "foo" has been inserted in the DOM
    // This means that when the MutationObserver is finally triggered for the
    // "foo" insertion, "bar" will be in the engine state but not in the DOM.
    // This causes the selection to be out of sync and this is why we need to
    // make sure the selection is not validated before the engine has committed all
    // pending operations.
    editor.send({type: 'insert.text', text: 'bar'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: foobar|')
    })

    editor.send({type: 'delete.backward', unit: 'character'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual('B: fooba|')
    })
  })
})
