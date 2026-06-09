import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {createTestEditor} from '../src/test/vitest'

describe('insertReplacementText', () => {
  test('Scenario: applied at the DOM selection when the event has no target ranges', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const TEXT = 'wat is the problem'

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: TEXT, marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    // Park the caret at the end of the text via a real keyboard event. This
    // sets both the editor selection and the DOM selection in lockstep via
    // the DOM->editor path. Issuing `editor.send({type: 'select'})` instead
    // would queue an editor->DOM sync that could revert our DOM mutation
    // below under CI scheduling.
    await userEvent.click(locator)
    await userEvent.keyboard('{End}')

    const editableElement = locator.element()
    const textNode = editableElement.querySelector('[data-pt-text]')?.firstChild

    if (!textNode) {
      throw new Error('Could not find the editable text node')
    }

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.anchor?.offset).toBe(
        TEXT.length,
      )
      const domSelection = window.getSelection()
      expect(domSelection?.anchorNode).toBe(textNode)
      expect(domSelection?.anchorOffset).toBe(TEXT.length)
    })

    // Browser extensions like Grammarly set the DOM selection on the word to
    // replace and then dispatch a synthetic `insertReplacementText` event with
    // no target ranges. Inside an iframe, the editor's own `selectionchange`
    // sync bails when focus moves to the extension's UI, leaving the editor
    // selection stale; the input must still apply at the DOM selection.
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
