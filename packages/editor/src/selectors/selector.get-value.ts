import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from './_exports'

/**
 * @public
 */
export const getValue: EditorSelector<Array<PortableTextBlock>> = ({
  context,
}) => {
  return context.value
}
