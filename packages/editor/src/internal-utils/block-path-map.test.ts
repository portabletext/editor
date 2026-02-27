import {describe, expect, test} from 'vitest'
import {InternalBlockPathMap} from './block-path-map'

function block(_key: string) {
  return {_key, _type: 'block', children: []}
}

describe(InternalBlockPathMap.name, () => {
  describe('rebuild', () => {
    test('empty value', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([])
      expect(map.size).toBe(0)
    })

    test('single block', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([block('a')])
      expect(map.get('a')).toEqual([0])
      expect(map.size).toBe(1)
    })

    test('multiple blocks', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([block('a'), block('b'), block('c')])
      expect(map.get('a')).toEqual([0])
      expect(map.get('b')).toEqual([1])
      expect(map.get('c')).toEqual([2])
      expect(map.size).toBe(3)
    })

    test('rebuild clears previous state', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([block('a'), block('b')])
      expect(map.size).toBe(2)

      map.rebuild([block('x')])
      expect(map.size).toBe(1)
      expect(map.has('a')).toBe(false)
      expect(map.get('x')).toEqual([0])
    })
  })

  describe('has', () => {
    test('returns true for existing key', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([block('a')])
      expect(map.has('a')).toBe(true)
    })

    test('returns false for missing key', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([block('a')])
      expect(map.has('z')).toBe(false)
    })
  })

  describe('entries', () => {
    test('iterates all entries', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([block('a'), block('b')])
      const entries = Array.from(map.entries())
      expect(entries).toEqual([
        ['a', [0]],
        ['b', [1]],
      ])
    })
  })

  describe('onInsertNode', () => {
    test('insert at beginning shifts all siblings', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([block('a'), block('b')])
      // Insert 'x' at [0]
      map.onInsertNode([0], 'x')
      expect(map.get('x')).toEqual([0])
      expect(map.get('a')).toEqual([1])
      expect(map.get('b')).toEqual([2])
    })

    test('insert at middle shifts later siblings', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([block('a'), block('b'), block('c')])
      // Insert 'x' at [1]
      map.onInsertNode([1], 'x')
      expect(map.get('a')).toEqual([0])
      expect(map.get('x')).toEqual([1])
      expect(map.get('b')).toEqual([2])
      expect(map.get('c')).toEqual([3])
    })

    test('insert at end does not shift existing', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([block('a'), block('b')])
      // Insert 'x' at [2]
      map.onInsertNode([2], 'x')
      expect(map.get('a')).toEqual([0])
      expect(map.get('b')).toEqual([1])
      expect(map.get('x')).toEqual([2])
    })

    test('insert shifts descendants of shifted blocks', () => {
      const map = new InternalBlockPathMap()
      // Simulate a container structure:
      // [0] = block 'a'
      // [1] = container 'c' with child [1, 0, 0] = 'c1'
      // [2] = block 'b'
      map.rebuild([block('a')])
      // Manually add nested entries to simulate container children
      map.onInsertNode([1], 'c')
      map.onInsertNode([1, 0, 0], 'c1')
      map.onInsertNode([2], 'b')

      expect(map.get('a')).toEqual([0])
      expect(map.get('c')).toEqual([1])
      expect(map.get('c1')).toEqual([1, 0, 0])
      expect(map.get('b')).toEqual([2])

      // Now insert 'x' at [0] — everything shifts
      map.onInsertNode([0], 'x')
      expect(map.get('x')).toEqual([0])
      expect(map.get('a')).toEqual([1])
      expect(map.get('c')).toEqual([2])
      expect(map.get('c1')).toEqual([2, 0, 0])
      expect(map.get('b')).toEqual([3])
    })
  })

  describe('onRemoveNode', () => {
    test('remove at beginning shifts all siblings back', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([block('a'), block('b'), block('c')])
      map.onRemoveNode([0])
      expect(map.has('a')).toBe(false)
      expect(map.get('b')).toEqual([0])
      expect(map.get('c')).toEqual([1])
      expect(map.size).toBe(2)
    })

    test('remove at middle shifts later siblings back', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([block('a'), block('b'), block('c')])
      map.onRemoveNode([1])
      expect(map.get('a')).toEqual([0])
      expect(map.has('b')).toBe(false)
      expect(map.get('c')).toEqual([1])
      expect(map.size).toBe(2)
    })

    test('remove at end does not shift existing', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([block('a'), block('b'), block('c')])
      map.onRemoveNode([2])
      expect(map.get('a')).toEqual([0])
      expect(map.get('b')).toEqual([1])
      expect(map.has('c')).toBe(false)
      expect(map.size).toBe(2)
    })

    test('remove also removes descendants', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([block('a')])
      // Add container with children
      map.onInsertNode([1], 'container')
      map.onInsertNode([1, 0, 0], 'child1')
      map.onInsertNode([1, 0, 1], 'child2')
      map.onInsertNode([2], 'b')

      expect(map.size).toBe(5)

      // Remove the container at [1] — should also remove child1 and child2
      map.onRemoveNode([1])
      expect(map.has('container')).toBe(false)
      expect(map.has('child1')).toBe(false)
      expect(map.has('child2')).toBe(false)
      expect(map.get('a')).toEqual([0])
      expect(map.get('b')).toEqual([1])
      expect(map.size).toBe(2)
    })

    test('remove shifts descendants of shifted blocks', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([block('a')])
      map.onInsertNode([1], 'b')
      map.onInsertNode([2], 'container')
      map.onInsertNode([2, 0, 0], 'child')

      // Remove 'a' at [0] — 'b' shifts to [0], 'container' to [1], 'child' to [1, 0, 0]
      map.onRemoveNode([0])
      expect(map.get('b')).toEqual([0])
      expect(map.get('container')).toEqual([1])
      expect(map.get('child')).toEqual([1, 0, 0])
    })
  })

  describe('onSplitNode', () => {
    test('split creates new entry and shifts siblings after', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([block('a'), block('b'), block('c')])
      // Split 'a' at [0] — new block 'a2' at [1], 'b' shifts to [2], 'c' to [3]
      map.onSplitNode([0], 'a2')
      expect(map.get('a')).toEqual([0])
      expect(map.get('a2')).toEqual([1])
      expect(map.get('b')).toEqual([2])
      expect(map.get('c')).toEqual([3])
      expect(map.size).toBe(4)
    })

    test('split at last block', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([block('a'), block('b')])
      map.onSplitNode([1], 'b2')
      expect(map.get('a')).toEqual([0])
      expect(map.get('b')).toEqual([1])
      expect(map.get('b2')).toEqual([2])
      expect(map.size).toBe(3)
    })

    test('split shifts descendants of shifted blocks', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([block('a')])
      map.onInsertNode([1], 'container')
      map.onInsertNode([1, 0, 0], 'child')

      // Split 'a' at [0] — container shifts to [2], child to [2, 0, 0]
      map.onSplitNode([0], 'a2')
      expect(map.get('a')).toEqual([0])
      expect(map.get('a2')).toEqual([1])
      expect(map.get('container')).toEqual([2])
      expect(map.get('child')).toEqual([2, 0, 0])
    })
  })

  describe('onMergeNode', () => {
    test('merge removes entry and shifts siblings', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([block('a'), block('b'), block('c')])
      // Merge at [1] — 'b' is removed, 'c' shifts to [1]
      map.onMergeNode([1])
      expect(map.get('a')).toEqual([0])
      expect(map.has('b')).toBe(false)
      expect(map.get('c')).toEqual([1])
      expect(map.size).toBe(2)
    })

    test('merge at last position', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([block('a'), block('b')])
      map.onMergeNode([1])
      expect(map.get('a')).toEqual([0])
      expect(map.has('b')).toBe(false)
      expect(map.size).toBe(1)
    })
  })

  describe('onMoveNode', () => {
    test('move from beginning to end', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([block('a'), block('b'), block('c')])
      // Move [0] to [2] — after removal of [0], 'b' is at [0], 'c' at [1],
      // then insert at [2]
      map.onMoveNode([0], [2])
      expect(map.get('b')).toEqual([0])
      expect(map.get('c')).toEqual([1])
      expect(map.get('a')).toEqual([2])
    })

    test('move from end to beginning', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([block('a'), block('b'), block('c')])
      // Move [2] to [0] — after removal of [2], 'a' at [0], 'b' at [1],
      // then insert at [0] shifts them
      map.onMoveNode([2], [0])
      expect(map.get('c')).toEqual([0])
      expect(map.get('a')).toEqual([1])
      expect(map.get('b')).toEqual([2])
    })

    test('swap adjacent blocks', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([block('a'), block('b'), block('c')])

      // Move b[1] → [0] (swap a and b)
      map.onMoveNode([1], [0])

      expect(map.get('b')).toEqual([0])
      expect(map.get('a')).toEqual([1])
      expect(map.get('c')).toEqual([2])
    })

    test('move to next position', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([block('a'), block('b'), block('c')])

      // Move a[0] → [1]
      map.onMoveNode([0], [1])

      expect(map.get('b')).toEqual([0])
      expect(map.get('a')).toEqual([1])
      expect(map.get('c')).toEqual([2])
    })

    test('move to same position is a no-op', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([block('a'), block('b'), block('c')])
      map.onMoveNode([1], [1])
      expect(map.get('a')).toEqual([0])
      expect(map.get('b')).toEqual([1])
      expect(map.get('c')).toEqual([2])
    })
  })

  describe('nested paths', () => {
    test('insert inside container does not affect top-level siblings', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([block('a')])
      map.onInsertNode([1], 'container')
      map.onInsertNode([2], 'b')

      // Insert a child inside the container at [1, 0, 0]
      map.onInsertNode([1, 0, 0], 'child1')
      expect(map.get('a')).toEqual([0])
      expect(map.get('container')).toEqual([1])
      expect(map.get('child1')).toEqual([1, 0, 0])
      expect(map.get('b')).toEqual([2])
    })

    test('insert inside container shifts nested siblings', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([block('a')])
      map.onInsertNode([1], 'container')
      map.onInsertNode([1, 0, 0], 'child1')
      map.onInsertNode([1, 0, 1], 'child2')

      // Insert 'child0' at [1, 0, 0] — child1 shifts to [1, 0, 1], child2 to [1, 0, 2]
      map.onInsertNode([1, 0, 0], 'child0')
      expect(map.get('child0')).toEqual([1, 0, 0])
      expect(map.get('child1')).toEqual([1, 0, 1])
      expect(map.get('child2')).toEqual([1, 0, 2])
      // Top-level unaffected
      expect(map.get('a')).toEqual([0])
      expect(map.get('container')).toEqual([1])
    })

    test('remove inside container shifts nested siblings', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([block('a')])
      map.onInsertNode([1], 'container')
      map.onInsertNode([1, 0, 0], 'child1')
      map.onInsertNode([1, 0, 1], 'child2')
      map.onInsertNode([1, 0, 2], 'child3')

      // Remove child1 at [1, 0, 0]
      map.onRemoveNode([1, 0, 0])
      expect(map.has('child1')).toBe(false)
      expect(map.get('child2')).toEqual([1, 0, 0])
      expect(map.get('child3')).toEqual([1, 0, 1])
      // Top-level unaffected
      expect(map.get('a')).toEqual([0])
      expect(map.get('container')).toEqual([1])
    })

    test('split inside container', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([block('a')])
      map.onInsertNode([1], 'container')
      map.onInsertNode([1, 0, 0], 'child1')
      map.onInsertNode([1, 0, 1], 'child2')

      // Split child1 at [1, 0, 0]
      map.onSplitNode([1, 0, 0], 'child1b')
      expect(map.get('child1')).toEqual([1, 0, 0])
      expect(map.get('child1b')).toEqual([1, 0, 1])
      expect(map.get('child2')).toEqual([1, 0, 2])
    })

    test('merge inside container', () => {
      const map = new InternalBlockPathMap()
      map.rebuild([block('a')])
      map.onInsertNode([1], 'container')
      map.onInsertNode([1, 0, 0], 'child1')
      map.onInsertNode([1, 0, 1], 'child2')
      map.onInsertNode([1, 0, 2], 'child3')

      // Merge at [1, 0, 1] — child2 removed, child3 shifts to [1, 0, 1]
      map.onMergeNode([1, 0, 1])
      expect(map.get('child1')).toEqual([1, 0, 0])
      expect(map.has('child2')).toBe(false)
      expect(map.get('child3')).toEqual([1, 0, 1])
    })
  })

  describe('performance', () => {
    function buildLargeDocument(blockCount: number) {
      return Array.from({length: blockCount}, (_, i) => block(`block-${i}`))
    }

    test('rebuild 10,000 blocks under 50ms', () => {
      const map = new InternalBlockPathMap()
      const blocks = buildLargeDocument(10_000)

      const start = performance.now()
      map.rebuild(blocks)
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(50)
      expect(map.get('block-0')).toEqual([0])
      expect(map.get('block-9999')).toEqual([9999])
    })

    test('lookup is O(1) — 10,000 lookups under 5ms', () => {
      const map = new InternalBlockPathMap()
      map.rebuild(buildLargeDocument(10_000))

      const start = performance.now()
      for (let i = 0; i < 10_000; i++) {
        map.get(`block-${i}`)
      }
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(5)
    })

    test('single structural op on 10,000-block doc under 10ms', () => {
      const map = new InternalBlockPathMap()
      map.rebuild(buildLargeDocument(10_000))

      // Worst case: insert at beginning, shifts all 10k entries
      const start = performance.now()
      map.onInsertNode([0], 'new-block')
      const elapsed = performance.now() - start

      // Worst case is O(n) where n = map size — shifting all entries.
      // On a 10k-block doc this should still be well under a frame budget.
      expect(elapsed).toBeLessThan(10)
      expect(map.get('new-block')).toEqual([0])
      expect(map.get('block-0')).toEqual([1])
    })

    test('applyOperation with text ops is zero-cost', () => {
      const map = new InternalBlockPathMap()
      map.rebuild(buildLargeDocument(10_000))

      const textOp = {
        type: 'insert_text' as const,
        path: [500, 0],
        offset: 5,
        text: 'hello',
      }

      const start = performance.now()
      for (let i = 0; i < 100_000; i++) {
        map.applyOperation(textOp)
      }
      const elapsed = performance.now() - start

      // 100k text ops should be essentially free — early return
      expect(elapsed).toBeLessThan(50)
    })
  })
})
