import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

/**
 * Container "drag handle" affordances - chrome elements rendered
 * inside a container's render output (handles, language pickers,
 * etc.) - are commonly `contentEditable={false}` so they don't
 * receive caret input. When such an affordance is the dragstart
 * source, the engine should resolve the drag to the WHOLE container
 * block, not to whatever text node happens to sit under the
 * `clientX/Y` coordinates of the dragstart event.
 *
 * Today `getEventPosition` calls `getSelectionFromEvent` which
 * uses `caretPositionFromPoint(clientX, clientY)`. The caret point
 * lands inside the container's first inner text block (the chrome
 * sits over content), and the engine then drags that inner block
 * instead of the container. This test pins the corrected behavior.
 */

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
  ],
})

const calloutContainer = defineContainer({
  type: 'callout',
  arrayField: 'content',
  render: ({attributes, children}) => (
    <aside data-testid="callout" {...attributes}>
      <button
        type="button"
        data-testid="callout-drag-handle"
        contentEditable={false}
        draggable
      >
        Drag
      </button>
      {children}
    </aside>
  ),
})

describe('dragstart from container chrome', () => {
  test('dragging a callout via chrome handle moves the callout, not its first inner block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = 'cl-1'
    const innerBlockKey = 'inner-1'
    const innerSpanKey = 'span-1'
    const targetBlockKey = 'target-1'
    const targetSpanKey = 'target-span-1'

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              style: 'normal',
              markDefs: [],
              children: [
                {
                  _type: 'span',
                  _key: innerSpanKey,
                  text: 'inside the callout',
                  marks: [],
                },
              ],
            },
          ],
        },
        {
          _type: 'block',
          _key: targetBlockKey,
          style: 'normal',
          markDefs: [],
          children: [
            {
              _type: 'span',
              _key: targetSpanKey,
              text: 'target paragraph',
              marks: [],
            },
          ],
        },
      ],
      children: <NodePlugin nodes={[calloutContainer]} />,
    })

    await vi.waitFor(() => {
      const root = locator.element() as HTMLElement
      expect(
        root.querySelector('[data-testid="callout-drag-handle"]'),
      ).not.toBeNull()
    })

    const root = locator.element() as HTMLElement
    const handle = root.querySelector(
      '[data-testid="callout-drag-handle"]',
    ) as HTMLButtonElement
    const targetBlockEl = root.querySelector(
      `[data-pt-block="text"][data-pt-path*="${targetBlockKey}"]`,
    ) as HTMLElement
    expect(targetBlockEl).toBeTruthy()

    const handleRect = handle.getBoundingClientRect()
    const targetRect = targetBlockEl.getBoundingClientRect()

    // Fire dragstart on the handle. clientX/Y is the chrome's center;
    // `caretPositionFromPoint` at those coords lands inside the callout's
    // first inner content block. The fix recognises the target sits
    // inside chrome and uses the block-level selection instead.
    const dataTransfer = new DataTransfer()
    const dragstart = new DragEvent('dragstart', {
      bubbles: true,
      cancelable: true,
      clientX: handleRect.left + handleRect.width / 2,
      clientY: handleRect.top + handleRect.height / 2,
      dataTransfer,
    })
    handle.dispatchEvent(dragstart)

    // Drop on the target block. `dragenter` + `dragover` set the drop
    // marker; `drop` commits.
    const dragover = new DragEvent('dragover', {
      bubbles: true,
      cancelable: true,
      clientX: targetRect.left + targetRect.width / 2,
      clientY: targetRect.bottom - 2,
      dataTransfer,
    })
    targetBlockEl.dispatchEvent(dragover)

    const drop = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      clientX: targetRect.left + targetRect.width / 2,
      clientY: targetRect.bottom - 2,
      dataTransfer,
    })
    targetBlockEl.dispatchEvent(drop)

    const dragend = new DragEvent('dragend', {
      bubbles: true,
      dataTransfer,
    })
    handle.dispatchEvent(dragend)

    // After the drop, the value should have the target FIRST, then the
    // callout (the callout moved DOWN, past the target). If the inner
    // block got dragged instead, the value would still have the callout
    // first (with only its inner content moved into the target's slot).
    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value ?? []
      const keys = value.map((b) => (b as {_key: string})._key)
      expect(keys).toEqual([targetBlockKey, calloutKey])
    })
  })
})
