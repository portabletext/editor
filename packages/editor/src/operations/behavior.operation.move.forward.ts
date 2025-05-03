import {Transforms} from 'slate'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const moveForwardOperationImplementation: BehaviorOperationImplementation<
  'move.forward'
> = ({operation}) => {
  Transforms.move(operation.editor, {
    unit: 'character',
    distance: operation.distance,
  })
}
