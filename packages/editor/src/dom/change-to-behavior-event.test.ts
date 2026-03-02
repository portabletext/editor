import {describe, expect, test} from 'vitest'
import {portableTextChangeToBehaviorEvent} from './change-to-behavior-event'

describe('portableTextChangeToBehaviorEvent', () => {
  describe('text.insert', () => {
    test('maps to insert.text event with selectionBefore', () => {
      const result = portableTextChangeToBehaviorEvent({
        type: 'text.insert',
        blockKey: 'b1',
        spanKey: 's1',
        offset: 5,
        text: 'Hello',
      })

      expect(result).toEqual({
        events: [{type: 'insert.text', text: 'Hello'}],
        selectionBefore: {
          blockKey: 'b1',
          offset: 5,
        },
      })
    })

    test('uses block-global offset for selectionBefore', () => {
      // offset here is block-global (e.g. offset 12 in a multi-span block)
      const result = portableTextChangeToBehaviorEvent({
        type: 'text.insert',
        blockKey: 'b1',
        spanKey: 's2',
        offset: 12,
        text: 'x',
      })

      expect(result.selectionBefore).toEqual({
        blockKey: 'b1',
        offset: 12,
      })
    })
  })

  describe('text.delete', () => {
    test('single-span: maps to delete event with block-level paths', () => {
      // Deleting "llo" from "Hello" (from=2, to=5) in a single span
      const result = portableTextChangeToBehaviorEvent({
        type: 'text.delete',
        blockKey: 'b1',
        spanKey: 's1',
        from: 2,
        to: 5,
      })

      expect(result.events).toEqual([
        {
          type: 'delete',
          direction: 'backward',
          at: {
            anchor: {
              path: [{_key: 'b1'}],
              offset: 2,
            },
            focus: {
              path: [{_key: 'b1'}],
              offset: 5,
            },
          },
        },
      ])
    })

    test('single-span: selectionBefore uses change.to for backward deletion', () => {
      const result = portableTextChangeToBehaviorEvent(
        {
          type: 'text.delete',
          blockKey: 'b1',
          spanKey: 's1',
          from: 2,
          to: 5,
        },
        // cursorOffset=5 means cursor is at the end of the deleted range → backward
        5,
      )

      expect(result.selectionBefore).toEqual({
        blockKey: 'b1',
        offset: 5,
      })
    })

    test('single-span: selectionBefore uses change.from for forward deletion', () => {
      const result = portableTextChangeToBehaviorEvent(
        {
          type: 'text.delete',
          blockKey: 'b1',
          spanKey: 's1',
          from: 2,
          to: 5,
        },
        // cursorOffset=2 means cursor is at the start of the deleted range → forward
        2,
      )

      expect(result.selectionBefore).toEqual({
        blockKey: 'b1',
        offset: 2,
      })
    })

    test('multi-span: uses block-level paths so offsets crossing span boundaries work', () => {
      // Block: ["Hello " (s1, len=6), "beautiful " (s2, len=10), "world" (s3, len=5)]
      // Deleting "lo beautiful wo" → from=3, to=19, spanKey=s1
      //
      // BUG (before fix): paths pointed to s1 with offsets 3 and 19,
      // but s1 only has length 6. toSlateRange would clamp offset 19 to 6,
      // only deleting "lo " instead of the full cross-span range.
      //
      // FIX: paths use block-level [{_key: 'b1'}] so toSlateRange calls
      // blockOffsetToSpanSelectionPoint to resolve the correct spans.
      const result = portableTextChangeToBehaviorEvent({
        type: 'text.delete',
        blockKey: 'b1',
        spanKey: 's1',
        from: 3,
        to: 19,
      })

      expect(result.events).toEqual([
        {
          type: 'delete',
          direction: 'backward',
          at: {
            anchor: {
              path: [{_key: 'b1'}],
              offset: 3,
            },
            focus: {
              path: [{_key: 'b1'}],
              offset: 19,
            },
          },
        },
      ])
    })

    test('infers backward deletion when cursorOffset is undefined', () => {
      const result = portableTextChangeToBehaviorEvent({
        type: 'text.delete',
        blockKey: 'b1',
        spanKey: 's1',
        from: 3,
        to: 5,
      })

      expect(result.events[0]).toMatchObject({
        type: 'delete',
        direction: 'backward',
      })
    })

    test('infers forward deletion when cursorOffset <= from', () => {
      const result = portableTextChangeToBehaviorEvent(
        {
          type: 'text.delete',
          blockKey: 'b1',
          spanKey: 's1',
          from: 3,
          to: 5,
        },
        3,
      )

      expect(result.events[0]).toMatchObject({
        type: 'delete',
        direction: 'forward',
      })
    })

    test('infers backward deletion when cursorOffset > from', () => {
      const result = portableTextChangeToBehaviorEvent(
        {
          type: 'text.delete',
          blockKey: 'b1',
          spanKey: 's1',
          from: 3,
          to: 5,
        },
        5,
      )

      expect(result.events[0]).toMatchObject({
        type: 'delete',
        direction: 'backward',
      })
    })
  })

  describe('text.replace', () => {
    test('single-span: maps to delete + insert.text events with block-level paths', () => {
      // Replacing "world" (from=6, to=11) with "universe" in a single span
      const result = portableTextChangeToBehaviorEvent({
        type: 'text.replace',
        blockKey: 'b1',
        spanKey: 's1',
        from: 6,
        to: 11,
        text: 'universe',
      })

      expect(result.events).toEqual([
        {
          type: 'delete',
          direction: 'backward',
          at: {
            anchor: {
              path: [{_key: 'b1'}],
              offset: 6,
            },
            focus: {
              path: [{_key: 'b1'}],
              offset: 11,
            },
          },
        },
        {
          type: 'insert.text',
          text: 'universe',
        },
      ])
    })

    test('single-span: selectionBefore uses change.to', () => {
      const result = portableTextChangeToBehaviorEvent({
        type: 'text.replace',
        blockKey: 'b1',
        spanKey: 's1',
        from: 6,
        to: 11,
        text: 'universe',
      })

      expect(result.selectionBefore).toEqual({
        blockKey: 'b1',
        offset: 11,
      })
    })

    test('multi-span: uses block-level paths so offsets crossing span boundaries work', () => {
      // Block: ["Hello " (s1, len=6), "beautiful " (s2, len=10), "world" (s3, len=5)]
      // Replacing "beautiful world" (from=6, to=21) with "earth"
      //
      // BUG (before fix): paths pointed to s2 with offsets 6 and 21,
      // but s2 only has length 10. toSlateRange would clamp, causing
      // incorrect replacement.
      //
      // FIX: paths use block-level [{_key: 'b1'}] so toSlateRange resolves
      // the correct spans via blockOffsetToSpanSelectionPoint.
      const result = portableTextChangeToBehaviorEvent({
        type: 'text.replace',
        blockKey: 'b1',
        spanKey: 's2',
        from: 6,
        to: 21,
        text: 'earth',
      })

      expect(result.events).toEqual([
        {
          type: 'delete',
          direction: 'backward',
          at: {
            anchor: {
              path: [{_key: 'b1'}],
              offset: 6,
            },
            focus: {
              path: [{_key: 'b1'}],
              offset: 21,
            },
          },
        },
        {
          type: 'insert.text',
          text: 'earth',
        },
      ])
    })
  })
})
