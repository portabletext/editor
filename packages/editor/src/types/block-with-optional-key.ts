import type {PortableTextObject, PortableTextTextBlock} from '@sanity/types'

export type TextBlockWithOptionalKey = Omit<PortableTextTextBlock, '_key'> & {
  _key?: PortableTextTextBlock['_key']
}

export type ObjectBlockWithOptionalKey = Omit<PortableTextObject, '_key'> & {
  _key?: PortableTextObject['_key']
}

export type BlockWithOptionalKey =
  | TextBlockWithOptionalKey
  | ObjectBlockWithOptionalKey
