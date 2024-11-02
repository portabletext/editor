import {defineSchema} from '@portabletext/editor'
import {
  ActivityIcon,
  BoldIcon,
  CodeIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  Heading5Icon,
  Heading6Icon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  MessageSquareTextIcon,
  PilcrowIcon,
  SeparatorHorizontalIcon,
  StrikethroughIcon,
  TextQuoteIcon,
  UnderlineIcon,
} from 'lucide-react'
import {z} from 'zod'

export const schemaDefinition = defineSchema({
  decorators: [
    {
      title: 'Strong',
      name: 'strong',
      icon: BoldIcon,
    },
    {
      title: 'Emphasis',
      name: 'em',
      icon: ItalicIcon,
    },
    {
      title: 'Code',
      name: 'code',
      icon: CodeIcon,
    },
    {
      title: 'Underline',
      name: 'underline',
      icon: UnderlineIcon,
    },
    {
      title: 'Strike',
      name: 'strike-through',
      icon: StrikethroughIcon,
    },
  ],
  annotations: [
    {
      title: 'Link',
      name: 'link',
      icon: LinkIcon,
    },
    {
      title: 'Comment',
      name: 'comment',
      icon: MessageSquareTextIcon,
    },
  ],
  lists: [
    {
      title: 'Bulleted list',
      name: 'bullet',
      icon: ListIcon,
    },
    {
      title: 'Numbered list',
      name: 'number',
      icon: ListOrderedIcon,
    },
  ],
  styles: [
    {
      title: 'Normal',
      name: 'normal',
      icon: PilcrowIcon,
    },
    {
      title: 'Heading 1',
      name: 'h1',
      icon: Heading1Icon,
    },
    {
      title: 'Heading 2',
      name: 'h2',
      icon: Heading2Icon,
    },
    {
      title: 'Heading 3',
      name: 'h3',
      icon: Heading3Icon,
    },
    {
      title: 'Heading 4',
      name: 'h4',
      icon: Heading4Icon,
    },
    {
      title: 'Heading 5',
      name: 'h5',
      icon: Heading5Icon,
    },
    {
      title: 'Heading 6',
      name: 'h6',
      icon: Heading6Icon,
    },
    {
      title: 'Quote',
      name: 'blockquote',
      icon: TextQuoteIcon,
    },
  ],
  blockObjects: [
    {
      title: 'Break',
      name: 'break',
      icon: SeparatorHorizontalIcon,
    },
    {
      title: 'Image',
      name: 'image',
      icon: ImageIcon,
    },
  ],
  inlineObjects: [
    {
      title: 'Stock ticker',
      name: 'stock-ticker',
      icon: ActivityIcon,
    },
  ],
})

export type SchemaDefinition = typeof schemaDefinition

export const ImageSchema = z.object({
  schemaType: z.object({
    name: z.literal('image'),
  }),
  value: z.object({
    url: z.string(),
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
