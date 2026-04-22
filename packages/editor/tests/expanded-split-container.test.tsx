import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
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

describe('split with an expanded selection inside a container', () => {
  test('splitting an expanded selection inside a code-block line', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const lineSpanKey = keyGenerator()
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
                {_type: 'span', _key: lineSpanKey, text: 'foobar', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[codeBlockContainer]} />,
    })

    const editable = document.querySelector('[role="textbox"]') as HTMLElement
    await userEvent.click(editable)

    // Select 'oo' inside 'foobar'.
    const point = (offset: number) => ({
      path: [
        {_key: codeBlockKey},
        'lines',
        {_key: lineKey},
        'children',
        {_key: lineSpanKey},
      ],
      offset,
    })

    editor.send({
      type: 'select',
      at: {anchor: point(1), focus: point(3)},
    })

    editor.send({type: 'split'})

    const value = editor.getSnapshot().context.value as Array<{
      _key: string
      lines?: Array<{_key: string; children: Array<{text?: string}>}>
    }>
    const lines = value[0]?.lines ?? []
    const lineTexts = lines.map((l) =>
      l.children.map((c) => c.text ?? '').join(''),
    )

    // Expanded split deletes the selection then splits at the caret.
    // 'foobar' with 'oo' selected → 'f' | 'bar' as two lines in the same
    // code block.
    expect(lineTexts).toEqual(['f', 'bar'])
  })
})
