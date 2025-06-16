import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import type {BlockPath} from '../types/paths'

/**
 * @public
 */
export const getLastBlock: EditorSelector<
  {node: PortableTextBlock; path: BlockPath} | undefined
> = (snapshot) => {
  const node = snapshot.context.value[snapshot.context.value.length - 1]
    ? snapshot.context.value[snapshot.context.value.length - 1]
    : undefined

  return node ? {node, path: [{_key: node._key}]} : undefined
}
