import type {PortableTextChild, PortableTextSpan} from '@sanity/types'
import type {EditorContext} from '..'

/**
 * @public
 */
export function isSpan(
  context: Pick<EditorContext, 'schema'>,
  child: PortableTextChild,
): child is PortableTextSpan {
  return child._type === context.schema.span.name
}
