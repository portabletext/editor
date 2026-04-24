import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {page} from '@vitest/browser/context'
import {describe, expect, test} from 'vitest'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
  styles: [{name: 'normal'}, {name: 'h1'}],
  decorators: [{name: 'strong'}, {name: 'em'}],
  lists: [{name: 'bullet'}, {name: 'number'}],
  annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
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
              styles: [{name: 'normal'}],
              decorators: [{name: 'strong'}],
              lists: [],
              annotations: [],
              inlineObjects: [],
            },
          ],
        },
      ],
    },
  ],
})

const calloutContainer = [
  defineContainer({
    scope: '$..callout',
    field: 'content',
    render: ({attributes, children}) => (
      <div {...attributes} data-testid="callout">
        {children}
      </div>
    ),
  }),
]

describe('renderers resolve sub-schema from container path', () => {
  test('renderStyle fires for a style declared by the nested block sub-schema', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()

    await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {_type: 'span', _key: innerSpanKey, text: 'inside', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={calloutContainer} />,
      editableProps: {
        renderStyle: ({children, value}) => (
          <span data-testid={`style-${value}`}>{children}</span>
        ),
      },
    })

    const styled = page.getByTestId('style-normal')
    await expect.element(styled).toBeInTheDocument()
  })

  test('renderDecorator fires for a decorator declared by the nested block sub-schema', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const innerBlockKey = keyGenerator()
    const innerSpanKey = keyGenerator()

    await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: innerBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: innerSpanKey,
                  text: 'bold',
                  marks: ['strong'],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <ContainerPlugin containers={calloutContainer} />,
      editableProps: {
        renderDecorator: ({children, value}) => (
          <strong data-testid={`decorator-${value}`}>{children}</strong>
        ),
      },
    })

    const decorated = page.getByTestId('decorator-strong')
    await expect.element(decorated).toBeInTheDocument()
  })
})
