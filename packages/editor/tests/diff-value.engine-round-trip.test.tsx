import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema} from '../src'
import {createTestEditor} from '../src/test/vitest'
import {diffValueToPatches} from '../test-utils/diff-value-patches'
import {generateValuePair} from '../test-utils/generate-value-pairs'

describe('diffValue round-trip: engine patches application', () => {
  // Seeds 3, 6, 14, 18, 21, 33, and 38 generate a `fromValue` with
  // adjacent same-mark spans. They were pinned as expected failures while
  // mount-time canonicalization merged that adjacency (forking the
  // engine's base from the diff's base); since cosmetic span normalization
  // became local-edit fallout only, the whole corpus round-trips.
  const seeds = Array.from({length: 40}, (_, index) => index + 1)

  test.each(seeds)('seed %i', async (seed) => {
    await roundTrip(seed)
  })

  async function roundTrip(seed: number) {
    const keyGenerator = createTestKeyGenerator(`seed${seed}-`)
    const {fromValue, toValue} = generateValuePair(seed, keyGenerator)

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(`editor${seed}-`),
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}, {name: 'em'}],
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
        inlineObjects: [
          {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
        ],
        blockObjects: [
          {name: 'image', fields: [{name: 'url', type: 'string'}]},
        ],
        styles: [
          {name: 'normal'},
          {name: 'h1'},
          {name: 'h2'},
          {name: 'blockquote'},
        ],
        lists: [{name: 'bullet'}],
      }),
      initialValue: fromValue,
    })

    editor.send({
      type: 'apply',
      patches: diffValueToPatches(fromValue, toValue),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(toValue)
    })
  }
})
