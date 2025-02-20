import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from './_exports'

/**
 * @public
 */
export const getValue: EditorSelector<Array<PortableTextBlock>> = (
  snapshot,
) => {
  return snapshot.context.value
}
