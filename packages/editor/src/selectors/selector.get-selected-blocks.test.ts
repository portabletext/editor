import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../../test-utils/create-test-snapshot'
import {makeContainerConfig} from '../schema/make-container-config'
import {resolveContainers} from '../schema/resolve-containers'
import {getSelectedBlocks} from './selector.get-selected-blocks'

describe(getSelectedBlocks.name, () => {
  test('returns root-level blocks the selection covers', () => {
    const schema = compileSchema(defineSchema({}))
    const b1: PortableTextTextBlock = {
      _type: 'block',
      _key: 'b1',
      children: [{_type: 'span', _key: 'b1c1', text: 'foo', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const b2: PortableTextTextBlock = {
      _type: 'block',
      _key: 'b2',
      children: [{_type: 'span', _key: 'b2c1', text: 'bar', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const value: Array<PortableTextBlock> = [b1, b2]
    const selection = {
      anchor: {
        path: [{_key: 'b1'}, 'children', {_key: 'b1c1'}],
        offset: 0,
      },
      focus: {
        path: [{_key: 'b2'}, 'children', {_key: 'b2c1'}],
        offset: 3,
      },
    }

    expect(
      getSelectedBlocks(
        createTestSnapshot({context: {schema, value, selection}}),
      ),
    ).toEqual([
      {node: b1, path: [{_key: 'b1'}]},
      {node: b2, path: [{_key: 'b2'}]},
    ])
  })

  test('returns the enclosing container when the selection is inside one', () => {
    const schema = compileSchema(
      defineSchema({
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
      }),
    )
    const configs = new Map()
    configs.set(
      '$..callout',
      makeContainerConfig(schema, {
        scope: '$..callout',
        field: 'content',
      }),
    )
    const containers = resolveContainers(schema, configs)

    const innerBlock: PortableTextTextBlock = {
      _type: 'block',
      _key: 'ib1',
      children: [{_type: 'span', _key: 'ib1c1', text: 'inside', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const callout = {
      _type: 'callout',
      _key: 'cal1',
      content: [innerBlock],
    }
    const value: Array<PortableTextBlock> = [callout]

    const selection = {
      anchor: {
        path: [
          {_key: 'cal1'},
          'content',
          {_key: 'ib1'},
          'children',
          {_key: 'ib1c1'},
        ],
        offset: 0,
      },
      focus: {
        path: [
          {_key: 'cal1'},
          'content',
          {_key: 'ib1'},
          'children',
          {_key: 'ib1c1'},
        ],
        offset: 3,
      },
    }

    expect(
      getSelectedBlocks(
        createTestSnapshot({context: {schema, value, selection, containers}}),
      ),
    ).toEqual([{node: callout, path: [{_key: 'cal1'}]}])
  })
})
