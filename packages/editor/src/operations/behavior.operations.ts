import type {
  AbstractBehaviorEventType,
  SyntheticBehaviorEvent,
} from '../behaviors/behavior.types.event'
import type {EditorContext} from '../editor/editor-snapshot'
import {removeDecoratorOperationImplementation} from '../editor/plugins/createWithPortableTextMarkModel'
import {
  historyRedoOperationImplementation,
  historyUndoOperationImplementation,
} from '../editor/plugins/createWithUndoRedo'
import type {OmitFromUnion, PickFromUnion} from '../type-utils'
import type {PortableTextSlateEditor} from '../types/editor'
import {addAnnotationOperationImplementation} from './behavior.operation.annotation.add'
import {removeAnnotationOperationImplementation} from './behavior.operation.annotation.remove'
import {blockSetOperationImplementation} from './behavior.operation.block.set'
import {blockUnsetOperationImplementation} from './behavior.operation.block.unset'
import {childSetOperationImplementation} from './behavior.operation.child.set'
import {childUnsetOperationImplementation} from './behavior.operation.child.unset'
import {decoratorAddOperationImplementation} from './behavior.operation.decorator.add'
import {deleteOperationImplementation} from './behavior.operation.delete'
import {insertInlineObjectOperationImplementation} from './behavior.operation.insert-inline-object'
import {insertSpanOperationImplementation} from './behavior.operation.insert-span'
import {insertBlockOperationImplementation} from './behavior.operation.insert.block'
import {insertTextOperationImplementation} from './behavior.operation.insert.text'
import {moveBackwardOperationImplementation} from './behavior.operation.move.backward'
import {moveBlockOperationImplementation} from './behavior.operation.move.block'
import {moveForwardOperationImplementation} from './behavior.operation.move.forward'
import {selectOperationImplementation} from './behavior.operation.select'

export type BehaviorOperationImplementationContext = Pick<
  EditorContext,
  'keyGenerator' | 'schema'
>

export type BehaviorOperationImplementation<
  TBehaviorOperationType extends BehaviorOperation['type'],
  TReturnType = void,
> = ({
  context,
  operation,
}: {
  context: BehaviorOperationImplementationContext
  operation: PickFromUnion<BehaviorOperation, 'type', TBehaviorOperationType>
}) => TReturnType

type BehaviorOperation = OmitFromUnion<
  SyntheticBehaviorEvent,
  'type',
  AbstractBehaviorEventType
> & {
  editor: PortableTextSlateEditor
}

type BehaviorOperationImplementations = {
  [TBehaviorOperationType in BehaviorOperation['type']]: BehaviorOperationImplementation<TBehaviorOperationType>
}

const behaviorOperationImplementations: BehaviorOperationImplementations = {
  'annotation.add': addAnnotationOperationImplementation,
  'annotation.remove': removeAnnotationOperationImplementation,
  'block.set': blockSetOperationImplementation,
  'block.unset': blockUnsetOperationImplementation,
  'child.set': childSetOperationImplementation,
  'child.unset': childUnsetOperationImplementation,
  'decorator.add': decoratorAddOperationImplementation,
  'decorator.remove': removeDecoratorOperationImplementation,
  'delete': deleteOperationImplementation,
  'history.redo': historyRedoOperationImplementation,
  'history.undo': historyUndoOperationImplementation,
  'insert.block': insertBlockOperationImplementation,
  'insert.inline object': insertInlineObjectOperationImplementation,
  'insert.span': insertSpanOperationImplementation,
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
  context: BehaviorOperationImplementationContext
  operation: BehaviorOperation
}) {
  try {
    switch (operation.type) {
      case 'annotation.add': {
        behaviorOperationImplementations['annotation.add']({
          context,
          operation: operation,
        })
        break
      }
      case 'annotation.remove': {
        behaviorOperationImplementations['annotation.remove']({
          context,
          operation: operation,
        })
        break
      }
      case 'block.set': {
        behaviorOperationImplementations['block.set']({
          context,
          operation: operation,
        })
        break
      }
      case 'block.unset': {
        behaviorOperationImplementations['block.unset']({
          context,
          operation: operation,
        })
        break
      }
      case 'child.set': {
        behaviorOperationImplementations['child.set']({
          context,
          operation: operation,
        })
        break
      }
      case 'child.unset': {
        behaviorOperationImplementations['child.unset']({
          context,
          operation: operation,
        })
        break
      }
      case 'decorator.add': {
        behaviorOperationImplementations['decorator.add']({
          context,
          operation: operation,
        })
        break
      }
      case 'decorator.remove': {
        behaviorOperationImplementations['decorator.remove']({
          context,
          operation: operation,
        })
        break
      }
      case 'delete': {
        behaviorOperationImplementations.delete({
          context,
          operation: operation,
        })
        break
      }
      case 'history.redo': {
        behaviorOperationImplementations['history.redo']({
          context,
          operation: operation,
        })
        break
      }
      case 'history.undo': {
        behaviorOperationImplementations['history.undo']({
          context,
          operation: operation,
        })
        break
      }
      case 'insert.block': {
        behaviorOperationImplementations['insert.block']({
          context,
          operation: operation,
        })
        break
      }
      case 'insert.inline object': {
        behaviorOperationImplementations['insert.inline object']({
          context,
          operation: operation,
        })
        break
      }
      case 'insert.span': {
        behaviorOperationImplementations['insert.span']({
          context,
          operation: operation,
        })
        break
      }
      case 'insert.text': {
        behaviorOperationImplementations['insert.text']({
          context,
          operation: operation,
        })
        break
      }
      case 'move.backward': {
        behaviorOperationImplementations['move.backward']({
          context,
          operation: operation,
        })
        break
      }
      case 'move.block': {
        behaviorOperationImplementations['move.block']({
          context,
          operation: operation,
        })
        break
      }
      case 'move.forward': {
        behaviorOperationImplementations['move.forward']({
          context,
          operation: operation,
        })
        break
      }
      default: {
        behaviorOperationImplementations.select({
          context,
          operation: operation,
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
}
