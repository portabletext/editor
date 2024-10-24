import {Editor} from 'slate'
import type {PortableTextMemberSchemaTypes} from '../../types/editor'
import type {BehaviorAction, PickFromUnion} from './behavior.types'

type BehaviorActionContext = {
  keyGenerator: () => string
  schema: PortableTextMemberSchemaTypes
}

export function inserText({
  event,
}: {
  context: BehaviorActionContext
  event: PickFromUnion<BehaviorAction, 'type', 'insert text'>
}) {
  Editor.insertText(event.editor, event.text)
}

export function inserTextBlock({
  context,
  event,
}: {
  context: BehaviorActionContext
  event: PickFromUnion<BehaviorAction, 'type', 'insert text block'>
}) {
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
}
