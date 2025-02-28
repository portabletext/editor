import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'

/**
 * @public
 */
export const getValue: EditorSelector<Array<PortableTextBlock>> = (
  snapshot,
) => {
  return snapshot.context.value
}
