import {Transforms} from 'slate'
import {keyedPathToSlatePath} from '../editor/keyed-path'
import {isIndexedBlockPath} from '../types/paths'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const moveBlockOperationImplementation: BehaviorOperationImplementation<
  'move.block'
> = ({operation}) => {
  const at = isIndexedBlockPath(operation.at)
    ? operation.at
    : [keyedPathToSlatePath(operation.at, operation.editor)[0]]
  const to = isIndexedBlockPath(operation.to)
    ? operation.to
    : [keyedPathToSlatePath(operation.to, operation.editor)[0]]

  Transforms.moveNodes(operation.editor, {
    at,
    to,
    mode: 'highest',
  })
}
