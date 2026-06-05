import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {NodePlugin} from '../src/plugins/plugin.node'
import {
  defineBlockObject,
  defineTextBlock,
} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

describe('dropPosition', () => {
  test('BlockObjectRenderProps.dropPosition is undefined when not mid-drag', async () => {
    const keyGenerator = createTestKeyGenerator()
    await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({blockObjects: [{name: 'image'}]}),
      initialValue: [{_type: 'image', _key: 'k0'}],
      children: (
        <NodePlugin
          nodes={[
            defineBlockObject({
              type: '*',
              render: ({attributes, children, dropPosition, node}) => (
                <div
                  data-testid={`block-${node._key}`}
                  data-drop-position={
                    dropPosition === undefined ? 'none' : dropPosition
                  }
                  {...attributes}
                >
                  {children}
                </div>
              ),
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      const k0 = document.querySelector('[data-testid="block-k0"]')
      expect(k0?.getAttribute('data-drop-position')).toEqual('none')
    })
  })

  test('TextBlockRenderProps.dropPosition is undefined when not mid-drag', async () => {
    const keyGenerator = createTestKeyGenerator()
    await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 's0', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineTextBlock({
              type: '*',
              render: ({attributes, children, dropPosition, node}) => (
                <div
                  data-testid={`block-${node._key}`}
                  data-drop-position={
                    dropPosition === undefined ? 'none' : dropPosition
                  }
                  {...attributes}
                >
                  {children}
                </div>
              ),
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      const k0 = document.querySelector('[data-testid="block-k0"]')
      expect(k0?.getAttribute('data-drop-position')).toEqual('none')
    })
  })
})
