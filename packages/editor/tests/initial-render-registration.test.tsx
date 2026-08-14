import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

describe('initial render', () => {
  test('a type registered as a container via NodePlugin never shows the engine block-object default fallback', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()

    // The engine's un-registered block-object default renders a
    // `[type: key]` placeholder (see `renderDefaultBlockObject`). If the
    // container registration landed after the first paint, that
    // placeholder would flash into the DOM before the container's own
    // render replaced it. A placeholder mounted and removed within one
    // synchronous flush produces no distinct mutation record, so this
    // observer can't catch that case; it's the best available instrument
    // now that there's no legacy render callback left to count.
    const bodySnapshots: Array<string> = []
    const observer = new MutationObserver(() => {
      bodySnapshots.push(document.body.textContent ?? '')
    })
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    const calloutContainer = defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({attributes, children}) => (
        <div data-testid="callout" {...attributes}>
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
      children: <NodePlugin nodes={[calloutContainer]} />,
    })

    await vi.waitFor(() => {
      const calloutElement = document.querySelector('[data-testid="callout"]')
      expect(calloutElement).not.toEqual(null)
    })

    observer.disconnect()

    expect(
      bodySnapshots.some((text) => text.includes(`callout: ${calloutKey}`)),
    ).toBe(false)
  })
})
