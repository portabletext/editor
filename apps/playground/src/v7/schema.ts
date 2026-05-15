import {defineSchema} from '@portabletext/editor'

/**
 * Inner schema for "rich" container content — used by callouts, fact-boxes,
 * cells, anywhere we want full prose-formatting + lists.
 */
const richBlock = {
  type: 'block',
  decorators: [
    {title: 'Strong', name: 'strong'},
    {title: 'Emphasis', name: 'em'},
    {title: 'Code', name: 'code'},
  ],
  annotations: [
    {
      title: 'Link',
      name: 'link',
      fields: [{name: 'href', title: 'HREF', type: 'string'}],
    },
  ],
  lists: [
    {title: 'Bulleted list', name: 'bullet'},
    {title: 'Numbered list', name: 'number'},
  ],
  styles: [
    {title: 'Normal', name: 'normal'},
    {title: 'Heading 1', name: 'h1'},
    {title: 'Heading 2', name: 'h2'},
    {title: 'Heading 3', name: 'h3'},
  ],
} as const

/**
 * Plain code-line schema - no decorators, no annotations, no styles. Each
 * line is one text block; the code-block container wraps them.
 */
const codeLineBlock = {
  type: 'block',
  decorators: [],
  annotations: [],
  styles: [],
  lists: [],
  inlineObjects: [],
} as const

/**
 * Schema for the v7 deck.
 *
 * One Portable Text document, slides at the root. Each `slide` block object
 * has a `content` array that holds the slide's blocks — rich text plus the
 * demonstration containers (callouts, code blocks, tables) for slides that
 * showcase those features.
 */
export const deckSchemaDefinition = defineSchema({
  decorators: [
    {title: 'Strong', name: 'strong'},
    {title: 'Emphasis', name: 'em'},
    {title: 'Code', name: 'code'},
  ],
  annotations: [
    {
      title: 'Link',
      name: 'link',
      fields: [{name: 'href', title: 'HREF', type: 'string'}],
    },
  ],
  lists: [
    {title: 'Bulleted list', name: 'bullet'},
    {title: 'Numbered list', name: 'number'},
  ],
  styles: [
    {title: 'Normal', name: 'normal'},
    {title: 'Heading 1', name: 'h1'},
    {title: 'Heading 2', name: 'h2'},
    {title: 'Heading 3', name: 'h3'},
  ],
  blockObjects: [
    {
      title: 'Slide',
      name: 'slide',
      fields: [
        {
          name: 'content',
          title: 'Content',
          type: 'array',
          of: [
            richBlock,
            // Callout - aside with a tone (note, tip, important, warning, caution)
            {
              type: 'object',
              name: 'callout',
              fields: [
                {name: 'tone', title: 'Tone', type: 'string'},
                {
                  name: 'content',
                  title: 'Content',
                  type: 'array',
                  of: [richBlock],
                },
              ],
            },
            // Code block - syntax-highlighted source. Each line is one text
            // block; the `language` field drives the Shiki tokenizer.
            {
              type: 'object',
              name: 'code-block',
              fields: [
                {name: 'language', title: 'Language', type: 'string'},
                {
                  name: 'lines',
                  title: 'Lines',
                  type: 'array',
                  of: [codeLineBlock],
                },
              ],
            },
            // Table - rows of cells, each cell holds rich content.
            {
              type: 'object',
              name: 'table',
              fields: [
                {name: 'headerRows', title: 'Header rows', type: 'number'},
                {
                  name: 'rows',
                  title: 'Rows',
                  type: 'array',
                  of: [
                    {
                      type: 'object',
                      name: 'row',
                      fields: [
                        {
                          name: 'cells',
                          title: 'Cells',
                          type: 'array',
                          of: [
                            {
                              type: 'object',
                              name: 'cell',
                              fields: [
                                {
                                  name: 'content',
                                  title: 'Content',
                                  type: 'array',
                                  of: [richBlock],
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
      ],
    },
  ],
})
