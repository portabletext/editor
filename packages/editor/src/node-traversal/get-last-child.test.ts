import {describe, expect, test} from 'vitest'
import type {ChildArrayField} from '../schema/editable-types'
import {getLastChild} from './get-last-child'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(getLastChild.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('last descendant from root', () => {
    expect(getLastChild(testbed.context, [])).toEqual({
      node: testbed.table,
      path: [{_key: 'k26'}],
    })
  })

  test('last descendant of text block', () => {
    expect(getLastChild(testbed.context, [{_key: 'k3'}])).toEqual({
      node: testbed.span2,
      path: [{_key: 'k3'}, 'children', {_key: 'k2'}],
    })
  })

  test('last descendant of code block', () => {
    expect(getLastChild(testbed.context, [{_key: 'k11'}])).toEqual({
      node: testbed.codeLine2,
      path: [{_key: 'k11'}, 'code', {_key: 'k10'}],
    })
  })

  test('last descendant of table', () => {
    expect(getLastChild(testbed.context, [{_key: 'k26'}])).toEqual({
      node: testbed.row2,
      path: [{_key: 'k26'}, 'rows', {_key: 'k25'}],
    })
  })

  test('leaf node returns undefined', () => {
    expect(
      getLastChild(testbed.context, [{_key: 'k3'}, 'children', {_key: 'k0'}]),
    ).toBeUndefined()
  })

  test('void block object returns undefined', () => {
    expect(getLastChild(testbed.context, [{_key: 'k4'}])).toBeUndefined()
  })

  test('invalid path returns undefined', () => {
    expect(
      getLastChild(testbed.context, [{_key: 'nonexistent'}]),
    ).toBeUndefined()
  })

  test('last of non-editable container returns undefined', () => {
    const tableOnly = new Map<string, Array<ChildArrayField>>([
      [
        'table',
        [
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
      ],
      [
        'table.row',
        [
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
      ],
      [
        'table.row.cell',
        [{name: 'content', type: 'array', of: [{type: 'block'}]}],
      ],
    ])
    expect(
      getLastChild({...testbed.context, editableTypes: tableOnly}, [
        {_key: 'k11'},
      ]),
    ).toBeUndefined()
  })
})
