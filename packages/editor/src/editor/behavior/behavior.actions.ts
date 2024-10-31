import {
  deleteBackward,
  deleteForward,
  Editor,
  insertText,
  Transforms,
} from 'slate'
import type {PortableTextMemberSchemaTypes} from '../../types/editor'
import {toSlateRange} from '../../utils/ranges'
import {insertBreakActionImplementation} from './behavior.action.insert-break'
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
  TBehaviorAction extends BehaviorAction,
> = ({
  context,
  action,
}: {
  context: BehaviorActionContext
  action: TBehaviorAction
}) => void

type BehaviourActionImplementations = {
  [TBehaviorActionType in BehaviorAction['type']]: BehaviourActionImplementation<
    PickFromUnion<BehaviorAction, 'type', TBehaviorActionType>
  >
}

const behaviorActionImplementations: BehaviourActionImplementations = {
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
  'insert break': insertBreakActionImplementation,
  // This mimics Slate's internal which also just does a regular insert break
  // when on soft break
  'insert soft break': insertBreakActionImplementation,
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
    Transforms.select(
      action.editor,
      toSlateRange(action.selection, action.editor)!,
    )
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
    default: {
      performDefaultAction({context, action})
    }
  }
}

export function performDefaultAction({
  context,
  action,
}: {
  context: BehaviorActionContext
  action: PickFromUnion<BehaviorAction, 'type', BehaviorEvent['type']>
}) {
  switch (action.type) {
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
