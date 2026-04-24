import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {getNode} from '../node-traversal/get-node'
import {defineContainer} from '../renderers/renderer.types'
import type {Node} from '../slate/interfaces/node'
import {getTypeChain} from './get-type-chain'
import {makeContainerConfig} from './make-container-config'
import {resolveContainers, type Containers} from './resolve-containers'

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
  ],
})

const schema = compileSchema(schemaDefinition)

const calloutContainer = defineContainer({
  scope: '$..callout',
  field: 'content',
})

const containers: Containers = resolveContainers(
  schema,
  new Map([
    [calloutContainer.scope, makeContainerConfig(schema, calloutContainer)],
  ]),
)

describe(getTypeChain.name, () => {
  test('root span: ["block", "span"]', () => {
    const value: Array<Node> = [
      {
        _type: 'block',
        _key: 'b1',
        children: [{_type: 'span', _key: 's1', text: 'hello', marks: []}],
        markDefs: [],
        style: 'normal',
      } as unknown as Node,
    ]
    const context = {schema, containers, value}
    const path = [{_key: 'b1'}, 'children', {_key: 's1'}]
    const entry = getNode(context, path)!
    expect(getTypeChain(context, entry.node, entry.path)).toEqual([
      'block',
      'span',
    ])
  })

  test('callout-nested span: ["callout", "block", "span"]', () => {
    const value: Array<Node> = [
      {
        _type: 'callout',
        _key: 'c1',
        content: [
          {
            _type: 'block',
            _key: 'b1',
            children: [{_type: 'span', _key: 's1', text: 'hi', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      } as unknown as Node,
    ]
    const context = {schema, containers, value}
    const path = [
      {_key: 'c1'},
      'content',
      {_key: 'b1'},
      'children',
      {_key: 's1'},
    ]
    const entry = getNode(context, path)!
    expect(getTypeChain(context, entry.node, entry.path)).toEqual([
      'callout',
      'block',
      'span',
    ])
  })

  test('root void block object: ["image"]', () => {
    const value: Array<Node> = [{_type: 'image', _key: 'i1'} as unknown as Node]
    const context = {schema, containers, value}
    const entry = getNode(context, [{_key: 'i1'}])!
    expect(getTypeChain(context, entry.node, entry.path)).toEqual(['image'])
  })
})
