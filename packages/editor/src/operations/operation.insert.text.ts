import {applySelect} from '../internal-utils/apply-selection'
import {getNode} from '../node-traversal/get-node'
import {getSpanNode} from '../node-traversal/get-span-node'
import {hasNode} from '../node-traversal/has-node'
import {isObjectNode} from '../slate/node/is-object-node'
import {nextPath} from '../slate/path/next-path'
import {isCollapsedRange} from '../slate/range/is-collapsed-range'
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

  // If the selection is at an ObjectNode, move to the adjacent span.
  if (isObjectNode({schema: editor.schema}, node)) {
    const next = nextPath(path)

    if (hasNode(editor, next)) {
      const nextNodeEntry = getSpanNode(editor, next)

      if (nextNodeEntry) {
        path = next
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
