import type {PortableTextBlock} from '@sanity/types'
import type {
  EditorSelection,
  PortableTextMemberSchemaTypes,
} from '../types/editor'

/**
 * @alpha
 */
export type EditorContext = {
  keyGenerator: () => string
  schema: PortableTextMemberSchemaTypes
  selection: NonNullable<EditorSelection>
  value: Array<PortableTextBlock>
}

/**
 * @alpha
 */
export type EditorSnapshot = {
  context: EditorContext
}
