import {describe, expect, test} from 'vitest'
import {
  mapPointThroughStep,
  mapPoint,
  type Point,
  type Step,
} from './step-mapper'

describe(mapPointThroughStep.name, () => {
  test('a null point stays null for any step', () => {
    const step: Step = {
      type: 'insert.text',
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 0,
      length: 5,
    }
    expect(mapPointThroughStep(step, null)).toEqual(null)
  })

  describe('insert.text', () => {
    test('shifts the offset forward when the insertion is before it', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 5,
      }
      const step: Step = {
        type: 'insert.text',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        length: 3,
      }
      expect(mapPointThroughStep(step, point)).toEqual({
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 8,
      })
    })

    test('shifts the offset at the same position with forward affinity', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
      }
      const step: Step = {
        type: 'insert.text',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        length: 3,
      }
      expect(mapPointThroughStep(step, point, {affinity: 'forward'})).toEqual({
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 6,
      })
    })

    test('leaves the offset untouched at the same position with backward affinity', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
      }
      const step: Step = {
        type: 'insert.text',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        length: 3,
      }
      expect(mapPointThroughStep(step, point, {affinity: 'backward'})).toBe(
        point,
      )
    })

    test('is a no-op when the insertion is after the offset', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 2,
      }
      const step: Step = {
        type: 'insert.text',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 5,
        length: 3,
      }
      expect(mapPointThroughStep(step, point)).toBe(point)
    })

    test('is a no-op on a different path', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 5,
      }
      const step: Step = {
        type: 'insert.text',
        path: [{_key: 'b1'}, 'children', {_key: 's2'}],
        offset: 0,
        length: 3,
      }
      expect(mapPointThroughStep(step, point)).toBe(point)
    })
  })

  describe('remove.text', () => {
    test('shifts the offset backward', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 5,
      }
      const step: Step = {
        type: 'remove.text',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 2,
        length: 2,
      }
      expect(mapPointThroughStep(step, point)).toEqual({
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
      })
    })

    test('clamps to the removal offset when the point sits inside the removed text', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
      }
      const step: Step = {
        type: 'remove.text',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 1,
        length: 6,
      }
      expect(mapPointThroughStep(step, point)).toEqual({
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 1,
      })
    })

    test('is a no-op when the removal starts after the offset', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 2,
      }
      const step: Step = {
        type: 'remove.text',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 5,
        length: 3,
      }
      expect(mapPointThroughStep(step, point)).toBe(point)
    })

    test('is a no-op on a different path', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 5,
      }
      const step: Step = {
        type: 'remove.text',
        path: [{_key: 'b1'}, 'children', {_key: 's2'}],
        offset: 0,
        length: 2,
      }
      expect(mapPointThroughStep(step, point)).toBe(point)
    })
  })

  describe('set.text', () => {
    test('clamps the offset to the new text length', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 5,
      }
      const step: Step = {
        type: 'set.text',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        length: 2,
      }
      expect(mapPointThroughStep(step, point)).toEqual({
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 2,
      })
    })

    test('leaves the offset untouched when it is within the new text length', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 2,
      }
      const step: Step = {
        type: 'set.text',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        length: 6,
      }
      expect(mapPointThroughStep(step, point)).toBe(point)
    })

    test('collapses to zero for a length of zero, the shape a text removed outright takes', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 4,
      }
      const step: Step = {
        type: 'set.text',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        length: 0,
      }
      expect(mapPointThroughStep(step, point)).toEqual({
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 0,
      })
    })

    test('is a no-op when the offset is already zero and the length is zero', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 0,
      }
      const step: Step = {
        type: 'set.text',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        length: 0,
      }
      expect(mapPointThroughStep(step, point)).toBe(point)
    })

    test('is a no-op on a different node', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 5,
      }
      const step: Step = {
        type: 'set.text',
        path: [{_key: 'b1'}, 'children', {_key: 's2'}],
        length: 2,
      }
      expect(mapPointThroughStep(step, point)).toBe(point)
    })
  })

  describe('remove.node', () => {
    test('invalidates a point at the removed node', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
      }
      const step: Step = {
        type: 'remove.node',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      }
      expect(mapPointThroughStep(step, point)).toEqual(null)
    })

    test('invalidates a point inside the removed node', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
      }
      const step: Step = {
        type: 'remove.node',
        path: [{_key: 'b1'}],
      }
      expect(mapPointThroughStep(step, point)).toEqual(null)
    })

    test('is a no-op on a different path', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
      }
      const step: Step = {
        type: 'remove.node',
        path: [{_key: 'b2'}],
      }
      expect(mapPointThroughStep(step, point)).toBe(point)
    })
  })

  describe('move.text', () => {
    test('maps a point at the start of the moved range to the destination start with the default (forward) affinity', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 4,
      }
      const step: Step = {
        type: 'move.text',
        from: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 4,
          length: 7,
        },
        to: {path: [{_key: 'b2'}, 'children', {_key: 's2'}], offset: 0},
      }
      expect(mapPointThroughStep(step, point)).toEqual({
        path: [{_key: 'b2'}, 'children', {_key: 's2'}],
        offset: 0,
      })
    })

    test('maps a point at the end of the moved range to the destination end with the default (forward) affinity', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 11,
      }
      const step: Step = {
        type: 'move.text',
        from: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 4,
          length: 7,
        },
        to: {path: [{_key: 'b2'}, 'children', {_key: 's2'}], offset: 0},
      }
      expect(mapPointThroughStep(step, point)).toEqual({
        path: [{_key: 'b2'}, 'children', {_key: 's2'}],
        offset: 7,
      })
    })

    test('leaves a point at the start of the moved range behind with backward affinity', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 4,
      }
      const step: Step = {
        type: 'move.text',
        from: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 4,
          length: 7,
        },
        to: {path: [{_key: 'b2'}, 'children', {_key: 's2'}], offset: 0},
      }
      expect(mapPointThroughStep(step, point, {affinity: 'backward'})).toBe(
        point,
      )
    })

    test('leaves a point at the end of the moved range behind with backward affinity', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 11,
      }
      const step: Step = {
        type: 'move.text',
        from: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 4,
          length: 7,
        },
        to: {path: [{_key: 'b2'}, 'children', {_key: 's2'}], offset: 0},
      }
      expect(mapPointThroughStep(step, point, {affinity: 'backward'})).toBe(
        point,
      )
    })

    test('a point strictly inside the moved range rides regardless of affinity', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 7,
      }
      const step: Step = {
        type: 'move.text',
        from: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 4,
          length: 7,
        },
        to: {path: [{_key: 'b2'}, 'children', {_key: 's2'}], offset: 0},
      }
      expect(mapPointThroughStep(step, point, {affinity: 'backward'})).toEqual({
        path: [{_key: 'b2'}, 'children', {_key: 's2'}],
        offset: 3,
      })
    })

    test('is a no-op when the offset sits outside the moved range', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
      }
      const step: Step = {
        type: 'move.text',
        from: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 4,
          length: 7,
        },
        to: {path: [{_key: 'b2'}, 'children', {_key: 's2'}], offset: 0},
      }
      expect(mapPointThroughStep(step, point)).toBe(point)
    })

    test('is a no-op on a different path', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's9'}],
        offset: 6,
      }
      const step: Step = {
        type: 'move.text',
        from: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 4,
          length: 7,
        },
        to: {path: [{_key: 'b2'}, 'children', {_key: 's2'}], offset: 0},
      }
      expect(mapPointThroughStep(step, point)).toBe(point)
    })

    test('offsets into the destination range by an offset target other than zero', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 6,
      }
      const step: Step = {
        type: 'move.text',
        from: {
          path: [{_key: 'b1'}, 'children', {_key: 's1'}],
          offset: 4,
          length: 7,
        },
        to: {path: [{_key: 'b2'}, 'children', {_key: 's2'}], offset: 5},
      }
      expect(mapPointThroughStep(step, point)).toEqual({
        path: [{_key: 'b2'}, 'children', {_key: 's2'}],
        offset: 7,
      })
    })
  })

  describe('set.key', () => {
    test('substitutes the old key with the new key at the segment addressed by the step path', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
      }
      const step: Step = {
        type: 'set.key',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        newKey: 's2',
      }
      expect(mapPointThroughStep(step, point)).toEqual({
        path: [{_key: 'b1'}, 'children', {_key: 's2'}],
        offset: 3,
      })
    })

    test('is a no-op when the old key is not the segment addressed by the step path', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
      }
      const step: Step = {
        type: 'set.key',
        path: [{_key: 'b1'}, 'children', {_key: 's9'}],
        newKey: 's2',
      }
      expect(mapPointThroughStep(step, point)).toBe(point)
    })

    test('is a no-op when the key matches but at a different depth than the step path', () => {
      const point = {
        path: [
          {_key: 'b1'},
          'children',
          {_key: 's1'},
          'children',
          {_key: 's1'},
        ],
        offset: 3,
      }
      const step: Step = {
        type: 'set.key',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        newKey: 's2',
      }

      expect(mapPointThroughStep(step, point)).toEqual({
        path: [
          {_key: 'b1'},
          'children',
          {_key: 's2'},
          'children',
          {_key: 's1'},
        ],
        offset: 3,
      })
    })

    test('a same-valued key elsewhere never matches: identity is by address, not by value', () => {
      const point = {
        path: [{_key: 'other'}, 'children', {_key: 's1'}],
        offset: 3,
      }
      const step: Step = {
        type: 'set.key',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        newKey: 's2',
      }
      expect(mapPointThroughStep(step, point)).toBe(point)
    })
  })

  describe('set.children', () => {
    test('remaps a point through a text-preserving replacement', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 5,
      }
      const step: Step = {
        type: 'set.children',
        path: [{_key: 'b1'}],
        field: 'children',
        oldChildren: [{_key: 's1', text: 'foobarbaz'}],
        newChildren: [
          {_key: 'n1', text: 'foo'},
          {_key: 'n2', text: 'bar'},
          {_key: 'n3', text: 'baz'},
        ],
      }
      expect(mapPointThroughStep(step, point)).toEqual({
        path: [{_key: 'b1'}, 'children', {_key: 'n2'}],
        offset: 2,
      })
    })

    test('a vanished key among text-less children leaves the point alone', () => {
      // Children without `text` (block-shaped members of a container
      // array) cannot occupy offsets, so the offset walk bails and the
      // point stays put rather than remapping through the replacement.
      const point: Point = {
        path: [{_key: 'container1'}, 'rows', {_key: 'row1'}],
        offset: 0,
      }
      const step: Step = {
        type: 'set.children',
        path: [{_key: 'container1'}],
        field: 'rows',
        oldChildren: [{_key: 'row1'}, {_key: 'row2'}],
        newChildren: [{_key: 'row3'}, {_key: 'row2'}],
      }
      expect(mapPointThroughStep(step, point)).toBe(point)
    })

    test('a boundary offset lands at the end of the earlier span', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
      }
      const step: Step = {
        type: 'set.children',
        path: [{_key: 'b1'}],
        field: 'children',
        oldChildren: [{_key: 's1', text: 'foobarbaz'}],
        newChildren: [
          {_key: 'n1', text: 'foo'},
          {_key: 'n2', text: 'barbaz'},
        ],
      }
      expect(mapPointThroughStep(step, point)).toEqual({
        path: [{_key: 'b1'}, 'children', {_key: 'n1'}],
        offset: 3,
      })
    })

    test('inline objects occupy no text offset on either side', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's2'}],
        offset: 1,
      }
      const step: Step = {
        type: 'set.children',
        path: [{_key: 'b1'}],
        field: 'children',
        oldChildren: [
          {_key: 's1', text: 'foo'},
          {_key: 'o1'},
          {_key: 's2', text: 'bar'},
        ],
        newChildren: [
          {_key: 'n1', text: 'foo'},
          {_key: 'n2'},
          {_key: 'n3', text: 'bar'},
        ],
      }
      expect(mapPointThroughStep(step, point)).toEqual({
        path: [{_key: 'b1'}, 'children', {_key: 'n3'}],
        offset: 1,
      })
    })

    test('a surviving span keeps its identity over offset mapping', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 2,
      }
      const step: Step = {
        type: 'set.children',
        path: [{_key: 'b1'}],
        field: 'children',
        oldChildren: [
          {_key: 's1', text: 'foo'},
          {_key: 'o2', text: 'bar'},
        ],
        newChildren: [
          {_key: 'n1', text: 'bar'},
          {_key: 's1', text: 'foo'},
        ],
      }
      expect(mapPointThroughStep(step, point)).toBe(point)
    })

    test('a surviving key with shrunken text clamps the offset to the new length', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 5,
      }
      const step: Step = {
        type: 'set.children',
        path: [{_key: 'b1'}],
        field: 'children',
        oldChildren: [{_key: 's1', text: 'foobarbaz'}],
        newChildren: [{_key: 's1', text: 'foo'}],
      }
      expect(mapPointThroughStep(step, point)).toEqual({
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
      })
    })

    test('a surviving key with the offset already within range keeps the same reference', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 2,
      }
      const step: Step = {
        type: 'set.children',
        path: [{_key: 'b1'}],
        field: 'children',
        oldChildren: [{_key: 's1', text: 'foobarbaz'}],
        newChildren: [{_key: 's1', text: 'foo'}],
      }
      expect(mapPointThroughStep(step, point)).toBe(point)
    })

    test('a surviving key without text is left untouched', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 'o1'}],
        offset: 5,
      }
      const step: Step = {
        type: 'set.children',
        path: [{_key: 'b1'}],
        field: 'children',
        oldChildren: [{_key: 'o1'}],
        newChildren: [{_key: 'o1'}],
      }
      expect(mapPointThroughStep(step, point)).toBe(point)
    })

    test('a text-changing replacement leaves the point untransformed', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 5,
      }
      const step: Step = {
        type: 'set.children',
        path: [{_key: 'b1'}],
        field: 'children',
        oldChildren: [{_key: 's1', text: 'foobarbaz'}],
        newChildren: [{_key: 'n1', text: 'hello'}],
      }
      expect(mapPointThroughStep(step, point)).toBe(point)
    })

    test('a point in another block is untouched', () => {
      const point = {
        path: [{_key: 'b2'}, 'children', {_key: 's9'}],
        offset: 5,
      }
      const step: Step = {
        type: 'set.children',
        path: [{_key: 'b1'}],
        field: 'children',
        oldChildren: [{_key: 's1', text: 'foobarbaz'}],
        newChildren: [{_key: 'n1', text: 'foobarbaz'}],
      }
      expect(mapPointThroughStep(step, point)).toBe(point)
    })

    test('a point in another array field of the same node is untouched', () => {
      const point = {
        path: [{_key: 'callout1'}, 'footnotes', {_key: 'f1'}],
        offset: 2,
      }
      const step: Step = {
        type: 'set.children',
        path: [{_key: 'callout1'}],
        field: 'children',
        oldChildren: [{_key: 's1', text: 'foo'}],
        newChildren: [{_key: 'n1', text: 'foo'}],
      }
      expect(mapPointThroughStep(step, point)).toBe(point)
    })

    test('container blocks in a field named `children` are not offset-mapped', () => {
      const point = {
        path: [{_key: 'callout1'}, 'children', {_key: 'block1'}],
        offset: 0,
      }
      const step: Step = {
        type: 'set.children',
        path: [{_key: 'callout1'}],
        field: 'children',
        oldChildren: [{_key: 'block1'}],
        newChildren: [{_key: 'newBlock1'}],
      }
      expect(mapPointThroughStep(step, point)).toBe(point)
    })

    test('a point deeper inside replaced container blocks is untouched', () => {
      const point = {
        path: [
          {_key: 'callout1'},
          'children',
          {_key: 'block1'},
          'children',
          {_key: 's1'},
        ],
        offset: 2,
      }
      const step: Step = {
        type: 'set.children',
        path: [{_key: 'callout1'}],
        field: 'children',
        oldChildren: [{_key: 'block1'}],
        newChildren: [{_key: 'newBlock1'}],
      }
      expect(mapPointThroughStep(step, point)).toBe(point)
    })

    test('remaps span points of a text block nested in a container', () => {
      const point = {
        path: [
          {_key: 'table1'},
          'rows',
          {_key: 'row1'},
          'cells',
          {_key: 'cell1'},
          'content',
          {_key: 'block1'},
          'children',
          {_key: 's1'},
        ],
        offset: 5,
      }
      const nodePath = [
        {_key: 'table1'},
        'rows',
        {_key: 'row1'},
        'cells',
        {_key: 'cell1'},
        'content',
        {_key: 'block1'},
      ]
      const step: Step = {
        type: 'set.children',
        path: nodePath,
        field: 'children',
        oldChildren: [{_key: 's1', text: 'foobarbaz'}],
        newChildren: [
          {_key: 'n1', text: 'foo'},
          {_key: 'n2', text: 'bar'},
          {_key: 'n3', text: 'baz'},
        ],
      }
      expect(mapPointThroughStep(step, point)).toEqual({
        path: [...nodePath, 'children', {_key: 'n2'}],
        offset: 2,
      })
    })

    test('a raw block-offset point is never offset-mapped', () => {
      const point = {
        path: [{_key: 'b1'}],
        offset: 5,
      }
      const step: Step = {
        type: 'set.children',
        path: [{_key: 'b1'}],
        field: 'children',
        oldChildren: [{_key: 's1', text: 'foobarbaz'}],
        newChildren: [{_key: 'n1', text: 'foobarbaz'}],
      }
      expect(mapPointThroughStep(step, point)).toBe(point)
    })
  })

  describe('nested paths', () => {
    test('insert.text shifts the offset of a container-depth point', () => {
      const point = {
        path: [
          {_key: 'container1'},
          'rows',
          {_key: 'row1'},
          'cells',
          {_key: 'cell1'},
          'children',
          {_key: 'block1'},
          'children',
          {_key: 'span1'},
        ],
        offset: 5,
      }
      const step: Step = {
        type: 'insert.text',
        path: [
          {_key: 'container1'},
          'rows',
          {_key: 'row1'},
          'cells',
          {_key: 'cell1'},
          'children',
          {_key: 'block1'},
          'children',
          {_key: 'span1'},
        ],
        offset: 3,
        length: 3,
      }
      expect(mapPointThroughStep(step, point)).toEqual({
        path: [
          {_key: 'container1'},
          'rows',
          {_key: 'row1'},
          'cells',
          {_key: 'cell1'},
          'children',
          {_key: 'block1'},
          'children',
          {_key: 'span1'},
        ],
        offset: 8,
      })
    })

    test('insert.text at a different container-depth path is a no-op', () => {
      const point = {
        path: [
          {_key: 'container1'},
          'rows',
          {_key: 'row1'},
          'cells',
          {_key: 'cell1'},
          'children',
          {_key: 'block1'},
          'children',
          {_key: 'span1'},
        ],
        offset: 5,
      }
      const step: Step = {
        type: 'insert.text',
        path: [
          {_key: 'container1'},
          'rows',
          {_key: 'row1'},
          'cells',
          {_key: 'cell1'},
          'children',
          {_key: 'block1'},
          'children',
          {_key: 'span2'},
        ],
        offset: 0,
        length: 3,
      }
      expect(mapPointThroughStep(step, point)).toBe(point)
    })

    test('remove.text collapses a container-depth point to the removal start', () => {
      const point = {
        path: [
          {_key: 'container1'},
          'rows',
          {_key: 'row1'},
          'cells',
          {_key: 'cell1'},
          'children',
          {_key: 'block1'},
          'children',
          {_key: 'span1'},
        ],
        offset: 3,
      }
      const step: Step = {
        type: 'remove.text',
        path: [
          {_key: 'container1'},
          'rows',
          {_key: 'row1'},
          'cells',
          {_key: 'cell1'},
          'children',
          {_key: 'block1'},
          'children',
          {_key: 'span1'},
        ],
        offset: 1,
        length: 6,
      }
      expect(mapPointThroughStep(step, point)).toEqual({
        path: [
          {_key: 'container1'},
          'rows',
          {_key: 'row1'},
          'cells',
          {_key: 'cell1'},
          'children',
          {_key: 'block1'},
          'children',
          {_key: 'span1'},
        ],
        offset: 1,
      })
    })

    test('remove.node of the container root nullifies a point nested inside it', () => {
      const point = {
        path: [
          {_key: 'container1'},
          'rows',
          {_key: 'row1'},
          'cells',
          {_key: 'cell1'},
          'children',
          {_key: 'block1'},
          'children',
          {_key: 'span1'},
        ],
        offset: 5,
      }
      const step: Step = {
        type: 'remove.node',
        path: [{_key: 'container1'}],
      }
      expect(mapPointThroughStep(step, point)).toEqual(null)
    })

    test('set.key rewrites a middle segment of a container-depth path', () => {
      const point = {
        path: [
          {_key: 'container1'},
          'rows',
          {_key: 'row1'},
          'cells',
          {_key: 'cell1'},
          'children',
          {_key: 'block1'},
          'children',
          {_key: 'span1'},
        ],
        offset: 3,
      }
      const step: Step = {
        type: 'set.key',
        path: [
          {_key: 'container1'},
          'rows',
          {_key: 'row1'},
          'cells',
          {_key: 'cell1'},
        ],
        newKey: 'cell2',
      }
      expect(mapPointThroughStep(step, point)).toEqual({
        path: [
          {_key: 'container1'},
          'rows',
          {_key: 'row1'},
          'cells',
          {_key: 'cell2'},
          'children',
          {_key: 'block1'},
          'children',
          {_key: 'span1'},
        ],
        offset: 3,
      })
    })

    test('set.children on a container-depth array leaves a non-direct-child point untouched', () => {
      const point = {
        path: [
          {_key: 'container1'},
          'rows',
          {_key: 'row1'},
          'cells',
          {_key: 'cell1'},
          'children',
          {_key: 'block1'},
          'children',
          {_key: 'span1'},
        ],
        offset: 2,
      }
      const step: Step = {
        type: 'set.children',
        path: [
          {_key: 'container1'},
          'rows',
          {_key: 'row1'},
          'cells',
          {_key: 'cell1'},
        ],
        field: 'children',
        oldChildren: [{_key: 'block1', text: 'foo'}],
        newChildren: [{_key: 'newBlock1', text: 'foo'}],
      }
      expect(mapPointThroughStep(step, point)).toBe(point)
    })
  })
})

describe(mapPoint.name, () => {
  test('folds a batch of steps over the point in order', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 5,
    }
    const steps: Step[] = [
      {
        type: 'insert.text',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
        length: 3,
      },
      {
        type: 'set.key',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        newKey: 's2',
      },
    ]
    expect(mapPoint(steps, point)).toEqual({
      path: [{_key: 'b1'}, 'children', {_key: 's2'}],
      offset: 8,
    })
  })

  test('short-circuits once a step invalidates the point', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 5,
    }
    const steps: Step[] = [
      {type: 'remove.node', path: [{_key: 'b1'}, 'children', {_key: 's1'}]},
      {
        type: 'set.key',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        newKey: 's2',
      },
    ]
    expect(mapPoint(steps, point)).toEqual(null)
  })

  test('an empty batch leaves the point untransformed', () => {
    const point = {
      path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      offset: 5,
    }
    expect(mapPoint([], point)).toBe(point)
  })

  test('a null point stays null through a batch', () => {
    const steps: Step[] = [
      {
        type: 'set.key',
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        newKey: 's2',
      },
    ]
    expect(mapPoint(steps, null)).toEqual(null)
  })
})
