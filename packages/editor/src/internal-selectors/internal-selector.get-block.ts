import {KeyedSegment, PortableTextBlock} from '@sanity/types'
import {EditorSelector} from '../editor/editor-selector'
import debug from '../internal-utils/debug'
import {BlockPath} from '../types/paths'
import {getBlockIndex} from './internal-selector.get-block-index'

export function getBlock(key: string): EditorSelector<
  | {
      node: PortableTextBlock
      path: BlockPath
    }
  | undefined
> {
  return (snapshot) => {
    const index = getBlockIndex(key)(snapshot)

    if (index === undefined) {
      return undefined
    }

    const node = snapshot.context.value.at(index)

    if (!node) {
      return undefined
    }

    if (node._key !== key) {
      console.error(``)
      return undefined
    }

    return {node, path: [{_key: key}]}
  }
}
