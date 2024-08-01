import {Schema} from '@sanity/schema'
import {defineField, defineType} from '@sanity/types'
import {
  BoldIcon,
  CodeIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  Heading5Icon,
  Heading6Icon,
  ItalicIcon,
  LinkIcon,
  ListChecksIcon,
  ListIcon,
  ListOrderedIcon,
  PilcrowIcon,
  StrikethroughIcon,
  SeparatorHorizontalIcon,
  TextQuoteIcon,
  ActivityIcon,
  UnderlineIcon,
} from 'lucide-react'
import {z} from 'zod'

const portableTextSchema = defineField({
  type: 'array',
  name: 'portable-text',
  of: [
    {type: 'break'},
    {
      type: 'block',
      name: 'block',
      of: [{type: 'stock-ticker'}],
      marks: {
        /**
         * Default decorators:
         * { "title": "Strong", "value": "strong" },
         * { "title": "Emphasis", "value": "em" },
         * { "title": "Code", "value": "code" },
         * { "title": "Underline", "value": "underline" },
         * { "title": "Strike", "value": "strike-through" }
         */
        decorators: [
          // React.ComponentType
          {title: 'Strong', value: 'strong', icon: () => <BoldIcon className="w-4 h-4" />},
          // React.ComponentType
          {title: 'Emphasis', value: 'em', icon: ItalicIcon},
          // React.ReactNode
          {title: 'Code', value: 'code', icon: <CodeIcon className="w-4 h-4" />},
          {title: 'Underline', value: 'underline', icon: UnderlineIcon},
          {title: 'Strike', value: 'strike-through', icon: StrikethroughIcon},
        ],
        annotations: [
          {
            name: 'link',
            type: 'object',
            icon: LinkIcon,
          },
        ],
      },
      /**
       * Default lists:
       * { "title": "Bulleted list", "value": "bullet" },
       * { "title": "Numbered list", "value": "number" }
       */
      lists: [
        {
          title: 'Bulleted list',
          value: 'bullet',
          icon: ListIcon,
        },
        {
          title: 'Numbered list',
          value: 'number',
          icon: ListOrderedIcon,
        },
        {
          title: 'To-do list',
          value: 'to-do',
          icon: ListChecksIcon,
        },
      ],
      /**
       * Default styles:
       * { "title": "Normal", "value": "normal" },
       * { "title": "Heading 1", "value": "h1" },
       * { "title": "Heading 2", "value": "h2" },
       * { "title": "Heading 3", "value": "h3" },
       * { "title": "Heading 4", "value": "h4" },
       * { "title": "Heading 5", "value": "h5" },
       * { "title": "Heading 6", "value": "h6" },
       * { "title": "Quote", "value": "blockquote" }
       */
      styles: [
        {title: 'Normal', value: 'normal', icon: PilcrowIcon},
        {title: 'Heading 1', value: 'h1', icon: Heading1Icon},
        {title: 'Heading 2', value: 'h2', icon: Heading2Icon},
        {title: 'Heading 3', value: 'h3', icon: Heading3Icon},
        {title: 'Heading 4', value: 'h4', icon: Heading4Icon},
        {title: 'Heading 5', value: 'h5', icon: Heading5Icon},
        {title: 'Heading 6', value: 'h6', icon: Heading6Icon},
        {title: 'Quote', value: 'blockquote', icon: TextQuoteIcon},
      ],
    },
  ],
})

const breakType = defineType({
  name: 'break',
  type: 'object',
  icon: SeparatorHorizontalIcon,
  fields: [
    defineField({
      name: 'style',
      type: 'string',
      options: {
        list: ['break'],
      },
      validation: (Rule) => Rule.required(),
    }),
  ],
})

const stockTickerType = defineType({
  name: 'stock-ticker',
  icon: ActivityIcon,
  type: 'object',
  fields: [
    defineField({
      name: 'symbol',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
  ],
})

export const schema = Schema.compile({
  types: [portableTextSchema, breakType, stockTickerType],
}).get('portable-text')

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
