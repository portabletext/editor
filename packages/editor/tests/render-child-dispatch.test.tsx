import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {LeafPlugin} from '../src/plugins/plugin.leaf'
import {defineContainer, defineLeaf} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const schema = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [
            {type: 'block'},
            {
              name: 'image',
              type: 'object',
              fields: [{name: 'src', type: 'string'}],
            },
          ],
        },
      ],
    },
    {
      name: 'image',
      fields: [{name: 'src', type: 'string'}],
    },
  ],
})

describe('renderChild dispatch', () => {
  test('parent container renderChild override fires for direct child of matching _type', async () => {
    const keyGenerator = createTestKeyGenerator()

    const {locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: schema,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c1',
          content: [
            {
              _type: 'image',
              _key: 'i1',
              src: 'inside-callout.png',
            },
          ],
        },
        {
          _type: 'image',
          _key: 'i2',
          src: 'top-level.png',
        },
      ],
      children: (
        <>
          <ContainerPlugin
            containers={[
              defineContainer({
                type: 'callout',
                childField: 'content',
                render: ({attributes, children}) => (
                  <div {...attributes} data-testid="callout">
                    {children}
                  </div>
                ),
                renderChild: {
                  image: ({attributes}) => (
                    <span {...attributes} data-testid="image-in-callout">
                      compact
                    </span>
                  ),
                },
              }),
            ]}
          />
          <LeafPlugin
            leaves={[
              defineLeaf({
                type: 'image',
                render: ({attributes}) => (
                  <div {...attributes} data-testid="image-global">
                    full-size
                  </div>
                ),
              }),
            ]}
          />
        </>
      ),
    })

    // Image inside callout uses the parent's renderChild override
    await expect
      .element(locator.getByTestId('image-in-callout'))
      .toBeInTheDocument()

    // Image at top level uses the global leaf render
    await expect
      .element(locator.getByTestId('image-global'))
      .toBeInTheDocument()
  })

  test('renderChild does NOT fire across an intermediate non-renderChild ancestor', async () => {
    // image inline-inside-block-inside-callout: parent is block (the text
    // block), NOT callout. Callout's renderChild.image must NOT fire.
    const keyGenerator = createTestKeyGenerator()
    const schemaWithInlineImage = defineSchema({
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
      inlineObjects: [
        {
          name: 'image',
          fields: [{name: 'src', type: 'string'}],
        },
      ],
    })

    const {locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: schemaWithInlineImage,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c1',
          content: [
            {
              _type: 'block',
              _key: 'b1',
              children: [
                {_type: 'span', _key: 's1', text: 'hi ', marks: []},
                {_type: 'image', _key: 'i1', src: 'inline.png'},
                {_type: 'span', _key: 's2', text: '', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <>
          <ContainerPlugin
            containers={[
              defineContainer({
                type: 'callout',
                childField: 'content',
                render: ({attributes, children}) => (
                  <div {...attributes} data-testid="callout">
                    {children}
                  </div>
                ),
                renderChild: {
                  image: ({attributes}) => (
                    <span {...attributes} data-testid="image-in-callout">
                      compact
                    </span>
                  ),
                },
              }),
            ]}
          />
          <LeafPlugin
            leaves={[
              defineLeaf({
                type: 'image',
                render: ({attributes}) => (
                  <span {...attributes} data-testid="image-global">
                    full-size
                  </span>
                ),
              }),
            ]}
          />
        </>
      ),
    })

    // Inline image inside the text block (which is inside callout) must
    // use the GLOBAL leaf render, not callout's renderChild override -
    // callout is the grandparent, not the immediate parent.
    await expect
      .element(locator.getByTestId('image-global'))
      .toBeInTheDocument()
    await expect(
      locator.getByTestId('image-in-callout').elements(),
    ).toHaveLength(0)
  })

  test('renderChild fires for a child type with no global registration', async () => {
    // Pip + Christian: the parent plugin is self-contained. A callout
    // plugin can declare `renderChild.chart` without a chart plugin
    // being mounted. Inside the callout, charts render via the override;
    // outside they fall through to engine default.
    const keyGenerator = createTestKeyGenerator()
    const schemaWithChart = defineSchema({
      blockObjects: [
        {
          name: 'callout',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [
                {type: 'block'},
                {
                  name: 'chart',
                  type: 'object',
                  fields: [{name: 'data', type: 'string'}],
                },
              ],
            },
          ],
        },
      ],
    })

    const {locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: schemaWithChart,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c1',
          content: [
            {
              _type: 'chart',
              _key: 'ch1',
              data: 'series-1',
            },
          ],
        },
      ],
      children: (
        <ContainerPlugin
          containers={[
            defineContainer({
              type: 'callout',
              childField: 'content',
              render: ({attributes, children}) => (
                <div {...attributes} data-testid="callout">
                  {children}
                </div>
              ),
              renderChild: {
                chart: ({attributes}) => (
                  <span {...attributes} data-testid="chart-in-callout">
                    chart
                  </span>
                ),
              },
            }),
          ]}
        />
      ),
    })

    // Chart has NO global defineContainer / defineLeaf. The callout
    // plugin's renderChild.chart fires anyway.
    await expect
      .element(locator.getByTestId('chart-in-callout'))
      .toBeInTheDocument()
  })

  test('renderChild.block fires for text-block children, bypassing the default text-block pipeline', async () => {
    // Symmetric with renderChild for any other `_type`: the override
    // fully replaces the engine's RenderTextBlock pipeline (style
    // switching, list-item rendering, marks). Authors who want
    // partial override use CSS or the outer container's `render`.
    const keyGenerator = createTestKeyGenerator()
    const schemaWithBlock = defineSchema({
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

    const {locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: schemaWithBlock,
      initialValue: [
        {
          _type: 'callout',
          _key: 'c1',
          content: [
            {
              _type: 'block',
              _key: 'b1',
              children: [
                {_type: 'span', _key: 's1', text: 'inside', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'outside', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <ContainerPlugin
          containers={[
            defineContainer({
              type: 'callout',
              childField: 'content',
              render: ({attributes, children}) => (
                <div {...attributes} data-testid="callout">
                  {children}
                </div>
              ),
              renderChild: {
                block: ({attributes, children}) => (
                  <div {...attributes} data-testid="block-in-callout">
                    {children}
                  </div>
                ),
              },
            }),
          ]}
        />
      ),
    })

    // Text block inside callout uses the parent's renderChild.block
    await expect
      .element(locator.getByTestId('block-in-callout'))
      .toBeInTheDocument()

    // Root-level text block does NOT use the override (no parent
    // container declares renderChild.block for it)
    await expect(
      locator.getByTestId('block-in-callout').elements(),
    ).toHaveLength(1)
  })
})
