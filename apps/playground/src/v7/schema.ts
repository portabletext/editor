import {defineSchema} from '@portabletext/editor'

const sharedSlideBlockOf = [
  {
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
  },
] as const

/**
 * Schema for the v7 deck.
 *
 * The deck is a single Portable Text document. Every top-level entry is a
 * `slide` block object with a `content` array field that holds the slide's
 * blocks. `defineContainer` (in `slide-container.tsx`) plugs into this
 * field at render time.
 *
 * Containers used inside slides (code-block, table, image, hr) get added
 * to `content.of` as we wire them up.
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
          of: sharedSlideBlockOf,
        },
      ],
    },
  ],
})
