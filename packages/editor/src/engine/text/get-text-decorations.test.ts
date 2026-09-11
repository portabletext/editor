import type {PortableTextSpan} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import type {DecoratedRange} from '../interfaces/text'
import {getTextDecorations} from './get-text-decorations'

const span: PortableTextSpan = {
  _key: 's1',
  _type: 'span',
  text: 'foo',
  marks: [],
}

describe('getTextDecorations', () => {
  test('Scenario: a decoration without a custom `merge` only assigns its own payload, not the `isRangeStart`/`isRangeEnd` bookkeeping', () => {
    const decoration: DecoratedRange = {
      anchor: {path: [], offset: 0},
      focus: {path: [], offset: 3},
      placeholder: true,
    } as DecoratedRange

    const [leaf] = getTextDecorations(span, [decoration])

    expect(leaf?.leaf).toEqual({
      _key: 's1',
      _type: 'span',
      text: 'foo',
      marks: [],
      placeholder: true,
    })
  })

  test("Scenario: an empty fragment exactly at another fragment's claim on a decoration's start does not duplicate `isFirst`", () => {
    const merge = (
      leaf: PortableTextSpan & {rangeDecorations?: Array<object>},
      decoration: object,
    ) => {
      leaf.rangeDecorations = [...(leaf.rangeDecorations ?? []), decoration]
    }

    const point: DecoratedRange = {
      anchor: {path: [], offset: 1},
      focus: {path: [], offset: 1},
      merge,
      isRangeStart: true,
      isRangeEnd: true,
      rangeDecoration: 'point',
    } as unknown as DecoratedRange

    const range: DecoratedRange = {
      anchor: {path: [], offset: 1},
      focus: {path: [], offset: 3},
      merge,
      isRangeStart: true,
      isRangeEnd: true,
      rangeDecoration: 'range',
    } as unknown as DecoratedRange

    const leaves = getTextDecorations(span, [point, range])

    const rangeEntries = leaves
      .flatMap(
        (item) =>
          (
            item.leaf as PortableTextSpan & {
              rangeDecorations?: Array<{
                rangeDecoration: unknown
                isFirst: boolean
                isLast: boolean
              }>
            }
          ).rangeDecorations ?? [],
      )
      .filter((entry) => entry.rangeDecoration === 'range')

    expect(rangeEntries.filter((entry) => entry.isFirst)).toHaveLength(1)
    expect(rangeEntries.filter((entry) => entry.isLast)).toHaveLength(1)
  })
})
