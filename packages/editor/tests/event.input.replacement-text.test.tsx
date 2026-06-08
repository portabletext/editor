import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {createTestEditor} from '../src/test/vitest'
import {getSelectionAfterText} from '../test-utils/text-selection'

describe('insertReplacementText', () => {
  test('Scenario: applied at the DOM selection when the event has no target ranges', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'wat is the problem',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await userEvent.click(locator)

    // Move the editor selection to the end of the text, away from the word
    // that will be replaced. This is the stale selection that a browser
    // extension's replacement must not be applied at.
    const staleSelection = getSelectionAfterText(
      editor.getSnapshot().context,
      'wat is the problem',
    )
    editor.send({type: 'select', at: staleSelection})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(staleSelection)
    })

    const editableElement = locator.element()
    const textNode = editableElement.querySelector(
      '[data-slate-string]',
    )?.firstChild

    if (!textNode) {
      throw new Error('Could not find the editable text node')
    }

    // Browser extensions like Grammarly set the DOM selection on the word to
    // replace and then dispatch a synthetic `insertReplacementText` event with
    // no target ranges. Both steps happen synchronously here so the editor's
    // own `selectionchange` sync doesn't run in between, mimicking how that
    // sync bails inside an iframe when focus moves to the extension's UI.
    const domSelection = window.getSelection()
    const range = document.createRange()
    range.setStart(textNode, 0)
    range.setEnd(textNode, 3)
    domSelection?.removeAllRanges()
    domSelection?.addRange(range)

    editableElement.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'insertReplacementText',
        data: 'What',
        bubbles: true,
        cancelable: true,
      }),
    )

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([
        'What is the problem',
      ])
    })
  })
})
