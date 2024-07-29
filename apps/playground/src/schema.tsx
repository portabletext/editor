import {PortableTextEditorProps} from '@portabletext/editor'
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
  TextQuoteIcon,
  UnderlineIcon,
} from 'lucide-react'
import {z} from 'zod'

export const schema: PortableTextEditorProps['schemaType'] = {
  type: 'array',
  name: 'body',
  of: [
    {
      type: 'block',
      name: 'block',
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
}

export const LinkAnnotationSchema = z.object({
  schemaType: z.object({
    name: z.literal('link'),
  }),
  value: z.object({
    href: z.string(),
  }),
})
