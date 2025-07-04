import {Transforms} from 'slate'
import {toSlatePath} from '../internal-utils/paths'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const moveBlockOperationImplementation: BehaviorOperationImplementation<
  'move.block'
> = ({context, operation}) => {
  const at = [
    toSlatePath(
      {
        context: {
          schema: context.schema,
          value: operation.editor.value,
        },
        blockIndexMap: operation.editor.blockIndexMap,
      },
      operation.at,
    )[0],
  ]
  const to = [
    toSlatePath(
      {
        context: {
          schema: context.schema,
          value: operation.editor.value,
        },
        blockIndexMap: operation.editor.blockIndexMap,
      },
      operation.to,
    )[0],
  ]

  Transforms.moveNodes(operation.editor, {
    at,
    to,
    mode: 'highest',
  })
}
