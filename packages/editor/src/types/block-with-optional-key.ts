import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'

export type TextBlockWithOptionalKey = Omit<PortableTextTextBlock, '_key'> & {
  _key?: PortableTextTextBlock['_key']
}

export type ObjectBlockWithOptionalKey = Omit<PortableTextObject, '_key'> & {
  _key?: PortableTextObject['_key']
}

export type BlockWithOptionalKey =
  | TextBlockWithOptionalKey
  | ObjectBlockWithOptionalKey

export type SpanWithOptionalKey = Omit<PortableTextSpan, '_key'> & {
  _key?: PortableTextSpan['_key']
}

export type ChildWithOptionalKey =
  | SpanWithOptionalKey
  | ObjectBlockWithOptionalKey
