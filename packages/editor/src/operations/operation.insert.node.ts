import {applySelect} from '../internal-utils/apply-selection'
import {end as editorEnd} from '../slate/editor/end'
import {start as editorStart} from '../slate/editor/start'
import {parentPath} from '../slate/path/parent-path'
import type {OperationImplementation} from './operation.types'

export const insertNodeOperationImplementation: OperationImplementation<
  'insert.node'
> = ({operation}) => {
  const {editor, at, node, position, select} = operation

  editor.apply({
    type: 'insert_node',
    path: at,
    node,
    position,
  })

  const selectOption = select ?? 'none'

  if (selectOption === 'none') {
    return
  }

  // The apply pipeline may re-key the node, so use the key from the
  // operation's node reference which is mutated in place by apply-operation.
  const parent = parentPath(at)
  const insertedPath = [...parent, {_key: node._key}]

  const point =
    selectOption === 'start'
      ? editorStart(editor, insertedPath)
      : editorEnd(editor, insertedPath)

  applySelect(editor, point)
}
