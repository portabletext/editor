import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {getNodeIf} from './get-node-if'

describe(getNodeIf.name, () => {
  const schema = compileSchema(
    defineSchema({
      blockObjects: [
        {name: 'image'},
        {
          name: 'block quote',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [{type: 'block'}],
            },
          ],
        },
        {
          name: 'table',
          fields: [
            {
              name: 'rows',
              type: 'array',
              of: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'cells',
                      type: 'array',
                      of: [
                        {
                          type: 'cell',
                          fields: [
                            {
                              name: 'content',
                              type: 'array',
                              of: [{type: 'block'}],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      inlineObjects: [{name: 'image'}, {name: 'stock ticker'}],
    }),
  )
  const keyGenerator = createTestKeyGenerator()
  const imageBlockKey = keyGenerator()
  const imageBlock = {
    _key: imageBlockKey,
    _type: 'image',
  }
  const blockQuoteKey = keyGenerator()
  const quoteBlockKey = keyGenerator()
  const quoteSpanKey = keyGenerator()
  const quoteBlock = {
    _key: blockQuoteKey,
    _type: 'block quote',
    content: [
      {
        _key: quoteBlockKey,
        _type: 'block',
        children: [
          {
            _key: quoteSpanKey,
            _type: 'span',
            text: 'foo',
          },
        ],
      },
    ],
  }

  test('image block object', () => {
    expect(getNodeIf({children: [imageBlock]}, [0], schema)).toEqual(imageBlock)
  })

  test('image block object overflow', () => {
    expect(getNodeIf({children: [imageBlock]}, [0, 0], schema)).toEqual(
      undefined,
    )
  })

  test('block quote -> block -> span', () => {
    expect(getNodeIf({children: [quoteBlock]}, [0, 0, 0], schema)).toEqual({
      _key: quoteSpanKey,
      _type: 'span',
      text: 'foo',
    })
  })
})
