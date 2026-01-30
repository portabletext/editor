/**
 * Test demonstrating the bug: "Attempt to apply insert patch to non-array value"
 *
 * Root cause: When a PTE field is `null` (not `undefined` or `[]`):
 * 1. `setIfMissing` doesn't treat `null` as "missing" - it only checks for `undefined`
 * 2. The subsequent `insert` patch then fails because it's applied to `null`
 *
 * This test reproduces the exact patch sequence that PTE generates when inserting
 * a block into an empty editor, and shows it fails when the field is `null`.
 *
 * Related: Linear CRX-1886
 */

import {describe, expect, test} from 'vitest'
import applyPatch, {applyAll} from './applyPatch'

describe('null field bug (CRX-1886)', () => {
  const block = {
    _type: 'block',
    _key: 'abc123',
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: 's1', text: 'Hello', marks: []}],
  }

  describe('setIfMissing behavior', () => {
    test('setIfMissing works on undefined', () => {
      // This is the expected behavior - setIfMissing should set the value
      const result = applyPatch(undefined, {
        type: 'setIfMissing',
        path: [],
        value: [],
      })
      expect(result).toEqual([])
    })

    test('setIfMissing does NOT work on null (BUG)', () => {
      // This is the bug - setIfMissing treats `null` as "present"
      // and returns `null` unchanged instead of setting the value
      const result = applyPatch(null, {
        type: 'setIfMissing',
        path: [],
        value: [],
      })

      // Current (buggy) behavior: returns null unchanged
      expect(result).toBe(null)

      // Expected (correct) behavior would be:
      // expect(result).toEqual([])
    })
  })

  describe('insert into null field', () => {
    test('insert into empty array works', () => {
      const result = applyPatch([], {
        type: 'insert',
        path: [0],
        position: 'before',
        items: [block],
      })
      expect(result).toEqual([block])
    })

    test('insert into null throws error (BUG consequence)', () => {
      // This is the error users see: trying to insert into null
      expect(() => {
        applyPatch(null, {
          type: 'insert',
          path: [0],
          position: 'before',
          items: [block],
        })
      }).toThrow()
    })
  })

  describe('setIfMissing + insert sequence (full bug reproduction)', () => {
    /**
     * This is the exact patch sequence PTE generates when inserting a block
     * into an empty editor (beforeValue = []):
     *
     * From operation-to-patches.ts lines 187-194:
     *   return [
     *     setIfMissing(beforeValue, []),  // setIfMissing([], [])
     *     insert([block], 'before', [0]),
     *   ]
     */

    test('sequence works when field is empty array', () => {
      const patches = [
        {type: 'setIfMissing' as const, path: [], value: []},
        {
          type: 'insert' as const,
          path: [0],
          position: 'before' as const,
          items: [block],
        },
      ]

      const result = applyAll([], patches)
      expect(result).toEqual([block])
    })

    test('sequence works when field is undefined', () => {
      const patches = [
        {type: 'setIfMissing' as const, path: [], value: []},
        {
          type: 'insert' as const,
          path: [0],
          position: 'before' as const,
          items: [block],
        },
      ]

      const result = applyAll(undefined, patches)
      expect(result).toEqual([block])
    })

    test('sequence FAILS when field is null (BUG)', () => {
      /**
       * This is the bug that users experience!
       *
       * When the field is `null`:
       * 1. setIfMissing sees `null` as "present" (not undefined)
       * 2. Returns `null` unchanged
       * 3. insert tries to insert into `null`
       * 4. BOOM - "Cannot apply deep operations on primitive values"
       */
      const patches = [
        {type: 'setIfMissing' as const, path: [], value: []},
        {
          type: 'insert' as const,
          path: [0],
          position: 'before' as const,
          items: [block],
        },
      ]

      // This throws the error users see
      expect(() => applyAll(null, patches)).toThrow(
        'Cannot apply deep operations on primitive values',
      )
    })
  })

  describe('proposed fix: atomic set', () => {
    /**
     * The proposed fix is to use an atomic `set` patch instead of
     * `setIfMissing + insert` when inserting into an empty editor.
     *
     * This works regardless of whether the field is `null`, `undefined`, or `[]`.
     */

    test('set works on null field', () => {
      const result = applyPatch(null, {
        type: 'set',
        path: [],
        value: [block],
      })
      expect(result).toEqual([block])
    })

    test('set works on undefined field', () => {
      const result = applyPatch(undefined, {
        type: 'set',
        path: [],
        value: [block],
      })
      expect(result).toEqual([block])
    })

    test('set works on empty array field', () => {
      const result = applyPatch([], {
        type: 'set',
        path: [],
        value: [block],
      })
      expect(result).toEqual([block])
    })
  })
})
