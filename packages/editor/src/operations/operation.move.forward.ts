import {Transforms} from '../slate'
import type {OperationImplementation} from './operation.types'

export const moveForwardOperationImplementation: OperationImplementation<
  'move.forward'
> = ({operation}) => {
  Transforms.move(operation.editor, {
    unit: 'character',
    distance: operation.distance,
  })
}
