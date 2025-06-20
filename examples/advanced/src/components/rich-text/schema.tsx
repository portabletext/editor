import {defineSchema, type BaseDefinition} from '@portabletext/editor'
import {
  BoldIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  TypeIcon,
  UnderlineIcon,
} from 'lucide-react'
import type * as React from 'react'

export interface SchemaDefinition extends BaseDefinition {
  icon: () => React.ReactNode
}

export const schemaDefinition = defineSchema({
  decorators: [
    {name: 'strong', icon: () => <BoldIcon width={16} height={16} />},
    {name: 'em', icon: () => <ItalicIcon width={16} height={16} />},
    {name: 'underline', icon: () => <UnderlineIcon width={16} height={16} />},
  ],
  styles: [
    {name: 'normal', icon: () => <TypeIcon width={16} height={16} />},
    {name: 'h1', icon: () => <Heading1Icon width={16} height={16} />},
    {name: 'h2', icon: () => <Heading2Icon width={16} height={16} />},
    {name: 'h3', icon: () => <Heading3Icon width={16} height={16} />},
    {name: 'blockquote', icon: () => <QuoteIcon width={16} height={16} />},
  ],
  lists: [
    {name: 'bullet', icon: () => <ListIcon width={16} height={16} />},
    {name: 'number', icon: () => <ListOrderedIcon width={16} height={16} />},
  ],
  inlineObjects: [
    {
      name: 'link',
      fields: [
        {name: 'name', type: 'string'},
        {name: 'url', type: 'string'},
      ],
    },
    {
      name: 'media',
      fields: [
        {name: 'id', type: 'string'},
        {name: 'name', type: 'string'},
        {name: 'src', type: 'string'},
        {name: 'mediaType', type: 'string'},
      ],
    },
  ],
})
