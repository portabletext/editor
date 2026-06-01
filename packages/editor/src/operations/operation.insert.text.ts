import {isCollapsedRange} from '../engine/range/is-collapsed-range'
import {applySelect} from '../internal-utils/apply-selection'
import {getNode} from '../traversal/get-node'
import {getSibling} from '../traversal/get-sibling'
import {getSpan} from '../traversal/get-span'
import {isLeafObject} from '../traversal/is-leaf-object'
import type {OperationImplementation} from './operation.types'

export const insertTextOperationImplementation: OperationImplementation<
  'insert.text'
> = ({operation}) => {
  const {editor} = operation

  // Primitive form: caller provided explicit position. Apply directly without
  // touching selection.
  if (operation.at !== undefined && operation.offset !== undefined) {
    if (operation.text.length === 0) {
      return
    }

    operation.editor.apply({
      type: 'insert_text',
      path: operation.at,
      offset: operation.offset,
      text: operation.text,
    })

    return
  }

  // Caret form: resolve position from the current selection.
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
  if (isLeafObject(editor, node, nodeEntry.path)) {
    const nextSibling = getSibling(editor, nodeEntry.path, {direction: 'next'})

    if (nextSibling) {
      const nextNodeEntry = getSpan(editor, nextSibling.path)

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
