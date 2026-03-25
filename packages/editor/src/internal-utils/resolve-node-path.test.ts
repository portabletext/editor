import {compileSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import type {Node} from '../slate/interfaces/node'
import {resolveNodePath} from './resolve-node-path'

function createContext(
  children: Array<Node>,
  schema: ReturnType<typeof compileSchema>,
) {
  const blockIndexMap = new Map<string, number>()
  const editableTypes = new Set<string>()

  for (let index = 0; index < children.length; index++) {
    const child = children.at(index)
    if (child && '_key' in child && typeof child._key === 'string') {
      blockIndexMap.set(child._key, index)
    }
  }

  // Build editableTypes from schema
  for (const blockObject of schema.blockObjects) {
    addEditableTypes(editableTypes, '', blockObject)
  }

  return {
    children,
    get value() {
      return this.children
    },
    schema,
    editableTypes,
    blockIndexMap,
  }
}

function addEditableTypes(
  editableTypes: Set<string>,
  parentScope: string,
  definition: {name: string; fields?: ReadonlyArray<Record<string, unknown>>},
) {
  if (!definition.fields) {
    return
  }

  const scope = parentScope
    ? `${parentScope}.${definition.name}`
    : definition.name
  editableTypes.add(scope)

  for (const field of definition.fields) {
    if (
      field['type'] === 'array' &&
      'of' in field &&
      Array.isArray(field['of'])
    ) {
      for (const ofDefinition of field['of']) {
        if (
          typeof ofDefinition === 'object' &&
          ofDefinition !== null &&
          'type' in ofDefinition &&
          typeof ofDefinition['type'] === 'string' &&
          'fields' in ofDefinition &&
          Array.isArray(ofDefinition['fields'])
        ) {
          addEditableTypes(editableTypes, scope, {
            name: ofDefinition['type'],
            fields: ofDefinition['fields'],
          })
        }
      }
    }
  }
}

const flatSchema = compileSchema({})

const codeBlockSchema = compileSchema({
  blockObjects: [
    {
      name: 'codeBlock',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}],
        },
      ],
    },
  ],
})

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

    test('resolves numeric first segment', () => {
      const context = createContext(children, flatSchema)
      const result = resolveNodePath(context, [0, 'style'])

      expect(result).toEqual({
        indexedPath: [0],
        propertyPath: ['style'],
      })
    })

    test('returns undefined for numeric segment beyond children length', () => {
      const context = createContext(children, flatSchema)
      const result = resolveNodePath(context, [5])

      expect(result).toBeUndefined()
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

  describe('code block (single-level container)', () => {
    const children: Array<Node> = [
      {
        _key: 'cb1',
        _type: 'codeBlock',
        content: [
          {
            _key: 'b1',
            _type: 'block',
            children: [{_key: 's1', _type: 'span', text: 'hello', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ]

    test('resolves span inside code block', () => {
      const context = createContext(children, codeBlockSchema)
      const result = resolveNodePath(context, [
        {_key: 'cb1'},
        'content',
        {_key: 'b1'},
        'children',
        {_key: 's1'},
      ])

      expect(result).toEqual({
        indexedPath: [0, 0, 0],
        propertyPath: [],
      })
    })

    test('resolves span text inside code block', () => {
      const context = createContext(children, codeBlockSchema)
      const result = resolveNodePath(context, [
        {_key: 'cb1'},
        'content',
        {_key: 'b1'},
        'children',
        {_key: 's1'},
        'text',
      ])

      expect(result).toEqual({
        indexedPath: [0, 0, 0],
        propertyPath: ['text'],
      })
    })

    test('resolves block inside code block', () => {
      const context = createContext(children, codeBlockSchema)
      const result = resolveNodePath(context, [
        {_key: 'cb1'},
        'content',
        {_key: 'b1'},
      ])

      expect(result).toEqual({
        indexedPath: [0, 0],
        propertyPath: [],
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

    test('resolves span inside table cell', () => {
      const context = createContext(children, tableSchema)
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
      const context = createContext(children, tableSchema)
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
      const context = createContext(children, tableSchema)
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
      const context = createContext(children, tableSchema)
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
      const context = createContext(children, tableSchema)
      const result = resolveNodePath(context, [{_key: 't1'}])

      expect(result).toEqual({
        indexedPath: [0],
        propertyPath: [],
      })
    })
  })

  describe('deep property paths on non-container block objects', () => {
    const children: Array<Node> = [
      {
        _key: 'w1',
        _type: 'myWidget',
        config: {color: 'red', size: 'large'},
      },
    ]
    const widgetSchema = compileSchema({
      blockObjects: [{name: 'myWidget'}],
    })

    test('resolves to block with property path', () => {
      const context = createContext(children, widgetSchema)
      const result = resolveNodePath(context, [{_key: 'w1'}, 'config', 'color'])

      expect(result).toEqual({
        indexedPath: [0],
        propertyPath: ['config', 'color'],
      })
    })
  })
})
