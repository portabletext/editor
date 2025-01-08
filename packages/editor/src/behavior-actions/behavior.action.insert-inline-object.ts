import {Editor, Transforms, type Element} from 'slate'
import {toSlateValue} from '../internal-utils/values'
import type {BehaviorActionImplementation} from './behavior.actions'

export const insertInlineObjectActionImplementation: BehaviorActionImplementation<
  'insert.inline object'
> = ({context, action}) => {
  if (
    !context.schema.inlineObjects.some(
      (inlineObject) => inlineObject.name === action.inlineObject.name,
    )
  ) {
    console.error('Unable to insert unknown inline object')
    return
  }

  if (!action.editor.selection) {
    console.error('Unable to insert inline object without selection')
    return
  }

  const [focusTextBlock] = Array.from(
    Editor.nodes(action.editor, {
      at: action.editor.selection.focus.path,
      match: (node) => action.editor.isTextBlock(node),
    }),
  ).at(0) ?? [undefined, undefined]

  if (!focusTextBlock) {
    console.error('Unable to perform action without focus text block')
    return
  }

  const block = toSlateValue(
    [
      {
        _type: context.schema.block.name,
        _key: context.keyGenerator(),
        children: [
          {
            _type: action.inlineObject.name,
            _key: context.keyGenerator(),
            ...(action.inlineObject.value ?? {}),
          },
        ],
      },
    ],
    {schemaTypes: context.schema},
  ).at(0) as unknown as Element
  const child = block?.children.at(0)

  if (!child) {
    console.error('Unable to insert inline object')
    return
  }

  Transforms.insertNodes(action.editor, child)
}
