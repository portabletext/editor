import type {
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import type {BaseEditor, Descendant} from '../slate'
import type {ReactEditor} from '../slate-react'
import type {PortableTextSlateEditor} from './slate-editor'

export interface VoidElement {
  _type: string
  _key: string
  children?: Descendant[]
  [key: string]: unknown
}

export interface SlateTextBlock extends Omit<
  PortableTextTextBlock,
  'children'
> {
  children: Descendant[]
}

declare module '../slate/index' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & PortableTextSlateEditor
    Element: SlateTextBlock | VoidElement
    Text: PortableTextSpan
  }
}
