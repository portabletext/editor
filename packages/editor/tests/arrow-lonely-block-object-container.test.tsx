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
      fields: [{name: 'lines', type: 'array', of: [{type: 'block'}]}],
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

describe('arrow on lonely block object — container awareness', () => {
  test('ArrowDown inside a code block line does NOT insert a root text block after', async () => {
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
      const el = document.querySelector('[data-testid="code-block"]')
      expect(el).not.toEqual(null)
      return el!
    })

    await userEvent.click(codeBlockElement)
    await userEvent.keyboard('{ArrowDown}')
    await new Promise((r) => setTimeout(r, 100))

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'code-block',
        _key: codeBlockKey,
        lines: [
          {
            _type: 'block',
            _key: lineKey,
            children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
  })

  test('ArrowUp inside a code block line does NOT insert a root text block before', async () => {
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
      const el = document.querySelector('[data-testid="code-block"]')
      expect(el).not.toEqual(null)
      return el!
    })

    await userEvent.click(codeBlockElement)
    await userEvent.keyboard('{ArrowUp}')
    await new Promise((r) => setTimeout(r, 100))

    expect(editor.getSnapshot().context.value).toEqual([
      {
        _type: 'code-block',
        _key: codeBlockKey,
        lines: [
          {
            _type: 'block',
            _key: lineKey,
            children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ])
  })

  test('ArrowDown on a lonely root void image still inserts an empty text block after', async () => {
    const schemaWithImage = defineSchema({
      blockObjects: [{name: 'image'}],
    })
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: schemaWithImage,
      initialValue: [{_type: 'image', _key: imageKey}],
    })

    const imageElement = await vi.waitFor(() => {
      const el = document.querySelector('[data-slate-void="true"]')
      expect(el).not.toEqual(null)
      return el!
    })

    await userEvent.click(imageElement)
    await userEvent.keyboard('{ArrowDown}')
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {_type: 'image', _key: imageKey},
        {
          _type: 'block',
          _key: 'k3',
          children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })
})
