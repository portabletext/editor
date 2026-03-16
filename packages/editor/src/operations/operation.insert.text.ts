import {isSpan} from '@portabletext/schema'
import {applySelect} from '../internal-utils/apply-selection'
import {elementReadOnly} from '../slate/editor/element-read-only'
import {getObjectNode} from '../slate/editor/get-object-node'
import {hasPath} from '../slate/editor/has-path'
import {getNode} from '../slate/node/get-node'
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

  const node = getNode(editor, path, editor.schema)

  // If the selection is at an ObjectNode, move to the adjacent span.
  if (isObjectNode({schema: editor.schema}, node)) {
    const next = nextPath(path)

    if (hasPath(editor, next)) {
      const nextNode = getNode(editor, next, editor.schema)

      if (isSpan({schema: editor.schema}, nextNode)) {
        path = next
        offset = 0
        applySelect(editor, {path, offset})
      } else {
        return
      }
    } else {
      return
    }
  } else if (
    getObjectNode(editor, {at: selection}) ||
    elementReadOnly(editor, {at: selection})
  ) {
    return
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
