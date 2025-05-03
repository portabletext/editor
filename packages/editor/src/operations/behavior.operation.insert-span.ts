import {Editor, Transforms} from 'slate'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const insertSpanOperationImplementation: BehaviorOperationImplementation<
  'insert.span'
> = ({context, operation}) => {
  if (!operation.editor.selection) {
    console.error('Unable to perform action without selection', operation)
    return
  }

  const [focusBlock, focusBlockPath] = Array.from(
    Editor.nodes(operation.editor, {
      at: operation.editor.selection.focus.path,
      match: (node) => operation.editor.isTextBlock(node),
    }),
  )[0] ?? [undefined, undefined]

  if (!focusBlock || !focusBlockPath) {
    console.error('Unable to perform action without focus block', operation)
    return
  }

  const markDefs = focusBlock.markDefs ?? []
  const annotations = operation.annotations
    ? operation.annotations.map((annotation) => ({
        _type: annotation.name,
        _key: context.keyGenerator(),
        ...annotation.value,
      }))
    : undefined

  if (annotations && annotations.length > 0) {
    Transforms.setNodes(operation.editor, {
      markDefs: [...markDefs, ...annotations],
    })
  }

  Transforms.insertNodes(operation.editor, {
    _type: 'span',
    _key: context.keyGenerator(),
    text: operation.text,
    marks: [
      ...(annotations?.map((annotation) => annotation._key) ?? []),
      ...(operation.decorators ?? []),
    ],
  })
}
