import {Editor, Range, Text, Transforms} from 'slate'
import {toSlateRange} from '../internal-utils/to-slate-range'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const decoratorAddOperationImplementation: BehaviorOperationImplementation<
  'decorator.add'
> = ({context, operation}) => {
  const editor = operation.editor
  const mark = operation.decorator

  let at = operation.at
    ? toSlateRange({
        context: {
          schema: context.schema,
          value: operation.editor.value,
          selection: operation.at,
        },
        blockIndexMap: operation.editor.blockIndexMap,
      })
    : operation.editor.selection

  if (!at) {
    throw new Error('Unable to add decorator without a selection')
  }

  if (Range.isExpanded(at)) {
    const rangeRef = Editor.rangeRef(editor, at, {affinity: 'inward'})
    const [start, end] = Range.edges(at)

    const endAtEndOfNode = Editor.isEnd(editor, end, end.path)

    Transforms.splitNodes(editor, {
      at: end,
      match: Text.isText,
      mode: 'lowest',
      voids: false,
      always: !endAtEndOfNode,
    })

    const startAtStartOfNode = Editor.isStart(editor, start, start.path)

    Transforms.splitNodes(editor, {
      at: start,
      match: Text.isText,
      mode: 'lowest',
      voids: false,
      always: !startAtStartOfNode,
    })

    at = rangeRef.unref()

    if (!at) {
      throw new Error('Unable to add decorator without a selection')
    }

    if (!operation.at) {
      Transforms.select(editor, at)
    }

    // Use new selection to find nodes to decorate
    const splitTextNodes = Editor.nodes(editor, {
      at,
      match: Text.isText,
    })

    for (const [node, path] of splitTextNodes) {
      const marks = [
        ...(Array.isArray(node.marks) ? node.marks : []).filter(
          (eMark: string) => eMark !== mark,
        ),
        mark,
      ]
      Transforms.setNodes(
        editor,
        {marks},
        {at: path, match: Text.isText, split: true, hanging: true},
      )
    }
  } else {
    const selectedSpan = Array.from(
      Editor.nodes(editor, {
        at,
        match: (node) => editor.isTextSpan(node),
      }),
    )?.at(0)

    if (!selectedSpan) {
      return
    }

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
          marks:
            existingMarks.length === existingMarksWithoutDecorator.length
              ? [...existingMarks, mark]
              : existingMarksWithoutDecorator,
        },
        {
          at: blockPath,
          match: (node) => editor.isTextSpan(node),
        },
      )
    } else {
      editor.decoratorState[mark] = true
    }
  }

  if (editor.selection) {
    // Reselect
    const selection = editor.selection
    editor.selection = {...selection}
  }
}
