import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelection} from '../types/editor'
import type {EditorSchema} from './define-schema'

/**
 * @alpha
 */
export type EditorContext = {
  activeDecorators: Array<string>
  keyGenerator: () => string
  schema: EditorSchema
  selection: EditorSelection
  value: Array<PortableTextBlock>
}

/**
 * @alpha
 */
export type EditorSnapshot = {
  context: EditorContext
}
