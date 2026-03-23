import {applyMove} from '../internal-utils/apply-move'
import type {OperationImplementation} from './operation.types'

export const moveForwardOperationImplementation: OperationImplementation<
  'move.forward'
> = ({operation}) => {
  applyMove(operation.editor, {
    unit: 'character',
    distance: operation.distance,
  })
}
