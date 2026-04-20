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
      name: 'code-block',
      fields: [
        {
          name: 'lines',
          type: 'array',
          of: [{type: 'block'}],
        },
      ],
    },
  ],
})

const codeBlockContainer = defineContainer<typeof schemaDefinition>({
  scope: '$..code-block',
  field: 'lines',
  render: ({attributes, children}) => (
    <pre data-testid="code-block" {...attributes}>
      {children}
    </pre>
  ),
})

describe('code block navigation', () => {
  test('ArrowRight moves the caret forward inside a code block line', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    const codeBlockElement = await vi.waitFor(() => {
      const element = document.querySelector('[data-testid="code-block"]')
      expect(element).not.toEqual(null)
      return element!
    })

    await userEvent.click(codeBlockElement)
    await userEvent.keyboard('{ArrowRight}')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: lineKey},
            'children',
            {_key: spanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: lineKey},
            'children',
            {_key: spanKey},
          ],
          offset: 1,
        },
        backward: false,
      })
    })
  })

  test('Backspace deletes one character inside a code block line', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {_type: 'span', _key: spanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    const codeBlockElement = await vi.waitFor(() => {
      const element = document.querySelector('[data-testid="code-block"]')
      expect(element).not.toEqual(null)
      return element!
    })

    await userEvent.click(codeBlockElement)
    // click lands at offset 0; advance to offset 1 then delete back to offset 0.
    await userEvent.keyboard('{ArrowRight}')
    await userEvent.keyboard('{Backspace}')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [{_type: 'span', _key: spanKey, text: 'oo', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })
})
