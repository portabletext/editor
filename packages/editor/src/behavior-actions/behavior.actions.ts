import {omit} from 'lodash'
import type {InternalBehaviorAction} from '../behaviors/behavior.types.action'
import type {EditorContext} from '../editor/editor-snapshot'
import {removeDecoratorActionImplementation} from '../editor/plugins/createWithPortableTextMarkModel'
import {
  historyRedoActionImplementation,
  historyUndoActionImplementation,
} from '../editor/plugins/createWithUndoRedo'
import {debugWithName} from '../internal-utils/debug'
import type {PickFromUnion} from '../type-utils'
import {addAnnotationActionImplementation} from './behavior.action.annotation.add'
import {removeAnnotationActionImplementation} from './behavior.action.annotation.remove'
import {blockSetBehaviorActionImplementation} from './behavior.action.block.set'
import {blockUnsetBehaviorActionImplementation} from './behavior.action.block.unset'
import {decoratorAddActionImplementation} from './behavior.action.decorator.add'
import {deleteActionImplementation} from './behavior.action.delete'
import {deleteBackwardActionImplementation} from './behavior.action.delete.backward'
import {deleteBlockActionImplementation} from './behavior.action.delete.block'
import {deleteForwardActionImplementation} from './behavior.action.delete.forward'
import {effectActionImplementation} from './behavior.action.effect'
import {insertInlineObjectActionImplementation} from './behavior.action.insert-inline-object'
import {insertSpanActionImplementation} from './behavior.action.insert-span'
import {insertBlockActionImplementation} from './behavior.action.insert.block'
import {insertTextActionImplementation} from './behavior.action.insert.text'
import {moveBackwardActionImplementation} from './behavior.action.move.backward'
import {moveBlockActionImplementation} from './behavior.action.move.block'
import {moveForwardActionImplementation} from './behavior.action.move.forward'
import {noopActionImplementation} from './behavior.action.noop'
import {selectActionImplementation} from './behavior.action.select'
import {splitBlockActionImplementation} from './behavior.action.split.block'

const debug = debugWithName('behaviors:action')

export type BehaviorActionImplementationContext = Pick<
  EditorContext,
  'keyGenerator' | 'schema'
>

export type BehaviorActionImplementation<
  TBehaviorActionType extends InternalBehaviorAction['type'],
  TReturnType = void,
> = ({
  context,
  action,
}: {
  context: BehaviorActionImplementationContext
  action: PickFromUnion<InternalBehaviorAction, 'type', TBehaviorActionType>
}) => TReturnType

type BehaviorActionImplementations = {
  [TBehaviorActionType in InternalBehaviorAction['type']]: BehaviorActionImplementation<TBehaviorActionType>
}

const behaviorActionImplementations: BehaviorActionImplementations = {
  'annotation.add': addAnnotationActionImplementation,
  'annotation.remove': removeAnnotationActionImplementation,
  'block.set': blockSetBehaviorActionImplementation,
  'block.unset': blockUnsetBehaviorActionImplementation,
  'decorator.add': decoratorAddActionImplementation,
  'decorator.remove': removeDecoratorActionImplementation,
  'delete': deleteActionImplementation,
  'delete.backward': deleteBackwardActionImplementation,
  'delete.forward': deleteForwardActionImplementation,
  'delete.block': deleteBlockActionImplementation,
  'history.redo': historyRedoActionImplementation,
  'history.undo': historyUndoActionImplementation,
  'insert.block': insertBlockActionImplementation,
  'insert.inline object': insertInlineObjectActionImplementation,
  'insert.span': insertSpanActionImplementation,
  'insert.text': insertTextActionImplementation,
  'effect': effectActionImplementation,
  'move.backward': moveBackwardActionImplementation,
  'move.block': moveBlockActionImplementation,
  'move.forward': moveForwardActionImplementation,
  'noop': noopActionImplementation,
  'select': selectActionImplementation,
  'split.block': splitBlockActionImplementation,
}

export function performAction({
  context,
  action,
}: {
  context: BehaviorActionImplementationContext
  action: InternalBehaviorAction
}) {
  debug(JSON.stringify(omit(action, ['editor']), null, 2))

  switch (action.type) {
    case 'annotation.add': {
      behaviorActionImplementations['annotation.add']({
        context,
        action,
      })
      break
    }
    case 'annotation.remove': {
      behaviorActionImplementations['annotation.remove']({
        context,
        action,
      })
      break
    }
    case 'block.set': {
      behaviorActionImplementations['block.set']({
        context,
        action,
      })
      break
    }
    case 'block.unset': {
      behaviorActionImplementations['block.unset']({
        context,
        action,
      })
      break
    }
    case 'decorator.add': {
      behaviorActionImplementations['decorator.add']({
        context,
        action,
      })
      break
    }
    case 'decorator.remove': {
      behaviorActionImplementations['decorator.remove']({
        context,
        action,
      })
      break
    }
    case 'delete': {
      behaviorActionImplementations.delete({
        context,
        action,
      })
      break
    }
    case 'delete.backward': {
      behaviorActionImplementations['delete.backward']({
        context,
        action,
      })
      break
    }
    case 'delete.block': {
      behaviorActionImplementations['delete.block']({
        context,
        action,
      })
      break
    }
    case 'delete.forward': {
      behaviorActionImplementations['delete.forward']({
        context,
        action,
      })
      break
    }
    case 'effect': {
      behaviorActionImplementations.effect({
        context,
        action,
      })
      break
    }
    case 'history.redo': {
      behaviorActionImplementations['history.redo']({
        context,
        action,
      })
      break
    }
    case 'history.undo': {
      behaviorActionImplementations['history.undo']({
        context,
        action,
      })
      break
    }
    case 'insert.block': {
      behaviorActionImplementations['insert.block']({
        context,
        action,
      })
      break
    }
    case 'insert.inline object': {
      behaviorActionImplementations['insert.inline object']({
        context,
        action,
      })
      break
    }
    case 'insert.span': {
      behaviorActionImplementations['insert.span']({
        context,
        action,
      })
      break
    }
    case 'insert.text': {
      behaviorActionImplementations['insert.text']({
        context,
        action,
      })
      break
    }
    case 'move.backward': {
      behaviorActionImplementations['move.backward']({
        context,
        action,
      })
      break
    }
    case 'move.block': {
      behaviorActionImplementations['move.block']({
        context,
        action,
      })
      break
    }
    case 'move.forward': {
      behaviorActionImplementations['move.forward']({
        context,
        action,
      })
      break
    }
    case 'noop': {
      behaviorActionImplementations.noop({
        context,
        action,
      })
      break
    }
    case 'split.block': {
      behaviorActionImplementations['split.block']({
        context,
        action,
      })
      break
    }
    default: {
      behaviorActionImplementations.select({
        context,
        action,
      })
      break
    }
  }
}
