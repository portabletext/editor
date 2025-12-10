import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'

/**
 * @public
 */
export const getValue: EditorSelector<Array<PortableTextBlock>> = (
  snapshot,
) => {
  return snapshot.context.value
}
