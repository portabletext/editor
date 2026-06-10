import {Schema as SanitySchema} from '@sanity/schema'
import {defineArrayMember, defineField, defineType} from '@sanity/types'
import {describe, expect, test} from 'vitest'
import {sanitySchemaToPortableTextSchema} from './sanity-schema-to-portable-text-schema'

/**
 * Regression test for a combinatorial blow-up in the deep schema walk.
 *
 * When many block-object types embed the same named Portable Text array
 * type (a common pattern in real studios: a shared `blockContent` array
 * reused as a field inside accordions, quotes, cards, ...), Sanity
 * compiles a single canonical instance of that array type, and every
 * embedding position resolves to the same `of` member instances.
 *
 * The walk's per-branch ancestor sets only cut a branch when a type
 * repeats within that branch, so without memoization the walk enumerates
 * every simple path through the mutually-embedding type graph - O(n!) in
 * the number of block objects. Real-world schemas with ~30 block objects
 * took seconds per conversion (and `PortableTextInput` converts on
 * render), freezing the studio when opening any document with a Portable
 * Text field.
 *
 * Converting each compiled type instance once and sharing the result
 * keeps the walk linear. With 12 mutually-embedding types this test
 * completes in well under a second; before the fix it does not complete
 * in any practical amount of time.
 */
describe('mutually-embedding block objects', () => {
  test('many block objects sharing a named Portable Text array type convert in linear time', () => {
    const objectCount = 12

    const objectTypes = Array.from({length: objectCount}, (_, index) =>
      defineType({
        type: 'object',
        name: `blockObject${index}`,
        fields: [
          defineField({name: 'label', type: 'string'}),
          // Every object embeds the shared array type, so every object
          // (transitively) embeds every other object.
          defineField({name: 'content', type: 'blockContent'}),
        ],
      }),
    )

    const blockContentType = defineType({
      type: 'array',
      name: 'blockContent',
      of: [
        defineArrayMember({type: 'block', name: 'block'}),
        ...objectTypes.map((objectType) =>
          defineArrayMember({type: objectType.name}),
        ),
      ],
    })

    const sanitySchema = SanitySchema.compile({
      types: [blockContentType, ...objectTypes],
    })

    const startedAt = performance.now()
    const schema = sanitySchemaToPortableTextSchema(
      sanitySchema.get('blockContent'),
    )
    const durationMs = performance.now() - startedAt

    expect(schema.blockObjects).toHaveLength(objectCount)
    // Generous bound - the conversion takes ~1ms when linear, while the
    // unmemoized walk does not finish in any practical amount of time.
    expect(durationMs).toBeLessThan(2_000)
  }, 10_000)
})
