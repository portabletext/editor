import type {
  FieldDefinition,
  OfDefinition,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
  Schema,
} from '@portabletext/schema'
import type {Path} from '../types/paths'
import type {CorrectionEntry} from './correction-entry'

export type CaretNode =
  | PortableTextTextBlock
  | PortableTextObject
  | PortableTextSpan

export type CaretCorrection =
  | {
      rule: CaretRule
      type: 'set'
      path: Path
      value: unknown
    }
  | {
      rule: CaretRule
      type: 'insert'
      path: Path
      node: CaretNode
      position: 'before' | 'after'
    }

export type CaretRule =
  | 'container-field'
  | 'empty-children'
  | 'inline-object-bracketing'

export type CaretEntry = CorrectionEntry & {
  container: () =>
    | {field: CaretContainerField; placeholderStyle: () => string}
    | undefined
}

export type CaretContext = {
  schema: Schema
  keyGenerator: () => string
}

export type CaretContainerField = FieldDefinition & {
  type: 'array'
  of: ReadonlyArray<OfDefinition>
}
