import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, it} from 'vitest'
import {toSlateBlock} from '../values'

const schemaTypes = compileSchema(defineSchema({}))

describe(toSlateBlock.name, () => {
  it('given type is custom with no custom properties, should return directly as PT-shaped node', () => {
    const result = toSlateBlock(
      {
        _type: 'image',
        _key: '123',
      },
      {schemaTypes},
    )

    expect(result).toMatchObject({
      _key: '123',
      _type: 'image',
    })
    // No children or value wrapper
    expect(result).not.toHaveProperty('children')
    expect(result).not.toHaveProperty('value')
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
          marks: [],
          text: '123',
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

    // Inline objects are returned directly as PT-shaped nodes
    expect(result).toEqual({
      _key: '123',
      _type: 'block',
      children: [
        {
          _key: '1231',
          _type: 'span',
          marks: [],
          text: '123',
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
