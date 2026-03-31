import {compileSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import type {Node} from '../slate/interfaces/node'
import {resolveNodePath} from './resolve-node-path'

// Helper to create context with proper editableTypes
function createContext(
  value: Array<Node>,
  schema: ReturnType<typeof compileSchema>,
  editableTypes: Set<string> = new Set(),
) {
  const blockIndexMap = new Map<string, number>()

  for (let index = 0; index < value.length; index++) {
    const node = value.at(index)
    if (node && '_key' in node && typeof node._key === 'string') {
      blockIndexMap.set(node._key, index)
    }
  }

  return {
    value,
    schema,
    editableTypes,
    blockIndexMap,
  }
}

const flatSchema = compileSchema({})

const tableSchema = compileSchema({
  blockObjects: [
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
})

describe('resolveNodePath', () => {
  describe('flat document', () => {
    const children: Array<Node> = [
      {
        _key: 'b1',
        _type: 'block',
        children: [{_key: 's1', _type: 'span', text: 'hello', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    test('resolves span path', () => {
      const context = createContext(children, flatSchema)
      const result = resolveNodePath(context, [
        {_key: 'b1'},
        'children',
        {_key: 's1'},
      ])
      expect(result).toEqual({
        indexedPath: [0, 0],
        propertyPath: [],
      })
    })

    test('resolves span text property', () => {
      const context = createContext(children, flatSchema)
      const result = resolveNodePath(context, [
        {_key: 'b1'},
        'children',
        {_key: 's1'},
        'text',
      ])
      expect(result).toEqual({
        indexedPath: [0, 0],
        propertyPath: ['text'],
      })
    })

    test('resolves block path', () => {
      const context = createContext(children, flatSchema)
      const result = resolveNodePath(context, [{_key: 'b1'}])
      expect(result).toEqual({
        indexedPath: [0],
        propertyPath: [],
      })
    })

    test('resolves block style property', () => {
      const context = createContext(children, flatSchema)
      const result = resolveNodePath(context, [{_key: 'b1'}, 'style'])
      expect(result).toEqual({
        indexedPath: [0],
        propertyPath: ['style'],
      })
    })

    test('returns undefined for unknown key', () => {
      const context = createContext(children, flatSchema)
      const result = resolveNodePath(context, [{_key: 'unknown'}])
      expect(result).toBeUndefined()
    })
  })

  describe('markDefs are not structural', () => {
    const children: Array<Node> = [
      {
        _key: 'b1',
        _type: 'block',
        children: [{_key: 's1', _type: 'span', text: 'hello', marks: ['m1']}],
        markDefs: [{_key: 'm1', _type: 'link', href: 'https://example.com'}],
        style: 'normal',
      },
    ]

    test('markDef path resolves to block with property path', () => {
      const context = createContext(children, flatSchema)
      const result = resolveNodePath(context, [
        {_key: 'b1'},
        'markDefs',
        {_key: 'm1'},
        'href',
      ])
      expect(result).toEqual({
        indexedPath: [0],
        propertyPath: ['markDefs', {_key: 'm1'}, 'href'],
      })
    })
  })

  describe('table (multi-level container)', () => {
    const children: Array<Node> = [
      {
        _key: 't1',
        _type: 'table',
        rows: [
          {
            _key: 'r1',
            _type: 'row',
            cells: [
              {
                _key: 'c1',
                _type: 'cell',
                content: [
                  {
                    _key: 'b1',
                    _type: 'block',
                    children: [
                      {
                        _key: 's1',
                        _type: 'span',
                        text: 'cell text',
                        marks: [],
                      },
                    ],
                    markDefs: [],
                    style: 'normal',
                  },
                ],
              },
            ],
          },
        ],
      },
    ]

    const tableEditableTypes = new Set(['table', 'table.row', 'table.row.cell'])

    test('resolves span inside table cell', () => {
      const context = createContext(children, tableSchema, tableEditableTypes)
      const result = resolveNodePath(context, [
        {_key: 't1'},
        'rows',
        {_key: 'r1'},
        'cells',
        {_key: 'c1'},
        'content',
        {_key: 'b1'},
        'children',
        {_key: 's1'},
      ])
      expect(result).toEqual({
        indexedPath: [0, 0, 0, 0, 0],
        propertyPath: [],
      })
    })

    test('resolves span text inside table cell', () => {
      const context = createContext(children, tableSchema, tableEditableTypes)
      const result = resolveNodePath(context, [
        {_key: 't1'},
        'rows',
        {_key: 'r1'},
        'cells',
        {_key: 'c1'},
        'content',
        {_key: 'b1'},
        'children',
        {_key: 's1'},
        'text',
      ])
      expect(result).toEqual({
        indexedPath: [0, 0, 0, 0, 0],
        propertyPath: ['text'],
      })
    })

    test('resolves cell inside table', () => {
      const context = createContext(children, tableSchema, tableEditableTypes)
      const result = resolveNodePath(context, [
        {_key: 't1'},
        'rows',
        {_key: 'r1'},
        'cells',
        {_key: 'c1'},
      ])
      expect(result).toEqual({
        indexedPath: [0, 0, 0],
        propertyPath: [],
      })
    })

    test('resolves row inside table', () => {
      const context = createContext(children, tableSchema, tableEditableTypes)
      const result = resolveNodePath(context, [
        {_key: 't1'},
        'rows',
        {_key: 'r1'},
      ])
      expect(result).toEqual({
        indexedPath: [0, 0],
        propertyPath: [],
      })
    })

    test('resolves table itself', () => {
      const context = createContext(children, tableSchema, tableEditableTypes)
      const result = resolveNodePath(context, [{_key: 't1'}])
      expect(result).toEqual({
        indexedPath: [0],
        propertyPath: [],
      })
    })
  })
})
