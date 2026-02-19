import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, it} from 'vitest'
import {toSlateBlock} from '../values'

const schemaTypes = compileSchema(defineSchema({}))

describe(toSlateBlock.name, () => {
  it('given type is custom with no custom properties, should be a childless void element', () => {
    const result = toSlateBlock(
      {
        _type: 'image',
        _key: '123',
      },
      {schemaTypes},
    )

    expect(result).toEqual({
      _key: '123',
      _type: 'image',
    })
  })

  it('given type is block', () => {
    const result = toSlateBlock(
      {
        _type: schemaTypes.block.name,
        _key: '123',
        children: [
          {
            _type: 'span',
            _key: '1231',
            text: '123',
          },
        ],
      },
      {schemaTypes},
    )
    expect(result).toEqual({
      _key: '123',
      _type: 'block',
      children: [
        {
          _key: '1231',
          _type: 'span',
          text: '123',
          marks: [],
        },
      ],
    })
  })

  it('given type is block and has custom in children', () => {
    const result = toSlateBlock(
      {
        _type: schemaTypes.block.name,
        _key: '123',
        children: [
          {
            _type: 'span',
            _key: '1231',
            text: '123',
          },
          {
            _type: 'image',
            _key: '1232',
            asset: {
              _ref: 'ref-123',
            },
          },
        ],
      },
      {schemaTypes},
    )

    expect(result).toEqual({
      _key: '123',
      _type: 'block',
      children: [
        {
          _key: '1231',
          _type: 'span',
          text: '123',
          marks: [],
        },
        {
          _key: '1232',
          _type: 'image',
          asset: {
            _ref: 'ref-123',
          },
        },
      ],
    })
  })
})
