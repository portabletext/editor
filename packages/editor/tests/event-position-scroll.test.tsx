import {describe, expect, test, vi} from 'vitest'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {createTestEditor} from '../src/test/vitest'

describe('event position on a window-scrolled page', () => {
  test('Scenario: the drop half comes from viewport coordinates, not page coordinates', async () => {
    const capturedBlocks: Array<'start' | 'end'> = []

    const {locator} = await createTestEditor({
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'b0s', _type: 'span', text: 'foo', marks: []}],
        },
        {
          _key: 'b1',
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [{_key: 'b1s', _type: 'span', text: 'bar', marks: []}],
        },
      ],
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'drag.dragover',
              guard: ({event}) => {
                capturedBlocks.push(event.position.block)
                return false
              },
              actions: [],
            }),
          ]}
        />
      ),
    })

    const editorElement = locator.element()
    const blockElement = editorElement.querySelector(
      '[data-pt-block="text"]',
    ) as HTMLElement
    const blockRect = blockElement.getBoundingClientRect()

    // Synthetic events always report `pageY === clientY`, so a real window
    // scroll cannot exercise this; simulate the trusted-event relationship
    // on the instance instead.
    const dragoverEvent = new DragEvent('dragover', {
      bubbles: true,
      cancelable: true,
      clientX: blockRect.left + 4,
      clientY: blockRect.top + 1,
      dataTransfer: new DataTransfer(),
    })
    Object.defineProperty(dragoverEvent, 'pageY', {
      value: blockRect.top + 1 + 2000,
    })

    blockElement.dispatchEvent(dragoverEvent)

    await vi.waitFor(() => {
      expect(capturedBlocks).toEqual(['start'])
    })
  })
})
