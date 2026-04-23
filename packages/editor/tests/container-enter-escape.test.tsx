import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {userEvent} from '@vitest/browser/context'
import {describe, expect, test, vi} from 'vitest'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const codeBlockSchema = defineSchema({
  blockObjects: [
    {
      name: 'code-block',
      fields: [{name: 'lines', type: 'array', of: [{type: 'block'}]}],
    },
  ],
})

const codeBlockContainer = defineContainer<typeof codeBlockSchema>({
  scope: '$..code-block',
  field: 'lines',
  render: ({attributes, children}) => (
    <pre data-testid="code-block" {...attributes}>
      {children}
    </pre>
  ),
})

describe('container Enter escape', () => {
  test('Scenario: Enter on empty last line with empty previous sibling escapes to editor root', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const line1Key = keyGenerator()
    const line1SpanKey = keyGenerator()
    const line2Key = keyGenerator()
    const line2SpanKey = keyGenerator()
    const line3Key = keyGenerator()
    const line3SpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: codeBlockSchema,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: line1Key,
              children: [
                {_type: 'span', _key: line1SpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: line2Key,
              children: [
                {_type: 'span', _key: line2SpanKey, text: '', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: line3Key,
              children: [
                {_type: 'span', _key: line3SpanKey, text: '', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: line3Key},
            'children',
            {_key: line3SpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: line3Key},
            'children',
            {_key: line3SpanKey},
          ],
          offset: 0,
        },
      },
    })

    await userEvent.keyboard('{Enter}')

    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value
      expect(value).toEqual([
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: line1Key,
              children: [
                {_type: 'span', _key: line1SpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: 'k9',
          children: [{_type: 'span', _key: 'k10', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Enter on empty last line with non-empty previous sibling does NOT escape', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const line1Key = keyGenerator()
    const line1SpanKey = keyGenerator()
    const line2Key = keyGenerator()
    const line2SpanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: codeBlockSchema,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: line1Key,
              children: [
                {_type: 'span', _key: line1SpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: line2Key,
              children: [
                {_type: 'span', _key: line2SpanKey, text: '', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: line2Key},
            'children',
            {_key: line2SpanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: line2Key},
            'children',
            {_key: line2SpanKey},
          ],
          offset: 0,
        },
      },
    })

    await userEvent.keyboard('{Enter}')

    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value
      expect(value).toEqual([
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: line1Key,
              children: [
                {_type: 'span', _key: line1SpanKey, text: 'foo', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: line2Key,
              children: [
                {_type: 'span', _key: line2SpanKey, text: '', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'k7',
              children: [{_type: 'span', _key: 'k8', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })
})
