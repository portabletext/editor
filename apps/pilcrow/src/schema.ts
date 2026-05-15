import {defineSchema} from '@portabletext/editor'

/**
 * Pilcrow schema (M0).
 *
 * Source of truth: `/specs/pilcrow.md` §6.1 (v141+).
 *
 * Scope principle: as rich as vanilla markdown allows, scoped to what
 * `@portabletext/markdown` actually rounds-trips today.
 *
 * Schema-fix-PR changes carried inline for M0 (per @pip's lean):
 * - top-level `lists: []` dropped (container-list-only)
 * - `image.title` (not `caption`)
 * - `link.title` field added
 * - `callout.content.of` widened to full GFM-rich
 * - `blockquote.content.of` widened to same minus self-recursive ambiguity
 * - `list-item.content.of` includes horizontal-rule + table
 * - `code-block.lines` options.spellCheck: false
 */
export const pilcrowSchema = defineSchema({
  styles: [
    {name: 'normal'},
    {name: 'h1'},
    {name: 'h2'},
    {name: 'h3'},
    {name: 'h4'},
    {name: 'h5'},
    {name: 'h6'},
  ],

  decorators: [
    {name: 'strong', title: 'Bold'},
    {name: 'em', title: 'Italic'},
    {name: 'code', title: 'Inline code'},
    {name: 'strike-through', title: 'Strike-through'},
  ],

  annotations: [
    {
      name: 'link',
      fields: [
        {name: 'href', type: 'string'},
        {name: 'title', type: 'string'},
      ],
    },
  ],

  // Top-level lists dropped per Q14-lean (container lists only).
  lists: [],

  blockObjects: [
    // List — container with kind discriminator and array of list-items.
    {
      name: 'list',
      title: 'List',
      fields: [
        {name: 'kind', type: 'string'},
        {
          name: 'items',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'list-item',
              fields: [
                {name: 'checked', type: 'boolean'},
                {
                  name: 'content',
                  type: 'array',
                  of: [
                    {type: 'block'},
                    {type: 'list'},
                    {type: 'code-block'},
                    {type: 'blockquote'},
                    {type: 'callout'},
                    {type: 'table'},
                    {type: 'image'},
                    {type: 'horizontal-rule'},
                  ],
                },
              ],
            },
          ],
        },
      ],
    },

    // Blockquote — recursive container.
    {
      name: 'blockquote',
      title: 'Blockquote',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [
            {type: 'block'},
            {type: 'blockquote'},
            {type: 'list'},
            {type: 'code-block'},
            {type: 'callout'},
            {type: 'table'},
            {type: 'image'},
            {type: 'horizontal-rule'},
          ],
        },
      ],
    },

    // Callout — GitHub Alerts style. Blockquote-shaped content.
    {
      name: 'callout',
      title: 'Callout',
      fields: [
        {name: 'tone', type: 'string'},
        {
          name: 'content',
          type: 'array',
          of: [
            {type: 'block'},
            {type: 'list'},
            {type: 'code-block'},
            {type: 'blockquote'},
            {type: 'callout'},
            {type: 'table'},
            {type: 'image'},
            {type: 'horizontal-rule'},
          ],
        },
      ],
    },

    // Code-block — container shape. Each line is a stripped text block.
    {
      name: 'code-block',
      title: 'Code block',
      fields: [
        {name: 'language', type: 'string'},
        {
          name: 'lines',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: [],
              decorators: [],
              annotations: [],
              lists: [],
              inlineObjects: [],
              options: {spellCheck: false},
            },
          ],
        },
      ],
    },

    // Table — GFM-shaped 3-level container (table > row > cell).
    {
      name: 'table',
      title: 'Table',
      fields: [
        {name: 'headerRows', type: 'number'},
        {
          name: 'rows',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'row',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  of: [
                    {
                      type: 'object',
                      name: 'cell',
                      fields: [
                        {
                          name: 'content',
                          type: 'array',
                          of: [
                            {
                              type: 'block',
                              styles: [{name: 'normal'}],
                              lists: [],
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
    },

    // Image — leaf block-object.
    {
      name: 'image',
      title: 'Image',
      fields: [
        {name: 'src', type: 'string'},
        {name: 'alt', type: 'string'},
        {name: 'title', type: 'string'},
      ],
    },

    // Horizontal rule — leaf block-object, no fields.
    {
      name: 'horizontal-rule',
      title: 'Horizontal rule',
      fields: [],
    },
  ],

  inlineObjects: [],
})
