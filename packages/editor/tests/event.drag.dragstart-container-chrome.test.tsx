import {createTestKeyGenerator} from '@portabletext/test'
import {assert, describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema} from '../src'
import {safeParse} from '../src/internal-utils/safe-json'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

describe('chrome drag', () => {
  test('Scenario: dragging a callout chrome drops the callout envelope', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const lineKey = keyGenerator()
    const spanKey = keyGenerator()
    const trailingBlockKey = keyGenerator()
    const trailingSpanKey = keyGenerator()

    const calloutContainer = defineContainer({
      type: 'callout',
      arrayField: 'content',
      render: ({attributes, childrenAttributes, children}) => (
        <aside {...attributes}>
          <span contentEditable={false} data-testid="chrome-icon">
            !
          </span>
          <div {...childrenAttributes}>{children}</div>
        </aside>
      ),
    })

    const {locator} = await createTestEditor({
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
          _key: calloutKey,
          _type: 'callout',
          content: [
            {
              _key: lineKey,
              _type: 'block',
              children: [
                {_key: spanKey, _type: 'span', text: 'note', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _key: trailingBlockKey,
          _type: 'block',
          children: [
            {_key: trailingSpanKey, _type: 'span', text: 'foo', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <NodePlugin nodes={[calloutContainer]} />,
    })

    await userEvent.click(locator)

    const icon = locator.element().querySelector('[data-testid="chrome-icon"]')
    assert(icon)
    const rect = icon.getBoundingClientRect()

    const dataTransfer = new DataTransfer()
    icon.dispatchEvent(
      new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      }),
    )

    // Inspect the serialized payload directly: the engine writes it to
    // the dataTransfer at serialize time, no drop required.
    await vi.waitFor(() => {
      const ptData = dataTransfer.getData('application/x-portable-text')
      const blocks = safeParse(ptData)
      expect(blocks).toEqual([
        {
          _key: calloutKey,
          _type: 'callout',
          content: [
            {
              _key: lineKey,
              _type: 'block',
              children: [
                {_key: spanKey, _type: 'span', text: 'note', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })
})
