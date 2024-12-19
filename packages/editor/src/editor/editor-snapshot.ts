import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelection} from '../types/editor'
import type {EditorSchema} from './define-schema'

/**
 * @public
 */
export type EditorContext = {
  activeDecorators: Array<string>
  keyGenerator: () => string
  schema: EditorSchema
  selection: EditorSelection
  value: Array<PortableTextBlock>
}

/**
 * @public
 */
export type EditorSnapshot = {
  context: EditorContext
}
