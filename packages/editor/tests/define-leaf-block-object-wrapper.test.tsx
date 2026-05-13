import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {LeafPlugin} from '../src/plugins/plugin.leaf'
import {defineLeaf} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
  blockObjects: [{name: 'image'}],
})

describe('defineLeaf void block-object wrapper contract', () => {
  test('consumer wrapping content with contentEditable=false + draggable on the inner wrapper preserves the spacer in editable context', async () => {
    const imageLeaf = defineLeaf<typeof schemaDefinition>({
      type: 'image',
      render: ({attributes, children, readOnly}) => (
        <div {...attributes} data-testid="image">
          {children}
          <div
            contentEditable={false}
            draggable={!readOnly}
            data-testid="image-inner"
          >
            <span>visual content</span>
          </div>
        </div>
      ),
    })

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: [{_key: 'i0', _type: 'image'}],
      children: <LeafPlugin leafs={[imageLeaf]} />,
    })

    await vi.waitFor(() => {
      const outer = document.querySelector('[data-testid="image"]')
      expect(outer).not.toEqual(null)

      const inner = outer!.querySelector('[data-testid="image-inner"]')
      expect(inner).not.toEqual(null)

      // The inner wrapper IS contentEditable=false AND draggable=true.
      expect(inner!.getAttribute('contenteditable')).toEqual('false')
      expect(inner!.getAttribute('draggable')).toEqual('true')

      // The outer engine wrapper is NOT contentEditable=false (block objects, unlike inline objects, do not get contentEditable=false auto-injected by the engine).
      expect(outer!.getAttribute('contenteditable')).toEqual(null)

      // The void spacer reaches the consumer through children and is NOT inside the contentEditable=false subtree.
      const spacer = outer!.querySelector('[data-slate-spacer]')
      expect(spacer).not.toEqual(null)
      expect(inner!.contains(spacer)).toEqual(false)
    })
  })

  test('Pressing Enter on a void block-object inserts a sibling text block when the leaf wraps content with contentEditable=false', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const imageKey = keyGenerator()

    const imageLeaf = defineLeaf<typeof schemaDefinition>({
      type: 'image',
      render: ({attributes, children, readOnly}) => (
        <div {...attributes}>
          {children}
          <div contentEditable={false} draggable={!readOnly}>
            <span>visual content</span>
          </div>
        </div>
      ),
    })

    const {locator, editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {_key: imageKey, _type: 'image'},
      ],
      children: <LeafPlugin leafs={[imageLeaf]} />,
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 3,
        },
      },
    })

    await userEvent.keyboard('{ArrowRight}')
    await userEvent.keyboard('{Enter}')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {_key: 'k2', _type: 'image'},
        {
          _key: 'k5',
          _type: 'block',
          children: [{_key: 'k6', _type: 'span', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })
})
