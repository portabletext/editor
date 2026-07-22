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

  test('relocates inserts that carry trailing EQUAL context past local growth', () => {
    // Live harness patches often look like insert-at-prefix with trailing
    // context (`A: ` + deadline + `exclusiv`), not a pure end-append.
    const current = 'A: exclusive article re'
    const peerInsert = dmp(
      'A: exclusive article re',
      'A: deadlineexclusive article re',
    )

    expect(describePrefixInsertDmp(peerInsert)).toMatchObject({
      prefix: 'A: ',
      inserted: 'deadline',
      trailingEqual: 'exclusiv',
    })
    expect(resolveRemoteSpanTextDmp(current, peerInsert)).toEqual(
      'A: exclusive article re deadline',
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
    // Trailing space on the insert means naive mid-prefix apply still keeps
    // whole words (`deadline exclusive`), so leave the library result alone.
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
})

describe(describePrefixInsertDmp.name, () => {
  test('describes a pure end-append', () => {
    expect(describePrefixInsertDmp(dmp('A: ', 'A: deadline'))).toEqual({
      prefix: 'A: ',
      inserted: 'deadline',
      trailingEqual: '',
    })
  })

  test('describes an insert with trailing EQUAL context', () => {
    expect(
      describePrefixInsertDmp(dmp('A: exclusive', 'A: deadlineexclusive')),
    ).toEqual({
      prefix: 'A: ',
      inserted: 'deadline',
      trailingEqual: 'exclusiv',
    })
  })

  test('rejects deletes', () => {
    expect(describePrefixInsertDmp(dmp('Hello there', 'Hello'))).toBeNull()
  })
})
