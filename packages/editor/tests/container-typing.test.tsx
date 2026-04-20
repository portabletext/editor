import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}],
        },
      ],
    },
  ],
})

const calloutContainer = defineContainer<typeof schemaDefinition>({
  scope: '$..callout',
  field: 'content',
  render: ({attributes, children}) => (
    <div data-testid="callout" {...attributes}>
      {children}
    </div>
  ),
})

describe('typing inside containers', () => {
  test('multi-character keyboard input inside a container', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {
                  _type: 'span',
                  _key: spanKey,
                  text: '',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[calloutContainer]} />,
    })

    const calloutElement = await vi.waitFor(() => {
      const element = document.querySelector('[data-testid="callout"]')
      expect(element).not.toEqual(null)
      return element!
    })

    await userEvent.click(calloutElement)
    await userEvent.keyboard('hello')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {
                  _type: 'span',
                  _key: spanKey,
                  text: 'hello',
                  marks: [],
                },
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
