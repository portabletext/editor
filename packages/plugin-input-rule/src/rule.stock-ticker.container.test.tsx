import {defineContainer} from '@portabletext/editor'
import {NodePlugin} from '@portabletext/editor/plugins'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {defineSchema} from '@portabletext/schema'
import {describe, expect, test, vi} from 'vitest'
import {InputRulePlugin} from './plugin.input-rule'
import {createStockTickerRule} from './rule.stock-ticker'

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}],
  inlineObjects: [{name: 'stock-ticker'}],
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

const containers = [
  defineContainer({
    type: 'callout',
    arrayField: 'content',
    render: ({attributes, childrenAttributes, children}) => (
      <div {...attributes} {...childrenAttributes}>
        {children}
      </div>
    ),
  }),
]

const stockTickerRule = createStockTickerRule({
  stockTickerObject: (context) => ({
    name: 'stock-ticker',
    value: {
      symbol: context.symbol,
    },
  }),
})

describe('stock-ticker rule (container awareness)', () => {
  test('triggers inside an editable container at depth and lands selection on the inserted ticker', async () => {
    const calloutKey = 'k0'
    const blockKey = 'k1'
    const spanKey = 'k2'

    let i = 3
    const testKeyGenerator = () => `k${i++}`

    const {editor} = await createTestEditor({
      keyGenerator: testKeyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: blockKey,
              children: [{_type: 'span', _key: spanKey, text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin nodes={containers} />
          <InputRulePlugin rules={[stockTickerRule]} />
        </>
      ),
    })

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: blockKey},
            'children',
            {_key: spanKey},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: calloutKey},
            'content',
            {_key: blockKey},
            'children',
            {_key: spanKey},
          ],
          offset: 0,
        },
      },
    })

    editor.send({type: 'insert.text', text: '{AAPL}'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'callout',
          content: [
            {
              _key: 'k1',
              _type: 'block',
              children: [
                {_key: 'k2', _type: 'span', marks: [], text: ''},
                {_key: 'k5', _type: 'stock-ticker'},
                {_key: 'k6', _type: 'span', marks: [], text: ''},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
    expect(editor.getSnapshot().context.selection).toEqual({
      anchor: {
        offset: 0,
        path: [{_key: 'k0'}, 'content', {_key: 'k1'}, 'children', {_key: 'k5'}],
      },
      backward: false,
      focus: {
        offset: 0,
        path: [{_key: 'k0'}, 'content', {_key: 'k1'}, 'children', {_key: 'k5'}],
      },
    })
  })
})
