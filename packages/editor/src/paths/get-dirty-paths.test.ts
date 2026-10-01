import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import type {Node} from '../engine/interfaces/node'
import {defineContainer} from '../renderers/renderer.types'
import {resolveContainers, type Containers} from '../schema/resolve-containers'
import {getDirtyPaths, getRemovalAdjacency} from './get-dirty-paths'
import {serializePath} from './serialize-path'

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}],
  annotations: [{name: 'link'}],
  blockObjects: [
    {name: 'image'},
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
    {
      name: 'table',
      fields: [
        {
          name: 'rows',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'row',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  of: [
                    {
                      type: 'object',
                      name: 'cell',
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
})

const schema = compileSchema(schemaDefinition)

const emptyContainers: Containers = new Map()

const containerContainers: Containers = resolveContainers(schema, [
  defineContainer({
    type: 'callout',
    arrayField: 'content',
  }),
])

const tableContainers: Containers = resolveContainers(schema, [
  defineContainer({
    type: 'table',
    arrayField: 'rows',
  }),
  defineContainer({
    type: 'row',
    arrayField: 'cells',
  }),
  defineContainer({
    type: 'cell',
    arrayField: 'content',
  }),
])

describe(getDirtyPaths.name, () => {
  describe('insert.text / remove.text', () => {
    test('insert.text returns path levels of the operation path', () => {
      expect(
        getDirtyPaths(
          {
            schema,
            containers: emptyContainers,
            value: [],
          },
          {
            type: 'insert.text',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 0,
            text: 'hello',
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'b1'}], kind: 'ancestor'},
        {path: [{_key: 'b1'}, 'children', {_key: 's1'}], kind: 'node'},
      ])
    })

    test('remove.text returns path levels of the operation path', () => {
      expect(
        getDirtyPaths(
          {
            schema,
            containers: emptyContainers,
            value: [],
          },
          {
            type: 'remove.text',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 0,
            text: 'hello',
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'b1'}], kind: 'ancestor'},
        {path: [{_key: 'b1'}, 'children', {_key: 's1'}], kind: 'node'},
      ])
    })

    test('insert.text inside callout text block returns path levels at each node boundary', () => {
      expect(
        getDirtyPaths(
          {
            schema,
            containers: containerContainers,
            value: [],
          },
          {
            type: 'insert.text',
            path: [
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
            ],
            offset: 0,
            text: 'hello',
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'c1'}], kind: 'ancestor'},
        {path: [{_key: 'c1'}, 'content', {_key: 'b1'}], kind: 'ancestor'},
        {
          path: [
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
          ],
          kind: 'node',
        },
      ])
    })

    test('remove.text inside callout text block returns path levels at each node boundary', () => {
      expect(
        getDirtyPaths(
          {
            schema,
            containers: containerContainers,
            value: [],
          },
          {
            type: 'remove.text',
            path: [
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 's1'},
            ],
            offset: 0,
            text: 'hello',
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'c1'}], kind: 'ancestor'},
        {path: [{_key: 'c1'}, 'content', {_key: 'b1'}], kind: 'ancestor'},
        {
          path: [
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
          ],
          kind: 'node',
        },
      ])
    })
  })

  describe('set', () => {
    test('root-level value replacement dirties root and all children', () => {
      const newValue: Array<Node> = [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'hello'}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'b2',
          children: [{_type: 'span', _key: 's2', text: 'world'}],
          markDefs: [],
          style: 'normal',
        },
      ]

      expect(
        getDirtyPaths(
          {
            schema,
            containers: emptyContainers,
            value: [],
          },
          {
            type: 'set',
            path: [],
            value: newValue,
          },
        ),
      ).toEqual([
        {path: [], kind: 'node'},
        {path: [{_key: 'b1'}], kind: 'descendant'},
        {path: [{_key: 'b1'}, 'children', 0], kind: 'descendant'},
        {path: [{_key: 'b2'}], kind: 'descendant'},
        {path: [{_key: 'b2'}, 'children', 0], kind: 'descendant'},
      ])
    })

    test('root-level value replacement with keyless children dirties them by numeric index', () => {
      const newValue: Array<Node> = [
        {
          _type: 'block',
          _key: undefined as unknown as string,
          children: [{_type: 'span', _key: 's1', text: 'foo'}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: '',
          children: [{_type: 'span', _key: 's2', text: 'bar'}],
          markDefs: [],
          style: 'normal',
        },
      ]

      expect(
        getDirtyPaths(
          {
            schema,
            containers: emptyContainers,
            value: [],
          },
          {
            type: 'set',
            path: [],
            value: newValue,
          },
        ),
      ).toEqual([
        {path: [], kind: 'node'},
        {path: [0], kind: 'descendant'},
        {path: [0, 'children', 0], kind: 'descendant'},
        {path: [1], kind: 'descendant'},
        {path: [1, 'children', 0], kind: 'descendant'},
      ])
    })

    test('single property set dirties node path levels', () => {
      expect(
        getDirtyPaths(
          {
            schema,
            containers: emptyContainers,
            value: [],
          },
          {
            type: 'set',
            path: [{_key: 'b1'}, 'style'],
            value: 'h1',
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'b1'}], kind: 'node'},
      ])
    })

    test('_key change uses new key in dirty path', () => {
      expect(
        getDirtyPaths(
          {
            schema,
            containers: emptyContainers,
            value: [],
          },
          {
            type: 'set',
            path: [{_key: 'old-key'}, '_key'],
            value: 'new-key',
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'new-key'}], kind: 'node'},
      ])
    })

    test('full node replacement dirties node and descendants', () => {
      const replacementNode: Node = {
        _type: 'block',
        _key: 'b1',
        children: [
          {_type: 'span', _key: 's1', text: 'hello'},
          {_type: 'span', _key: 's2', text: 'world'},
        ],
        markDefs: [],
        style: 'normal',
      }

      expect(
        getDirtyPaths(
          {
            schema,
            containers: emptyContainers,
            value: [replacementNode],
          },
          {
            type: 'set',
            path: [{_key: 'b1'}],
            value: replacementNode,
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'b1'}], kind: 'node'},
        {path: [{_key: 'b1'}, 'children', 0], kind: 'descendant'},
        {path: [{_key: 'b1'}, 'children', 1], kind: 'descendant'},
      ])
    })

    test('child array field replacement dirties new children', () => {
      const blockNode: Node = {
        _type: 'block',
        _key: 'b1',
        children: [
          {_type: 'span', _key: 's1', text: 'hello'},
          {_type: 'span', _key: 's2', text: 'world'},
        ],
        markDefs: [],
        style: 'normal',
      }

      expect(
        getDirtyPaths(
          {
            schema,
            containers: emptyContainers,
            value: [blockNode],
          },
          {
            type: 'set',
            path: [{_key: 'b1'}, 'children'],
            value: [
              {_type: 'span', _key: 'new-s1', text: 'new'},
              {_type: 'span', _key: 'new-s2', text: 'text'},
            ],
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'b1'}], kind: 'node'},
        {
          path: [{_key: 'b1'}, 'children', {_key: 'new-s1'}],
          kind: 'descendant',
        },
        {
          path: [{_key: 'b1'}, 'children', {_key: 'new-s2'}],
          kind: 'descendant',
        },
      ])
    })

    test('child array field replacement with keyless children dirties them by numeric index', () => {
      const blockNode: Node = {
        _type: 'block',
        _key: 'b1',
        children: [
          {_type: 'span', _key: 's1', text: 'hello'},
          {_type: 'span', _key: 's2', text: 'world'},
        ],
        markDefs: [],
        style: 'normal',
      }

      expect(
        getDirtyPaths(
          {
            schema,
            containers: emptyContainers,
            value: [blockNode],
          },
          {
            type: 'set',
            path: [{_key: 'b1'}, 'children'],
            value: [
              {
                _type: 'span',
                _key: undefined as unknown as string,
                text: 'foo',
              },
              {_type: 'span', _key: '', text: 'bar'},
            ],
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'b1'}], kind: 'node'},
        {path: [{_key: 'b1'}, 'children', 0], kind: 'descendant'},
        {path: [{_key: 'b1'}, 'children', 1], kind: 'descendant'},
      ])
    })

    test('root-level value replacement with container children dirties descendants', () => {
      const calloutNode: Node = {
        _type: 'callout',
        _key: 'c1',
        content: [
          {
            _type: 'block',
            _key: 'cb1',
            children: [{_type: 'span', _key: 'cs1', text: 'inside callout'}],
            markDefs: [],
            style: 'normal',
          },
        ],
      }

      expect(
        getDirtyPaths(
          {
            schema,
            containers: containerContainers,
            value: [],
          },
          {
            type: 'set',
            path: [],
            value: [calloutNode],
          },
        ),
      ).toEqual([
        {path: [], kind: 'node'},
        {path: [{_key: 'c1'}], kind: 'descendant'},
        {path: [{_key: 'c1'}, 'content', 0], kind: 'descendant'},
        {path: [{_key: 'c1'}, 'content', 0, 'children', 0], kind: 'descendant'},
      ])
    })

    test('property set inside callout dirties node path levels', () => {
      expect(
        getDirtyPaths(
          {
            schema,
            containers: containerContainers,
            value: [],
          },
          {
            type: 'set',
            path: [{_key: 'c1'}, 'content', {_key: 'b1'}, 'style'],
            value: 'h1',
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'c1'}], kind: 'ancestor'},
        {path: [{_key: 'c1'}, 'content', {_key: 'b1'}], kind: 'node'},
      ])
    })

    test('_key change inside callout uses new key in dirty path', () => {
      expect(
        getDirtyPaths(
          {
            schema,
            containers: containerContainers,
            value: [],
          },
          {
            type: 'set',
            path: [{_key: 'c1'}, 'content', {_key: 'old'}, '_key'],
            value: 'new-key',
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'c1'}], kind: 'ancestor'},
        {path: [{_key: 'c1'}, 'content', {_key: 'new-key'}], kind: 'node'},
      ])
    })

    test('full node replacement inside callout dirties node and descendants', () => {
      const replacementBlock: Node = {
        _type: 'block',
        _key: 'b1',
        children: [
          {_type: 'span', _key: 's1', text: 'hello'},
          {_type: 'span', _key: 's2', text: 'world'},
        ],
        markDefs: [],
        style: 'normal',
      }

      const calloutNode: Node = {
        _type: 'callout',
        _key: 'c1',
        content: [replacementBlock],
      }

      expect(
        getDirtyPaths(
          {
            schema,
            containers: containerContainers,
            value: [calloutNode],
          },
          {
            type: 'set',
            path: [{_key: 'c1'}, 'content', {_key: 'b1'}],
            value: replacementBlock,
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'c1'}], kind: 'ancestor'},
        {path: [{_key: 'c1'}, 'content', {_key: 'b1'}], kind: 'node'},
        {
          path: [{_key: 'c1'}, 'content', {_key: 'b1'}, 'children', 0],
          kind: 'descendant',
        },
        {
          path: [{_key: 'c1'}, 'content', {_key: 'b1'}, 'children', 1],
          kind: 'descendant',
        },
      ])
    })

    test('child array replacement inside callout dirties new children', () => {
      const blockNode: Node = {
        _type: 'block',
        _key: 'b1',
        children: [{_type: 'span', _key: 's1', text: 'hello'}],
        markDefs: [],
        style: 'normal',
      }

      const calloutNode: Node = {
        _type: 'callout',
        _key: 'c1',
        content: [blockNode],
      }

      expect(
        getDirtyPaths(
          {
            schema,
            containers: containerContainers,
            value: [calloutNode],
          },
          {
            type: 'set',
            path: [{_key: 'c1'}, 'content', {_key: 'b1'}, 'children'],
            value: [
              {_type: 'span', _key: 'new-s1', text: 'new'},
              {_type: 'span', _key: 'new-s2', text: 'text'},
            ],
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'c1'}], kind: 'ancestor'},
        {path: [{_key: 'c1'}, 'content', {_key: 'b1'}], kind: 'node'},
        {
          path: [
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 'new-s1'},
          ],
          kind: 'descendant',
        },
        {
          path: [
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 'new-s2'},
          ],
          kind: 'descendant',
        },
      ])
    })

    test('property set inside table cell dirties node path levels', () => {
      expect(
        getDirtyPaths(
          {
            schema,
            containers: tableContainers,
            value: [],
          },
          {
            type: 'set',
            path: [
              {_key: 't1'},
              'rows',
              {_key: 'r1'},
              'cells',
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
              'style',
            ],
            value: 'h1',
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 't1'}], kind: 'ancestor'},
        {path: [{_key: 't1'}, 'rows', {_key: 'r1'}], kind: 'ancestor'},
        {
          path: [{_key: 't1'}, 'rows', {_key: 'r1'}, 'cells', {_key: 'c1'}],
          kind: 'ancestor',
        },
        {
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
          ],
          kind: 'node',
        },
      ])
    })

    test('replacing a child by index dirties the block as the node and not the replaced child', () => {
      const keyGenerator = createTestKeyGenerator()
      const block = textBlock(keyGenerator, ['foo'])

      expect(
        getDirtyPaths(
          {
            schema,
            containers: emptyContainers,
            value: [block],
          },
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', 0],
            value: {_type: 'span', _key: keyGenerator(), text: 'bar'},
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'k0'}], kind: 'node'},
      ])
    })

    test('property set on a `markDefs` entry dirties the owning block as the node', () => {
      const keyGenerator = createTestKeyGenerator()
      const block = textBlock(keyGenerator, ['foo'])
      const linkKey = keyGenerator()

      expect(
        getDirtyPaths(
          {
            schema,
            containers: emptyContainers,
            value: [
              {
                ...block,
                markDefs: [{_type: 'link', _key: linkKey, href: 'https://bar'}],
              },
            ],
          },
          {
            type: 'set',
            path: [{_key: 'k0'}, 'markDefs', {_key: 'k2'}, 'href'],
            value: 'https://bar',
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'k0'}], kind: 'node'},
        {path: [{_key: 'k0'}, 'markDefs', {_key: 'k2'}], kind: 'node'},
      ])
    })

    test('replacing a `markDefs` entry dirties the owning block as the node', () => {
      const keyGenerator = createTestKeyGenerator()
      const block = textBlock(keyGenerator, ['foo'])
      const link = {_type: 'link', _key: keyGenerator(), href: 'https://bar'}

      expect(
        getDirtyPaths(
          {
            schema,
            containers: emptyContainers,
            value: [{...block, markDefs: [link]}],
          },
          {
            type: 'set',
            path: [{_key: 'k0'}, 'markDefs', {_key: 'k2'}],
            value: link,
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'k0'}], kind: 'node'},
        {path: [{_key: 'k0'}, 'markDefs', {_key: 'k2'}], kind: 'node'},
      ])
    })

    test('property set on a child of a resolved block keeps the block an ancestor', () => {
      const keyGenerator = createTestKeyGenerator()

      expect(
        getDirtyPaths(
          {
            schema,
            containers: emptyContainers,
            value: [textBlock(keyGenerator, ['foo'])],
          },
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'text'],
            value: 'bar',
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'k0'}], kind: 'ancestor'},
        {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], kind: 'node'},
      ])
    })
  })

  describe('unset', () => {
    test('node removal with keyed last segment returns ancestor paths only', () => {
      expect(
        getDirtyPaths(
          {
            schema,
            containers: emptyContainers,
            value: [],
          },
          {
            type: 'unset',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'b1'}], kind: 'ancestor'},
      ])
    })

    test('property removal returns node path levels', () => {
      expect(
        getDirtyPaths(
          {
            schema,
            containers: emptyContainers,
            value: [],
          },
          {
            type: 'unset',
            path: [{_key: 'b1'}, 'style'],
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'b1'}], kind: 'node'},
      ])
    })

    test('_key unset uses numeric index for keyless node', () => {
      const value: Array<Node> = [
        {
          _type: 'block',
          _key: 'b1',
          children: [{_type: 'span', _key: 's1', text: 'hello'}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: undefined as unknown as string,
          children: [{_type: 'span', _key: 's2', text: 'world'}],
          markDefs: [],
          style: 'normal',
        },
      ]

      expect(
        getDirtyPaths(
          {
            schema,
            containers: emptyContainers,
            value,
          },
          {
            type: 'unset',
            path: [{_key: 'old-key'}, '_key'],
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [1], kind: 'node'},
      ])
    })

    test('numeric last segment returns ancestor paths', () => {
      expect(
        getDirtyPaths(
          {
            schema,
            containers: emptyContainers,
            value: [],
          },
          {
            type: 'unset',
            path: [{_key: 'b1'}, 'children', 0],
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'b1'}], kind: 'ancestor'},
      ])
    })

    test('node removal inside callout returns ancestor paths', () => {
      expect(
        getDirtyPaths(
          {
            schema,
            containers: containerContainers,
            value: [],
          },
          {
            type: 'unset',
            path: [{_key: 'c1'}, 'content', {_key: 'b1'}],
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'c1'}], kind: 'ancestor'},
      ])
    })

    test('property removal inside callout returns node path levels', () => {
      expect(
        getDirtyPaths(
          {
            schema,
            containers: containerContainers,
            value: [],
          },
          {
            type: 'unset',
            path: [{_key: 'c1'}, 'content', {_key: 'b1'}, 'style'],
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'c1'}], kind: 'ancestor'},
        {path: [{_key: 'c1'}, 'content', {_key: 'b1'}], kind: 'node'},
      ])
    })

    test('_key unset inside callout uses numeric index for keyless node', () => {
      const calloutValue: Array<Node> = [
        {
          _type: 'callout',
          _key: 'c1',
          content: [
            {
              _type: 'block',
              _key: 'b1',
              children: [{_type: 'span', _key: 's1', text: 'first'}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: undefined as unknown as string,
              children: [{_type: 'span', _key: 's2', text: 'keyless'}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ]

      expect(
        getDirtyPaths(
          {
            schema,
            containers: containerContainers,
            value: calloutValue,
          },
          {
            type: 'unset',
            path: [{_key: 'c1'}, 'content', {_key: 'old-key'}, '_key'],
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'c1'}], kind: 'ancestor'},
        {path: [{_key: 'c1'}, 'content', 1], kind: 'node'},
      ])
    })

    test('node removal from a resolved block keeps the block an ancestor', () => {
      const keyGenerator = createTestKeyGenerator()

      expect(
        getDirtyPaths(
          {
            schema,
            containers: emptyContainers,
            value: [textBlock(keyGenerator, ['foo'])],
          },
          {
            type: 'unset',
            path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'k0'}], kind: 'ancestor'},
      ])
    })

    test('removing a property of a `markDefs` entry dirties the owning block as the node', () => {
      const keyGenerator = createTestKeyGenerator()
      const block = textBlock(keyGenerator, ['foo'])
      const linkKey = keyGenerator()

      expect(
        getDirtyPaths(
          {
            schema,
            containers: emptyContainers,
            value: [
              {
                ...block,
                markDefs: [{_type: 'link', _key: linkKey, href: 'https://bar'}],
              },
            ],
          },
          {
            type: 'unset',
            path: [{_key: 'k0'}, 'markDefs', {_key: 'k2'}, 'href'],
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'k0'}], kind: 'node'},
        {path: [{_key: 'k0'}, 'markDefs', {_key: 'k2'}], kind: 'node'},
      ])
    })

    test('removing a `markDefs` entry dirties the owning block as the node', () => {
      const keyGenerator = createTestKeyGenerator()

      expect(
        getDirtyPaths(
          {
            schema,
            containers: emptyContainers,
            value: [textBlock(keyGenerator, ['foo'])],
          },
          {
            type: 'unset',
            path: [{_key: 'k0'}, 'markDefs', {_key: 'k2'}],
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'k0'}], kind: 'node'},
      ])
    })

    test('removing a mark from a span dirties the span as the node', () => {
      const keyGenerator = createTestKeyGenerator()

      expect(
        getDirtyPaths(
          {
            schema,
            containers: emptyContainers,
            value: [textBlock(keyGenerator, ['foo'])],
          },
          {
            type: 'unset',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}, 'marks', 0],
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'k0'}], kind: 'ancestor'},
        {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], kind: 'node'},
      ])
    })
  })

  describe('insert', () => {
    test('insert span dirties ancestors and inserted node path', () => {
      expect(
        getDirtyPaths(
          {
            schema,
            containers: emptyContainers,
            value: [],
          },
          {
            type: 'insert',
            path: [{_key: 'b1'}, 'children', {_key: 'existing'}],
            node: {_type: 'span', _key: 'new-span', text: ''},
            position: 'after',
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'b1'}], kind: 'ancestor'},
        {
          path: [{_key: 'b1'}, 'children', {_key: 'existing'}],
          kind: 'neighbour',
        },
        {path: [{_key: 'b1'}, 'children', {_key: 'new-span'}], kind: 'node'},
      ])
    })

    test('inserting a `markDefs` entry dirties the owning block as the node', () => {
      const keyGenerator = createTestKeyGenerator()
      const block = textBlock(keyGenerator, ['foo'])
      const existingLink = {
        _type: 'link',
        _key: keyGenerator(),
        href: 'https://bar',
      }
      const newLink = {_type: 'link', _key: keyGenerator(), href: 'https://baz'}

      expect(
        getDirtyPaths(
          {
            schema,
            containers: emptyContainers,
            value: [{...block, markDefs: [newLink, existingLink]}],
          },
          {
            type: 'insert',
            path: [{_key: 'k0'}, 'markDefs', 0],
            node: newLink,
            position: 'before',
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'k0'}], kind: 'node'},
        {path: [{_key: 'k0'}, 'markDefs', 0], kind: 'node'},
        {path: [{_key: 'k0'}, 'markDefs', {_key: 'k3'}], kind: 'node'},
      ])
    })

    test('a numeric `before` reference with a negative index stays the neighbour', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const fooKey = keyGenerator()
      const barKey = keyGenerator()
      const newSpan = {_type: 'span', _key: keyGenerator(), text: 'baz'}

      expect(
        getDirtyPaths(
          {
            schema,
            containers: emptyContainers,
            value: [
              {
                _type: 'block',
                _key: blockKey,
                children: [
                  {_type: 'span', _key: fooKey, text: 'foo', marks: []},
                  newSpan,
                  {_type: 'span', _key: barKey, text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
          {
            type: 'insert',
            path: [{_key: 'k0'}, 'children', -1],
            node: newSpan,
            position: 'before',
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'k0'}], kind: 'ancestor'},
        {path: [{_key: 'k0'}, 'children', -1], kind: 'neighbour'},
        {path: [{_key: 'k0'}, 'children', {_key: 'k3'}], kind: 'node'},
      ])
    })

    test('insert block dirties ancestors, node path, and children', () => {
      const blockNode: Node = {
        _type: 'block',
        _key: 'new-block',
        children: [
          {_type: 'span', _key: 's1', text: 'hello'},
          {_type: 'span', _key: 's2', text: 'world'},
        ],
        markDefs: [],
        style: 'normal',
      }

      expect(
        getDirtyPaths(
          {
            schema,
            containers: emptyContainers,
            value: [],
          },
          {
            type: 'insert',
            path: [{_key: 'existing-block'}],
            node: blockNode,
            position: 'after',
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'existing-block'}], kind: 'neighbour'},
        {path: [{_key: 'new-block'}], kind: 'node'},
        {path: [{_key: 'new-block'}, 'children', 0], kind: 'descendant'},
        {path: [{_key: 'new-block'}, 'children', 1], kind: 'descendant'},
      ])
    })

    test('insert container block dirties ancestors, node path, and nested descendants', () => {
      const calloutNode: Node = {
        _type: 'callout',
        _key: 'new-callout',
        content: [
          {
            _type: 'block',
            _key: 'cb1',
            children: [{_type: 'span', _key: 'cs1', text: 'inside'}],
            markDefs: [],
            style: 'normal',
          },
        ],
      }

      expect(
        getDirtyPaths(
          {
            schema,
            containers: containerContainers,
            value: [],
          },
          {
            type: 'insert',
            path: [{_key: 'existing-block'}],
            node: calloutNode,
            position: 'after',
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'existing-block'}], kind: 'neighbour'},
        {path: [{_key: 'new-callout'}], kind: 'node'},
        {path: [{_key: 'new-callout'}, 'content', 0], kind: 'descendant'},
        {
          path: [{_key: 'new-callout'}, 'content', 0, 'children', 0],
          kind: 'descendant',
        },
      ])
    })

    test('insert span inside callout text block dirties ancestors and inserted node path', () => {
      expect(
        getDirtyPaths(
          {
            schema,
            containers: containerContainers,
            value: [],
          },
          {
            type: 'insert',
            path: [
              {_key: 'c1'},
              'content',
              {_key: 'b1'},
              'children',
              {_key: 'existing'},
            ],
            node: {_type: 'span', _key: 'new-span', text: ''},
            position: 'after',
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'c1'}], kind: 'ancestor'},
        {path: [{_key: 'c1'}, 'content', {_key: 'b1'}], kind: 'ancestor'},
        {
          path: [
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 'existing'},
          ],
          kind: 'neighbour',
        },
        {
          path: [
            {_key: 'c1'},
            'content',
            {_key: 'b1'},
            'children',
            {_key: 'new-span'},
          ],
          kind: 'node',
        },
      ])
    })

    test('insert block inside callout content dirties ancestors, node path, and children', () => {
      const blockNode: Node = {
        _type: 'block',
        _key: 'new-block',
        children: [
          {_type: 'span', _key: 's1', text: 'hello'},
          {_type: 'span', _key: 's2', text: 'world'},
        ],
        markDefs: [],
        style: 'normal',
      }

      expect(
        getDirtyPaths(
          {
            schema,
            containers: containerContainers,
            value: [],
          },
          {
            type: 'insert',
            path: [{_key: 'c1'}, 'content', {_key: 'existing-block'}],
            node: blockNode,
            position: 'after',
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'c1'}], kind: 'ancestor'},
        {
          path: [{_key: 'c1'}, 'content', {_key: 'existing-block'}],
          kind: 'neighbour',
        },
        {path: [{_key: 'c1'}, 'content', {_key: 'new-block'}], kind: 'node'},
        {
          path: [{_key: 'c1'}, 'content', {_key: 'new-block'}, 'children', 0],
          kind: 'descendant',
        },
        {
          path: [{_key: 'c1'}, 'content', {_key: 'new-block'}, 'children', 1],
          kind: 'descendant',
        },
      ])
    })

    test('insert block inside table cell content dirties ancestors, node path, and children', () => {
      const blockNode: Node = {
        _type: 'block',
        _key: 'new-block',
        children: [{_type: 'span', _key: 's1', text: 'hello'}],
        markDefs: [],
        style: 'normal',
      }

      expect(
        getDirtyPaths(
          {
            schema,
            containers: tableContainers,
            value: [],
          },
          {
            type: 'insert',
            path: [
              {_key: 't1'},
              'rows',
              {_key: 'r1'},
              'cells',
              {_key: 'c1'},
              'content',
              {_key: 'existing-block'},
            ],
            node: blockNode,
            position: 'after',
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 't1'}], kind: 'ancestor'},
        {path: [{_key: 't1'}, 'rows', {_key: 'r1'}], kind: 'ancestor'},
        {
          path: [{_key: 't1'}, 'rows', {_key: 'r1'}, 'cells', {_key: 'c1'}],
          kind: 'ancestor',
        },
        {
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c1'},
            'content',
            {_key: 'existing-block'},
          ],
          kind: 'neighbour',
        },
        {
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c1'},
            'content',
            {_key: 'new-block'},
          ],
          kind: 'node',
        },
        {
          path: [
            {_key: 't1'},
            'rows',
            {_key: 'r1'},
            'cells',
            {_key: 'c1'},
            'content',
            {_key: 'new-block'},
            'children',
            0,
          ],
          kind: 'descendant',
        },
      ])
    })

    test('insert before a numeric reference dirties the reference path as the node it now addresses', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const fooSpan = {_type: 'span', _key: keyGenerator(), text: 'foo'}
      const span = {_type: 'span', _key: keyGenerator(), text: 'bar'}

      expect(
        getDirtyPaths(
          {
            schema,
            containers: emptyContainers,
            value: [
              {
                _type: 'block',
                _key: blockKey,
                children: [span, fooSpan],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
          {
            type: 'insert',
            path: [{_key: 'k0'}, 'children', 0],
            node: span,
            position: 'before',
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'k0'}], kind: 'ancestor'},
        {path: [{_key: 'k0'}, 'children', 0], kind: 'node'},
        {path: [{_key: 'k0'}, 'children', {_key: 'k2'}], kind: 'node'},
      ])
    })

    test('insert after a numeric reference dirties the reference path as a neighbour', () => {
      const keyGenerator = createTestKeyGenerator()
      const blockKey = keyGenerator()
      const fooSpan = {_type: 'span', _key: keyGenerator(), text: 'foo'}
      const span = {_type: 'span', _key: keyGenerator(), text: 'bar'}

      expect(
        getDirtyPaths(
          {
            schema,
            containers: emptyContainers,
            value: [
              {
                _type: 'block',
                _key: blockKey,
                children: [fooSpan, span],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
          {
            type: 'insert',
            path: [{_key: 'k0'}, 'children', 0],
            node: span,
            position: 'after',
          },
        ),
      ).toEqual([
        {path: [], kind: 'ancestor'},
        {path: [{_key: 'k0'}], kind: 'ancestor'},
        {path: [{_key: 'k0'}, 'children', 0], kind: 'neighbour'},
        {path: [{_key: 'k0'}, 'children', {_key: 'k2'}], kind: 'node'},
      ])
    })
  })
})

describe(getRemovalAdjacency.name, () => {
  test('keyed node removal records the siblings it leaves adjacent', () => {
    const keyGenerator = createTestKeyGenerator()

    expect(
      getRemovalAdjacency(
        {
          context: {
            schema,
            containers: emptyContainers,
            value: [textBlock(keyGenerator, ['foo', 'bar', 'baz'])],
          },
          blockIndexMap: new Map(),
        },
        {
          type: 'unset',
          path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
        },
      ),
    ).toEqual({
      path: [{_key: 'k0'}],
      kind: 'adjacency',
      adjacency: {
        previous: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        next: [{_key: 'k0'}, 'children', {_key: 'k3'}],
      },
    })
  })

  test('numeric node removal records the siblings it leaves adjacent', () => {
    const keyGenerator = createTestKeyGenerator()

    expect(
      getRemovalAdjacency(
        {
          context: {
            schema,
            containers: emptyContainers,
            value: [textBlock(keyGenerator, ['foo', 'bar', 'baz'])],
          },
          blockIndexMap: new Map(),
        },
        {
          type: 'unset',
          path: [{_key: 'k0'}, 'children', 1],
        },
      ),
    ).toEqual({
      path: [{_key: 'k0'}],
      kind: 'adjacency',
      adjacency: {
        previous: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        next: [{_key: 'k0'}, 'children', {_key: 'k3'}],
      },
    })
  })

  test('root-level node removal records the siblings it leaves adjacent', () => {
    const keyGenerator = createTestKeyGenerator()

    expect(
      getRemovalAdjacency(
        {
          context: {
            schema,
            containers: emptyContainers,
            value: [
              textBlock(keyGenerator, ['foo']),
              textBlock(keyGenerator, ['bar']),
              textBlock(keyGenerator, ['baz']),
            ],
          },
          blockIndexMap: new Map(),
        },
        {
          type: 'unset',
          path: [{_key: 'k2'}],
        },
      ),
    ).toEqual({
      path: [],
      kind: 'adjacency',
      adjacency: {
        previous: [{_key: 'k0'}],
        next: [{_key: 'k4'}],
      },
    })
  })

  test('node removal inside callout content records the siblings it leaves adjacent', () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()

    expect(
      getRemovalAdjacency(
        {
          context: {
            schema,
            containers: containerContainers,
            value: [
              {
                _type: 'callout',
                _key: calloutKey,
                content: [
                  textBlock(keyGenerator, ['foo']),
                  textBlock(keyGenerator, ['bar']),
                  textBlock(keyGenerator, ['baz']),
                ],
              },
            ],
          },
          blockIndexMap: new Map(),
        },
        {
          type: 'unset',
          path: [{_key: 'k0'}, 'content', {_key: 'k3'}],
        },
      ),
    ).toEqual({
      path: [{_key: 'k0'}],
      kind: 'adjacency',
      adjacency: {
        previous: [{_key: 'k0'}, 'content', {_key: 'k1'}],
        next: [{_key: 'k0'}, 'content', {_key: 'k5'}],
      },
    })
  })

  test('keyless siblings are addressed by their index after the removal', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    expect(
      getRemovalAdjacency(
        {
          context: {
            schema,
            containers: emptyContainers,
            value: [
              {
                _type: 'block',
                _key: blockKey,
                children: [
                  {_type: 'span', _key: '', text: 'foo'},
                  {_type: 'span', _key: spanKey, text: 'bar'},
                  {_type: 'span', _key: '', text: 'baz'},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
          blockIndexMap: new Map(),
        },
        {
          type: 'unset',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        },
      ),
    ).toEqual({
      path: [{_key: 'k0'}],
      kind: 'adjacency',
      adjacency: {
        previous: [{_key: 'k0'}, 'children', 0],
        next: [{_key: 'k0'}, 'children', 1],
      },
    })
  })

  test('a duplicate-keyed sibling is located through a matching `blockIndexMap` entry', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const duplicateKey = keyGenerator()
    const barKey = keyGenerator()
    const bazKey = keyGenerator()

    expect(
      getRemovalAdjacency(
        {
          context: {
            schema,
            containers: emptyContainers,
            value: [
              {
                _type: 'block',
                _key: blockKey,
                children: [
                  {_type: 'span', _key: fooKey, text: 'foo'},
                  {_type: 'span', _key: duplicateKey, text: 'bar'},
                  {_type: 'span', _key: barKey, text: 'baz'},
                  {_type: 'span', _key: duplicateKey, text: 'qux'},
                  {_type: 'span', _key: bazKey, text: 'quux'},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
          blockIndexMap: new Map([
            [
              serializePath([
                {_key: blockKey},
                'children',
                {_key: duplicateKey},
              ]),
              3,
            ],
          ]),
        },
        {
          type: 'unset',
          path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
        },
      ),
    ).toEqual({
      path: [{_key: 'k0'}],
      kind: 'adjacency',
      adjacency: {
        previous: [{_key: 'k0'}, 'children', {_key: 'k3'}],
        next: [{_key: 'k0'}, 'children', {_key: 'k4'}],
      },
    })
  })

  test('a stale `blockIndexMap` entry falls back to the first sibling with the key', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const duplicateKey = keyGenerator()
    const barKey = keyGenerator()
    const bazKey = keyGenerator()

    expect(
      getRemovalAdjacency(
        {
          context: {
            schema,
            containers: emptyContainers,
            value: [
              {
                _type: 'block',
                _key: blockKey,
                children: [
                  {_type: 'span', _key: fooKey, text: 'foo'},
                  {_type: 'span', _key: duplicateKey, text: 'bar'},
                  {_type: 'span', _key: barKey, text: 'baz'},
                  {_type: 'span', _key: duplicateKey, text: 'qux'},
                  {_type: 'span', _key: bazKey, text: 'quux'},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
          blockIndexMap: new Map([
            [
              serializePath([
                {_key: blockKey},
                'children',
                {_key: duplicateKey},
              ]),
              4,
            ],
          ]),
        },
        {
          type: 'unset',
          path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
        },
      ),
    ).toEqual({
      path: [{_key: 'k0'}],
      kind: 'adjacency',
      adjacency: {
        previous: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        next: [{_key: 'k0'}, 'children', {_key: 'k3'}],
      },
    })
  })

  test('removing a `markDefs` entry records no adjacency', () => {
    const keyGenerator = createTestKeyGenerator()
    const context = {
      schema,
      containers: emptyContainers,
      value: [
        {
          ...textBlock(keyGenerator, ['foo', 'bar', 'baz']),
          markDefs: [
            {_type: 'link', _key: keyGenerator()},
            {_type: 'link', _key: keyGenerator()},
            {_type: 'link', _key: keyGenerator()},
          ],
        },
      ],
    }

    expect(
      getRemovalAdjacency(
        {context, blockIndexMap: new Map()},
        {
          type: 'unset',
          path: [{_key: 'k0'}, 'markDefs', {_key: 'k5'}],
        },
      ),
    ).toEqual(undefined)
    expect(
      getRemovalAdjacency(
        {context, blockIndexMap: new Map()},
        {
          type: 'unset',
          path: [{_key: 'k0'}, 'markDefs', 1],
        },
      ),
    ).toEqual(undefined)
  })

  test('removing the first child records no adjacency', () => {
    const keyGenerator = createTestKeyGenerator()

    expect(
      getRemovalAdjacency(
        {
          context: {
            schema,
            containers: emptyContainers,
            value: [textBlock(keyGenerator, ['foo', 'bar', 'baz'])],
          },
          blockIndexMap: new Map(),
        },
        {
          type: 'unset',
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
        },
      ),
    ).toEqual(undefined)
  })

  test('removing the last child records no adjacency', () => {
    const keyGenerator = createTestKeyGenerator()

    expect(
      getRemovalAdjacency(
        {
          context: {
            schema,
            containers: emptyContainers,
            value: [textBlock(keyGenerator, ['foo', 'bar', 'baz'])],
          },
          blockIndexMap: new Map(),
        },
        {
          type: 'unset',
          path: [{_key: 'k0'}, 'children', 2],
        },
      ),
    ).toEqual(undefined)
  })

  test('operations other than node removal record no adjacency', () => {
    const keyGenerator = createTestKeyGenerator()
    const context = {
      schema,
      containers: emptyContainers,
      value: [textBlock(keyGenerator, ['foo', 'bar', 'baz'])],
    }

    expect(
      getRemovalAdjacency(
        {context, blockIndexMap: new Map()},
        {
          type: 'unset',
          path: [{_key: 'k0'}, 'style'],
        },
      ),
    ).toEqual(undefined)
    expect(
      getRemovalAdjacency(
        {context, blockIndexMap: new Map()},
        {
          type: 'set',
          path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
          value: {_type: 'span', _key: 'k2', text: 'bar'},
        },
      ),
    ).toEqual(undefined)
    expect(
      getRemovalAdjacency(
        {context, blockIndexMap: new Map()},
        {
          type: 'insert',
          path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
          node: {_type: 'span', _key: keyGenerator(), text: ''},
          position: 'after',
        },
      ),
    ).toEqual(undefined)
    expect(
      getRemovalAdjacency(
        {context, blockIndexMap: new Map()},
        {
          type: 'remove.text',
          path: [{_key: 'k0'}, 'children', {_key: 'k2'}],
          offset: 0,
          text: 'bar',
        },
      ),
    ).toEqual(undefined)
  })
})

function textBlock(keyGenerator: () => string, texts: Array<string>): Node {
  return {
    _type: 'block',
    _key: keyGenerator(),
    children: texts.map((text) => ({
      _type: 'span',
      _key: keyGenerator(),
      text,
    })),
    markDefs: [],
    style: 'normal',
  }
}
