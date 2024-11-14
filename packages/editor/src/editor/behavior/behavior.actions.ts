import {
  deleteBackward,
  deleteForward,
  Editor,
  insertText,
  Transforms,
} from 'slate'
import {ReactEditor} from 'slate-react'
import type {PortableTextMemberSchemaTypes} from '../../types/editor'
import {toSlateRange} from '../../utils/ranges'
import {
  addAnnotationActionImplementation,
  insertBlockObjectActionImplementation,
  removeAnnotationActionImplementation,
  toggleAnnotationActionImplementation,
} from '../plugins/createWithEditableAPI'
import {
  addDecoratorActionImplementation,
  removeDecoratorActionImplementation,
  toggleDecoratorActionImplementation,
} from '../plugins/createWithPortableTextMarkModel'
import {
  insertBreakActionImplementation,
  insertSoftBreakActionImplementation,
} from './behavior.action.insert-break'
import {insertSpanActionImplementation} from './behavior.action.insert-span'
import type {
  BehaviorAction,
  BehaviorEvent,
  PickFromUnion,
} from './behavior.types'

export type BehaviorActionContext = {
  keyGenerator: () => string
  schema: PortableTextMemberSchemaTypes
}

export type BehaviourActionImplementation<
  TBehaviorActionType extends BehaviorAction['type'],
  TReturnType = void,
> = ({
  context,
  action,
}: {
  context: BehaviorActionContext
  action: PickFromUnion<BehaviorAction, 'type', TBehaviorActionType>
}) => TReturnType

type BehaviourActionImplementations = {
  [TBehaviorActionType in BehaviorAction['type']]: BehaviourActionImplementation<TBehaviorActionType>
}

const behaviorActionImplementations: BehaviourActionImplementations = {
  'annotation.add': addAnnotationActionImplementation,
  'annotation.remove': removeAnnotationActionImplementation,
  'annotation.toggle': toggleAnnotationActionImplementation,
  'decorator.add': addDecoratorActionImplementation,
  'decorator.remove': removeDecoratorActionImplementation,
  'decorator.toggle': toggleDecoratorActionImplementation,
  'focus': ({action}) => {
    ReactEditor.focus(action.editor)
  },
  'set block': ({action}) => {
    for (const path of action.paths) {
      const at = toSlateRange(
        {anchor: {path, offset: 0}, focus: {path, offset: 0}},
        action.editor,
      )!

      Transforms.setNodes(
        action.editor,
        {
          ...(action.style ? {style: action.style} : {}),
          ...(action.listItem ? {listItem: action.listItem} : {}),
          ...(action.level ? {level: action.level} : {}),
        },
        {at},
      )
    }
  },
  'unset block': ({action}) => {
    for (const path of action.paths) {
      const at = toSlateRange(
        {anchor: {path, offset: 0}, focus: {path, offset: 0}},
        action.editor,
      )!

      Transforms.unsetNodes(action.editor, action.props, {at})
    }
  },
  'delete backward': ({action}) => {
    deleteBackward(action.editor, action.unit)
  },
  'delete forward': ({action}) => {
    deleteForward(action.editor, action.unit)
  },
  'delete': ({action}) => {
    const location = toSlateRange(action.selection, action.editor)

    if (!location) {
      console.error(
        `Could not find Slate location from selection ${action.selection}`,
      )
      return
    }

    if (location.anchor.path.length === 1 && location.focus.path.length === 1) {
      Transforms.removeNodes(action.editor, {
        at: location,
      })
    } else {
      Transforms.delete(action.editor, {
        at: location,
      })
    }
  },
  'insert block object': insertBlockObjectActionImplementation,
  'insert break': insertBreakActionImplementation,
  'insert soft break': insertSoftBreakActionImplementation,
  'insert span': insertSpanActionImplementation,
  'insert text': ({action}) => {
    insertText(action.editor, action.text)
  },
  'insert text block': ({context, action}) => {
    Editor.insertNode(action.editor, {
      _key: context.keyGenerator(),
      _type: context.schema.block.name,
      style: context.schema.styles[0].value ?? 'normal',
      markDefs: [],
      children: [
        {
          _key: context.keyGenerator(),
          _type: 'span',
          text: '',
        },
      ],
    })
  },
  'effect': ({action}) => {
    action.effect()
  },
  'select': ({action}) => {
    const newSelection = toSlateRange(action.selection, action.editor)

    if (newSelection) {
      Transforms.select(action.editor, newSelection)
    } else {
      Transforms.deselect(action.editor)
    }
  },
  'reselect': ({action}) => {
    const selection = action.editor.selection

    if (selection) {
      Transforms.select(action.editor, {...selection})
      action.editor.selection = {...selection}
    }
  },
}

export function performAction({
  context,
  action,
}: {
  context: BehaviorActionContext
  action: BehaviorAction
}) {
  switch (action.type) {
    case 'delete': {
      behaviorActionImplementations.delete({
        context,
        action,
      })
      break
    }
    case 'insert block object': {
      behaviorActionImplementations['insert block object']({
        context,
        action,
      })
      break
    }
    case 'insert span': {
      behaviorActionImplementations['insert span']({
        context,
        action,
      })
      break
    }
    case 'insert text block': {
      behaviorActionImplementations['insert text block']({
        context,
        action,
      })
      break
    }
    case 'set block': {
      behaviorActionImplementations['set block']({
        context,
        action,
      })
      break
    }
    case 'unset block': {
      behaviorActionImplementations['unset block']({
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
    case 'reselect': {
      behaviorActionImplementations.reselect({
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
  context: BehaviorActionContext
  action: PickFromUnion<BehaviorAction, 'type', BehaviorEvent['type']>
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
    case 'delete backward': {
      behaviorActionImplementations['delete backward']({
        context,
        action,
      })
      break
    }
    case 'delete forward': {
      behaviorActionImplementations['delete forward']({
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
    case 'insert break': {
      behaviorActionImplementations['insert break']({
        context,
        action,
      })
      break
    }
    case 'insert soft break': {
      behaviorActionImplementations['insert soft break']({
        context,
        action,
      })
      break
    }
    default: {
      behaviorActionImplementations['insert text']({
        context,
        action,
      })
    }
  }
}
