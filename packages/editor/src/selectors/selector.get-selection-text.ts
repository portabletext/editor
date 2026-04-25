import {isSpan, isTextBlock, type PortableTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {EditorContext} from '../editor/editor-snapshot'
import {getNodeChildren} from '../node-traversal/get-children'
import type {Node} from '../slate/interfaces/node'
import {getSelectedValue} from './selector.get-selected-value'

/**
 * @public
 */
export const getSelectionText: EditorSelector<string> = (snapshot) => {
  const selectedValue = getSelectedValue(snapshot)

  return collectText(snapshot.context, selectedValue, '')
}

function collectText(
  context: Pick<EditorContext, 'schema' | 'containers'>,
  blocks: ReadonlyArray<Node | PortableTextBlock>,
  scopePath: string,
): string {
  let text = ''

  for (const block of blocks) {
    if (isTextBlock(context, block)) {
      for (const child of block.children) {
        if (isSpan(context, child)) {
          text += child.text
        }
      }
      continue
    }

    const childInfo = getNodeChildren(context, block, scopePath)

    if (!childInfo) {
      continue
    }

    text += collectText(context, childInfo.children, childInfo.scopePath)
  }

  return text
}
