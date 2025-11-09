import {defineSchema} from '@portabletext/editor'
import {z} from 'zod'

export const playgroundSchemaDefinition = defineSchema({
  decorators: [
    {
      title: 'Strong',
      name: 'strong',
    },
    {
      title: 'Emphasis',
      name: 'em',
    },
    {
      title: 'Code',
      name: 'code',
    },
    {
      title: 'Underline',
      name: 'underline',
    },
    {
      title: 'Strike',
      name: 'strike-through',
    },
    {
      title: 'Subscript',
      name: 'subscript',
    },
    {
      title: 'Superscript',
      name: 'superscript',
    },
  ],
  annotations: [
    {
      title: 'Link',
      name: 'link',
      fields: [{name: 'href', title: 'HREF', type: 'string'}],
    },
    {
      title: 'Comment',
      name: 'comment',
      fields: [{name: 'text', title: 'Text', type: 'string'}],
    },
  ],
  lists: [
    {
      title: 'Bulleted list',
      name: 'bullet',
    },
    {
      title: 'Numbered list',
      name: 'number',
    },
  ],
  styles: [
    {
      title: 'Normal',
      name: 'normal',
    },
    {
      title: 'Heading 1',
      name: 'h1',
    },
    {
      title: 'Heading 2',
      name: 'h2',
    },
    {
      title: 'Heading 3',
      name: 'h3',
    },
    {
      title: 'Heading 4',
      name: 'h4',
    },
    {
      title: 'Heading 5',
      name: 'h5',
    },
    {
      title: 'Heading 6',
      name: 'h6',
    },
    {
      title: 'Quote',
      name: 'blockquote',
    },
  ],
  blocks: [
    {
      name: 'table',
      children: [{name: 'row'}],
    },
    {
      name: 'row',
      children: [{name: 'cell'}],
    },
    {
      name: 'cell',
      children: [{name: 'span'}],
      decorators: [{name: 'strong'}],
    },
  ],
  blockObjects: [
    {
      title: 'Break',
      name: 'break',
    },
    {
      title: 'Image',
      name: 'image',
      fields: [
        {name: 'src', title: 'Src', type: 'string'},
        {name: 'alt', title: 'Alt text', type: 'string'},
      ],
    },
  ],
  inlineObjects: [
    {
      title: 'Stock ticker',
      name: 'stock-ticker',
      fields: [{name: 'symbol', title: 'Symbol', type: 'string'}],
    },
    {
      title: 'Inline image',
      name: 'image',
      fields: [
        {name: 'src', title: 'Src', type: 'string'},
        {name: 'alt', title: 'Alt text', type: 'string'},
      ],
    },
  ],
})

export const ImageSchema = z.object({
  schemaType: z.object({
    name: z.literal('image'),
  }),
  value: z.object({
    src: z.string(),
    alt: z.string().optional(),
  }),
})

export const InlineImageSchema = z.object({
  schemaType: z.object({
    name: z.literal('image'),
  }),
  value: z.object({
    src: z.string(),
    alt: z.string().optional(),
  }),
})

export const CommentAnnotationSchema = z.object({
  schemaType: z.object({
    name: z.literal('comment'),
  }),
  value: z.object({
    text: z.string(),
  }),
})

export const LinkAnnotationSchema = z.object({
  schemaType: z.object({
    name: z.literal('link'),
  }),
  value: z.object({
    href: z.string(),
  }),
})

export const StockTickerSchema = z.object({
  schemaType: z.object({
    name: z.literal('stock-ticker'),
  }),
  value: z.object({
    symbol: z.string(),
  }),
})
