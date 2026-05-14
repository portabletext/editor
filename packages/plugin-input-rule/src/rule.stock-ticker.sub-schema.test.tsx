import {defineContainer} from '@portabletext/editor'
import {ContainerPlugin} from '@portabletext/editor/plugins'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {defineSchema} from '@portabletext/schema'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {InputRulePlugin} from './plugin.input-rule'
import {createStockTickerRule} from './rule.stock-ticker'

describe('stock-ticker rule respects the sub-schema at the focus', () => {
  test('does not trigger inside a container that does not declare the inline object', async () => {
    const schemaDefinition = defineSchema({
      // Root declares stock-ticker.
      inlineObjects: [{name: 'stock-ticker'}],
      blockObjects: [
        {
          name: 'callout',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [
                {
                  type: 'block',
                  // Sub-schema does not declare stock-ticker.
                  inlineObjects: [],
                },
              ],
            },
          ],
        },
      ],
    })

    const containers = [
      defineContainer({
        type: 'callout',
        childField: 'content',
        render: ({attributes, children}) => (
          <div data-testid="callout" {...attributes}>
            {children}
          </div>
        ),
      }),
    ]

    const stockTickerRule = createStockTickerRule({
      stockTickerObject: (context) => {
        const ticker = context.schema.inlineObjects.find(
          (inlineObject) => inlineObject.name === 'stock-ticker',
        )
        if (!ticker) {
          return undefined
        }
        return {name: ticker.name, value: {symbol: context.symbol}}
      },
    })

    const {editor, locator} = await createTestEditor({
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c1',
          content: [
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <>
          <ContainerPlugin containers={containers} />
          <InputRulePlugin rules={[stockTickerRule]} />
        </>
      ),
    })

    await vi.waitFor(() => {
      expect(document.querySelector('[data-testid="callout"]')).not.toEqual(
        null,
      )
    })

    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
          ],
          offset: 0,
        },
      },
    })

    await userEvent.keyboard('{{AAPL}')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'callout',
          _key: 'c1',
          content: [
            {
              _type: 'block',
              _key: 'b1',
              children: [
                {_type: 'span', _key: 's1', text: '{AAPL}', marks: []},
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
