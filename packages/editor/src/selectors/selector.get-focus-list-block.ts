import type {PortableTextListBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {Path} from '../slate/interfaces/path'
import {isListBlock} from '../utils/parse-blocks'
import {getFocusTextBlock} from './selector.get-focus-text-block'

/**
 * Returns the list block containing the focus selection, resolved at any
 * depth.
 *
 * @public
 */
export const getFocusListBlock: EditorSelector<
  {node: PortableTextListBlock; path: Path} | undefined
> = (snapshot) => {
  const focusTextBlock = getFocusTextBlock(snapshot)

  return focusTextBlock && isListBlock(snapshot.context, focusTextBlock.node)
    ? {node: focusTextBlock.node, path: focusTextBlock.path}
    : undefined
}
