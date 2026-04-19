import {defineSchema} from '@portabletext/schema'
import {describe, test} from 'vitest'
import type {ContainerScope, LeafScope} from './scope.types'

const minimalSchema = defineSchema({})
type MinimalSchema = typeof minimalSchema

const calloutSchema = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
    {name: 'image'},
  ],
  inlineObjects: [{name: 'stock-ticker'}],
})
type CalloutSchema = typeof calloutSchema

const gallerySchema = defineSchema({
  blockObjects: [
    {
      name: 'gallery',
      fields: [
        {name: 'images', type: 'array', of: [{type: 'image', fields: []}]},
      ],
    },
  ],
})
type GallerySchema = typeof gallerySchema

const tableSchema = defineSchema({
  blockObjects: [
    {
      name: 'table',
      fields: [
        {
          name: 'rows',
          type: 'array',
          of: [
            {
              type: 'row',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  of: [
                    {
                      type: 'cell',
                      fields: [
                        {
                          name: 'content',
                          type: 'array',
                          of: [{type: 'block'}],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
})
type TableSchema = typeof tableSchema

const fullSchema = defineSchema({
  blockObjects: [
    {name: 'image'},
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'image'}],
        },
      ],
    },
  ],
  inlineObjects: [{name: 'stock-ticker'}],
})
type FullSchema = typeof fullSchema

describe('ContainerScope', () => {
  describe('minimal schema (no blockObjects)', () => {
    test('accepts root text block', () => {
      '$.block' satisfies ContainerScope<MinimalSchema>
    })

    test('accepts descendant text block', () => {
      '$..block' satisfies ContainerScope<MinimalSchema>
    })

    test('rejects unknown container type', () => {
      // @ts-expect-error: callout not in schema
      '$.callout' satisfies ContainerScope<MinimalSchema>
    })

    test('rejects leaf terminal (span)', () => {
      // @ts-expect-error: span is a leaf, not a container
      '$..span' satisfies ContainerScope<MinimalSchema>
    })
  })

  describe('callout schema', () => {
    test('accepts root text block', () => {
      '$.block' satisfies ContainerScope<CalloutSchema>
    })

    test('accepts descendant text block', () => {
      '$..block' satisfies ContainerScope<CalloutSchema>
    })

    test('accepts root callout', () => {
      '$.callout' satisfies ContainerScope<CalloutSchema>
    })

    test('accepts descendant callout', () => {
      '$..callout' satisfies ContainerScope<CalloutSchema>
    })

    test('accepts callout with block chain (root)', () => {
      '$.callout.block' satisfies ContainerScope<CalloutSchema>
    })

    test('accepts callout with block chain (descendant)', () => {
      '$..callout.block' satisfies ContainerScope<CalloutSchema>
    })

    test('accepts callout middle-`..` to block (root)', () => {
      '$.callout..block' satisfies ContainerScope<CalloutSchema>
    })

    test('accepts callout middle-`..` to block (descendant)', () => {
      '$..callout..block' satisfies ContainerScope<CalloutSchema>
    })

    test('rejects image as container (void block object)', () => {
      // @ts-expect-error: image is a leaf, not a container
      '$..image' satisfies ContainerScope<CalloutSchema>
    })

    test('rejects inline object as container', () => {
      // @ts-expect-error: stock-ticker is a leaf, not a container
      '$..stock-ticker' satisfies ContainerScope<CalloutSchema>
    })

    test('rejects leaf scope as container', () => {
      // @ts-expect-error: span is a leaf
      '$..block.span' satisfies ContainerScope<CalloutSchema>
    })
  })

  describe('gallery schema (container with void-only children)', () => {
    test('accepts root gallery', () => {
      '$.gallery' satisfies ContainerScope<GallerySchema>
    })

    test('accepts descendant gallery', () => {
      '$..gallery' satisfies ContainerScope<GallerySchema>
    })

    test('accepts root text block', () => {
      '$.block' satisfies ContainerScope<GallerySchema>
    })

    test('rejects image as container', () => {
      // @ts-expect-error: image is a leaf
      '$..image' satisfies ContainerScope<GallerySchema>
    })
  })

  describe('table schema (deep nesting)', () => {
    test('accepts root table', () => {
      '$.table' satisfies ContainerScope<TableSchema>
    })

    test('accepts descendant table', () => {
      '$..table' satisfies ContainerScope<TableSchema>
    })

    test('accepts table.row', () => {
      '$..table.row' satisfies ContainerScope<TableSchema>
    })

    test('accepts table.row.cell', () => {
      '$..table.row.cell' satisfies ContainerScope<TableSchema>
    })

    test('accepts table.row.cell.block', () => {
      '$..table.row.cell.block' satisfies ContainerScope<TableSchema>
    })

    test('accepts table..cell middle-`..`', () => {
      '$..table..cell' satisfies ContainerScope<TableSchema>
    })

    test('accepts table..block middle-`..`', () => {
      '$..table..block' satisfies ContainerScope<TableSchema>
    })

    test('accepts table..cell.block middle-`..` with exact tail', () => {
      '$..table..cell.block' satisfies ContainerScope<TableSchema>
    })

    test('accepts row..cell middle-`..`', () => {
      '$..row..cell' satisfies ContainerScope<TableSchema>
    })

    test('rejects bare row (not at chain root)', () => {
      // @ts-expect-error: row only appears inside table
      '$.row' satisfies ContainerScope<TableSchema>
    })

    test('rejects bare cell (not at chain root)', () => {
      // @ts-expect-error: cell only appears inside table.row
      '$.cell' satisfies ContainerScope<TableSchema>
    })
  })

  describe('syntax errors', () => {
    test('rejects bare scope (no anchor)', () => {
      // @ts-expect-error: missing $. or $..
      'block' satisfies ContainerScope<CalloutSchema>
    })

    test('rejects missing dot after $', () => {
      // @ts-expect-error: need $. or $..
      '$block' satisfies ContainerScope<CalloutSchema>
    })

    test('rejects bare root anchor', () => {
      // @ts-expect-error: no segment after $.
      '$.' satisfies ContainerScope<CalloutSchema>
    })

    test('rejects bare descendant anchor', () => {
      // @ts-expect-error: no segment after $..
      '$..' satisfies ContainerScope<CalloutSchema>
    })

    test('rejects root alone', () => {
      // @ts-expect-error: no segment after $
      '$' satisfies ContainerScope<CalloutSchema>
    })

    test('rejects empty string', () => {
      // @ts-expect-error: must start with $. or $..
      '' satisfies ContainerScope<CalloutSchema>
    })

    test('rejects field name in scope', () => {
      // @ts-expect-error: fields are not types
      '$..callout.content' satisfies ContainerScope<CalloutSchema>
    })

    test('rejects unknown type', () => {
      // @ts-expect-error: foo is not in the schema
      '$..foo' satisfies ContainerScope<CalloutSchema>
    })
  })
})

describe('LeafScope', () => {
  describe('minimal schema (just spans)', () => {
    test('accepts span in root text block', () => {
      '$.block.span' satisfies LeafScope<MinimalSchema>
    })

    test('accepts span in any text block', () => {
      '$..block.span' satisfies LeafScope<MinimalSchema>
    })

    test('rejects span without block. parent', () => {
      // @ts-expect-error: span must have block. parent
      '$..span' satisfies LeafScope<MinimalSchema>
    })

    test('rejects span at root without block. parent', () => {
      // @ts-expect-error: span must have block. parent
      '$.span' satisfies LeafScope<MinimalSchema>
    })
  })

  describe('callout schema', () => {
    test('accepts void block object at root', () => {
      '$.image' satisfies LeafScope<CalloutSchema>
    })

    test('accepts void block object anywhere', () => {
      '$..image' satisfies LeafScope<CalloutSchema>
    })

    test('accepts span in root text block', () => {
      '$.block.span' satisfies LeafScope<CalloutSchema>
    })

    test('accepts span in any text block', () => {
      '$..block.span' satisfies LeafScope<CalloutSchema>
    })

    test('accepts span in callout text block', () => {
      '$..callout.block.span' satisfies LeafScope<CalloutSchema>
    })

    test('accepts span in root callout text block', () => {
      '$.callout.block.span' satisfies LeafScope<CalloutSchema>
    })

    test('accepts span with middle-`..` inside callout', () => {
      '$..callout..block.span' satisfies LeafScope<CalloutSchema>
    })

    test('accepts inline object in text block', () => {
      '$..block.stock-ticker' satisfies LeafScope<CalloutSchema>
    })

    test('accepts inline object in root text block', () => {
      '$.block.stock-ticker' satisfies LeafScope<CalloutSchema>
    })

    test('accepts inline object in callout text block', () => {
      '$..callout.block.stock-ticker' satisfies LeafScope<CalloutSchema>
    })

    test('rejects inline object without block. parent', () => {
      // @ts-expect-error: stock-ticker must have block. parent
      '$..stock-ticker' satisfies LeafScope<CalloutSchema>
    })

    test('rejects inline object with callout parent (no block.)', () => {
      // @ts-expect-error: must be $..callout.block.stock-ticker
      '$..callout.stock-ticker' satisfies LeafScope<CalloutSchema>
    })

    test('rejects container as leaf', () => {
      // @ts-expect-error: callout is a container
      '$..callout' satisfies LeafScope<CalloutSchema>
    })

    test('rejects block as leaf', () => {
      // @ts-expect-error: block is a container
      '$..block' satisfies LeafScope<CalloutSchema>
    })

    test('rejects unknown leaf type', () => {
      // @ts-expect-error
      '$..unknown' satisfies LeafScope<CalloutSchema>
    })
  })

  describe('gallery schema (image inside container)', () => {
    test('accepts image in gallery', () => {
      '$.gallery.image' satisfies LeafScope<GallerySchema>
    })

    test('accepts image anywhere in gallery', () => {
      '$..gallery.image' satisfies LeafScope<GallerySchema>
    })

    test('accepts span in root block (always valid for any schema)', () => {
      '$.block.span' satisfies LeafScope<GallerySchema>
    })

    test('rejects gallery as leaf', () => {
      // @ts-expect-error: gallery is a container
      '$..gallery' satisfies LeafScope<GallerySchema>
    })
  })

  describe('table schema (deep leaves)', () => {
    test('accepts span in deep chain', () => {
      '$..table.row.cell.block.span' satisfies LeafScope<TableSchema>
    })

    test('accepts span with middle-`..`', () => {
      '$..table..block.span' satisfies LeafScope<TableSchema>
    })

    test('accepts span in root table chain', () => {
      '$.table.row.cell.block.span' satisfies LeafScope<TableSchema>
    })

    test('rejects middle-`..` before span (not a block parent)', () => {
      // @ts-expect-error: span must have block. immediate parent
      '$..table..span' satisfies LeafScope<TableSchema>
    })
  })

  describe('full schema walkthrough', () => {
    test('accepts $..image', () => {
      '$..image' satisfies LeafScope<FullSchema>
    })

    test('accepts $.image', () => {
      '$.image' satisfies LeafScope<FullSchema>
    })

    test('accepts $..callout.image', () => {
      '$..callout.image' satisfies LeafScope<FullSchema>
    })

    test('accepts $.callout.image', () => {
      '$.callout.image' satisfies LeafScope<FullSchema>
    })

    test('accepts $..callout..image', () => {
      '$..callout..image' satisfies LeafScope<FullSchema>
    })

    test('accepts $..block.span', () => {
      '$..block.span' satisfies LeafScope<FullSchema>
    })

    test('accepts $.block.span', () => {
      '$.block.span' satisfies LeafScope<FullSchema>
    })

    test('accepts $..callout.block.span', () => {
      '$..callout.block.span' satisfies LeafScope<FullSchema>
    })

    test('accepts $..block.stock-ticker', () => {
      '$..block.stock-ticker' satisfies LeafScope<FullSchema>
    })

    test('accepts $..callout.block.stock-ticker', () => {
      '$..callout.block.stock-ticker' satisfies LeafScope<FullSchema>
    })

    test('rejects $..callout..block.stock-ticker when in middle-..`', () => {
      '$..callout..block.stock-ticker' satisfies LeafScope<FullSchema>
    })
  })
})
