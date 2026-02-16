import {Editor} from '../slate'
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
import {insertBlockOperationImplementation} from './operation.insert.block'
import {insertChildOperationImplementation} from './operation.insert.child'
import {insertTextOperationImplementation} from './operation.insert.text'
import {moveBackwardOperationImplementation} from './operation.move.backward'
import {moveBlockOperationImplementation} from './operation.move.block'
import {moveForwardOperationImplementation} from './operation.move.forward'
import {selectOperationImplementation} from './operation.select'
import type {
  Operation,
  OperationContext,
  OperationImplementations,
} from './operation.types'

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
  'insert.block': insertBlockOperationImplementation,
  'insert.child': insertChildOperationImplementation,
  'insert.text': insertTextOperationImplementation,
  'move.backward': moveBackwardOperationImplementation,
  'move.block': moveBlockOperationImplementation,
  'move.forward': moveForwardOperationImplementation,
  'select': selectOperationImplementation,
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
      switch (operation.type) {
        case 'annotation.add': {
          operationImplementations['annotation.add']({
            context,
            operation,
          })
          break
        }
        case 'annotation.remove': {
          operationImplementations['annotation.remove']({
            context,
            operation,
          })
          break
        }
        case 'block.set': {
          operationImplementations['block.set']({
            context,
            operation,
          })
          break
        }
        case 'block.unset': {
          operationImplementations['block.unset']({
            context,
            operation,
          })
          break
        }
        case 'child.set': {
          operationImplementations['child.set']({
            context,
            operation,
          })
          break
        }
        case 'child.unset': {
          operationImplementations['child.unset']({
            context,
            operation,
          })
          break
        }
        case 'decorator.add': {
          operationImplementations['decorator.add']({
            context,
            operation: operation,
          })
          break
        }
        case 'decorator.remove': {
          operationImplementations['decorator.remove']({
            context,
            operation,
          })
          break
        }
        case 'delete': {
          operationImplementations.delete({
            context,
            operation,
          })
          break
        }
        case 'history.redo': {
          operationImplementations['history.redo']({
            context,
            operation,
          })
          break
        }
        case 'history.undo': {
          operationImplementations['history.undo']({
            context,
            operation,
          })
          break
        }
        case 'insert.block': {
          operationImplementations['insert.block']({
            context,
            operation,
          })
          break
        }
        case 'insert.child': {
          operationImplementations['insert.child']({
            context,
            operation,
          })
          break
        }
        case 'insert.text': {
          operationImplementations['insert.text']({
            context,
            operation,
          })
          break
        }
        case 'move.backward': {
          operationImplementations['move.backward']({
            context,
            operation,
          })
          break
        }
        case 'move.block': {
          operationImplementations['move.block']({
            context,
            operation,
          })
          break
        }
        case 'move.forward': {
          operationImplementations['move.forward']({
            context,
            operation,
          })
          break
        }
        default: {
          operationImplementations.select({
            context,
            operation,
          })
          break
        }
      }
    } catch (error) {
      console.error(
        new Error(
          `Performing "${operation.type}" failed due to: ${error instanceof Error ? error.message : error}`,
        ),
      )
    }
  }

  if (Editor.isNormalizing(operation.editor)) {
    Editor.withoutNormalizing(operation.editor, perform)
  } else {
    perform()
  }
}
