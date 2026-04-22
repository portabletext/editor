import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'
import {toTextspec} from '../test-utils/to-textspec'

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

describe('split and insert.break inside editable containers', () => {
  test('split with an expanded selection across two lines of a code-block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const line1Key = keyGenerator()
    const line1SpanKey = keyGenerator()
    const line2Key = keyGenerator()
    const line2SpanKey = keyGenerator()

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
                {_type: 'span', _key: line2SpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: line1Key},
            'children',
            {_key: line1SpanKey},
          ],
          offset: 1,
        },
        focus: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: line2Key},
            'children',
            {_key: line2SpanKey},
          ],
          offset: 2,
        },
      },
    })

    editor.send({type: 'split'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CODE-BLOCK:', '  B: f', '  B: |r'].join('\n'),
      )
    })
  })

  test('insert.break with an expanded selection spanning two entire lines of a code-block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const line1Key = keyGenerator()
    const line1SpanKey = keyGenerator()
    const line2Key = keyGenerator()
    const line2SpanKey = keyGenerator()

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
                {_type: 'span', _key: line2SpanKey, text: 'bar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    // Select both lines entirely.
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: codeBlockKey},
            'lines',
            {_key: line1Key},
            'children',
            {_key: line1SpanKey},
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
          offset: 3,
        },
      },
    })

    editor.send({type: 'insert.break'})

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CODE-BLOCK:', '  B: '].join('\n'),
      )
    })
  })
})
