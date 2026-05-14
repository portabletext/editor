import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {LeafPlugin} from '../src/plugins/plugin.leaf'
import {defineLeaf} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const inlineSchema = defineSchema({
  inlineObjects: [{name: 'stock-ticker'}],
})

const blockObjectSchema = defineSchema({
  blockObjects: [{name: 'image'}],
})

describe('defineLeaf void spacer', () => {
  test('the engine-emitted void spacer reaches the consumer through children for inline objects', async () => {
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
      schemaDefinition: inlineSchema,
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

      const spacer = consumerSpan!.querySelector('[data-slate-spacer]')
      expect(spacer).not.toEqual(null)
    })
  })

  test('the engine-emitted void spacer reaches the consumer through children for void block objects', async () => {
    const imageLeaf = defineLeaf({
      type: 'image',
      render: ({attributes, children, node}) => {
        const image = node as {src?: string}
        return (
          <div {...attributes} data-testid="image">
            {children}
            <span>image: {image.src ?? '?'}</span>
          </div>
        )
      },
    })

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: blockObjectSchema,
      initialValue: [
        {_key: 'i0', _type: 'image', src: 'https://example.com/x.png'},
      ],
      children: <LeafPlugin leaves={[imageLeaf]} />,
    })

    await vi.waitFor(() => {
      const consumerDiv = document.querySelector('[data-testid="image"]')
      expect(consumerDiv).not.toEqual(null)

      const spacer = consumerDiv!.querySelector('[data-slate-spacer]')
      expect(spacer).not.toEqual(null)
    })
  })
})
