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
import type {ToolbarSchemaDefinition} from './toolbar/toolbar-schema-definition'

/**
 * Extended schema definition with icons, field titles and default values.
 * This makes it easier to use the schema definition in the playground to
 * render the toolbar, forms and other UI components.
 */
export const playgroundSchemaDefinition = defineSchema({
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
      fields: [{name: 'href', title: 'HREF', type: 'string'}],
      defaultValues: {
        href: 'https://example.com',
      },
    },
    {
      title: 'Comment',
      name: 'comment',
      icon: MessageSquareTextIcon,
      fields: [{name: 'text', title: 'Text', type: 'string'}],
      defaultValues: {
        text: 'Consider rewriting this',
      },
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
      fields: [],
      defaultValues: {},
    },
    {
      title: 'Image',
      name: 'image',
      icon: ImageIcon,
      fields: [
        {name: 'url', title: 'URL', type: 'string'},
        {name: 'alt', title: 'Alt text', type: 'string'},
      ],
      defaultValues: {
        url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA4OTggMjQwIj48cG9seWdvbiBwb2ludHM9IjM5Mi4xOSA3OC40NSAzOTIuMTMgMTAwLjc1IDM3Mi4xOSA4OS4yNCAzNzEuOSAxODkuMjEgMzU4LjkxIDE4MS43MSAzNTkuMTkgODEuNzQgMzM5LjM1IDcwLjI4IDMzOS40MiA0Ny45OCAzOTIuMTkgNzguNDUiLz48cG9seWdvbiBwb2ludHM9IjQ0Mi42NyAxMDcuNTkgNDQyLjYxIDEyOS45IDQxMy4yOSAxMTIuOTcgNDEzLjIyIDEzOS42NSA0MzkuODEgMTU1IDQzOS43NSAxNzYuNzIgNDEzLjE2IDE2MS4zNyA0MTMuMDcgMTkwLjQ0IDQ0Mi4zOSAyMDcuMzYgNDQyLjMyIDIyOS44NyA0MDAuMzEgMjA1LjYxIDQwMC42NiA4My4zNCA0NDIuNjcgMTA3LjU5Ii8+PHBvbHlnb24gcG9pbnRzPSI1MDMuNCA3OS4yMiA0ODMuODYgMTUwLjE0IDUwNC43MiAyMDAuOTQgNDkwLjczIDIwOS4wMSA0NzYuNjQgMTc0LjY1IDQ2Mi44OCAyMjUuMSA0NDkuMTkgMjMzIDQ2OS42OSAxNTguNzIgNDQ5LjgyIDExMC4xNSA0NjMuODkgMTAyLjAzIDQ3Ni44MSAxMzQuMjYgNDg5LjgxIDg3LjA2IDUwMy40IDc5LjIyIi8+PHBvbHlnb24gcG9pbnRzPSI1NTcuNzUgNDcuODMgNTU3LjgyIDcwLjE0IDUzOC42IDgxLjI0IDUzOC44OCAxODEuMjIgNTI2LjM2IDE4OC40NCA1MjYuMDggODguNDYgNTA2Ljk1IDk5LjUxIDUwNi44OSA3Ny4yIDU1Ny43NSA0Ny44MyIvPjxwYXRoIGQ9Ik00MTkuMzcsMjcuMTJoMHMuMTktMzEuODIsMjcuODMtMTUuODMsMjcuNjUsNDcuODYsMjcuNjUsNDcuODZsLTkuMjItNS4zM3MwLTIxLjI4LTE4LjQzLTMxLjkyLTE4LjQzLDEwLjY0LTE4LjQzLDEwLjY0WiIvPjwvc3ZnPgo=',
        alt: 'Portable Text logo',
      },
    },
  ],
  inlineObjects: [
    {
      title: 'Stock ticker',
      name: 'stock-ticker',
      icon: ActivityIcon,
      fields: [{name: 'symbol', title: 'Symbol', type: 'string'}],
      defaultValues: {
        symbol: 'NVDA',
      },
    },
  ],
}) satisfies ToolbarSchemaDefinition

export const ImageSchema = z.object({
  schemaType: z.object({
    name: z.literal('image'),
  }),
  value: z.object({
    url: z.string(),
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
