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
      fields: [
        {
          name: 'lines',
          type: 'array',
          of: [{type: 'block'}],
        },
      ],
    },
  ],
  inlineObjects: [
    {
      name: 'stock-ticker',
      fields: [{name: 'symbol', type: 'string'}],
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

describe('insert into container', () => {
  test('insert.child (span) into a code-block line', async () => {
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

    const spanPath = [
      {_key: codeBlockKey},
      'lines',
      {_key: lineKey},
      'children',
      {_key: spanKey},
    ]
    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 3},
        focus: {path: spanPath, offset: 3},
      },
    })

    editor.send({
      type: 'insert.child',
      child: {_type: 'span', text: 'bar', marks: []},
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CODE-BLOCK:', '  B: foobar|'].join('\n'),
      )
    })
  })

  test('insert.inline object into a code-block line', async () => {
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

    const spanPath = [
      {_key: codeBlockKey},
      'lines',
      {_key: lineKey},
      'children',
      {_key: spanKey},
    ]
    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath, offset: 3},
        focus: {path: spanPath, offset: 3},
      },
    })

    editor.send({
      type: 'insert.inline object',
      inlineObject: {name: 'stock-ticker', value: {symbol: 'AAPL'}},
    })

    await vi.waitFor(() => {
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['CODE-BLOCK:', '  B: foo|{stock-ticker symbol="AAPL"}'].join('\n'),
      )
    })
  })
})
