import {isDeepStrictEqual} from 'node:util'
import {describe, expect, test} from 'vitest'
import {
  patchPathRules,
  type PatchPathRule,
} from '../test-utils/patch-path-rules'
import applyPatch from './applyPatch'
import type {Path} from './types'

const knownDifferences = new Set<PatchPathRule['id']>([
  'index--4-inc',
  'index--4-dec',
  'index-3-inc',
  'index-3-dec',
  'index-8-inc',
  'index-8-dec',
  'absent-inc',
  'absent-dec',
  'duplicate-set',
  'duplicate-property-set',
  'duplicate-unset',
  'duplicate-insert-replace',
  'duplicate-inc',
  'duplicate-dec',
  'duplicate-dmp',
  'missing-intermediate-set',
  'missing-intermediate-setIfMissing',
  'missing-intermediate-inc',
  'missing-intermediate-dec',
  'present-null-setIfMissing',
  'present-[]-setIfMissing',
  'present-{}-setIfMissing',
  'primitive-null-deep-set',
  'primitive-null-deep-setIfMissing',
  'primitive-null-deep-inc',
  'primitive-null-deep-dec',
  'primitive-"foo"-deep-set',
  'primitive-"foo"-deep-unset',
  'primitive-"foo"-deep-setIfMissing',
  'primitive-4-deep-set',
  'primitive-4-deep-unset',
  'primitive-4-deep-setIfMissing',
  'primitive-[]-deep-set',
  'primitive-[]-deep-setIfMissing',
  'primitive-[]-deep-inc',
  'primitive-[]-deep-dec',
  'null-0-setIfMissing',
  'null-0-key-set',
  'null-0-key-unset',
  'null-1-setIfMissing',
])

const depths: Array<{
  name: string
  wrap: (array: Array<unknown>) => Array<unknown>
  unwrap: (value: any) => unknown
  prefix: Path
}> = [
  {
    name: 'at the root',
    wrap: (array) => array,
    unwrap: (value) => value,
    prefix: [],
  },
  {
    name: 'inside a container',
    wrap: (array) => [{_key: 'container', _type: 'callout', content: array}],
    unwrap: (value) => value[0].content,
    prefix: [{_key: 'container'}, 'content'],
  },
  {
    name: 'inside a container inside a container',
    wrap: (array) => [
      {
        _key: 'outer',
        _type: 'callout',
        content: [{_key: 'inner', _type: 'callout', content: array}],
      },
    ],
    unwrap: (value) => value[0].content[0].content,
    prefix: [{_key: 'outer'}, 'content', {_key: 'inner'}, 'content'],
  },
  {
    name: 'inside a field of a block object',
    wrap: (array) => [{_key: 'note', _type: 'note', body: array}],
    unwrap: (value) => value[0].body,
    prefix: [{_key: 'note'}, 'body'],
  },
]

describe('patch path rules measured against Sanity', () => {
  describe.each(depths)('$name', ({wrap, unwrap, prefix}) => {
    for (const row of patchPathRules) {
      const name = `${row.rule}: ${describePatch(row)} ${describeOutcome(row)} (${row.id})`
      const run = knownDifferences.has(row.id) ? test.fails : test

      run(name, () => {
        const value = wrap(structuredClone(row.start))
        const patch = {...row.patch, path: [...prefix, ...row.patch.path]}

        if ('rejected' in row.sanity) {
          expect(() => applyPatch(value, patch)).toThrow()
        } else if (row.defect) {
          expect(unwrap(applyPatch(value, patch))).not.toEqual(
            row.sanity.result,
          )
        } else {
          expect(unwrap(applyPatch(value, patch))).toEqual(row.sanity.result)
        }
      })
    }
  })
})

function describePatch(row: PatchPathRule) {
  const path = JSON.stringify(row.patch.path)

  if (row.patch.type === 'insert') {
    return `insert ${row.patch.position} ${row.patch.items.length} at ${path}`
  }

  return `${row.patch.type} at ${path}`
}

function describeOutcome(row: PatchPathRule) {
  if ('rejected' in row.sanity) {
    return 'is rejected'
  }

  if (row.defect) {
    return 'does not copy a Sanity defect'
  }

  return isDeepStrictEqual(row.sanity.result, row.start)
    ? 'leaves the array unchanged'
    : 'changes the array as Sanity does'
}
