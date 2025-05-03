import {Transforms} from 'slate'
import {toSlatePath} from '../internal-utils/paths'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const moveBlockOperationImplementation: BehaviorOperationImplementation<
  'move.block'
> = ({operation}) => {
  const at = [toSlatePath(operation.at, operation.editor)[0]]
  const to = [toSlatePath(operation.to, operation.editor)[0]]

  Transforms.moveNodes(operation.editor, {
    at,
    to,
    mode: 'highest',
  })
}
