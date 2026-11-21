import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'

/** A document object, including plain objects and nodes awaiting keys. @public */
export type Node =
  | PortableTextTextBlock
  | PortableTextObject
  | PortableTextSpan
  | {_key?: string; _type?: string; [field: string]: unknown}
