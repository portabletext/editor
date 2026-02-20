import {toSlateRange} from '../internal-utils/to-slate-range'
import {Editor, Range, Transforms} from '../slate'
import type {OperationImplementation} from './operation.types'

export const decoratorRemoveOperationImplementation: OperationImplementation<
  'decorator.remove'
> = ({context, operation}) => {
  const editor = operation.editor
  const mark = operation.decorator
  const at = operation.at
    ? toSlateRange({
        context: {
          schema: context.schema,
          value: operation.editor.children,
          selection: operation.at,
        },
        blockIndexMap: operation.editor.blockIndexMap,
      })
    : editor.selection

  if (!at) {
    // Unable to remove decorator without a selection
    return
  }

  if (Range.isExpanded(at)) {
    const rangeRef = Editor.rangeRef(editor, at, {affinity: 'inward'})

    Transforms.setNodes(
      editor,
      {},
      {at, match: (n) => editor.isText(n), split: true, hanging: true},
    )

    const updatedAt = rangeRef.unref()

    if (updatedAt) {
      const splitTextNodes = [
        ...Editor.nodes(editor, {
          at: updatedAt,
          match: (n) => editor.isText(n),
        }),
      ]
      splitTextNodes.forEach(([node, path]) => {
        const block = editor.children[path[0]!]
        if (editor.isElement(block) && block.children?.includes(node)) {
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
    const [block, blockPath] = Editor.node(editor, at, {
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
