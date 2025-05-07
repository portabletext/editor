import {Editor, Transforms, type Element} from 'slate'
import {parseInlineObject} from '../internal-utils/parse-blocks'
import {toSlateValue} from '../internal-utils/values'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const insertInlineObjectOperationImplementation: BehaviorOperationImplementation<
  'insert.inline object'
> = ({context, operation}) => {
  const parsedInlineObject = parseInlineObject({
    context,
    inlineObject: {
      _type: operation.inlineObject.name,
      ...(operation.inlineObject.value ?? {}),
    },
    options: {refreshKeys: false, validateFields: true},
  })

  if (!parsedInlineObject) {
    throw new Error(
      `Failed to parse inline object ${JSON.stringify(operation.inlineObject)}`,
    )
  }

  if (!operation.editor.selection) {
    console.error('Unable to insert inline object without selection')
    return
  }

  const [focusTextBlock] = Array.from(
    Editor.nodes(operation.editor, {
      at: operation.editor.selection.focus.path,
      match: (node) => operation.editor.isTextBlock(node),
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
        children: [parsedInlineObject],
      },
    ],
    {schemaTypes: context.schema},
  ).at(0) as unknown as Element
  const child = block?.children.at(0)

  if (!child) {
    console.error('Unable to insert inline object')
    return
  }

  Transforms.insertNodes(operation.editor, child)
}
