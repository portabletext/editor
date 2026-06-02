import {describe, expect, test} from 'vitest'
import {createNodeTraversalTestbed} from './node-traversal-testbed'
import {rangeIncludes} from './range-includes'

describe(rangeIncludes.name, () => {
  const testbed = createNodeTraversalTestbed()
  const snapshot = testbed.snapshot

  test('returns false when the range is null', () => {
    expect(
      rangeIncludes(snapshot, null, [{_key: testbed.textBlock1._key}]),
    ).toBe(false)
  })

  test('returns false when the target is null', () => {
    const point = {
      path: [
        {_key: testbed.textBlock1._key},
        'children',
        {_key: testbed.span1._key},
      ],
      offset: 0,
    }
    const range = {anchor: point, focus: point}
    expect(rangeIncludes(snapshot, range, null)).toBe(false)
  })

  describe('Path target', () => {
    test('collapsed range inside the target path is included', () => {
      const point = {
        path: [
          {_key: testbed.textBlock1._key},
          'children',
          {_key: testbed.span1._key},
        ],
        offset: 0,
      }
      const range = {anchor: point, focus: point}
      expect(
        rangeIncludes(snapshot, range, [{_key: testbed.textBlock1._key}]),
      ).toBe(true)
    })

    test('collapsed range outside the target path is not included', () => {
      const point = {
        path: [
          {_key: testbed.textBlock2._key},
          'children',
          {_key: testbed.span3._key},
        ],
        offset: 0,
      }
      const range = {anchor: point, focus: point}
      expect(
        rangeIncludes(snapshot, range, [{_key: testbed.textBlock1._key}]),
      ).toBe(false)
    })

    test('expanded range that spans the target path is included', () => {
      const range = {
        anchor: {
          path: [
            {_key: testbed.textBlock1._key},
            'children',
            {_key: testbed.span1._key},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: testbed.textBlock2._key},
            'children',
            {_key: testbed.span3._key},
          ],
          offset: 0,
        },
      }
      expect(rangeIncludes(snapshot, range, [{_key: testbed.image._key}])).toBe(
        true,
      )
    })

    test('deep path inside a nested container is included when range lives there', () => {
      const point = {
        path: [
          {_key: testbed.table._key},
          'rows',
          {_key: testbed.row1._key},
          'cells',
          {_key: testbed.cell1._key},
          'content',
          {_key: testbed.cellBlock1._key},
          'children',
          {_key: testbed.cellSpan1._key},
        ],
        offset: 0,
      }
      const range = {anchor: point, focus: point}
      expect(
        rangeIncludes(snapshot, range, [
          {_key: testbed.table._key},
          'rows',
          {_key: testbed.row1._key},
        ]),
      ).toBe(true)
    })
  })

  describe('Point target', () => {
    test('point inside the range is included', () => {
      const range = {
        anchor: {
          path: [
            {_key: testbed.textBlock1._key},
            'children',
            {_key: testbed.span1._key},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: testbed.textBlock1._key},
            'children',
            {_key: testbed.span2._key},
          ],
          offset: 0,
        },
      }
      const target = {
        path: [
          {_key: testbed.textBlock1._key},
          'children',
          {_key: testbed.span1._key},
        ],
        offset: 3,
      }
      expect(rangeIncludes(snapshot, range, target)).toBe(true)
    })

    test('point outside the range is not included', () => {
      const point = {
        path: [
          {_key: testbed.textBlock1._key},
          'children',
          {_key: testbed.span1._key},
        ],
        offset: 0,
      }
      const range = {anchor: point, focus: point}
      const target = {
        path: [
          {_key: testbed.textBlock2._key},
          'children',
          {_key: testbed.span3._key},
        ],
        offset: 0,
      }
      expect(rangeIncludes(snapshot, range, target)).toBe(false)
    })
  })

  describe('Range target', () => {
    test('overlapping ranges return true', () => {
      const a = {
        path: [
          {_key: testbed.textBlock1._key},
          'children',
          {_key: testbed.span1._key},
        ],
        offset: 0,
      }
      const b = {
        path: [
          {_key: testbed.textBlock1._key},
          'children',
          {_key: testbed.span2._key},
        ],
        offset: 0,
      }
      const range = {anchor: a, focus: b}
      const target = {anchor: b, focus: b}
      expect(rangeIncludes(snapshot, range, target)).toBe(true)
    })

    test('non-overlapping ranges return false', () => {
      const inBlock1 = {
        path: [
          {_key: testbed.textBlock1._key},
          'children',
          {_key: testbed.span1._key},
        ],
        offset: 0,
      }
      const inBlock2 = {
        path: [
          {_key: testbed.textBlock2._key},
          'children',
          {_key: testbed.span3._key},
        ],
        offset: 0,
      }
      const range = {anchor: inBlock1, focus: inBlock1}
      const target = {anchor: inBlock2, focus: inBlock2}
      expect(rangeIncludes(snapshot, range, target)).toBe(false)
    })
  })
})
