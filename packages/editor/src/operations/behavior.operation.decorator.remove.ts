import {Editor, Element, Range, Text, Transforms} from 'slate'
import type {OperationImplementation} from './operation.types'

export const decoratorRemoveOperationImplementation: OperationImplementation<
  'decorator.remove'
> = ({operation}) => {
  const editor = operation.editor
  const mark = operation.decorator
  const {selection} = editor

  if (selection) {
    if (Range.isExpanded(selection)) {
      // Split if needed
      Transforms.setNodes(
        editor,
        {},
        {match: Text.isText, split: true, hanging: true},
      )
      if (editor.selection) {
        const splitTextNodes = [
          ...Editor.nodes(editor, {
            at: editor.selection,
            match: Text.isText,
          }),
        ]
        splitTextNodes.forEach(([node, path]) => {
          const block = editor.children[path[0]]
          if (Element.isElement(block) && block.children.includes(node)) {
            Transforms.setNodes(
              editor,
              {
                marks: (Array.isArray(node.marks) ? node.marks : []).filter(
                  (eMark: string) => eMark !== mark,
                ),
                _type: 'span',
              },
              {at: path},
            )
          }
        })
      }
    } else {
      const [block, blockPath] = Editor.node(editor, selection, {
        depth: 1,
      })
      const lonelyEmptySpan =
        editor.isTextBlock(block) &&
        block.children.length === 1 &&
        editor.isTextSpan(block.children[0]) &&
        block.children[0].text === ''
          ? block.children[0]
          : undefined

      if (lonelyEmptySpan) {
        const existingMarks = lonelyEmptySpan.marks ?? []
        const existingMarksWithoutDecorator = existingMarks.filter(
          (existingMark) => existingMark !== mark,
        )

        Transforms.setNodes(
          editor,
          {
            marks: existingMarksWithoutDecorator,
          },
          {
            at: blockPath,
            match: (node) => editor.isTextSpan(node),
          },
        )
      } else {
        editor.decoratorState[mark] = false
      }
    }

    if (editor.selection) {
      // Reselect
      const selection = editor.selection
      editor.selection = {...selection}
    }
  }
}
