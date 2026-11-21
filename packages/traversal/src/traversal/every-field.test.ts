import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../../test-utils/create-test-snapshot'
import {createEveryFieldFixture} from '../../test-utils/every-field-fixture'
import {
  isBlock,
  isInline,
  getEnclosingBlock,
  rangeIntersects,
  getAnnotation,
  getLeaf,
  getNode,
  getNodes,
  getParent,
  getSpan,
  getText,
  comparePoints,
} from '../index'

const schema = compileSchema(defineSchema({}))

describe('every object field', () => {
  test('orders hole paths like dense undefined entries without a registry', () => {
    const keyGenerator = createTestKeyGenerator()
    const items = new Array<{_type: string} | undefined>(5)
    items[1] = {_type: 'card'}
    items[3] = {_type: 'card'}
    const rootKey = keyGenerator()
    const sparse = {
      context: {schema, value: [{_key: rootKey, _type: 'box', items}]},
    }
    const dense = {
      context: {
        schema,
        value: [{_key: rootKey, _type: 'box', items: Array.from(items)}],
      },
    }
    for (const index of [0, 2, 4, -1]) {
      const hole = {path: [{_key: rootKey}, 'items', index], offset: 0}
      const outside = {path: [{_key: rootKey}, 'items', 9], offset: 0}
      for (const [first, second] of [
        [hole, outside],
        [outside, hole],
      ] as const) {
        expect(comparePoints(sparse, first, second)).toEqual(
          comparePoints(dense, first, second),
        )
        expect(
          rangeIntersects(
            sparse,
            {anchor: first, focus: second},
            {
              path: [{_key: rootKey}, 'items', 1],
              offset: 0,
            },
          ),
        ).toEqual(
          rangeIntersects(
            dense,
            {anchor: first, focus: second},
            {
              path: [{_key: rootKey}, 'items', 1],
              offset: 0,
            },
          ),
        )
      }
    }
  })

  test('skips holes in the root without a registry', () => {
    const node = {_type: 'card', label: 'foo'}
    const sparse = new Array<typeof node>(4)
    sparse[1] = node
    sparse[3] = {...node, label: 'bar'}
    const snapshot = {context: {schema, value: sparse}}
    expect([...getNodes(snapshot)].map((entry) => entry.path)).toEqual([
      [1],
      [3],
    ])
    expect(
      [...getNodes(snapshot, {reverse: true})].map((entry) => entry.path),
    ).toEqual([[3], [1]])
    expect(
      [...getNodes(snapshot, {at: []})].map((entry) => entry.path),
    ).toEqual([[1], [3]])
    expect(
      [...getNodes(snapshot, {from: [1], to: [3]})].map((entry) => entry.path),
    ).toEqual([[1], [3]])
  })

  test('skips holes in the children without a registry', () => {
    const node = {_type: 'span', text: 'foo', marks: []}
    const sparse = new Array<typeof node>(4)
    sparse[1] = node
    sparse[3] = {...node, text: 'bar'}
    const snapshot = {
      context: {
        schema,
        value: [{_type: 'block', children: sparse, markDefs: []}],
      },
    }
    expect([...getNodes(snapshot)].map((entry) => entry.path)).toEqual([
      [0],
      [0, 'children', 1],
      [0, 'children', 3],
    ])
    expect(
      [...getNodes(snapshot, {reverse: true})].map((entry) => entry.path),
    ).toEqual([[0], [0, 'children', 3], [0, 'children', 1]])
    expect(
      [...getNodes(snapshot, {at: [0]})].map((entry) => entry.path),
    ).toEqual([
      [0, 'children', 1],
      [0, 'children', 3],
    ])
    expect(
      [
        ...getNodes(snapshot, {
          from: [0, 'children', 1],
          to: [0, 'children', 3],
        }),
      ].map((entry) => entry.path),
    ).toEqual([[0], [0, 'children', 1], [0, 'children', 3]])
  })

  test('skips holes in the nested container field without a registry', () => {
    const node = {_type: 'card', label: 'foo'}
    const sparse = new Array<typeof node>(4)
    sparse[1] = node
    sparse[3] = {...node, label: 'bar'}
    const snapshot = {
      context: {
        schema,
        value: [{_type: 'box', items: [{_type: 'box', items: sparse}]}],
      },
    }
    expect([...getNodes(snapshot)].map((entry) => entry.path)).toEqual([
      [0],
      [0, 'items', 0],
      [0, 'items', 0, 'items', 1],
      [0, 'items', 0, 'items', 3],
    ])
    expect(
      [...getNodes(snapshot, {reverse: true})].map((entry) => entry.path),
    ).toEqual([
      [0],
      [0, 'items', 0],
      [0, 'items', 0, 'items', 3],
      [0, 'items', 0, 'items', 1],
    ])
    expect(
      [...getNodes(snapshot, {at: [0, 'items', 0]})].map((entry) => entry.path),
    ).toEqual([
      [0, 'items', 0, 'items', 1],
      [0, 'items', 0, 'items', 3],
    ])
    expect(
      [
        ...getNodes(snapshot, {
          from: [0, 'items', 0, 'items', 1],
          to: [0, 'items', 0, 'items', 3],
        }),
      ].map((entry) => entry.path),
    ).toEqual([
      [0],
      [0, 'items', 0],
      [0, 'items', 0, 'items', 1],
      [0, 'items', 0, 'items', 3],
    ])
  })

  test('skips holes in the object field array without a registry', () => {
    const node = {_type: 'card', label: 'foo'}
    const sparse = new Array<typeof node>(4)
    sparse[1] = node
    sparse[3] = {...node, label: 'bar'}
    const snapshot = {
      context: {schema, value: [{_type: 'card', details: {items: sparse}}]},
    }
    expect([...getNodes(snapshot)].map((entry) => entry.path)).toEqual([
      [0],
      [0, 'details'],
      [0, 'details', 'items', 1],
      [0, 'details', 'items', 3],
    ])
    expect(
      [...getNodes(snapshot, {reverse: true})].map((entry) => entry.path),
    ).toEqual([
      [0],
      [0, 'details'],
      [0, 'details', 'items', 3],
      [0, 'details', 'items', 1],
    ])
    expect(
      [...getNodes(snapshot, {at: [0, 'details']})].map((entry) => entry.path),
    ).toEqual([
      [0, 'details', 'items', 1],
      [0, 'details', 'items', 3],
    ])
    expect(
      [
        ...getNodes(snapshot, {
          from: [0, 'details', 'items', 1],
          to: [0, 'details', 'items', 3],
        }),
      ].map((entry) => entry.path),
    ).toEqual([
      [0],
      [0, 'details'],
      [0, 'details', 'items', 1],
      [0, 'details', 'items', 3],
    ])
  })

  test('returns the same nodes for keyed nested bounds with and without a blockIndexMap', () => {
    const keyGenerator = createTestKeyGenerator()
    const value = [
      {_key: keyGenerator(), _type: 'card'},
      {
        _key: keyGenerator(),
        _type: 'box',
        items: [
          {_key: keyGenerator(), _type: 'card'},
          {
            _key: keyGenerator(),
            _type: 'block',
            children: [
              {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []},
              {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []},
            ],
            markDefs: [],
          },
          {_key: keyGenerator(), _type: 'card'},
        ],
      },
      {_key: keyGenerator(), _type: 'card'},
    ]
    const snapshot = createTestSnapshot({
      context: {
        schema,
        value,
        containers: new Map([
          [
            'box',
            {
              kind: 'container',
              type: 'box',
              field: {
                name: 'items',
                type: 'array',
                of: [{type: 'block'}, {type: 'card'}],
              },
            },
          ],
        ]),
      },
    })
    const options = {
      from: [{_key: 'k1'}, 'items', {_key: 'k3'}, 'children', {_key: 'k5'}],
      to: [
        {_key: 'k1'},
        'items',
        {_key: 'k3'},
        'children',
        {_key: keyGenerator()},
      ],
    }
    expect([...getNodes({context: snapshot.context}, options)]).toEqual([
      ...getNodes(snapshot, options),
    ])
    expect([
      ...getNodes({context: snapshot.context}, {...options, reverse: true}),
    ]).toEqual([...getNodes(snapshot, {...options, reverse: true})])
  })

  test('visits plain objects, annotations, span fields and nested arrays in field order', () => {
    const snapshot = {context: {schema, value: createEveryFieldFixture()}}
    expect([...getNodes(snapshot)].map((entry) => entry.path)).toEqual([
      [0],
      [0, 'details'],
      [0, 'details', 'body', 0],
      [0, 'details', 'body', 0, 'children', 0],
      [0, 'details', 'body', 0, 'children', 0, 'metadata'],
      [0, 'details', 'body', 0, 'children', 0, 'extras', 0],
      [0, 'details', 'body', 0, 'children', 0, 'extras', 1],
      [0, 'details', 'body', 0, 'children', 0, 'extras', 2],
      [0, 'details', 'body', 0, 'children', 0, 'extras', 3],
      [0, 'details', 'body', 0, 'children', 0, 'extras', 4],
      [0, 'details', 'body', 0, 'children', 1],
      [0, 'details', 'body', 0, 'children', 2],
      [0, 'details', 'body', 0, 'children', 3],
      [0, 'details', 'body', 0, 'children', 4],
      [
        0,
        'details',
        'body',
        0,
        'markDefs',
        {
          _key: 'k2',
        },
      ],
      [0, 'details', 'body', 0, 'markDefs', 1],
      [0, 'details', 'body', 0, 'markDefs', 2],
      [0, 'details', 'body', 0, 'markDefs', 3],
      [0, 'details', 'body', 0, 'markDefs', 4],
      [0, 'details', 'body', 0, 'side'],
      [0, 'details', 'body', 1],
      [0, 'details', 'body', 2],
      [0, 'details', 'body', 3],
      [0, 'details', 'body', 4],
      [0, 'zeta', 0],
      [0, 'zeta', 0, 'children', 0],
      [0, 'zeta', 0, 'children', 1],
      [0, 'zeta', 0, 'children', 2],
      [0, 'zeta', 0, 'children', 3],
      [0, 'zeta', 0, 'children', 4],
      [
        0,
        'zeta',
        0,
        'markDefs',
        {
          _key: 'k6',
        },
      ],
      [0, 'zeta', 0, 'markDefs', 1],
      [0, 'zeta', 0, 'markDefs', 2],
      [0, 'zeta', 0, 'markDefs', 3],
      [0, 'zeta', 0, 'markDefs', 4],
      [0, 'zeta', 1],
      [0, 'zeta', 2],
      [0, 'zeta', 3],
      [0, 'zeta', 4],
      [0, 'alpha', 0],
      [0, 'alpha', 1],
      [0, 'alpha', 2],
      [0, 'alpha', 3],
      [0, 'alpha', 4],
      [0, 'matrix', 0, 0],
      [0, 'matrix', 0, 0, 'children', 0],
      [0, 'matrix', 0, 0, 'children', 1],
      [0, 'matrix', 0, 0, 'children', 2],
      [0, 'matrix', 0, 0, 'children', 3],
      [0, 'matrix', 0, 0, 'children', 4],
      [0, 'matrix', 0, 1],
      [0, 'matrix', 0, 2],
      [0, 'matrix', 0, 3],
      [0, 'matrix', 0, 4],
      [0, 'matrix', 1],
      [0, 'matrix', 2],
      [0, 'matrix', 3],
      [0, 'matrix', 4],
      [1],
      [2],
      [3],
      [4],
    ])
  })

  test('addresses a plain object and returns it as a nested block parent', () => {
    const value = createEveryFieldFixture()
    const snapshot = {context: {schema, value}}
    expect(getNode(snapshot, [0, 'details'])).toEqual({
      node: value[0]!.details,
      path: [0, 'details'],
    })
    expect(getParent(snapshot, [0, 'details', 'body', 0])).toEqual({
      node: value[0]!.details,
      path: [0, 'details'],
    })
  })

  test('gets text at depths zero, one, two and three', () => {
    const value = [
      {
        _type: 'block',
        children: [{_type: 'span', text: 'foo', marks: []}],
        markDefs: [],
      },
    ]
    expect(getText({context: {schema, value}}, [0])).toEqual('foo')
    expect(
      getText({context: {schema, value: [{_type: 'wrapper', body: value}]}}, [
        0,
        'body',
        0,
      ]),
    ).toEqual('foo')
    expect(
      getText(
        {
          context: {
            schema,
            value: [{_type: 'wrapper', details: {body: value}}],
          },
        },
        [0, 'details', 'body', 0],
      ),
    ).toEqual('foo')
    expect(
      getText(
        {
          context: {
            schema,
            value: [{_type: 'wrapper', items: [{details: {body: value}}]}],
          },
        },
        [0, 'items', 0, 'details', 'body', 0],
      ),
    ).toEqual('foo')
  })

  test('reaches Portable Text inside an inline object field', () => {
    const value = [
      {
        _type: 'block',
        children: [
          {
            _type: 'object',
            body: [
              {
                _type: 'block',
                children: [{_type: 'span', text: 'bar', marks: []}],
                markDefs: [],
              },
            ],
          },
        ],
        markDefs: [],
      },
    ]
    expect(
      getText({context: {schema, value}}, [0, 'children', 0, 'body', 0]),
    ).toEqual('bar')
  })

  test('resolves keyed annotations without a registry', () => {
    const value = createEveryFieldFixture()
    expect(
      getAnnotation({context: {schema, value}}, [
        0,
        'details',
        'body',
        0,
        'markDefs',
        {_key: 'k2'},
      ]),
    ).toEqual({
      node: {_key: 'k2', _type: 'link', href: 'foo'},
      path: [0, 'details', 'body', 0, 'markDefs', {_key: 'k2'}],
    })
  })

  test('follows text-block children with an empty registry and span fields without one', () => {
    const value = [
      {
        _type: 'block',
        children: [
          {_type: 'span', text: 'foo', marks: [], details: {label: 'bar'}},
        ],
        markDefs: [],
      },
    ]
    expect(
      getLeaf({context: {schema, value, containers: new Map()}}, [0], {
        edge: 'start',
      }),
    ).toEqual({node: value[0]!.children[0], path: [0, 'children', 0]})
    expect(getLeaf({context: {schema, value}}, [0], {edge: 'start'})).toEqual({
      node: {label: 'bar'},
      path: [0, 'children', 0, 'details'],
    })
  })

  test('orders bounded keyed nodes identically with and without an index map', () => {
    const keyGenerator = createTestKeyGenerator()
    const value = [
      {_type: 'object', _key: keyGenerator()},
      {_type: 'object', _key: keyGenerator()},
      {_type: 'object', _key: keyGenerator()},
    ]
    const snapshot = createTestSnapshot({context: {schema, value}})
    const options = {from: [{_key: 'k1'}], to: [{_key: 'k2'}]}
    expect([...getNodes({context: snapshot.context}, options)]).toEqual([
      {node: {_type: 'object', _key: 'k1'}, path: [{_key: 'k1'}]},
      {node: {_type: 'object', _key: 'k2'}, path: [{_key: 'k2'}]},
    ])
    expect([...getNodes(snapshot, options)]).toEqual([
      {node: {_type: 'object', _key: 'k1'}, path: [{_key: 'k1'}]},
      {node: {_type: 'object', _key: 'k2'}, path: [{_key: 'k2'}]},
    ])
  })

  test('compares sibling fields in insertion order', () => {
    const snapshot = {
      context: {
        schema,
        value: [{_type: 'object', zeta: {label: 'foo'}, alpha: {label: 'bar'}}],
      },
    }
    expect(
      comparePoints(
        snapshot,
        {path: [0, 'zeta'], offset: 0},
        {path: [0, 'alpha'], offset: 0},
      ),
    ).toEqual(-1)
  })

  test('keeps span-shaped annotations and side fields out of the text model', () => {
    const value = [
      {
        _type: 'block',
        children: [
          {
            _type: 'span',
            text: 'foo',
            marks: [],
            metadata: {_type: 'span', text: 'baz', marks: []},
          },
        ],
        markDefs: [{_type: 'span', text: 'bar', marks: []}],
        side: {_type: 'span', text: 'baz', marks: []},
      },
    ]
    const snapshot = {context: {schema, value}}
    expect(getNode(snapshot, [0, 'side'])).toEqual({
      node: value[0]!.side,
      path: [0, 'side'],
    })
    expect(getSpan(snapshot, [0, 'markDefs', 0])).toEqual(undefined)
    expect(getSpan(snapshot, [0, 'side'])).toEqual(undefined)
    expect(getSpan(snapshot, [0, 'children', 0, 'metadata'])).toEqual(undefined)
    expect(getText(snapshot, [0])).toEqual('foo')
  })
  test('rejects invalid paths and treats a missing root index as a block', () => {
    const snapshot = {
      context: {schema, value: [{_type: 'object', label: 'foo'}]},
    }
    expect(getNode(snapshot, [0, 'label', 0, 0])).toEqual(undefined)
    expect([...getNodes(snapshot, {from: [0, 0]})]).toEqual([])
    expect(isBlock(snapshot, [999])).toEqual(true)
  })
  test('contains both range edges in field order', () => {
    const snapshot = {
      context: {schema, value: [{_type: 'card', z: {}, a: {}, grid: [[{}]]}]},
    }
    const anchor = {path: [0, 'z'], offset: 0}
    const focus = {path: [0, 'a'], offset: 0}
    expect(rangeIntersects(snapshot, {anchor, focus}, anchor)).toEqual(true)
    expect(rangeIntersects(snapshot, {anchor, focus}, [0, 'z'])).toEqual(true)
  })

  test('orders unresolved keys antisymmetrically without discarding their tails', () => {
    const keyGenerator = createTestKeyGenerator()
    const snapshot = {
      context: {
        schema,
        value: [{_key: keyGenerator(), _type: 'block', children: []}],
      },
    }
    expect(
      comparePoints(
        snapshot,
        {path: [{_key: 'zz'}], offset: 0},
        {path: [{_key: 'aa'}], offset: 0},
      ),
    ).toEqual(1)
    expect(
      comparePoints(
        snapshot,
        {path: [{_key: 'aa'}], offset: 0},
        {path: [{_key: 'zz'}], offset: 0},
      ),
    ).toEqual(-1)
    expect(
      comparePoints(
        snapshot,
        {path: [0, 'children', {_key: 'zz'}], offset: 0},
        {path: [0, 'children', {_key: 'aa'}], offset: 0},
      ),
    ).toEqual(1)
  })

  test('includes the same ancestors for index and keyed bounds without a registry', () => {
    const keyGenerator = createTestKeyGenerator()
    const value = [
      {
        _key: keyGenerator(),
        _type: 'block',
        children: [{_key: keyGenerator(), _type: 'span', text: 'foo'}],
      },
      {_key: keyGenerator(), _type: 'card'},
    ]
    const snapshot = {context: {schema, value}}
    expect([
      ...getNodes(snapshot, {from: [0, 'children', 0], to: [1]}),
    ]).toEqual([
      {node: value[0], path: [{_key: 'k0'}]},
      {
        node: value[0]!.children![0],
        path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
      },
      {node: value[1], path: [{_key: 'k2'}]},
    ])
  })

  test('keeps numeric registered bounds equal with and without the index map', () => {
    const keyGenerator = createTestKeyGenerator()
    const value = [
      {
        _key: keyGenerator(),
        _type: 'block',
        children: [{_key: keyGenerator(), _type: 'span', text: 'foo'}],
        markDefs: [],
      },
      {_key: keyGenerator(), _type: 'card'},
    ]
    const snapshot = createTestSnapshot({context: {schema, value}})
    expect([...getNodes(snapshot, {from: [0], to: [1]})]).toEqual([
      ...getNodes({context: snapshot.context}, {from: [0], to: [1]}),
    ])
    expect([
      ...getNodes(snapshot, {from: [0, 'children', 0], to: [1]}),
    ]).toEqual([
      ...getNodes(
        {context: snapshot.context},
        {from: [0, 'children', 0], to: [1]},
      ),
    ])
  })

  test('excludes nested inline object text from that object and its text block', () => {
    const value = [
      {
        _type: 'block',
        children: [
          {_type: 'span', text: 'foo'},
          {
            _type: 'stock',
            body: [
              {
                _type: 'block',
                children: [{_type: 'span', text: 'bar'}],
                markDefs: [],
              },
            ],
          },
        ],
        markDefs: [],
      },
    ]
    const snapshot = {context: {schema, value}}
    expect(getText(snapshot, [0, 'children', 1])).toEqual('')
    expect(getText(snapshot, [0])).toEqual('foo')
  })

  test('finds an enclosing block past spans and their plain object fields', () => {
    const value = [
      {
        _type: 'block',
        children: [{_type: 'span', text: 'foo', meta: {details: {}}}],
        markDefs: [],
      },
    ]
    const snapshot = {context: {schema, value}}
    expect(
      getEnclosingBlock(snapshot, [0, 'children', 0, 'meta', 'details']),
    ).toEqual({node: value[0], path: [0]})
    expect(
      getEnclosingBlock(snapshot, [0, 'children', 0, 'meta', 'details'], {
        mode: 'highest',
      }),
    ).toEqual({node: value[0], path: [0]})
  })

  test('classifies every nested-array object as a block outside text blocks', () => {
    const value = createEveryFieldFixture()
    const snapshot = {context: {schema, value}}
    expect(isBlock(snapshot, [0, 'matrix', 0, 1])).toEqual(true)
    expect(isInline(snapshot, [0, 'matrix', 0, 1])).toEqual(false)
    expect(isBlock(snapshot, [0, 'matrix', 0, 2])).toEqual(true)
    expect(isBlock(snapshot, [0, 'matrix', 0, 4])).toEqual(true)
  })

  test('walks deep arrays and objects without recursive descent', () => {
    let arrays: unknown = {}
    for (let depth = 0; depth < 10000; depth++) {
      arrays = [arrays]
    }
    const arrayValue = [{field: arrays}]
    let arrayCount = 0
    let lastArrayEntry: {path: unknown[]} | undefined
    for (const entry of getNodes({context: {schema, value: arrayValue}})) {
      arrayCount++
      lastArrayEntry = entry
    }
    expect(arrayCount).toEqual(2)
    expect(lastArrayEntry?.path.length).toEqual(10002)
    let objects = {}
    for (let depth = 0; depth < 10000; depth++) {
      objects = {field: objects}
    }
    let objectCount = 0
    let lastObjectEntry: {path: unknown[]} | undefined
    for (const entry of getNodes({context: {schema, value: [objects]}})) {
      objectCount++
      lastObjectEntry = entry
    }
    expect(objectCount).toEqual(10001)
    expect(lastObjectEntry?.path.length).toEqual(10001)
  })

  test('does not resolve each walked node from the root', () => {
    const keyGenerator = createTestKeyGenerator()
    let reads = 0
    const value = Array.from({length: 20}, () => ({
      _key: keyGenerator(),
      _type: 'card',
      details: {},
    }))
    const first = value[0]!
    Object.defineProperty(value, 0, {
      get: () => {
        reads++
        return first
      },
    })
    expect([...getNodes({context: {schema, value}})].length).toEqual(40)
    expect(reads).toEqual(3)
  })

  test('canonicalizes malformed keys and skips non-objects in bounded walks', () => {
    const value = createEveryFieldFixture()
    const snapshot = {context: {schema, value}}
    expect(
      [
        ...getNodes(snapshot, {
          from: [0, 'matrix', 0, 1],
          to: [0, 'matrix', 0, 4],
        }),
      ].map((entry) => entry.path),
    ).toEqual([
      [0],
      [0, 'matrix', 0, 1],
      [0, 'matrix', 0, 2],
      [0, 'matrix', 0, 3],
      [0, 'matrix', 0, 4],
    ])
    expect(
      comparePoints(
        snapshot,
        {path: [0, 'matrix', 0, {_key: 'k11'}], offset: 0},
        {path: [0, 'matrix', 0, 2], offset: 0},
      ),
    ).toEqual(0)
    expect(
      comparePoints(
        snapshot,
        {path: [0, 'matrix', 0, {_key: ''}], offset: 0},
        {path: [0, 'matrix', 0, 1], offset: 0},
      ),
    ).toEqual(0)
  })
  test('validates range paths through nested arrays without a registry', () => {
    const snapshot = {context: {schema, value: [{_type: 'card', grid: [[{}]]}]}}
    const nested = {path: [0, 'grid', 0, 0], offset: 0}
    expect(
      rangeIntersects(snapshot, {anchor: nested, focus: nested}, nested),
    ).toEqual(true)
    expect(
      rangeIntersects(snapshot, {anchor: nested, focus: nested}, nested.path),
    ).toEqual(true)
    expect(
      rangeIntersects(
        snapshot,
        {anchor: nested, focus: nested},
        {anchor: nested, focus: nested},
      ),
    ).toEqual(true)
  })

  test('keeps numeric container bounds map-independent with malformed keys', () => {
    const value = createEveryFieldFixture()
    const snapshot = createTestSnapshot({
      context: {
        schema,
        value,
        containers: new Map([
          [
            'wrapper',
            {
              kind: 'container',
              type: 'wrapper',
              field: {type: 'array', name: 'zeta', of: [{type: 'block'}]},
            },
          ],
        ]),
      },
    })
    expect([...getNodes(snapshot, {from: [0], to: [1]})]).toEqual([
      ...getNodes({context: snapshot.context}, {from: [0], to: [1]}),
    ])
  })
  test('keeps objects in span fields inline through nested arrays', () => {
    const value = [
      {
        _type: 'block',
        children: [
          {_type: 'span', text: 'foo', meta: {plain: {}, grid: [[{}]]}},
        ],
        markDefs: [],
      },
    ]
    const snapshot = {context: {schema, value}}
    expect(isBlock(snapshot, [0, 'children', 0, 'meta', 'plain'])).toEqual(
      false,
    )
    expect(isInline(snapshot, [0, 'children', 0, 'meta', 'plain'])).toEqual(
      true,
    )
    expect(isBlock(snapshot, [0, 'children', 0, 'meta', 'grid', 0, 0])).toEqual(
      false,
    )
    expect(
      isInline(snapshot, [0, 'children', 0, 'meta', 'grid', 0, 0]),
    ).toEqual(true)
  })
})
