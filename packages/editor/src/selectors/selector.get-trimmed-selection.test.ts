import type {PortableTextBlock} from '@sanity/types'
import {describe, expect, test} from 'vitest'
import {compileSchemaDefinition} from '../editor/editor-schema'
import {defineSchema} from '../editor/editor-schema-definition'
import {createTestSnapshot} from '../internal-utils/create-test-snapshot'
import {parseBlock} from '../internal-utils/parse-blocks'
import {createTestKeyGenerator} from '../internal-utils/test-key-generator'
import type {EditorSelection} from '../types/editor'
import {getTrimmedSelection} from './selector.get-trimmed-selection'

const keyGenerator = createTestKeyGenerator()

function snapshot(
  value: Array<Partial<PortableTextBlock>>,
  selection: EditorSelection,
) {
  const schema = compileSchemaDefinition(
    defineSchema({
      blockObjects: [{name: 'image'}],
      inlineObjects: [{name: 'stock-ticker'}],
    }),
  )

  return createTestSnapshot({
    context: {
      keyGenerator,
      schema,
      selection,
      value: value.flatMap((block) => {
        const parsedBlock = parseBlock({
          context: {
            keyGenerator,
            schema,
          },
          block,
          options: {
            refreshKeys: false,
            validateFields: false,
          },
        })

        return parsedBlock ? [parsedBlock] : []
      }),
    },
  })
}

function createSpan(text: string, marks: Array<string> = []) {
  return {
    _key: keyGenerator(),
    _type: 'span',
    text,
    marks,
  }
}

function createBlock(children: PortableTextBlock['children']) {
  return {
    _key: keyGenerator(),
    _type: 'block',
    children,
  }
}

function createStockTicker(symbol: string) {
  return {
    _key: keyGenerator(),
    _type: 'stock-ticker',
    symbol,
  }
}

function createImage(src: string) {
  return {
    _key: keyGenerator(),
    _type: 'image',
    src,
  }
}

describe(getTrimmedSelection.name, () => {
  test('Sensible defaults', () => {
    expect(getTrimmedSelection(snapshot([], null))).toBe(null)
    expect(
      getTrimmedSelection(snapshot([createBlock([createSpan('foo')])], null)),
    ).toBe(null)
  })

  test('does not trim spans that have selected text', () => {
    const foo = createSpan('foo')
    const bar = createSpan('bar', ['strong'])
    const baz = createSpan('baz')
    const block = createBlock([foo, bar, baz])

    expect(
      getTrimmedSelection(
        snapshot([block], {
          anchor: {
            path: [{_key: block._key}, 'children', {_key: bar._key}],
            offset: 0,
          },
          focus: {
            path: [{_key: block._key}, 'children', {_key: bar._key}],
            offset: 3,
          },
        }),
      ),
    ).toEqual({
      anchor: {
        path: [{_key: block._key}, 'children', {_key: bar._key}],
        offset: 0,
      },
      focus: {
        path: [{_key: block._key}, 'children', {_key: bar._key}],
        offset: 3,
      },
    })

    expect(
      getTrimmedSelection(
        snapshot([block], {
          anchor: {
            path: [{_key: block._key}, 'children', {_key: foo._key}],
            offset: 2,
          },
          focus: {
            path: [{_key: block._key}, 'children', {_key: baz._key}],
            offset: 2,
          },
        }),
      ),
    ).toEqual({
      anchor: {
        path: [{_key: block._key}, 'children', {_key: foo._key}],
        offset: 2,
      },
      focus: {
        path: [{_key: block._key}, 'children', {_key: baz._key}],
        offset: 2,
      },
    })
  })

  test('trims spans that have no selected text', () => {
    const foo = createSpan('foo')
    const bar = createSpan('bar', ['strong'])
    const baz = createSpan('baz')
    const block = createBlock([foo, bar, baz])

    expect(
      getTrimmedSelection(
        snapshot([block], {
          anchor: {
            path: [{_key: block._key}, 'children', {_key: foo._key}],
            offset: 3,
          },
          focus: {
            path: [{_key: block._key}, 'children', {_key: baz._key}],
            offset: 0,
          },
        }),
      ),
    ).toEqual({
      anchor: {
        path: [{_key: block._key}, 'children', {_key: bar._key}],
        offset: 0,
      },
      focus: {
        path: [{_key: block._key}, 'children', {_key: bar._key}],
        offset: 3,
      },
    })
  })

  test('trims inline objects at the start edge', () => {
    const aapl = createStockTicker('AAPL')
    const foo = createSpan('foo')
    const block = createBlock([aapl, foo])

    expect(
      getTrimmedSelection(
        snapshot([block], {
          anchor: {
            path: [{_key: block._key}, 'children', {_key: aapl._key}],
            offset: 0,
          },
          focus: {
            path: [{_key: block._key}, 'children', {_key: foo._key}],
            offset: 3,
          },
        }),
      ),
    ).toEqual({
      anchor: {
        path: [{_key: block._key}, 'children', {_key: foo._key}],
        offset: 0,
      },
      focus: {
        path: [{_key: block._key}, 'children', {_key: foo._key}],
        offset: 3,
      },
    })
  })

  test('trims inline objects at the end edge', () => {
    const foo = createSpan('foo')
    const aapl = createStockTicker('AAPL')
    const block = createBlock([foo, aapl])

    expect(
      getTrimmedSelection(
        snapshot([block], {
          anchor: {
            path: [{_key: block._key}, 'children', {_key: foo._key}],
            offset: 0,
          },
          focus: {
            path: [{_key: block._key}, 'children', {_key: aapl._key}],
            offset: 0,
          },
        }),
      ),
    ).toEqual({
      anchor: {
        path: [{_key: block._key}, 'children', {_key: foo._key}],
        offset: 0,
      },
      focus: {
        path: [{_key: block._key}, 'children', {_key: foo._key}],
        offset: 3,
      },
    })
  })

  test('trims empty spans', () => {
    const empty1 = createSpan('')
    const aapl = createStockTicker('AAPL')
    const foo = createSpan('foo')
    const nvda = createStockTicker('NVDA')
    const empty2 = createSpan('')
    const block = createBlock([empty1, aapl, foo, nvda, empty2])

    expect(
      getTrimmedSelection(
        snapshot([block], {
          anchor: {
            path: [{_key: block._key}, 'children', {_key: empty1._key}],
            offset: 0,
          },
          focus: {
            path: [{_key: block._key}, 'children', {_key: empty2._key}],
            offset: 0,
          },
        }),
      ),
    ).toEqual({
      anchor: {
        path: [{_key: block._key}, 'children', {_key: foo._key}],
        offset: 0,
      },
      focus: {
        path: [{_key: block._key}, 'children', {_key: foo._key}],
        offset: 3,
      },
    })
  })

  test('trims off block at the start edge', () => {
    const empty1 = createSpan('')
    const aapl = createStockTicker('AAPL')
    const foo = createSpan('foo')
    const empty2 = createSpan('')
    const nvda = createStockTicker('NVDA')
    const bar = createSpan('bar')
    const block1 = createBlock([foo, aapl, empty1])
    const block2 = createBlock([empty2, nvda, bar])

    expect(
      getTrimmedSelection(
        snapshot([block1, block2], {
          anchor: {
            path: [{_key: block1._key}, 'children', {_key: foo._key}],
            offset: 3,
          },
          focus: {
            path: [{_key: block2._key}, 'children', {_key: bar._key}],
            offset: 3,
          },
        }),
      ),
    ).toEqual({
      anchor: {
        path: [{_key: block2._key}, 'children', {_key: bar._key}],
        offset: 0,
      },
      focus: {
        path: [{_key: block2._key}, 'children', {_key: bar._key}],
        offset: 3,
      },
    })
  })

  test('trims off block at the end edge', () => {
    const empty1 = createSpan('')
    const aapl = createStockTicker('AAPL')
    const foo = createSpan('foo')
    const empty2 = createSpan('')
    const nvda = createStockTicker('NVDA')
    const bar = createSpan('bar')
    const block1 = createBlock([foo, aapl, empty1])
    const block2 = createBlock([empty2, nvda, bar])

    expect(
      getTrimmedSelection(
        snapshot([block1, block2], {
          anchor: {
            path: [{_key: block1._key}, 'children', {_key: foo._key}],
            offset: 0,
          },
          focus: {
            path: [{_key: block2._key}, 'children', {_key: bar._key}],
            offset: 0,
          },
        }),
      ),
    ).toEqual({
      anchor: {
        path: [{_key: block1._key}, 'children', {_key: foo._key}],
        offset: 0,
      },
      focus: {
        path: [{_key: block1._key}, 'children', {_key: foo._key}],
        offset: 3,
      },
    })
  })

  test('ignores empty text block on start edge', () => {
    const empty = createSpan('')
    const block1 = createBlock([empty])
    const foo = createSpan('foo')
    const block2 = createBlock([foo])

    expect(
      getTrimmedSelection(
        snapshot([block1, block2], {
          anchor: {
            path: [{_key: block1._key}, 'children', {_key: empty._key}],
            offset: 0,
          },
          focus: {
            path: [{_key: block2._key}, 'children', {_key: foo._key}],
            offset: 3,
          },
        }),
      ),
    ).toEqual({
      anchor: {
        path: [{_key: block1._key}, 'children', {_key: empty._key}],
        offset: 0,
      },
      focus: {
        path: [{_key: block2._key}, 'children', {_key: foo._key}],
        offset: 3,
      },
    })
  })

  test('ignores empty text block on end edge', () => {
    const foo = createSpan('foo')
    const block1 = createBlock([foo])
    const empty = createSpan('')
    const block2 = createBlock([empty])

    expect(
      getTrimmedSelection(
        snapshot([block1, block2], {
          anchor: {
            path: [{_key: block1._key}, 'children', {_key: foo._key}],
            offset: 0,
          },
          focus: {
            path: [{_key: block2._key}, 'children', {_key: empty._key}],
            offset: 0,
          },
        }),
      ),
    ).toEqual({
      anchor: {
        path: [{_key: block1._key}, 'children', {_key: foo._key}],
        offset: 0,
      },
      focus: {
        path: [{_key: block2._key}, 'children', {_key: empty._key}],
        offset: 0,
      },
    })
  })

  test('ignores block object on start edge', () => {
    const image1 = createImage('image1')
    const empty1 = createSpan('')
    const aapl = createStockTicker('AAPL')
    const foo = createSpan('foo')
    const nvda = createStockTicker('NVDA')
    const empty2 = createSpan('')
    const block = createBlock([empty1, aapl, foo, nvda, empty2])
    const image2 = createImage('image2')

    expect(
      getTrimmedSelection(
        snapshot([image1, block, image2], {
          anchor: {
            path: [{_key: image1._key}],
            offset: 0,
          },
          focus: {
            path: [{_key: block._key}, 'children', {_key: empty2._key}],
            offset: 0,
          },
        }),
      ),
    ).toEqual({
      anchor: {
        path: [{_key: image1._key}],
        offset: 0,
      },
      focus: {
        path: [{_key: block._key}, 'children', {_key: foo._key}],
        offset: 3,
      },
    })
  })

  test('ignores block object on end edge', () => {
    const image1 = createImage('image1')
    const empty1 = createSpan('')
    const aapl = createStockTicker('AAPL')
    const foo = createSpan('foo')
    const nvda = createStockTicker('NVDA')
    const empty2 = createSpan('')
    const block = createBlock([empty1, aapl, foo, nvda, empty2])
    const image2 = createImage('image2')

    expect(
      getTrimmedSelection(
        snapshot([image1, block, image2], {
          anchor: {
            path: [{_key: block._key}, 'children', {_key: empty1._key}],
            offset: 0,
          },
          focus: {
            path: [{_key: image2._key}],
            offset: 0,
          },
        }),
      ),
    ).toEqual({
      anchor: {
        path: [{_key: block._key}, 'children', {_key: foo._key}],
        offset: 0,
      },
      focus: {
        path: [{_key: image2._key}],
        offset: 0,
      },
    })
  })

  test('ignores block objects on start and end edge', () => {
    const image1 = createImage('image1')
    const empty1 = createSpan('')
    const aapl = createStockTicker('AAPL')
    const foo = createSpan('foo')
    const nvda = createStockTicker('NVDA')
    const empty2 = createSpan('')
    const block = createBlock([empty1, aapl, foo, nvda, empty2])
    const image2 = createImage('image2')

    expect(
      getTrimmedSelection(
        snapshot([image1, block, image2], {
          anchor: {
            path: [{_key: image1._key}],
            offset: 0,
          },
          focus: {
            path: [{_key: image2._key}],
            offset: 0,
          },
        }),
      ),
    ).toEqual({
      anchor: {
        path: [{_key: image1._key}],
        offset: 0,
      },
      focus: {
        path: [{_key: image2._key}],
        offset: 0,
      },
    })
  })

  test('edge case', () => {
    expect(
      getTrimmedSelection(
        snapshot(
          [
            {
              _key: 'b0',
              _type: 'block',
              children: [
                {
                  _key: 's0',
                  _type: 'span',
                  text: 'foo',
                },
                {
                  _key: 's1',
                  _type: 'span',
                  text: '',
                },
              ],
            },
            {
              _key: 'b1',
              _type: 'block',
              children: [
                {
                  _key: 's2',
                  _type: 'span',
                  text: '',
                },
                {
                  _key: 's3',
                  _type: 'span',
                  text: 'bar',
                },
              ],
            },
          ],
          {
            anchor: {
              path: [{_key: 'b0'}, 'children', {_key: 's0'}],
              offset: 3,
            },
            focus: {
              path: [{_key: 'b1'}, 'children', {_key: 's2'}],
              offset: 0,
            },
          },
        ),
      ),
    ).toEqual(null)
  })

  test('edge case #2', () => {
    const foo = createSpan('foo')
    const block1 = createBlock([foo])
    const empty = createSpan('')
    const block2 = createBlock([empty])
    const bar = createSpan('bar')
    const block3 = createBlock([bar])

    expect(
      getTrimmedSelection(
        snapshot([block1, block2, block3], {
          anchor: {
            path: [{_key: block1._key}, 'children', {_key: foo._key}],
            offset: 3,
          },
          focus: {
            path: [{_key: block3._key}, 'children', {_key: bar._key}],
            offset: 0,
          },
        }),
      ),
    ).toEqual({
      anchor: {
        path: [{_key: block2._key}, 'children', {_key: empty._key}],
        offset: 0,
      },
      focus: {
        path: [{_key: block2._key}, 'children', {_key: empty._key}],
        offset: 0,
      },
    })
  })

  test('edge case #3', () => {
    const foo = createSpan('foo')
    const block1 = createBlock([foo])
    const empty = createSpan('')
    const block2 = createBlock([empty])
    const bar = createSpan('bar')
    const block3 = createBlock([bar])

    expect(
      getTrimmedSelection(
        snapshot([block1, block2, block3], {
          anchor: {
            path: [{_key: block3._key}, 'children', {_key: bar._key}],
            offset: 0,
          },
          focus: {
            path: [{_key: block1._key}, 'children', {_key: foo._key}],
            offset: 3,
          },
          backward: true,
        }),
      ),
    ).toEqual({
      anchor: {
        path: [{_key: block2._key}, 'children', {_key: empty._key}],
        offset: 0,
      },
      focus: {
        path: [{_key: block2._key}, 'children', {_key: empty._key}],
        offset: 0,
      },
      backward: true,
    })
  })

  test('backwards selection', () => {
    const foo = createSpan('foo')
    const block1 = createBlock([foo])
    const bar = createSpan('bar')
    const block2 = createBlock([bar])

    expect(
      getTrimmedSelection(
        snapshot([block1, block2], {
          anchor: {
            path: [{_key: block2._key}, 'children', {_key: bar._key}],
            offset: 3,
          },
          focus: {
            path: [{_key: block1._key}, 'children', {_key: foo._key}],
            offset: 3,
          },
          backward: true,
        }),
      ),
    ).toEqual({
      anchor: {
        path: [{_key: block2._key}, 'children', {_key: bar._key}],
        offset: 3,
      },
      focus: {
        path: [{_key: block2._key}, 'children', {_key: bar._key}],
        offset: 0,
      },
      backward: true,
    })
  })
})
