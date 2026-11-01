import {createTestKeyGenerator} from '@portabletext/test'
import {assert, describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema} from '../src'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {NodePlugin} from '../src/plugins/plugin.node'
import {
  defineBlockObject,
  defineInlineObject,
} from '../src/renderers/renderer.types'
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

  test('Scenario: dragging a block object sets a ghost cloned from the whole block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()

    const image = defineBlockObject({
      type: 'image',
      render: ({attributes, children}) => (
        <div {...attributes} style={{width: '300px'}}>
          {children}
          <div
            contentEditable={false}
            draggable
            data-testid="image-handle"
            style={{height: '80px'}}
          >
            foo
          </div>
        </div>
      ),
    })

    const {locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({blockObjects: [{name: 'image'}]}),
      initialValue: [{_key: imageKey, _type: 'image'}],
      children: <NodePlugin nodes={[image]} />,
    })

    await userEvent.click(locator)

    const handle = locator
      .element()
      .querySelector('[data-testid="image-handle"]')
    assert(handle)
    const handleRect = handle.getBoundingClientRect()

    const dataTransfer = new DataTransfer()
    const setDragImage = vi.spyOn(dataTransfer, 'setDragImage')
    handle.dispatchEvent(
      new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
        clientX: handleRect.left + 30,
        clientY: handleRect.top + 15,
      }),
    )

    await vi.waitFor(() => {
      expect(setDragImage).toHaveBeenCalledTimes(1)
    })

    const ghost = document.body.lastElementChild
    expect(setDragImage.mock.calls).toEqual([[ghost, 30, 15]])
    const block = locator.element().querySelector('[data-pt-block="object"]')
    assert(block)
    const expectedClone = block.cloneNode(true) as HTMLElement
    expectedClone.style.position = 'relative'
    expect(ghost?.getAttribute('style')).toEqual(
      'position: absolute; left: -99999px; box-sizing: border-box; width: 300px; height: 80px;',
    )
    expect(ghost?.hasAttribute('data-dragged')).toBe(true)
    expect(ghost?.children).toHaveLength(1)
    expect(ghost?.firstElementChild?.isEqualNode(expectedClone)).toBe(true)
  })

  test('Scenario: a `data-pt-drag-ghost-element` inside a dragged block object does not replace the whole-block ghost', async () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()

    const image = defineBlockObject({
      type: 'image',
      render: ({attributes, children}) => (
        <div {...attributes} style={{width: '300px'}}>
          {children}
          <div
            contentEditable={false}
            draggable
            data-testid="image-handle"
            style={{height: '80px'}}
          >
            foo
            <div
              data-pt-drag-ghost-element=""
              style={{width: '60px', height: '30px'}}
            >
              bar
            </div>
          </div>
        </div>
      ),
    })

    const {locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({blockObjects: [{name: 'image'}]}),
      initialValue: [{_key: imageKey, _type: 'image'}],
      children: <NodePlugin nodes={[image]} />,
    })

    await userEvent.click(locator)

    const handle = locator
      .element()
      .querySelector('[data-testid="image-handle"]')
    assert(handle)
    const handleRect = handle.getBoundingClientRect()

    const dataTransfer = new DataTransfer()
    const setDragImage = vi.spyOn(dataTransfer, 'setDragImage')
    handle.dispatchEvent(
      new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
        clientX: handleRect.left + 30,
        clientY: handleRect.top + 15,
      }),
    )

    await vi.waitFor(() => {
      expect(setDragImage).toHaveBeenCalledTimes(1)
    })

    const ghost = document.body.lastElementChild
    expect(setDragImage.mock.calls).toEqual([[ghost, 30, 15]])
    const block = locator.element().querySelector('[data-pt-block="object"]')
    assert(block)
    const expectedClone = block.cloneNode(true) as HTMLElement
    expectedClone.style.position = 'relative'
    expect(ghost?.getAttribute('style')).toEqual(
      'position: absolute; left: -99999px; box-sizing: border-box; width: 300px; height: 80px;',
    )
    expect(ghost?.hasAttribute('data-dragged')).toBe(true)
    expect(ghost?.children).toHaveLength(1)
    expect(ghost?.firstElementChild?.isEqualNode(expectedClone)).toBe(true)
  })

  test('Scenario: dragging an inline object sets a ghost cloned from the inline object only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const stockTickerKey = keyGenerator()
    const barKey = keyGenerator()

    const stockTicker = defineInlineObject({
      type: 'stock-ticker',
      render: ({attributes, children}) => (
        <span
          {...attributes}
          style={{display: 'inline-block', width: '50px', height: '20px'}}
        >
          {children}
          <span draggable data-testid="stock-ticker-handle">
            baz
          </span>
        </span>
      ),
    })

    const {locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [{name: 'stock-ticker'}],
      }),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: fooKey, _type: 'span', text: '', marks: []},
            {_key: stockTickerKey, _type: 'stock-ticker'},
            {_key: barKey, _type: 'span', text: '', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={[stockTicker]} />,
    })

    await userEvent.click(locator)

    const handle = locator
      .element()
      .querySelector('[data-testid="stock-ticker-handle"]')
    assert(handle)
    const stockTickerRect = locator
      .element()
      .querySelector('[data-pt-inline="object"]')
      ?.getBoundingClientRect()
    assert(stockTickerRect)

    const dataTransfer = new DataTransfer()
    const setDragImage = vi.spyOn(dataTransfer, 'setDragImage')
    handle.dispatchEvent(
      new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
        clientX: stockTickerRect.left + 10,
        clientY: stockTickerRect.top + 5,
      }),
    )

    await vi.waitFor(() => {
      expect(setDragImage).toHaveBeenCalledTimes(1)
    })

    const ghost = document.body.lastElementChild
    expect(setDragImage.mock.calls).toEqual([[ghost, 10, 5]])
    const inlineObject = locator
      .element()
      .querySelector('[data-pt-inline="object"]')
    assert(inlineObject)
    expect(ghost?.getAttribute('style')).toEqual(
      'position: absolute; left: -99999px; box-sizing: border-box; width: 50px; height: 20px;',
    )
    expect(ghost?.hasAttribute('data-dragged')).toBe(false)
    expect(ghost?.children).toHaveLength(1)
    expect(ghost?.firstElementChild?.isEqualNode(inlineObject)).toBe(true)
  })
})
