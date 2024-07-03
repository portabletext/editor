import {z} from 'zod'
import {ArrayDefinition} from '@sanity/types'

export const schema: ArrayDefinition = {
  type: 'array' as const,
  name: 'body',
  of: [
    {
      type: 'block',
      name: 'block',
      marks: {
        annotations: [
          {
            name: 'link',
            type: 'object',
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
