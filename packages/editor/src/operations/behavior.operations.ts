import {Editor} from 'slate'
import {addAnnotationOperationImplementation} from './behavior.operation.annotation.add'
import {removeAnnotationOperationImplementation} from './behavior.operation.annotation.remove'
import {blockSetOperationImplementation} from './behavior.operation.block.set'
import {blockUnsetOperationImplementation} from './behavior.operation.block.unset'
import {childSetOperationImplementation} from './behavior.operation.child.set'
import {childUnsetOperationImplementation} from './behavior.operation.child.unset'
import {decoratorAddOperationImplementation} from './behavior.operation.decorator.add'
import {decoratorRemoveOperationImplementation} from './behavior.operation.decorator.remove'
import {deleteOperationImplementation} from './behavior.operation.delete'
import {historyRedoOperationImplementation} from './behavior.operation.history.redo'
import {historyUndoOperationImplementation} from './behavior.operation.history.undo'
import {insertBlockOperationImplementation} from './behavior.operation.insert.block'
import {insertChildOperationImplementation} from './behavior.operation.insert.child'
import {insertTextOperationImplementation} from './behavior.operation.insert.text'
import {moveBackwardOperationImplementation} from './behavior.operation.move.backward'
import {moveBlockOperationImplementation} from './behavior.operation.move.block'
import {moveForwardOperationImplementation} from './behavior.operation.move.forward'
import {selectOperationImplementation} from './behavior.operation.select'
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
  Editor.withoutNormalizing(operation.editor, () => {
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
          `Executing "${operation.type}" failed due to: ${error.message}`,
        ),
      )
    }
  })
}
