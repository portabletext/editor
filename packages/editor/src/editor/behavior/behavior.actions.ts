import {Editor, Transforms} from 'slate'
import type {PortableTextMemberSchemaTypes} from '../../types/editor'
import {toSlateRange} from '../../utils/ranges'
import type {BehaviorAction, PickFromUnion} from './behavior.types'

type BehaviorActionContext = {
  keyGenerator: () => string
  schema: PortableTextMemberSchemaTypes
}

type BehaviourActionImplementation<TBehaviorAction extends BehaviorAction> = ({
  context,
  event,
}: {
  context: BehaviorActionContext
  event: TBehaviorAction
}) => void

type BehaviourActionImplementations = {
  [TBehaviorActionType in BehaviorAction['type']]: BehaviourActionImplementation<
    PickFromUnion<BehaviorAction, 'type', TBehaviorActionType>
  >
}

export const behaviorActionImplementations: BehaviourActionImplementations = {
  'apply block style': ({event}) => {
    for (const path of event.paths) {
      const at = toSlateRange(
        {anchor: {path, offset: 0}, focus: {path, offset: 0}},
        event.editor,
      )!

      Transforms.setNodes(event.editor, {style: event.style}, {at})
    }
  },
  'delete backward': ({event}) => {
    // Since this calls the native Editor method it will trigger a new behavior
    // event
    Editor.deleteBackward(event.editor, {unit: event.unit})
  },
  'delete text': ({event}) => {
    Transforms.delete(event.editor, {
      at: toSlateRange(event.selection, event.editor)!,
    })
  },
  'insert break': ({event}) => {
    // Since this calls the native Editor method it will trigger a new behavior
    // event
    Editor.insertBreak(event.editor)
  },
  'insert soft break': ({event}) => {
    // Since this calls the native Editor method it will trigger a new behavior
    // event
    Editor.insertSoftBreak(event.editor)
  },
  'insert text': ({event}) => {
    // Since this calls the native Editor method it will trigger a new behavior
    // event
    Editor.insertText(event.editor, event.text)
  },
  'insert text block': ({context, event}) => {
    Editor.insertNode(event.editor, {
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
}
