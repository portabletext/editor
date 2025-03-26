import {omit} from 'lodash'
import type {InternalBehaviorAction} from '../behaviors/behavior.types.action'
import type {EditorContext} from '../editor/editor-snapshot'
import {
  addAnnotationActionImplementation,
  removeAnnotationActionImplementation,
  toggleAnnotationActionImplementation,
} from '../editor/plugins/createWithEditableAPI'
import {
  removeDecoratorActionImplementation,
  toggleDecoratorActionImplementation,
} from '../editor/plugins/createWithPortableTextMarkModel'
import {
  historyRedoActionImplementation,
  historyUndoActionImplementation,
} from '../editor/plugins/createWithUndoRedo'
import {debugWithName} from '../internal-utils/debug'
import type {PickFromUnion} from '../type-utils'
import {blockSetBehaviorActionImplementation} from './behavior.action.block.set'
import {blockUnsetBehaviorActionImplementation} from './behavior.action.block.unset'
import {blurActionImplementation} from './behavior.action.blur'
import {decoratorAddActionImplementation} from './behavior.action.decorator.add'
import {deleteActionImplementation} from './behavior.action.delete'
import {deleteBackwardActionImplementation} from './behavior.action.delete.backward'
import {deleteBlockActionImplementation} from './behavior.action.delete.block'
import {deleteForwardActionImplementation} from './behavior.action.delete.forward'
import {deleteTextActionImplementation} from './behavior.action.delete.text'
import {effectActionImplementation} from './behavior.action.effect'
import {focusActionImplementation} from './behavior.action.focus'
import {insertBlocksActionImplementation} from './behavior.action.insert-blocks'
import {
  insertBreakActionImplementation,
  insertSoftBreakActionImplementation,
} from './behavior.action.insert-break'
import {insertInlineObjectActionImplementation} from './behavior.action.insert-inline-object'
import {insertSpanActionImplementation} from './behavior.action.insert-span'
import {insertBlockActionImplementation} from './behavior.action.insert.block'
import {insertTextActionImplementation} from './behavior.action.insert.text'
import {moveBlockActionImplementation} from './behavior.action.move.block'
import {moveBlockDownActionImplementation} from './behavior.action.move.block-down'
import {moveBlockUpActionImplementation} from './behavior.action.move.block-up'
import {noopActionImplementation} from './behavior.action.noop'
import {selectActionImplementation} from './behavior.action.select'
import {selectNextBlockActionImplementation} from './behavior.action.select.next-block'
import {selectPreviousBlockActionImplementation} from './behavior.action.select.previous-block'

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
  'annotation.toggle': toggleAnnotationActionImplementation,
  'block.set': blockSetBehaviorActionImplementation,
  'block.unset': blockUnsetBehaviorActionImplementation,
  'blur': blurActionImplementation,
  'decorator.add': decoratorAddActionImplementation,
  'decorator.remove': removeDecoratorActionImplementation,
  'decorator.toggle': toggleDecoratorActionImplementation,
  'focus': focusActionImplementation,
  'delete': deleteActionImplementation,
  'delete.backward': deleteBackwardActionImplementation,
  'delete.forward': deleteForwardActionImplementation,
  'delete.block': deleteBlockActionImplementation,
  'delete.text': deleteTextActionImplementation,
  'history.redo': historyRedoActionImplementation,
  'history.undo': historyUndoActionImplementation,
  'insert.block': insertBlockActionImplementation,
  'insert.blocks': insertBlocksActionImplementation,
  'insert.break': insertBreakActionImplementation,
  'insert.inline object': insertInlineObjectActionImplementation,
  'insert.soft break': insertSoftBreakActionImplementation,
  'insert.span': insertSpanActionImplementation,
  'insert.text': insertTextActionImplementation,
  'effect': effectActionImplementation,
  'move.block': moveBlockActionImplementation,
  'move.block down': moveBlockDownActionImplementation,
  'move.block up': moveBlockUpActionImplementation,
  'noop': noopActionImplementation,
  'select': selectActionImplementation,
  'select.previous block': selectPreviousBlockActionImplementation,
  'select.next block': selectNextBlockActionImplementation,
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
    case 'annotation.toggle': {
      behaviorActionImplementations['annotation.toggle']({
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
    case 'blur': {
      behaviorActionImplementations.blur({
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
    case 'decorator.toggle': {
      behaviorActionImplementations['decorator.toggle']({
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
    case 'delete.text': {
      behaviorActionImplementations['delete.text']({
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
    case 'focus': {
      behaviorActionImplementations.focus({
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
    case 'insert.blocks': {
      behaviorActionImplementations['insert.blocks']({
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
    case 'insert.break': {
      behaviorActionImplementations['insert.break']({
        context,
        action,
      })
      break
    }
    case 'insert.soft break': {
      behaviorActionImplementations['insert.soft break']({
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
    case 'move.block': {
      behaviorActionImplementations['move.block']({
        context,
        action,
      })
      break
    }
    case 'move.block down': {
      behaviorActionImplementations['move.block down']({
        context,
        action,
      })
      break
    }
    case 'move.block up': {
      behaviorActionImplementations['move.block up']({
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
    case 'select': {
      behaviorActionImplementations.select({
        context,
        action,
      })
      break
    }
    case 'select.previous block': {
      behaviorActionImplementations['select.previous block']({
        context,
        action,
      })
      break
    }
    default: {
      behaviorActionImplementations['select.next block']({
        context,
        action,
      })
      break
    }
  }
}
