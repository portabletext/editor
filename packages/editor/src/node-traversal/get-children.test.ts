import {describe, expect, test} from 'vitest'
import type {ChildArrayField} from '../schema/resolve-containers'
import {getChildren} from './get-children'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(getChildren.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('root children', () => {
    expect(getChildren(testbed.context, [])).toEqual([
      {node: testbed.textBlock1, path: [{_key: 'k3'}]},
      {node: testbed.image, path: [{_key: 'k4'}]},
      {node: testbed.textBlock2, path: [{_key: 'k6'}]},
      {node: testbed.codeBlock, path: [{_key: 'k11'}]},
      {node: testbed.table, path: [{_key: 'k26'}]},
    ])
  })

  test('text block children', () => {
    expect(getChildren(testbed.context, [{_key: 'k3'}])).toEqual([
      {node: testbed.span1, path: [{_key: 'k3'}, 'children', {_key: 'k0'}]},
      {
        node: testbed.stockTicker1,
        path: [{_key: 'k3'}, 'children', {_key: 'k1'}],
      },
      {node: testbed.span2, path: [{_key: 'k3'}, 'children', {_key: 'k2'}]},
    ])
  })

  test('code block children (code lines)', () => {
    expect(getChildren(testbed.context, [{_key: 'k11'}])).toEqual([
      {node: testbed.codeLine1, path: [{_key: 'k11'}, 'code', {_key: 'k8'}]},
      {node: testbed.codeLine2, path: [{_key: 'k11'}, 'code', {_key: 'k10'}]},
    ])
  })

  test('code line children', () => {
    expect(
      getChildren(testbed.context, [{_key: 'k11'}, 'code', {_key: 'k8'}]),
    ).toEqual([
      {
        node: testbed.codeSpan1,
        path: [{_key: 'k11'}, 'code', {_key: 'k8'}, 'children', {_key: 'k7'}],
      },
    ])
  })

  test('table children (rows)', () => {
    expect(getChildren(testbed.context, [{_key: 'k26'}])).toEqual([
      {node: testbed.row1, path: [{_key: 'k26'}, 'rows', {_key: 'k21'}]},
      {node: testbed.row2, path: [{_key: 'k26'}, 'rows', {_key: 'k25'}]},
    ])
  })

  test('row children (cells)', () => {
    expect(
      getChildren(testbed.context, [{_key: 'k26'}, 'rows', {_key: 'k21'}]),
    ).toEqual([
      {
        node: testbed.cell1,
        path: [{_key: 'k26'}, 'rows', {_key: 'k21'}, 'cells', {_key: 'k17'}],
      },
      {
        node: testbed.cell2,
        path: [{_key: 'k26'}, 'rows', {_key: 'k21'}, 'cells', {_key: 'k20'}],
      },
    ])
  })

  test('cell with multiple blocks', () => {
    expect(
      getChildren(testbed.context, [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k17'},
      ]),
    ).toEqual([
      {
        node: testbed.cellBlock1,
        path: [
          {_key: 'k26'},
          'rows',
          {_key: 'k21'},
          'cells',
          {_key: 'k17'},
          'content',
          {_key: 'k14'},
        ],
      },
      {
        node: testbed.cellBlock2,
        path: [
          {_key: 'k26'},
          'rows',
          {_key: 'k21'},
          'cells',
          {_key: 'k17'},
          'content',
          {_key: 'k16'},
        ],
      },
    ])
  })

  test('block inside cell children', () => {
    expect(
      getChildren(testbed.context, [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k17'},
        'content',
        {_key: 'k14'},
      ]),
    ).toEqual([
      {
        node: testbed.cellSpan1,
        path: [
          {_key: 'k26'},
          'rows',
          {_key: 'k21'},
          'cells',
          {_key: 'k17'},
          'content',
          {_key: 'k14'},
          'children',
          {_key: 'k12'},
        ],
      },
      {
        node: testbed.stockTicker2,
        path: [
          {_key: 'k26'},
          'rows',
          {_key: 'k21'},
          'cells',
          {_key: 'k17'},
          'content',
          {_key: 'k14'},
          'children',
          {_key: 'k13'},
        ],
      },
    ])
  })

  test('leaf node returns empty array', () => {
    expect(
      getChildren(testbed.context, [{_key: 'k3'}, 'children', {_key: 'k0'}]),
    ).toEqual([])
  })

  test('block object without children returns empty array', () => {
    expect(getChildren(testbed.context, [{_key: 'k4'}])).toEqual([])
  })

  test('invalid path returns empty array', () => {
    expect(getChildren(testbed.context, [{_key: 'nonexistent'}])).toEqual([])
  })

  test('non-editable code block returns empty array', () => {
    const tableOnly = new Map<string, ChildArrayField>([
      [
        'table',
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
      [
        'table.row',
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
      [
        'table.row.cell',
        {name: 'content', type: 'array', of: [{type: 'block'}]},
      ],
    ])
    expect(
      getChildren({...testbed.context, containers: tableOnly}, [{_key: 'k11'}]),
    ).toEqual([])
  })

  test('non-editable table returns empty array', () => {
    const codeOnly = new Map<string, ChildArrayField>([
      ['code-block', {name: 'code', type: 'array', of: [{type: 'block'}]}],
    ])
    expect(
      getChildren({...testbed.context, containers: codeOnly}, [{_key: 'k26'}]),
    ).toEqual([])
  })
})
