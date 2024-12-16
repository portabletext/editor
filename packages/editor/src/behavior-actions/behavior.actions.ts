import {
  deleteBackward,
  deleteForward,
  insertText,
  Path,
  Transforms,
} from 'slate'
import {ReactEditor} from 'slate-react'
import type {
  BehaviorAction,
  SyntheticBehaviorEvent,
} from '../behaviors/behavior.types'
import type {EditorContext} from '../editor/editor-snapshot'
import {
  addAnnotationActionImplementation,
  removeAnnotationActionImplementation,
  toggleAnnotationActionImplementation,
} from '../editor/plugins/createWithEditableAPI'
import {
  addDecoratorActionImplementation,
  removeDecoratorActionImplementation,
  toggleDecoratorActionImplementation,
} from '../editor/plugins/createWithPortableTextMarkModel'
import {blockOffsetToSpanSelectionPoint} from '../editor/utils/utils.block-offset'
import type {PickFromUnion} from '../type-utils'
import {toSlatePath} from '../utils/paths'
import {toSlateRange} from '../utils/ranges'
import {fromSlateValue, toSlateValue} from '../utils/values'
import {KEY_TO_VALUE_ELEMENT} from '../utils/weakMaps'
import {insertBlock} from './behavior.action-utils.insert-block'
import {insertBlockObjectActionImplementation} from './behavior.action.insert-block-object'
import {
  insertBreakActionImplementation,
  insertSoftBreakActionImplementation,
} from './behavior.action.insert-break'
import {insertInlineObjectActionImplementation} from './behavior.action.insert-inline-object'
import {insertSpanActionImplementation} from './behavior.action.insert-span'
import {
  addListItemActionImplementation,
  removeListItemActionImplementation,
  toggleListItemActionImplementation,
} from './behavior.action.list-item'
import {
  addStyleActionImplementation,
  removeStyleActionImplementation,
  toggleStyleActionImplementation,
} from './behavior.action.style'
import {textBlockSetActionImplementation} from './behavior.action.text-block.set'
import {textBlockUnsetActionImplementation} from './behavior.action.text-block.unset'

export type BehaviorActionImplementationContext = Pick<
  EditorContext,
  'keyGenerator' | 'schema'
>

export type BehaviorActionImplementation<
  TBehaviorActionType extends BehaviorAction['type'],
  TReturnType = void,
> = ({
  context,
  action,
}: {
  context: BehaviorActionImplementationContext
  action: PickFromUnion<BehaviorAction, 'type', TBehaviorActionType>
}) => TReturnType

type BehaviorActionImplementations = {
  [TBehaviorActionType in BehaviorAction['type']]: BehaviorActionImplementation<TBehaviorActionType>
}

const behaviorActionImplementations: BehaviorActionImplementations = {
  'annotation.add': addAnnotationActionImplementation,
  'annotation.remove': removeAnnotationActionImplementation,
  'annotation.toggle': toggleAnnotationActionImplementation,
  'blur': ({action}) => {
    ReactEditor.blur(action.editor)
  },
  'decorator.add': addDecoratorActionImplementation,
  'decorator.remove': removeDecoratorActionImplementation,
  'decorator.toggle': toggleDecoratorActionImplementation,
  'focus': ({action}) => {
    ReactEditor.focus(action.editor)
  },
  'delete.backward': ({action}) => {
    deleteBackward(action.editor, action.unit)
  },
  'delete.forward': ({action}) => {
    deleteForward(action.editor, action.unit)
  },
  'delete.block': ({action}) => {
    const range = toSlateRange(
      {
        anchor: {path: action.blockPath, offset: 0},
        focus: {path: action.blockPath, offset: 0},
      },
      action.editor,
    )

    if (!range) {
      console.error('Unable to find Slate range from selection points')
      return
    }

    Transforms.removeNodes(action.editor, {
      at: range,
    })
  },
  'delete.text': ({context, action}) => {
    const value = fromSlateValue(
      action.editor.children,
      context.schema.block.name,
      KEY_TO_VALUE_ELEMENT.get(action.editor),
    )

    const anchor = blockOffsetToSpanSelectionPoint({
      value,
      blockOffset: action.anchor,
    })
    const focus = blockOffsetToSpanSelectionPoint({
      value,
      blockOffset: action.focus,
    })

    if (!anchor || !focus) {
      console.error('Unable to find anchor or focus selection point')
      return
    }

    const range = toSlateRange(
      {
        anchor,
        focus,
      },
      action.editor,
    )

    if (!range) {
      console.error('Unable to find Slate range from selection points')
      return
    }

    Transforms.delete(action.editor, {
      at: range,
    })
  },
  'insert.block object': insertBlockObjectActionImplementation,
  'insert.break': insertBreakActionImplementation,
  'insert.inline object': insertInlineObjectActionImplementation,
  'insert.soft break': insertSoftBreakActionImplementation,
  'insert.span': insertSpanActionImplementation,
  'insert.text': ({action}) => {
    insertText(action.editor, action.text)
  },
  'insert.text block': ({context, action}) => {
    const block = toSlateValue(
      [
        {
          _key: context.keyGenerator(),
          _type: context.schema.block.name,
          style: context.schema.styles[0].value ?? 'normal',
          markDefs: [],
          children: action.textBlock?.children?.map((child) => ({
            ...child,
            _key: context.keyGenerator(),
          })) ?? [
            {
              _type: context.schema.span.name,
              _key: context.keyGenerator(),
              text: '',
            },
          ],
        },
      ],
      {schemaTypes: context.schema},
    )[0]

    insertBlock({
      block,
      editor: action.editor,
      schema: context.schema,
      placement: action.placement,
    })
  },
  'effect': ({action}) => {
    action.effect()
  },
  'list item.add': addListItemActionImplementation,
  'list item.remove': removeListItemActionImplementation,
  'list item.toggle': toggleListItemActionImplementation,
  'move.block': ({action}) => {
    const at = [toSlatePath(action.at, action.editor)[0]]
    const to = [toSlatePath(action.to, action.editor)[0]]

    Transforms.moveNodes(action.editor, {
      at,
      to,
      mode: 'highest',
    })
  },
  'move.block down': ({action}) => {
    const at = [toSlatePath(action.at, action.editor)[0]]
    const to = [Path.next(at)[0]]

    Transforms.moveNodes(action.editor, {
      at,
      to,
      mode: 'highest',
    })
  },
  'move.block up': ({action}) => {
    const at = [toSlatePath(action.at, action.editor)[0]]

    if (!Path.hasPrevious(at)) {
      return
    }

    const to = [Path.previous(at)[0]]

    Transforms.moveNodes(action.editor, {
      at,
      to,
      mode: 'highest',
    })
  },
  'noop': () => {},
  'select': ({action}) => {
    const newSelection = toSlateRange(action.selection, action.editor)

    if (newSelection) {
      Transforms.select(action.editor, newSelection)
    } else {
      Transforms.deselect(action.editor)
    }
  },
  'select.previous block': ({action}) => {
    if (!action.editor.selection) {
      console.error('Unable to select previous block without a selection')
      return
    }

    const blockPath = action.editor.selection.focus.path.slice(0, 1)

    if (!Path.hasPrevious(blockPath)) {
      console.error("There's no previous block to select")
      return
    }

    const previousBlockPath = Path.previous(blockPath)

    Transforms.select(action.editor, previousBlockPath)
  },
  'select.next block': ({action}) => {
    if (!action.editor.selection) {
      console.error('Unable to select next block without a selection')
      return
    }

    const blockPath = action.editor.selection.focus.path.slice(0, 1)
    const nextBlockPath = [blockPath[0] + 1]

    Transforms.select(action.editor, nextBlockPath)
  },
  'reselect': ({action}) => {
    const selection = action.editor.selection

    if (selection) {
      Transforms.select(action.editor, {...selection})
      action.editor.selection = {...selection}
    }
  },
  'style.toggle': toggleStyleActionImplementation,
  'style.add': addStyleActionImplementation,
  'style.remove': removeStyleActionImplementation,
  'text block.set': textBlockSetActionImplementation,
  'text block.unset': textBlockUnsetActionImplementation,
}

export function performAction({
  context,
  action,
}: {
  context: BehaviorActionImplementationContext
  action: BehaviorAction
}) {
  switch (action.type) {
    case 'delete.block': {
      behaviorActionImplementations['delete.block']({
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
    case 'insert.span': {
      behaviorActionImplementations['insert.span']({
        context,
        action,
      })
      break
    }
    case 'insert.text block': {
      behaviorActionImplementations['insert.text block']({
        context,
        action,
      })
      break
    }
    case 'list item.add': {
      behaviorActionImplementations['list item.add']({
        context,
        action,
      })
      break
    }
    case 'list item.remove': {
      behaviorActionImplementations['list item.remove']({
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
    case 'effect': {
      behaviorActionImplementations.effect({
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
    case 'select.next block': {
      behaviorActionImplementations['select.next block']({
        context,
        action,
      })
      break
    }
    case 'reselect': {
      behaviorActionImplementations.reselect({
        context,
        action,
      })
      break
    }
    case 'style.add': {
      behaviorActionImplementations['style.add']({
        context,
        action,
      })
      break
    }
    case 'style.remove': {
      behaviorActionImplementations['style.remove']({
        context,
        action,
      })
      break
    }
    case 'text block.set': {
      behaviorActionImplementations['text block.set']({
        context,
        action,
      })
      break
    }
    case 'text block.unset': {
      behaviorActionImplementations['text block.unset']({
        context,
        action,
      })
      break
    }
    default: {
      performDefaultAction({context, action})
    }
  }
}

function performDefaultAction({
  context,
  action,
}: {
  context: BehaviorActionImplementationContext
  action: PickFromUnion<BehaviorAction, 'type', SyntheticBehaviorEvent['type']>
}) {
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
    case 'delete.backward': {
      behaviorActionImplementations['delete.backward']({
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
    case 'focus': {
      behaviorActionImplementations.focus({
        context,
        action,
      })
      break
    }
    case 'insert.block object': {
      behaviorActionImplementations['insert.block object']({
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
    case 'insert.text': {
      behaviorActionImplementations['insert.text']({
        context,
        action,
      })
      break
    }
    case 'list item.toggle': {
      behaviorActionImplementations['list item.toggle']({
        context,
        action,
      })
      break
    }
    default: {
      behaviorActionImplementations['style.toggle']({
        context,
        action,
      })
    }
  }
}
