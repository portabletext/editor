import {isSpan} from '@portabletext/schema'
import {applySelect} from '../internal-utils/apply-selection'
import {isCollapsedRange} from '../slate/range/is-collapsed-range'
import {getNode} from '../traversal/get-node'
import {getSibling} from '../traversal/get-sibling'
import {getSpanNode} from '../traversal/get-span-node'
import {isLeaf} from '../traversal/is-leaf'
import type {OperationImplementation} from './operation.types'

export const insertTextOperationImplementation: OperationImplementation<
  'insert.text'
> = ({operation}) => {
  const {editor} = operation
  const {selection} = editor

  if (!selection || !isCollapsedRange(selection)) {
    return
  }

  let {path, offset} = selection.anchor

  const nodeEntry = getNode(editor, path)

  if (!nodeEntry) {
    return
  }

  const node = nodeEntry.node

  // If the selection is at a non-span leaf (inline object or block object),
  // try to move to the adjacent span.
  if (
    isLeaf(editor, nodeEntry.path) &&
    !isSpan({schema: editor.schema}, node)
  ) {
    const nextSibling = getSibling(editor, nodeEntry.path, 'next')

    if (nextSibling) {
      const nextNodeEntry = getSpanNode(editor, nextSibling.path)

      if (nextNodeEntry) {
        path = nextSibling.path
        offset = 0
        applySelect(editor, {path, offset})
      } else {
        return
      }
    } else {
      return
    }
  }

  if (operation.text.length > 0) {
    editor.apply({
      type: 'insert_text',
      path,
      offset,
      text: operation.text,
    })
  }
}
