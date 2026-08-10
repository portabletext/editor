import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema} from '../src'
import {execute} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {createTestEditor} from '../src/test/vitest'

const initialValue = [
  {
    _type: 'block',
    _key: 'b1',
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: 's1', text: 'foo', marks: []}],
  },
]

const anchor = {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 0}
const focus = {path: [{_key: 'b1'}, 'children', {_key: 's1'}], offset: 3}

function findTextNode(root: Node, text: string): Node | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    if (walker.currentNode.textContent === text) {
      return walker.currentNode
    }
  }
  return null
}

/**
 * The MutationObserver driving selection validation fires on childList
 * mutations. Its callback is queued as a microtask before this function's
 * continuation, so awaiting once lets the validation pass run first.
 */
async function triggerSelectionValidation(editorElement: Element) {
  editorElement.appendChild(document.createComment('mutation'))
  await Promise.resolve()
}

describe('selection validation', () => {
  test('leaves an equivalent DOM selection representation alone', async () => {
    const {editor, locator} = await createTestEditor({
      schemaDefinition: defineSchema({}),
      initialValue,
    })
    await userEvent.click(locator)
    editor.send({type: 'select', at: {anchor, focus}})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus).toEqual(focus)
    })

    const editorElement = locator.element()
    const textNode = findTextNode(editorElement, 'foo')
    const parent = textNode?.parentNode
    expect(parent).not.toBeNull()
    const index = Array.prototype.indexOf.call(parent!.childNodes, textNode)

    // The same selection ("foo", offsets 0..3) expressed with element-level
    // endpoints, the way browsers represent a selection swept across table
    // cells.
    window.getSelection()?.setBaseAndExtent(parent!, index, parent!, index + 1)

    await triggerSelectionValidation(editorElement)

    const domSelection = window.getSelection()
    expect(domSelection?.anchorNode).toBe(parent)
    expect(domSelection?.anchorOffset).toBe(index)
    expect(domSelection?.focusNode).toBe(parent)
    expect(domSelection?.focusOffset).toBe(index + 1)
    expect(editor.getSnapshot().context.selection?.focus).toEqual(focus)
  })

  test('rewrites a DOM selection that means something else', async () => {
    const {editor, locator} = await createTestEditor({
      schemaDefinition: defineSchema({}),
      initialValue,
    })
    await userEvent.click(locator)
    editor.send({type: 'select', at: {anchor, focus}})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus).toEqual(focus)
    })

    const editorElement = locator.element()
    const textNode = findTextNode(editorElement, 'foo')
    const parent = textNode?.parentNode
    expect(parent).not.toBeNull()

    // A collapsed selection at the block start disagrees with the model's
    // 0..3 range.
    window.getSelection()?.setBaseAndExtent(parent!, 0, parent!, 0)

    await triggerSelectionValidation(editorElement)

    const domSelection = window.getSelection()
    expect(domSelection?.focusNode).toBe(textNode)
    expect(domSelection?.focusOffset).toBe(3)
  })

  test('Scenario: An action set that swaps a block keeps selection on the new block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const imageKey = keyGenerator()
    const newBlockKey = 'newBlock'
    const newSpanKey = 'newSpan'

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
        ],
      }),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo'}],
        },
        {
          _key: imageKey,
          _type: 'image',
          src: 'https://example.com/image.jpg',
        },
      ],
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior({
              on: 'custom.swap-image',
              actions: [
                () => [
                  execute({
                    type: 'insert.block',
                    block: {
                      _key: newBlockKey,
                      _type: 'block',
                      children: [
                        {_key: newSpanKey, _type: 'span', text: '', marks: []},
                      ],
                      markDefs: [],
                      style: 'normal',
                    },
                    placement: 'after',
                    select: 'start',
                  }),
                  execute({
                    type: 'delete.block',
                    at: [{_key: imageKey}],
                  }),
                ],
              ],
            }),
          ]}
        />
      ),
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: {
        anchor: {path: [{_key: imageKey}], offset: 0},
        focus: {path: [{_key: imageKey}], offset: 0},
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.anchor.path).toEqual([
        {_key: imageKey},
      ])
    })

    editor.send({type: 'custom.swap-image'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo'}],
        },
        {
          _key: newBlockKey,
          _type: 'block',
          children: [{_key: newSpanKey, _type: 'span', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        path: [{_key: newBlockKey}, 'children', {_key: newSpanKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: newBlockKey}, 'children', {_key: newSpanKey}],
        offset: 0,
      },
      backward: false,
    })
  })
})
