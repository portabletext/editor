import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {defineContainer, type Container} from '../renderers/renderer.types'
import {getBlockObjectSchema} from './get-block-object-schema'
import {resolveContainers} from './resolve-containers'

const testRender: Container['render'] = ({children}) => children

describe(getBlockObjectSchema.name, () => {
  test('returns a root-level block-object definition when block is at the document root', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {
            name: 'image',
            fields: [{name: 'src', type: 'string'}],
          },
        ],
      }),
    )
    const context = {
      context: {schema, containers: new Map(), value: []},
      blockIndexMap: new Map(),
    }
    const node = {_type: 'image', _key: 'i0', src: 'foo.png'}

    expect(getBlockObjectSchema(context, node, [{_key: 'i0'}])).toEqual({
      name: 'image',
      fields: [{name: 'src', type: 'string'}],
    })
  })

  test('returns an inline-declared type definition when block is inside a container', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'src', type: 'string'}]},
          {
            name: 'callout',
            fields: [
              {
                name: 'content',
                type: 'array',
                of: [{type: 'block'}, {type: 'image'}],
              },
            ],
          },
        ],
      }),
    )

    const containers = resolveContainers(schema, [
      defineContainer({
        type: 'callout',
        childField: 'content',
        render: testRender,
      }),
    ])

    const context = {
      context: {schema, containers, value: []},
      blockIndexMap: new Map(),
    }
    // `image` is in root `blockObjects` but not inline-declared inside callout.
    // Looking it up at a callout-internal position falls back to root.
    const imageNode = {_type: 'image', _key: 'i0', src: 'foo.png'}

    expect(
      getBlockObjectSchema(context, imageNode, [
        {_key: 'co0'},
        'content',
        {_key: 'i0'},
      ])?.name,
    ).toBe('image')
  })

  test('returns undefined when the type is unknown at the effective scope', () => {
    const schema = compileSchema(
      defineSchema({
        blockObjects: [{name: 'image'}],
      }),
    )
    const context = {
      context: {schema, containers: new Map(), value: []},
      blockIndexMap: new Map(),
    }
    const node = {_type: 'unknown', _key: 'u0'}

    expect(getBlockObjectSchema(context, node, [{_key: 'u0'}])).toBeUndefined()
  })
})
