import {Editor, Transforms} from 'slate'
import type {BehaviorActionImplementation} from './behavior.actions'

export const insertSpanActionImplementation: BehaviorActionImplementation<
  'insert.span'
> = ({context, action}) => {
  if (!action.editor.selection) {
    console.error('Unable to perform action without selection', action)
    return
  }

  const [focusBlock, focusBlockPath] = Array.from(
    Editor.nodes(action.editor, {
      at: action.editor.selection.focus.path,
      match: (node) => action.editor.isTextBlock(node),
    }),
  )[0] ?? [undefined, undefined]

  if (!focusBlock || !focusBlockPath) {
    console.error('Unable to perform action without focus block', action)
    return
  }

  const markDefs = focusBlock.markDefs ?? []
  const annotations = action.annotations
    ? action.annotations.map((annotation) => ({
        _type: annotation.name,
        _key: context.keyGenerator(),
        ...annotation.value,
      }))
    : undefined

  if (annotations && annotations.length > 0) {
    Transforms.setNodes(action.editor, {
      markDefs: [...markDefs, ...annotations],
    })
  }

  Transforms.insertNodes(action.editor, {
    _type: 'span',
    _key: context.keyGenerator(),
    text: action.text,
    marks: [
      ...(annotations?.map((annotation) => annotation._key) ?? []),
      ...(action.decorators ?? []),
    ],
  })
}
