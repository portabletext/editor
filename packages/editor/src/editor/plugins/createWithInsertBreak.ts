import {Editor, Node, Path, Range, Transforms} from 'slate'
import {
  type PortableTextMemberSchemaTypes,
  type PortableTextSlateEditor,
} from '../../types/editor'
import {type SlateTextBlock, type VoidElement} from '../../types/slate'

export function createWithInsertBreak(
  types: PortableTextMemberSchemaTypes,
): (editor: PortableTextSlateEditor) => PortableTextSlateEditor {
  return function withInsertBreak(
    editor: PortableTextSlateEditor,
  ): PortableTextSlateEditor {
    const {insertBreak} = editor

    editor.insertBreak = () => {
      if (!editor.selection || Range.isExpanded(editor.selection)) {
        insertBreak()
        return
      }

      const focusBlockPath = editor.selection.focus.path.slice(0, 1)
      const focusBlock = Node.descendant(editor, focusBlockPath) as
        | SlateTextBlock
        | VoidElement

      if (editor.isTextBlock(focusBlock)) {
        const [, end] = Range.edges(editor.selection)
        const isEndAtStartOfNode = Editor.isStart(editor, end, end.path)

        if (isEndAtStartOfNode) {
          const focusDecorators = editor.isTextSpan(focusBlock.children[0])
            ? (focusBlock.children[0].marks ?? []).filter((mark) =>
                types.decorators.some((decorator) => decorator.value === mark),
              )
            : []

          Editor.insertNode(
            editor,
            editor.pteCreateTextBlock({decorators: focusDecorators}),
          )

          const [nextBlockPath] = Path.next(focusBlockPath)

          Transforms.select(editor, {
            anchor: {path: [nextBlockPath, 0], offset: 0},
            focus: {path: [nextBlockPath, 0], offset: 0},
          })

          editor.onChange()
          return
        }
      }

      insertBreak()
    }

    return editor
  }
}
