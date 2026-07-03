import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

/**
 * A click in the whitespace around a container (a table's gutter, the
 * editable's padding) can make the browser park a collapsed DOM caret on an
 * element instead of in text. The model normalizes the synced selection to
 * a leaf, but nothing corrected the DOM caret, so it kept rendering in the
 * whitespace, a caret the document model does not contain. The sync must
 * push the canonical position back to the DOM.
 */

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
  ],
})

const containers = [defineContainer({type: 'callout', arrayField: 'content'})]

const initialValue = [
  {
    _type: 'callout',
    _key: 'c0',
    content: [
      {
        _type: 'block',
        _key: 'cb0',
        style: 'normal',
        markDefs: [],
        children: [{_type: 'span', _key: 'cs0', text: 'AA', marks: []}],
      },
    ],
  },
]

describe('degenerate collapsed DOM carets', () => {
  test('the caret is canonicalized even when the model selection does not change', async () => {
    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <NodePlugin nodes={containers} />,
    })
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    const editable = document.querySelector('[contenteditable="true"]')
    const container = editable?.querySelector('[data-pt-block="container"]')
    if (!container) {
      throw new Error('container not rendered')
    }

    // Park the model exactly where the element-level point will normalize
    // to, so the sync below is a no-op on the model side.
    const leafPoint = {
      path: [{_key: 'c0'}, 'content', {_key: 'cb0'}, 'children', {_key: 'cs0'}],
      offset: 0,
    }
    editor.send({type: 'focus'})
    editor.send({type: 'select', at: {anchor: leafPoint, focus: leafPoint}})
    await vi.waitFor(() => {
      const selection = window.getSelection()
      expect(selection?.anchorNode?.nodeType).toBe(Node.TEXT_NODE)
    })

    // The browser's caret resolution for a click in surrounding whitespace:
    // a collapsed element-level point on the container. The model already
    // holds the position it normalizes to, so without canonicalization the
    // parked caret survives and renders in the whitespace.
    window.getSelection()?.collapse(container, 0)

    await vi.waitFor(() => {
      const selection = window.getSelection()
      expect(selection?.isCollapsed).toBe(true)
      expect(selection?.anchorNode?.nodeType).toBe(Node.TEXT_NODE)
      expect(selection?.anchorNode?.textContent).toBe('AA')
    })
  })

  test('a caret parked on a container element is pushed into its text', async () => {
    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
      children: <NodePlugin nodes={containers} />,
    })
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    const editable = document.querySelector('[contenteditable="true"]')
    const container = editable?.querySelector('[data-pt-block="container"]')
    if (!container) {
      throw new Error('container not rendered')
    }

    // Focus and park the caret at a distinct position first, so the synced
    // selection below provably comes from the element-level point.
    const leafPoint = {
      path: [{_key: 'c0'}, 'content', {_key: 'cb0'}, 'children', {_key: 'cs0'}],
      offset: 2,
    }
    editor.send({type: 'focus'})
    editor.send({type: 'select', at: {anchor: leafPoint, focus: leafPoint}})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.offset).toBe(2)
    })

    // The browser's caret resolution for a click in surrounding whitespace:
    // a collapsed element-level point on the container.
    const domSelection = window.getSelection()
    domSelection?.collapse(container, 0)

    await vi.waitFor(() => {
      // The model normalizes to the container's first leaf.
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'cb0'},
            'children',
            {_key: 'cs0'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'c0'},
            'content',
            {_key: 'cb0'},
            'children',
            {_key: 'cs0'},
          ],
          offset: 0,
        },
        backward: false,
      })
      // And the DOM caret follows: it sits in the text node, not on the
      // element, so it renders inside the container instead of in the
      // surrounding whitespace.
      const selection = window.getSelection()
      expect(selection?.isCollapsed).toBe(true)
      expect(selection?.anchorNode?.nodeType).toBe(Node.TEXT_NODE)
      expect(selection?.anchorNode?.textContent).toBe('AA')
    })
  })
})
