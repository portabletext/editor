import {Schema as SanitySchema} from '@sanity/schema'
import {defineArrayMember, defineField, defineType} from '@sanity/types'
import {describe, expect, test} from 'vitest'
import {sanitySchemaToPortableTextSchema} from './sanity-schema-to-portable-text-schema'

/**
 * Characterize what the converter produces when a Sanity schema reuses
 * the same `name` across multiple positions.
 *
 * Sanity does not hard-reject every same-name configuration - only
 * top-level type collisions throw at `Schema.compile` time - so
 * consumers can author schemas that share a name across different
 * inline positions, sometimes with structurally different field sets.
 *
 * Each test pins the full `blockObjects` output the converter emits
 * for the relevant parents. Downstream packages (editor, toolbar)
 * consume this output, so the contract recorded here matters for those
 * consumers.
 *
 * Notes on Sanity defaults observed in the output:
 * - Inline declarations get an auto-generated `title` (PascalCase of
 *   `name`) when none is provided. The converter passes the title
 *   through.
 *
 * See existing tests in `sanity-schema-to-portable-text-schema.test.ts`
 * for self-recursive and mutually-recursive cycle handling.
 */
describe('sanitySchemaToPortableTextSchema: same name in multiple positions', () => {
  function compile(types: Array<unknown>) {
    return SanitySchema.compile({
      name: 'test',
      types: types as Array<
        Parameters<typeof SanitySchema.compile>[0]['types'][number]
      >,
    }).get('content')
  }

  test('identical fields under two different parents both inline cleanly', () => {
    // Two parents each contain an INLINE `cell` with the same shape.
    // Distinct from existing tests in this directory that exercise
    // same-name via TOP-LEVEL `defineType` chained through bare
    // references - here `cell` is declared inline in two different
    // parents' `of` arrays and never lifted to top level. The
    // converter walks each parent's subtree independently and emits
    // both inline declarations unchanged. No deduplication.
    const sanitySchema = compile([
      defineArrayMember({
        type: 'array',
        name: 'content',
        of: [
          defineField({type: 'block', name: 'block'}),
          defineArrayMember({
            type: 'object',
            name: 'row',
            fields: [
              defineField({
                name: 'cells',
                type: 'array',
                of: [
                  defineArrayMember({
                    type: 'object',
                    name: 'cell',
                    fields: [defineField({name: 'text', type: 'string'})],
                  }),
                ],
              }),
            ],
          }),
          defineArrayMember({
            type: 'object',
            name: 'column',
            fields: [
              defineField({
                name: 'cells',
                type: 'array',
                of: [
                  defineArrayMember({
                    type: 'object',
                    name: 'cell',
                    fields: [defineField({name: 'text', type: 'string'})],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ])

    const schema = sanitySchemaToPortableTextSchema(sanitySchema)

    expect(schema.blockObjects).toEqual([
      {
        name: 'row',
        title: 'Row',
        fields: [
          {
            name: 'cells',
            type: 'array',
            title: 'Cells',
            of: [
              {
                type: 'object',
                name: 'cell',
                title: 'Cell',
                fields: [{name: 'text', title: 'Text', type: 'string'}],
              },
            ],
          },
        ],
      },
      {
        name: 'column',
        title: 'Column',
        fields: [
          {
            name: 'cells',
            type: 'array',
            title: 'Cells',
            of: [
              {
                type: 'object',
                name: 'cell',
                title: 'Cell',
                fields: [{name: 'text', title: 'Text', type: 'string'}],
              },
            ],
          },
        ],
      },
    ])
  })

  test('different fields under two different parents both reach the output', () => {
    // `table.cells.cell` has a `content` field; `organism.parts.cell`
    // has a `markers` field. Each parent walks its own `ancestorNames`
    // set, so two structurally different declarations of `cell` both
    // appear in the output. The converter does not deduplicate or warn
    // about the divergent shapes - downstream consumers see both.
    //
    // Downstream context: when @portabletext/editor consumes a schema
    // shaped like this, its flat `Map<_type, ...>` projection of
    // registered containers picks one shape per bare `_type` and
    // silently drops the other. Descent helpers using that map return
    // `[]` for nodes at the dropped position. This bridge-level test
    // pins what the converter emits; whether the downstream layer
    // should warn or normalize is a separate decision tracked on the
    // editor side.
    const sanitySchema = compile([
      defineArrayMember({
        type: 'array',
        name: 'content',
        of: [
          defineField({type: 'block', name: 'block'}),
          defineArrayMember({
            type: 'object',
            name: 'table',
            fields: [
              defineField({
                name: 'cells',
                type: 'array',
                of: [
                  defineArrayMember({
                    type: 'object',
                    name: 'cell',
                    fields: [defineField({name: 'content', type: 'string'})],
                  }),
                ],
              }),
            ],
          }),
          defineArrayMember({
            type: 'object',
            name: 'organism',
            fields: [
              defineField({
                name: 'parts',
                type: 'array',
                of: [
                  defineArrayMember({
                    type: 'object',
                    name: 'cell',
                    fields: [defineField({name: 'markers', type: 'string'})],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ])

    const schema = sanitySchemaToPortableTextSchema(sanitySchema)

    expect(schema.blockObjects).toEqual([
      {
        name: 'table',
        title: 'Table',
        fields: [
          {
            name: 'cells',
            type: 'array',
            title: 'Cells',
            of: [
              {
                type: 'object',
                name: 'cell',
                title: 'Cell',
                fields: [{name: 'content', title: 'Content', type: 'string'}],
              },
            ],
          },
        ],
      },
      {
        name: 'organism',
        title: 'Organism',
        fields: [
          {
            name: 'parts',
            type: 'array',
            title: 'Parts',
            of: [
              {
                type: 'object',
                name: 'cell',
                title: 'Cell',
                fields: [{name: 'markers', title: 'Markers', type: 'string'}],
              },
            ],
          },
        ],
      },
    ])
  })

  test('top-level type referenced by bare {type} from two arrays inlines under each parent', () => {
    // A top-level `defineType({name: 'cell', ...})` is referenced
    // from inside two different parents as `{type: 'cell'}` (no
    // inline fields). Sanity's compile step resolves the bare
    // reference into the fully fielded type at each call site, and
    // the converter walks the resolved member as if it were declared
    // inline at that position. Both parents end up with an INLINE
    // `cell` object carrying the top-level's fields.
    //
    // Bare references that do not trigger cycle detection (i.e. the
    // referenced type is not already in the ancestor chain) are
    // INLINED with the resolved type's fields at the call site. Cycle
    // detection IS implemented (see the recursive-type tests in the
    // neighbouring file) - that branch emits a bare reference stub
    // back into the output. This test exercises the non-cycle branch.
    const sanitySchema = compile([
      defineType({
        name: 'cell',
        type: 'object',
        fields: [defineField({name: 'value', type: 'string'})],
      }),
      defineArrayMember({
        type: 'array',
        name: 'content',
        of: [
          defineField({type: 'block', name: 'block'}),
          defineArrayMember({
            type: 'object',
            name: 'row',
            fields: [
              defineField({
                name: 'cells',
                type: 'array',
                of: [defineArrayMember({type: 'cell'})],
              }),
            ],
          }),
          defineArrayMember({
            type: 'object',
            name: 'column',
            fields: [
              defineField({
                name: 'cells',
                type: 'array',
                of: [defineArrayMember({type: 'cell'})],
              }),
            ],
          }),
        ],
      }),
    ])

    const schema = sanitySchemaToPortableTextSchema(sanitySchema)

    expect(schema.blockObjects).toEqual([
      {
        name: 'row',
        title: 'Row',
        fields: [
          {
            name: 'cells',
            type: 'array',
            title: 'Cells',
            of: [
              {
                type: 'object',
                name: 'cell',
                title: 'Cell',
                fields: [{name: 'value', title: 'Value', type: 'string'}],
              },
            ],
          },
        ],
      },
      {
        name: 'column',
        title: 'Column',
        fields: [
          {
            name: 'cells',
            type: 'array',
            title: 'Cells',
            of: [
              {
                type: 'object',
                name: 'cell',
                title: 'Cell',
                fields: [{name: 'value', title: 'Value', type: 'string'}],
              },
            ],
          },
        ],
      },
    ])
  })

  test('top-level type AND a same-named inline declaration with different fields', () => {
    // A top-level `cell` declares `{value: string}`. An inline
    // declaration with the same name under one parent's `of` declares
    // `{override: string}` instead. `Schema.compile()` accepts this
    // configuration without throwing and without emitting a console
    // warning (Sanity's validation layer flags this kind of conflict
    // in Studio's UI / lint CLI, not at compile time, so the converter
    // sees no signal).
    //
    // The converter walks the inline as inline (it has local fields
    // and is not in the ancestor chain) and emits the inline's local
    // fields. The top-level `cell` does not appear as a separate
    // blockObject entry in THIS fixture because nothing in the
    // portable text array reaches it except via the inline declaration
    // the converter walked through. A different fixture (top-level
    // `cell` reachable via bare reference somewhere) would surface
    // the top-level shape; see Test 3.
    const sanitySchema = compile([
      defineType({
        name: 'cell',
        type: 'object',
        fields: [defineField({name: 'value', type: 'string'})],
      }),
      defineArrayMember({
        type: 'array',
        name: 'content',
        of: [
          defineField({type: 'block', name: 'block'}),
          defineArrayMember({
            type: 'object',
            name: 'row',
            fields: [
              defineField({
                name: 'cells',
                type: 'array',
                of: [
                  defineArrayMember({
                    type: 'object',
                    name: 'cell',
                    fields: [defineField({name: 'override', type: 'string'})],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ])

    const schema = sanitySchemaToPortableTextSchema(sanitySchema)

    expect(schema.blockObjects).toEqual([
      {
        name: 'row',
        title: 'Row',
        fields: [
          {
            name: 'cells',
            type: 'array',
            title: 'Cells',
            of: [
              {
                type: 'object',
                name: 'cell',
                title: 'Cell',
                fields: [{name: 'override', title: 'Override', type: 'string'}],
              },
            ],
          },
        ],
      },
    ])
  })
})
