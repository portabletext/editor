import {readFileSync} from 'node:fs'
import {describe, expect, test} from 'vitest'
import {interpretChange} from './interpret-change'
import {mapPointThroughStep, mapPoint, type Step} from './step-mapper'

describe(mapPointThroughStep.name, () => {
  test('shifts a descendant through a numeric sibling removal', () => {
    expect(
      mapPoint([{type: 'remove.node', nearest: null, path: ['body', 0]}], {
        path: ['body', 2, 'children', 0],
        offset: 1,
      }),
    ).toEqual({path: ['body', 1, 'children', 0], offset: 1})
  })

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

  describe('remove.node', () => {
    test('invalidates a point at the removed node', () => {
      const point = {
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
        offset: 3,
      }
      const step: Step = {
        type: 'remove.node',
        nearest: null,
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
        nearest: null,
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
        nearest: null,
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

    test('leaves a point at the end of the moved range behind with forward affinity', () => {
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
      expect(mapPointThroughStep(step, point)).toBe(point)
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

    test('maps a point at the end of the moved range with backward affinity', () => {
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
      expect(mapPointThroughStep(step, point, {affinity: 'backward'})).toEqual({
        path: [{_key: 'b2'}, 'children', {_key: 's2'}],
        offset: 7,
      })
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
        nearest: null,
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
      {
        type: 'remove.node',
        nearest: null,
        path: [{_key: 'b1'}, 'children', {_key: 's1'}],
      },
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
    // @ts-expect-error Runtime compatibility for callers passing a removed point.
    expect(mapPoint(steps, null)).toEqual(null)
  })
})

test('removed block caret follows the editor in AB order', () => {
  const fixture = JSON.parse(
    readFileSync(
      new URL('./__fixtures__/nearest/witness-AB.json', import.meta.url),
      'utf8',
    ),
  )
  const steps = interpretChange({value: fixture.before}, fixture.patches)
  expect(mapPoint(steps, fixture.point)).toEqual({
    path: [{_key: 'k2'}, 'children', {_key: 'k3'}],
    offset: 0,
  })
})

test('removed block caret follows the editor in BA order', () => {
  const fixture = JSON.parse(
    readFileSync(
      new URL('./__fixtures__/nearest/witness-BA.json', import.meta.url),
      'utf8',
    ),
  )
  const steps = interpretChange({value: fixture.before}, fixture.patches)
  expect(mapPoint(steps, fixture.point)).toEqual({
    path: [{_key: 'k2'}, 'children', {_key: 'k3'}],
    offset: 3,
  })
})
