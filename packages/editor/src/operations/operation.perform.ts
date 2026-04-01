import {isNormalizing} from '../slate/editor/is-normalizing'
import {withoutNormalizing} from '../slate/editor/without-normalizing'
import {addAnnotationOperationImplementation} from './operation.annotation.add'
import {removeAnnotationOperationImplementation} from './operation.annotation.remove'
import {blockSetOperationImplementation} from './operation.block.set'
import {blockUnsetOperationImplementation} from './operation.block.unset'
import {childSetOperationImplementation} from './operation.child.set'
import {childUnsetOperationImplementation} from './operation.child.unset'
import {decoratorAddOperationImplementation} from './operation.decorator.add'
import {decoratorRemoveOperationImplementation} from './operation.decorator.remove'
import {deleteOperationImplementation} from './operation.delete'
import {historyRedoOperationImplementation} from './operation.history.redo'
import {historyUndoOperationImplementation} from './operation.history.undo'
import {insertOperationImplementation} from './operation.insert'
import {insertBlockOperationImplementation} from './operation.insert.block'
import {insertChildOperationImplementation} from './operation.insert.child'
import {insertTextOperationImplementation} from './operation.insert.text'
import {moveBackwardOperationImplementation} from './operation.move.backward'
import {moveBlockOperationImplementation} from './operation.move.block'
import {moveForwardOperationImplementation} from './operation.move.forward'
import {removeOperationImplementation} from './operation.remove'
import {selectOperationImplementation} from './operation.select'
import {setOperationImplementation} from './operation.set'
import type {
  Operation,
  OperationContext,
  OperationImplementations,
} from './operation.types'
import {unsetOperationImplementation} from './operation.unset'

const operationImplementations: OperationImplementations = {
  'annotation.add': addAnnotationOperationImplementation,
  'annotation.remove': removeAnnotationOperationImplementation,
  'block.set': blockSetOperationImplementation,
  'block.unset': blockUnsetOperationImplementation,
  'child.set': childSetOperationImplementation,
  'child.unset': childUnsetOperationImplementation,
  'decorator.add': decoratorAddOperationImplementation,
  'decorator.remove': decoratorRemoveOperationImplementation,
  'delete': deleteOperationImplementation,
  'history.redo': historyRedoOperationImplementation,
  'history.undo': historyUndoOperationImplementation,
  'insert': insertOperationImplementation,
  'insert.block': insertBlockOperationImplementation,
  'insert.child': insertChildOperationImplementation,
  'insert.text': insertTextOperationImplementation,
  'move.backward': moveBackwardOperationImplementation,
  'move.block': moveBlockOperationImplementation,
  'move.forward': moveForwardOperationImplementation,
  'remove': removeOperationImplementation,
  'select': selectOperationImplementation,
  'set': setOperationImplementation,
  'unset': unsetOperationImplementation,
}

export function performOperation({
  context,
  operation,
}: {
  context: OperationContext
  operation: Operation
}) {
  const perform = () => {
    try {
      const implementation = operationImplementations[
        operation.type
      ] as (args: {context: OperationContext; operation: Operation}) => void
      implementation({context, operation})
    } catch (error) {
      console.error(
        new Error(
          `Performing "${operation.type}" failed due to: ${error instanceof Error ? error.message : error}`,
        ),
      )
    }
  }

  if (isNormalizing(operation.editor)) {
    withoutNormalizing(operation.editor, perform)
  } else {
    perform()
  }
}
