import {deleteBackward, deleteForward, insertText, Transforms} from 'slate'
import {ReactEditor} from 'slate-react'
import type {PortableTextMemberSchemaTypes} from '../../types/editor'
import {toSlateRange} from '../../utils/ranges'
import {fromSlateValue, toSlateValue} from '../../utils/values'
import {KEY_TO_VALUE_ELEMENT} from '../../utils/weakMaps'
import {
  addAnnotationActionImplementation,
  removeAnnotationActionImplementation,
  toggleAnnotationActionImplementation,
} from '../plugins/createWithEditableAPI'
import {
  addDecoratorActionImplementation,
  removeDecoratorActionImplementation,
  toggleDecoratorActionImplementation,
} from '../plugins/createWithPortableTextMarkModel'
import {insertBlock} from './behavior.action-utils.insert-block'
import {insertBlockObjectActionImplementation} from './behavior.action.insert-block-object'
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
import {blockOffsetToSpanSelectionPoint} from './behavior.utils.block-offset'

export type BehaviorActionContext = {
  keyGenerator: () => string
  schema: PortableTextMemberSchemaTypes
}

export type BehaviorActionImplementation<
  TBehaviorActionType extends BehaviorAction['type'],
  TReturnType = void,
> = ({
  context,
  action,
}: {
  context: BehaviorActionContext
  action: PickFromUnion<BehaviorAction, 'type', TBehaviorActionType>
}) => TReturnType

type BehaviorActionImplementations = {
  [TBehaviorActionType in BehaviorAction['type']]: BehaviorActionImplementation<TBehaviorActionType>
}

const behaviorActionImplementations: BehaviorActionImplementations = {
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
  'delete block': ({action}) => {
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
  'delete text': ({context, action}) => {
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
  'insert block object': insertBlockObjectActionImplementation,
  'insert break': insertBreakActionImplementation,
  'insert soft break': insertSoftBreakActionImplementation,
  'insert span': insertSpanActionImplementation,
  'insert text': ({action}) => {
    insertText(action.editor, action.text)
  },
  'insert text block': ({context, action}) => {
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
  'paste': ({action}) => {
    action.editor.insertData(action.clipboardData)
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
    case 'delete block': {
      behaviorActionImplementations['delete block']({
        context,
        action,
      })
      break
    }
    case 'delete text': {
      behaviorActionImplementations['delete text']({
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
    case 'insert text': {
      behaviorActionImplementations['insert text']({
        context,
        action,
      })
      break
    }
    default: {
      behaviorActionImplementations.paste({
        context,
        action,
      })
    }
  }
}
