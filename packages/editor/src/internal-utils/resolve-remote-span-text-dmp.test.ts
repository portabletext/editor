import {
  applyPatches,
  makeDiff,
  makePatches,
  parsePatch,
  stringifyPatches,
} from '@sanity/diff-match-patch'
import {describe, expect, test} from 'vitest'
import {
  describePrefixInsertDmp,
  describePureAppendDmp,
  resolveRemoteSpanTextDmp,
} from './resolve-remote-span-text-dmp'

function dmp(from: string, to: string): string {
  return stringifyPatches(makePatches(makeDiff(from, to)))
}

describe(resolveRemoteSpanTextDmp.name, () => {
  test('applies a normal append when the editor matches the patch base', () => {
    expect(resolveRemoteSpanTextDmp('A: ', dmp('A: ', 'A: deadline'))).toEqual(
      'A: deadline',
    )
  })

  test('relocates a concurrent End append that would splice mid-word', () => {
    const current = 'A: exclusive article re'
    const peerAppend = dmp('A: ', 'A: deadline')

    expect(resolveRemoteSpanTextDmp(current, peerAppend)).toEqual(
      'A: exclusive article re deadline',
    )
    expect(resolveRemoteSpanTextDmp(current, peerAppend)).not.toEqual(
      'A: deadlineexclusive article re',
    )
  })

  test('does not relocate inserts that carry trailing EQUAL context', () => {
    // Trailing EQUAL means an intentional mid-document insert (for example
    // typing at the start). Relocating those breaks collaboration undo.
    const current = 'A: exclusive article re'
    const peerInsert = dmp(
      'A: exclusive article re',
      'A: deadlineexclusive article re',
    )

    expect(
      describePrefixInsertDmp(peerInsert)?.trailingEqual.length,
    ).toBeGreaterThan(0)
    expect(resolveRemoteSpanTextDmp(current, peerInsert)).toEqual(
      'A: deadlineexclusive article re',
    )
  })

  test('keeps a mid-prefix insert when the editor is still on the patch base', () => {
    const current = 'A: exclusive art'
    const peerInsert = dmp('A: exclusive art', 'A: deadline exclusive art')

    expect(resolveRemoteSpanTextDmp(current, peerInsert)).toEqual(
      'A: deadline exclusive art',
    )
  })

  test('keeps a spaced concurrent insert readable without relocating', () => {
    const current = 'A: exclusive article re'
    const peerAppend = dmp('A: ', 'A: deadline ')

    expect(resolveRemoteSpanTextDmp(current, peerAppend)).toEqual(
      'A: deadline exclusive article re',
    )
  })

  test('leaves non-append diffs alone', () => {
    const current = 'Hello there'
    const removal = dmp('Hello there', 'Hello')

    expect(resolveRemoteSpanTextDmp(current, removal)).toEqual('Hello')
  })

  test('falls through to library apply when current text does not start with the patch prefix', () => {
    const current = 'B: exclusive'
    const peerAppend = dmp('A: ', 'A: deadline')
    const [naive] = applyPatches(parsePatch(peerAppend), current, {
      allowExceedingIndices: true,
    })

    expect(resolveRemoteSpanTextDmp(current, peerAppend)).toEqual(naive)
  })

  test('does not relocate empty-prefix inserts at the start of existing text', () => {
    const current = 'First paragraph\n\nSecond paragraph!?'
    const peerStart = dmp('', 'W')
    const [naive] = applyPatches(parsePatch(peerStart), current, {
      allowExceedingIndices: true,
    })

    expect(describePureAppendDmp(peerStart)).toEqual({
      from: '',
      inserted: 'W',
    })
    expect(resolveRemoteSpanTextDmp(current, peerStart)).toEqual(naive)
    expect(resolveRemoteSpanTextDmp(current, peerStart)).toEqual(`W${current}`)
  })
})

describe(describePureAppendDmp.name, () => {
  test('describes a pure end-append', () => {
    expect(describePureAppendDmp(dmp('A: ', 'A: deadline'))).toEqual({
      from: 'A: ',
      inserted: 'deadline',
    })
  })

  test('rejects inserts with trailing EQUAL context', () => {
    expect(
      describePureAppendDmp(dmp('A: exclusive', 'A: deadlineexclusive')),
    ).toBeNull()
  })

  test('rejects deletes', () => {
    expect(describePureAppendDmp(dmp('Hello there', 'Hello'))).toBeNull()
  })
})

describe(describePrefixInsertDmp.name, () => {
  test('describes an insert with trailing EQUAL context', () => {
    expect(
      describePrefixInsertDmp(dmp('A: exclusive', 'A: deadlineexclusive')),
    ).toEqual({
      prefix: 'A: ',
      inserted: 'deadline',
      trailingEqual: 'exclusiv',
    })
  })
})
