import type {PortableTextTextBlock} from '@portabletext/schema'
import type {Descendant} from '../slate/interfaces/node'

export interface ObjectElement {
  _type: string
  _key: string
  children: Descendant[]
  [key: string]: unknown
}

export interface SlateTextBlock extends Omit<
  PortableTextTextBlock,
  'children'
> {
  children: Descendant[]
}
