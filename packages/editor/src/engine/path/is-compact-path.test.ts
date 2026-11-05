import {describe, expect, test} from 'vitest'
import {
  createTextBlockDepthTestbed,
  textBlockDepths,
} from '../../traversal/node-traversal-testbed'
import {eventHasCompactPath, isCompactPath} from './is-compact-path'

describe.each(textBlockDepths)(
  `${isCompactPath.name} for a text block %s`,
  (depth) => {
    const testbed = createTextBlockDepthTestbed(depth)

    test('the root path is not compact', () => {
      expect(isCompactPath([])).toEqual(false)
    })

    test('full node and property paths are not compact', () => {
      expect(isCompactPath(testbed.blockPath)).toEqual(false)
      expect(isCompactPath(testbed.spanPath)).toEqual(false)
      expect(isCompactPath(testbed.indexedSpanPath)).toEqual(false)
      expect(isCompactPath([...testbed.spanPath, 'text'])).toEqual(false)
      expect(isCompactPath(testbed.annotationPath)).toEqual(false)
      expect(isCompactPath([...testbed.annotationPath, 'href'])).toEqual(false)
    })

    test.each(testbed.compactSpanPaths)(
      'a compact span path ($form) is compact',
      ({path}) => {
        expect(isCompactPath(path)).toEqual(true)
      },
    )

    test.each(testbed.compactBlockPaths)(
      'a compact block path ($form) is compact',
      ({path}) => {
        expect(isCompactPath(path)).toEqual(true)
      },
    )
  },
)

describe(isCompactPath.name, () => {
  test('two node segments side by side make a path compact', () => {
    expect(isCompactPath([0, 0])).toEqual(true)
    expect(isCompactPath([{_key: 'b1'}, {_key: 's1'}])).toEqual(true)
    expect(isCompactPath([{_key: 'b1'}, 0])).toEqual(true)
    expect(isCompactPath([0, {_key: 's1'}, 'text'])).toEqual(true)
  })

  test('two node segments side by side after a field name make a path compact', () => {
    expect(
      isCompactPath([{_key: 'i1'}, 'data', 'matrix', 0, 0, 'text']),
    ).toEqual(true)
    expect(isCompactPath([{_key: 'b1'}, 'markDefs', {_key: 'm1'}, 0])).toEqual(
      true,
    )
  })

  test('a path whose node segments are each followed by a field name is not compact', () => {
    expect(isCompactPath([])).toEqual(false)
    expect(isCompactPath([{_key: 'b1'}])).toEqual(false)
    expect(isCompactPath([0, 'children', 0, 'text'])).toEqual(false)
    expect(
      isCompactPath([{_key: 'b1'}, 'markDefs', {_key: 'm1'}, 'href']),
    ).toEqual(false)
  })
})

describe.each(textBlockDepths)(
  `${isCompactPath.name} does not depend on whether nodes exist, for a text block %s`,
  (depth) => {
    const testbed = createTextBlockDepthTestbed(depth)

    test.each([
      {kind: 'full', path: testbed.spanPath, compact: false},
      ...testbed.compactSpanPaths.map(({form, path}) => ({
        kind: form,
        path,
        compact: true,
      })),
    ])(
      'the $kind span path gives the same answer with any of its nodes missing',
      ({path, compact}) => {
        const nodeIndices = path.flatMap((segment, index) =>
          typeof segment === 'string' ? [] : [index],
        )
        const subsets = Array.from(
          {length: 2 ** nodeIndices.length},
          (_, mask) => nodeIndices.filter((_, bit) => (mask >> bit) & 1),
        )

        expect(
          subsets.map((subset) =>
            isCompactPath(
              path.map((segment, index) =>
                subset.includes(index) ? {_key: `missing-${index}`} : segment,
              ),
            ),
          ),
        ).toEqual(subsets.map(() => compact))
      },
    )
  },
)

describe.each(textBlockDepths)(
  `${eventHasCompactPath.name} for a text block %s`,
  (depth) => {
    const testbed = createTextBlockDepthTestbed(depth)
    const compactPath = testbed.compactSpanPaths[0]!.path
    const fullSelection = {
      anchor: {path: testbed.spanPath, offset: 0},
      focus: {path: testbed.spanPath, offset: 1},
      backward: false,
    }
    const compactSelection = {
      anchor: {path: testbed.spanPath, offset: 0},
      focus: {path: compactPath, offset: 1},
      backward: false,
    }

    test('an event without address fields has no compact path', () => {
      expect(eventHasCompactPath({type: 'insert.break'})).toEqual(false)
    })

    test('full `at` paths and ranges have no compact path', () => {
      expect(
        eventHasCompactPath({
          type: 'set',
          at: [...testbed.spanPath, 'text'],
          value: 'bar',
        }),
      ).toEqual(false)
      expect(eventHasCompactPath({type: 'select', at: fullSelection})).toEqual(
        false,
      )
      expect(eventHasCompactPath({type: 'select', at: null})).toEqual(false)
    })

    test('a compact `at` path or range point has a compact path', () => {
      expect(
        eventHasCompactPath({
          type: 'set',
          at: [...compactPath, 'text'],
          value: 'bar',
        }),
      ).toEqual(true)
      expect(
        eventHasCompactPath({type: 'select', at: compactSelection}),
      ).toEqual(true)
    })

    test('a compact `to` path has a compact path', () => {
      expect(
        eventHasCompactPath({
          type: 'move.block',
          at: testbed.blockPath,
          to: [...compactPath],
        }),
      ).toEqual(true)
    })

    test('a custom event payload is never read', () => {
      expect(
        eventHasCompactPath({
          type: 'custom.foo',
          at: compactPath,
          to: compactPath,
          position: {selection: compactSelection},
          dragOrigin: {selection: compactSelection},
        }),
      ).toEqual(false)
    })
  },
)
