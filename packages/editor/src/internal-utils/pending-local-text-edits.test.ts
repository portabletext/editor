import {describe, expect, test} from 'vitest'
import {
  deletePendingLocalTextEditsInPath,
  getPendingLocalTextEditsKey,
  PENDING_LOCAL_TEXT_EDIT_MAX_AGE_MS,
  pruneStaleLocalTextEdits,
  type PendingLocalTextEdit,
} from './pending-local-text-edits'

const spanPath = [
  {_key: 'block'},
  'children',
  {_key: 'span'},
] satisfies PendingLocalTextEdit['path']

describe('pending local text edits', () => {
  test('prunes entries only after their maximum age', () => {
    const edits = new Map<string, PendingLocalTextEdit>([
      [
        getPendingLocalTextEditsKey(spanPath),
        {path: spanPath, baseText: 'base', lastEditTime: 100},
      ],
    ])

    pruneStaleLocalTextEdits(edits, 100 + PENDING_LOCAL_TEXT_EDIT_MAX_AGE_MS)
    expect(edits.size).toBe(1)

    pruneStaleLocalTextEdits(edits, 101 + PENDING_LOCAL_TEXT_EDIT_MAX_AGE_MS)
    expect(edits.size).toBe(0)
  })

  test('deletes entries under a replaced ancestor', () => {
    const edits = createEdits()

    deletePendingLocalTextEditsInPath(edits, [{_key: 'block'}, 'children'])

    expect(edits.size).toBe(0)
  })

  test('deletes an entry when its span is replaced', () => {
    const edits = createEdits()

    deletePendingLocalTextEditsInPath(edits, spanPath)

    expect(edits.size).toBe(0)
  })

  test('keeps entries for unrelated paths', () => {
    const edits = createEdits()

    deletePendingLocalTextEditsInPath(edits, [
      {_key: 'block'},
      'children',
      {_key: 'other-span'},
    ])

    expect(edits.size).toBe(1)
  })
})

function createEdits(): Map<string, PendingLocalTextEdit> {
  return new Map([
    [
      getPendingLocalTextEditsKey(spanPath),
      {path: spanPath, baseText: 'base', lastEditTime: 100},
    ],
  ])
}
