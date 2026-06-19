import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import type {BlockRenderProps} from '../src'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

describe('initial render', () => {
  test('legacy renderBlock is never called for a type registered as a container via NodePlugin', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()

    const renderBlockCalls: Array<string> = []
    const renderBlock = (props: BlockRenderProps) => {
      renderBlockCalls.push(props.value._type)
      return props.children
    }

    const calloutContainer = defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({attributes, childrenAttributes, children}) => (
        <div data-testid="callout" {...attributes} {...childrenAttributes}>
          {children}
        </div>
      ),
    })

    await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'inside', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      editableProps: {renderBlock},
      children: <NodePlugin nodes={[calloutContainer]} />,
    })

    await vi.waitFor(() => {
      const calloutElement = document.querySelector('[data-testid="callout"]')
      expect(calloutElement).not.toEqual(null)
    })

    // Ad-hoc registration via NodePlugin lands before the first frame
    // the value renders, so the legacy renderBlock fallback never fires
    // for the registered type. Verifies that there is no visible
    // flicker between mount and registration on initial render.
    expect(renderBlockCalls).not.toContain('callout')
  })
})
