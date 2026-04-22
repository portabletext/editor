import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {page} from '@vitest/browser/context'
import {describe, expect, test} from 'vitest'
import {LeafPlugin} from '../src/plugins/plugin.leaf'
import {defineLeaf} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'image',
      fields: [{name: 'src', type: 'string'}],
    },
  ],
  inlineObjects: [
    {
      name: 'stock-ticker',
      fields: [{name: 'symbol', type: 'string'}],
    },
  ],
})

const imageLeaf = [
  defineLeaf({
    scope: '$..image',
    render: ({attributes, children}) => (
      <div {...attributes} data-testid="leaf-image">
        image-leaf
        {children}
      </div>
    ),
  }),
]

const stockTickerLeaf = [
  defineLeaf({
    scope: '$..block.stock-ticker',
    render: ({attributes, children}) => (
      <span {...attributes} data-testid="leaf-ticker">
        STOCK
        {children}
      </span>
    ),
  }),
]

describe('defineLeaf replaces the outermost element for matching nodes', () => {
  test('void block object is rendered by the registered leaf', async () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()

    await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [{_type: 'image', _key: imageKey, src: 'hi.png'}],
      children: <LeafPlugin leafs={imageLeaf} />,
    })

    const el = page.getByTestId('leaf-image')
    await expect.element(el).toBeInTheDocument()
  })

  test('inline object is rendered by the registered leaf', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const tickerKey = keyGenerator()

    await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'before ', marks: []},
            {_type: 'stock-ticker', _key: tickerKey, symbol: 'ACME'},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: <LeafPlugin leafs={stockTickerLeaf} />,
    })

    const el = page.getByTestId('leaf-ticker')
    await expect.element(el).toBeInTheDocument()
  })

  test('unregistered leaf scope does not replace anything', async () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()

    await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [{_type: 'image', _key: imageKey, src: 'hi.png'}],
    })

    // No LeafPlugin -- the block object should render with the default
    // wrapper (which has className pt-block pt-object-block) and NOT
    // the custom marker.
    expect(document.querySelector('[data-testid="leaf-image"]')).toBeNull()
  })
})
