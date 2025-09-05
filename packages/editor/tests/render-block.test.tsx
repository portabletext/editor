import {createTestKeyGenerator} from '@portabletext/test'
import {userEvent} from '@vitest/browser/context'
import {describe, expect, test, vi} from 'vitest'
import {
  defineSchema,
  type BlockRenderProps,
  type PortableTextBlock,
} from '../src'
import {createTestEditor} from '../src/internal-utils/test-editor'

describe('renderBlock', () => {
  test('Receives the updated value for text block changes', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooBlock = {
      _type: 'block',
      _key: keyGenerator(),
      children: [
        {
          _type: 'span',
          _key: keyGenerator(),
          text: 'foo',
          marks: [],
        },
        {
          _type: 'stock-ticker',
          _key: keyGenerator(),
          symbol: 'AAPL',
        },
        {
          _type: 'span',
          _key: keyGenerator(),
          text: '',
          marks: [],
        },
      ],
      markDefs: [],
      style: 'normal',
    }
    const barBlock = {
      _type: 'block',
      _key: keyGenerator(),
      children: [
        {
          _type: 'span',
          _key: keyGenerator(),
          text: 'bar',
          marks: [],
        },
      ],
      markDefs: [],
      style: 'normal',
    }

    const initialValue: PortableTextBlock[] = [fooBlock, barBlock]

    const renderBlockValues: Array<PortableTextBlock> = []
    const renderBlock = (props: BlockRenderProps) => {
      renderBlockValues.push(props.value)
      return props.children
    }

    const {locator} = await createTestEditor({
      keyGenerator,
      initialValue,
      schemaDefinition: defineSchema({
        inlineObjects: [{name: 'stock-ticker'}],
      }),
      editableProps: {renderBlock},
    })

    const barSpanLocator = locator.getByText('b')
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())
    await vi.waitFor(() => expect.element(barSpanLocator).toBeInTheDocument())

    expect(renderBlockValues).toEqual([
      {
        // Placeholder block
        _type: 'block',
        _key: 'k6',
        children: [
          {
            _type: 'span',
            _key: 'k7',
            text: '',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
      ...initialValue,
    ])

    await userEvent.click(barSpanLocator)

    await vi.waitFor(() =>
      expect(renderBlockValues.slice(3)).toEqual([barBlock]),
    )

    await userEvent.type(locator, '1')

    await vi.waitFor(() =>
      expect(renderBlockValues.slice(4)).toEqual([
        {
          ...barBlock,
          children: [
            {
              ...barBlock.children[0],
              text: 'b1ar',
            },
          ],
        },
      ]),
    )

    await userEvent.type(locator, '2')

    await vi.waitFor(() =>
      expect(renderBlockValues.slice(5)).toEqual([
        {
          ...barBlock,
          children: [
            {
              ...barBlock.children[0],
              text: 'b12ar',
            },
          ],
        },
      ]),
    )

    await userEvent.type(locator, '3')

    await vi.waitFor(() =>
      expect(renderBlockValues.slice(6)).toEqual([
        {
          ...barBlock,
          children: [
            {
              ...barBlock.children[0],
              text: 'b123ar',
            },
          ],
        },
      ]),
    )
  })
})
