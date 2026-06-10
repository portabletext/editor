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

  test('a marketing-site schema converts to a PTE schema that container resolution can walk at every depth', () => {
    const layoutBlockNames = [
      'hero',
      'card',
      'callout',
      'accordion',
      'tabs',
      'columns',
      'gallery',
      'quote',
      'cta',
      'testimonial',
      'section',
      'banner',
    ] as const

    const layoutBlockTypes = layoutBlockNames.map((name) =>
      defineType({
        type: 'object',
        name,
        fields: [
          defineField({name: 'title', type: 'string'}),
          defineField({name: 'body', type: 'pageBody'}),
        ],
      }),
    )

    const pageBodyType = defineType({
      type: 'array',
      name: 'pageBody',
      of: [
        defineArrayMember({type: 'block'}),
        ...layoutBlockNames.map((name) => defineArrayMember({type: name})),
      ],
    })

    const pageType = defineType({
      type: 'document',
      name: 'page',
      fields: [
        defineField({name: 'title', type: 'string'}),
        defineField({name: 'body', type: 'pageBody'}),
      ],
    })

    const sanitySchema = SanitySchema.compile({
      types: [pageType, pageBodyType, ...layoutBlockTypes],
    })

    const startedAt = performance.now()
    const schema = sanitySchemaToPortableTextSchema(
      sanitySchema.get('pageBody'),
    )
    const durationMs = performance.now() - startedAt

    expect(durationMs).toBeLessThan(2_000)

    // The non-recursive parts of the converted schema mirror what a
    // default Portable Text array carries - block, span, the standard
    // decorators / styles / lists, the default link annotation, and an
    // empty inline-objects list (the schema only uses block objects).
    expect({
      block: schema.block,
      span: schema.span,
      styles: schema.styles,
      lists: schema.lists,
      decorators: schema.decorators,
      annotations: schema.annotations,
      inlineObjects: schema.inlineObjects,
    }).toEqual({
      block: {name: 'block'},
      span: {name: 'span'},
      styles: [
        {name: 'normal', title: 'Normal', value: 'normal'},
        {name: 'h1', title: 'Heading 1', value: 'h1'},
        {name: 'h2', title: 'Heading 2', value: 'h2'},
        {name: 'h3', title: 'Heading 3', value: 'h3'},
        {name: 'h4', title: 'Heading 4', value: 'h4'},
        {name: 'h5', title: 'Heading 5', value: 'h5'},
        {name: 'h6', title: 'Heading 6', value: 'h6'},
        {name: 'blockquote', title: 'Quote', value: 'blockquote'},
      ],
      lists: [
        {name: 'bullet', title: 'Bulleted list', value: 'bullet'},
        {name: 'number', title: 'Numbered list', value: 'number'},
      ],
      decorators: [
        {name: 'strong', title: 'Strong', value: 'strong'},
        {name: 'em', title: 'Italic', value: 'em'},
        {name: 'code', title: 'Code', value: 'code'},
        {name: 'underline', title: 'Underline', value: 'underline'},
        {name: 'strike-through', title: 'Strike', value: 'strike-through'},
      ],
      annotations: [
        {
          name: 'link',
          title: 'Link',
          fields: [{name: 'href', title: 'Link', type: 'string'}],
        },
      ],
      inlineObjects: [],
    })

    // Every layout block ends up as a top-level block-object that
    // `containers.get(_type)` can look up - the global half of
    // container resolution.
    expect(
      schema.blockObjects.map((blockObject) => ({
        name: blockObject.name,
        title: blockObject.title,
      })),
    ).toEqual([
      {name: 'hero', title: 'Hero'},
      {name: 'card', title: 'Card'},
      {name: 'callout', title: 'Callout'},
      {name: 'accordion', title: 'Accordion'},
      {name: 'tabs', title: 'Tabs'},
      {name: 'columns', title: 'Columns'},
      {name: 'gallery', title: 'Gallery'},
      {name: 'quote', title: 'Quote'},
      {name: 'cta', title: 'Cta'},
      {name: 'testimonial', title: 'Testimonial'},
      {name: 'section', title: 'Section'},
      {name: 'banner', title: 'Banner'},
    ])

    // The positional half of container resolution walks the parent's
    // `of` array at the current depth. Every block-object's body
    // field is an array whose `of` covers every layout block -
    // either inline (first reach during the walk) or as a name-only stub
    // (after the type has been visited along an ancestor chain). Either
    // way, a container registered against any of these types resolves at
    // any depth inside the tree.
    const allowedMemberTypes = ['block', ...layoutBlockNames].sort()
    for (const blockObject of schema.blockObjects) {
      const bodyField = blockObject.fields.find(
        (field) => field.name === 'body',
      )
      if (bodyField?.type !== 'array' || bodyField.of === undefined) {
        throw new Error(`${blockObject.name}.body should be an array field`)
      }
      const memberTypeNames = bodyField.of
        .map((member) => (member.type === 'object' ? member.name : member.type))
        .sort()
      expect(memberTypeNames).toEqual(allowedMemberTypes)
    }
  }, 10_000)
})
