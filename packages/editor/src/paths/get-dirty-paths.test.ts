import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import type {Containers} from '../schema/resolve-containers'
import type {Node} from '../slate/interfaces/node'
import {getDirtyPaths} from './get-dirty-paths'

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}],
  annotations: [{name: 'link'}],
  blockObjects: [
    {name: 'image'},
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
  ],
})

const schema = compileSchema(schemaDefinition)

const emptyContainers: Containers = new Map()

const containerContainers: Containers = new Map([
  ['callout', {name: 'content', type: 'array', of: [{type: 'block'}]}],
])

const tableContainers: Containers = new Map([
  ['table', {name: 'rows', type: 'array', of: [{type: 'row'}]}],
  ['table.row', {name: 'cells', type: 'array', of: [{type: 'cell'}]}],
  ['table.row.cell', {name: 'content', type: 'array', of: [{type: 'block'}]}],
])

describe(getDirtyPaths.name, () => {
  describe('insert_text / remove_text', () => {
    test('insert_text returns path levels of the operation path', () => {
      expect(
        getDirtyPaths(
          {
            schema,
            containers: emptyContainers,
            value: [],
          },
          {
            type: 'insert_text',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 0,
            text: 'hello',
          },
        ),
      ).toEqual([[], [{_key: 'b1'}], [{_key: 'b1'}, 'children', {_key: 's1'}]])
    })

    test('remove_text returns path levels of the operation path', () => {
      expect(
        getDirtyPaths(
          {
            schema,
            containers: emptyContainers,
            value: [],
          },
          {
            type: 'remove_text',
            path: [{_key: 'b1'}, 'children', {_key: 's1'}],
            offset: 0,
            text: 'hello',
          },
        ),
      ).toEqual([[], [{_key: 'b1'}], [{_key: 'b1'}, 'children', {_key: 's1'}]])
    })

    test('insert_text inside callout text block returns path levels at each node boundary', () => {
      expect(
        getDirtyPaths(
          {
            schema,
            containers: containerContainers,
            value: [],
          },
          {
            type: 'insert_text',
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
        [],
        [{_key: 'c1'}],
        [{_key: 'c1'}, 'content', {_key: 'b1'}],
        [{_key: 'c1'}, 'content', {_key: 'b1'}, 'children', {_key: 's1'}],
      ])
    })

    test('remove_text inside callout text block returns path levels at each node boundary', () => {
      expect(
        getDirtyPaths(
          {
            schema,
            containers: containerContainers,
            value: [],
          },
          {
            type: 'remove_text',
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
        [],
        [{_key: 'c1'}],
        [{_key: 'c1'}, 'content', {_key: 'b1'}],
        [{_key: 'c1'}, 'content', {_key: 'b1'}, 'children', {_key: 's1'}],
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
        [],
        [{_key: 'b1'}],
        [{_key: 'b1'}, 'children', 0],
        [{_key: 'b2'}],
        [{_key: 'b2'}, 'children', 0],
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
      ).toEqual([[], [{_key: 'b1'}]])
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
      ).toEqual([[], [{_key: 'new-key'}]])
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
        [],
        [{_key: 'b1'}],
        [{_key: 'b1'}, 'children', 0],
        [{_key: 'b1'}, 'children', 1],
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
        [],
        [{_key: 'b1'}],
        [{_key: 'b1'}, 'children', {_key: 'new-s1'}],
        [{_key: 'b1'}, 'children', {_key: 'new-s2'}],
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
        [],
        [{_key: 'c1'}],
        [{_key: 'c1'}, 'content', 0],
        [{_key: 'c1'}, 'content', 0, 'children', 0],
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
      ).toEqual([[], [{_key: 'c1'}], [{_key: 'c1'}, 'content', {_key: 'b1'}]])
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
        [],
        [{_key: 'c1'}],
        [{_key: 'c1'}, 'content', {_key: 'new-key'}],
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
        [],
        [{_key: 'c1'}],
        [{_key: 'c1'}, 'content', {_key: 'b1'}],
        [{_key: 'c1'}, 'content', {_key: 'b1'}, 'children', 0],
        [{_key: 'c1'}, 'content', {_key: 'b1'}, 'children', 1],
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
        [],
        [{_key: 'c1'}],
        [{_key: 'c1'}, 'content', {_key: 'b1'}],
        [{_key: 'c1'}, 'content', {_key: 'b1'}, 'children', {_key: 'new-s1'}],
        [{_key: 'c1'}, 'content', {_key: 'b1'}, 'children', {_key: 'new-s2'}],
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
        [],
        [{_key: 't1'}],
        [{_key: 't1'}, 'rows', {_key: 'r1'}],
        [{_key: 't1'}, 'rows', {_key: 'r1'}, 'cells', {_key: 'c1'}],
        [
          {_key: 't1'},
          'rows',
          {_key: 'r1'},
          'cells',
          {_key: 'c1'},
          'content',
          {_key: 'b1'},
        ],
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
      ).toEqual([[], [{_key: 'b1'}]])
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
      ).toEqual([[], [{_key: 'b1'}]])
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
      ).toEqual([[], [1]])
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
      ).toEqual([[], [{_key: 'b1'}]])
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
      ).toEqual([[], [{_key: 'c1'}]])
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
      ).toEqual([[], [{_key: 'c1'}], [{_key: 'c1'}, 'content', {_key: 'b1'}]])
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
      ).toEqual([[], [{_key: 'c1'}], [{_key: 'c1'}, 'content', 1]])
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
        [],
        [{_key: 'b1'}],
        [{_key: 'b1'}, 'children', {_key: 'existing'}],
        [{_key: 'b1'}, 'children', {_key: 'new-span'}],
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
        [],
        [{_key: 'existing-block'}],
        [{_key: 'new-block'}],
        [{_key: 'new-block'}, 'children', 0],
        [{_key: 'new-block'}, 'children', 1],
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
        [],
        [{_key: 'existing-block'}],
        [{_key: 'new-callout'}],
        [{_key: 'new-callout'}, 'content', 0],
        [{_key: 'new-callout'}, 'content', 0, 'children', 0],
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
        [],
        [{_key: 'c1'}],
        [{_key: 'c1'}, 'content', {_key: 'b1'}],
        [{_key: 'c1'}, 'content', {_key: 'b1'}, 'children', {_key: 'existing'}],
        [{_key: 'c1'}, 'content', {_key: 'b1'}, 'children', {_key: 'new-span'}],
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
        [],
        [{_key: 'c1'}],
        [{_key: 'c1'}, 'content', {_key: 'existing-block'}],
        [{_key: 'c1'}, 'content', {_key: 'new-block'}],
        [{_key: 'c1'}, 'content', {_key: 'new-block'}, 'children', 0],
        [{_key: 'c1'}, 'content', {_key: 'new-block'}, 'children', 1],
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
        [],
        [{_key: 't1'}],
        [{_key: 't1'}, 'rows', {_key: 'r1'}],
        [{_key: 't1'}, 'rows', {_key: 'r1'}, 'cells', {_key: 'c1'}],
        [
          {_key: 't1'},
          'rows',
          {_key: 'r1'},
          'cells',
          {_key: 'c1'},
          'content',
          {_key: 'existing-block'},
        ],
        [
          {_key: 't1'},
          'rows',
          {_key: 'r1'},
          'cells',
          {_key: 'c1'},
          'content',
          {_key: 'new-block'},
        ],
        [
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
      ])
    })
  })
})
