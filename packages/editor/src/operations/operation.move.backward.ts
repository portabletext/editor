import {Transforms} from '../slate'
import type {OperationImplementation} from './operation.types'

export const moveBackwardOperationImplementation: OperationImplementation<
  'move.backward'
> = ({operation}) => {
  Transforms.move(operation.editor, {
    unit: 'character',
    distance: operation.distance,
    reverse: true,
  })
}
