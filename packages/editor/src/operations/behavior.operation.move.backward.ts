import {Transforms} from 'slate'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const moveBackwardOperationImplementation: BehaviorOperationImplementation<
  'move.backward'
> = ({operation}) => {
  Transforms.move(operation.editor, {
    unit: 'character',
    distance: operation.distance,
    reverse: true,
  })
}
