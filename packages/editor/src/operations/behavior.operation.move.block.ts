import {Transforms} from 'slate'
import {toSlatePath} from '../internal-utils/paths'
import {isIndexedBlockPath} from '../types/paths'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const moveBlockOperationImplementation: BehaviorOperationImplementation<
  'move.block'
> = ({operation}) => {
  const at = isIndexedBlockPath(operation.at)
    ? operation.at
    : [toSlatePath(operation.at, operation.editor)[0]]
  const to = isIndexedBlockPath(operation.to)
    ? operation.to
    : [toSlatePath(operation.to, operation.editor)[0]]

  Transforms.moveNodes(operation.editor, {
    at,
    to,
    mode: 'highest',
  })
}
