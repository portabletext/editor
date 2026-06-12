import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {NodePlugin} from '../src/plugins/plugin.node'
import {
  defineBlockObject,
  defineInlineObject,
} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

describe('draggable', () => {
  test('BlockObjectRenderProps.attributes.draggable is true', async () => {
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
              render: ({attributes, children, node}) => (
                <div
                  data-testid={`block-${node._key}`}
                  data-draggable={String(attributes['draggable'])}
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
      expect(k0?.getAttribute('data-draggable')).toEqual('true')
      expect(k0?.getAttribute('draggable')).toEqual('true')
    })
  })

  test('InlineObjectRenderProps.attributes.draggable is true', async () => {
    const keyGenerator = createTestKeyGenerator()
    await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({inlineObjects: [{name: 'mention'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 's0', text: 'hello ', marks: []},
            {_type: 'mention', _key: 'm0'},
            {_type: 'span', _key: 's1', text: ' world', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineInlineObject({
              type: '*',
              render: ({attributes, children, node}) => (
                <span
                  data-testid={`inline-${node._key}`}
                  data-draggable={String(attributes['draggable'])}
                  {...attributes}
                >
                  {children}
                </span>
              ),
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      const m0 = document.querySelector('[data-testid="inline-m0"]')
      expect(m0?.getAttribute('data-draggable')).toEqual('true')
      expect(m0?.getAttribute('draggable')).toEqual('true')
    })
  })
})
