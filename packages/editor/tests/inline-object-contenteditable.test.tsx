import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {LeafPlugin} from '../src/plugins/plugin.leaf'
import {defineContainer, defineLeaf} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

describe('inline-object void wrapper contenteditable', () => {
  test('the consumer wrapper has `contenteditable="false"` when registered via `defineLeaf`', async () => {
    const stockTickerLeaf = defineLeaf({
      type: 'stock-ticker',
      render: ({attributes, children, node}) => {
        const ticker = node as {symbol?: string}
        return (
          <span {...attributes} data-testid="stock-ticker">
            {children}
            {ticker.symbol ?? '?'}
          </span>
        )
      },
    })

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({
        inlineObjects: [{name: 'stock-ticker'}],
      }),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [
            {_key: 's0', _type: 'span', text: 'before ', marks: []},
            {_key: 'i0', _type: 'stock-ticker', symbol: 'AAPL'},
            {_key: 's1', _type: 'span', text: ' after', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <LeafPlugin leaves={[stockTickerLeaf]} />,
    })

    await vi.waitFor(() => {
      const consumerSpan = document.querySelector(
        '[data-testid="stock-ticker"]',
      )
      expect(consumerSpan).not.toEqual(null)
      // The legacy pipeline is in play (no `ContainerPlugin`); confirm
      // by checking that `object-node.tsx` emitted the `data-slate-spacer`
      // variant of the inline-void spacer.
      expect(consumerSpan!.querySelector('[data-slate-spacer]')).not.toEqual(
        null,
      )
      expect(consumerSpan!.getAttribute('contenteditable')).toEqual('false')
    })
  })

  test('the engine-rendered placeholder wrapper has `contenteditable="false"` inside a container without `defineLeaf`', async () => {
    const cellContainer = defineContainer({
      type: 'cell',
      childField: 'content',
      render: ({attributes, children}) => <div {...attributes}>{children}</div>,
    })

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({
        inlineObjects: [{name: 'stock-ticker'}],
        blockObjects: [
          {
            name: 'cell',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block', of: [{type: 'stock-ticker'}]}],
              },
            ],
          },
        ],
      }),
      initialValue: [
        {
          _key: 'c0',
          _type: 'cell',
          content: [
            {
              _key: 'b0',
              _type: 'block',
              children: [
                {_key: 's0', _type: 'span', text: 'before ', marks: []},
                {_key: 'i0', _type: 'stock-ticker'},
                {_key: 's1', _type: 'span', text: ' after', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={[cellContainer]} />,
    })

    await vi.waitFor(() => {
      const wrapper = document.querySelector('[data-pt-inline="object"]')
      expect(wrapper).not.toEqual(null)
      expect(wrapper!.getAttribute('contenteditable')).toEqual('false')
    })
  })
})
