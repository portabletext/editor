import {applyMove} from '../internal-utils/apply-move'
import type {OperationImplementation} from './operation.types'

export const moveBackwardOperationImplementation: OperationImplementation<
  'move.backward'
> = ({operation}) => {
  applyMove(operation.editor, {
    unit: 'character',
    distance: operation.distance,
    reverse: true,
  })
}
