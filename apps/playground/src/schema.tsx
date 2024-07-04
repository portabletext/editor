import {PortableTextEditorProps} from '@portabletext/editor'
import {
  BoldIcon,
  CodeIcon,
  ItalicIcon,
  LinkIcon,
  StrikethroughIcon,
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
