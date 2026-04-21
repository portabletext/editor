import type {PortableTextTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getFocusTextBlock as getFocusTextBlockTraversal} from '../node-traversal/get-focus-text-block'
import type {Path} from '../slate/interfaces/path'

/**
 * Returns the text block containing the focus selection, resolved at any depth.
 *
 * When the focus is inside an editable container (e.g. a code block's line),
 * this returns the innermost text block ancestor (the line), not the outer
 * container. When the focus is at root, behavior is unchanged.
 *
 * @public
 */
export const getFocusTextBlock: EditorSelector<
  {node: PortableTextTextBlock; path: Path} | undefined
> = (snapshot) => getFocusTextBlockTraversal(snapshot)
