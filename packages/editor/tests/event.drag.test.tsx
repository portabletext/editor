import {describe, expect, test, vi} from 'vitest'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {createTestEditor} from '../src/test/vitest'

describe('event.drag', () => {
  test('Scenario: `drag.drag` and `drag.dragleave` reach behaviors without a caret hit-test', async () => {
    const onDrag = vi.fn()
    const onDragLeave = vi.fn()

    const {locator} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'drag.drag',
              guard: () => {
                onDrag()
                return false
              },
              actions: [],
            }),
            defineBehavior({
              on: 'drag.dragleave',
              guard: () => {
                onDragLeave()
                return false
              },
              actions: [],
            }),
          ]}
        />
      ),
    })

    const editorElement = locator.element()

    const documentWithCaret = window.document as Document & {
      caretPositionFromPoint(x: number, y: number): unknown
    }
    const caretHitTest = vi.spyOn(documentWithCaret, 'caretPositionFromPoint')

    editorElement.dispatchEvent(
      new DragEvent('drag', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer(),
      }),
    )
    editorElement.dispatchEvent(
      new DragEvent('dragleave', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer(),
      }),
    )

    await vi.waitFor(() => {
      expect(onDrag).toHaveBeenCalledTimes(1)
      expect(onDragLeave).toHaveBeenCalledTimes(1)
    })

    // These events carry no position, so the handlers must not pay for
    // resolving one at pointer-move frequency.
    expect(caretHitTest).not.toHaveBeenCalled()

    caretHitTest.mockRestore()
  })
})
