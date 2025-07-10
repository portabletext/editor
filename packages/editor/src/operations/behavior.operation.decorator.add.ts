import {Editor, Range, Text, Transforms} from 'slate'
import {slateRangeToSelection} from '../internal-utils/slate-utils'
import {toSlateRange} from '../internal-utils/to-slate-range'
import {fromSlateValue} from '../internal-utils/values'
import {KEY_TO_VALUE_ELEMENT} from '../internal-utils/weakMaps'
import * as selectors from '../selectors'
import * as utils from '../utils'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const decoratorAddOperationImplementation: BehaviorOperationImplementation<
  'decorator.add'
> = ({context, operation}) => {
  const editor = operation.editor
  const mark = operation.decorator
  const value = fromSlateValue(
    editor.children,
    context.schema.block.name,
    KEY_TO_VALUE_ELEMENT.get(editor),
  )

  const manualAnchor = operation.at?.anchor
    ? utils.blockOffsetToSpanSelectionPoint({
        context: {
          ...context,
          value,
        },
        blockOffset: operation.at.anchor,
        direction: 'backward',
      })
    : undefined
  const manualFocus = operation.at?.focus
    ? utils.blockOffsetToSpanSelectionPoint({
        context: {
          ...context,
          value,
        },
        blockOffset: operation.at.focus,
        direction: 'forward',
      })
    : undefined
  const manualSelection =
    manualAnchor && manualFocus
      ? {
          anchor: manualAnchor,
          focus: manualFocus,
        }
      : undefined

  const selection = manualSelection
    ? (toSlateRange({
        context: {
          schema: context.schema,
          value: operation.editor.value,
          selection: manualSelection,
        },
        blockIndexMap: operation.editor.blockIndexMap,
      }) ?? editor.selection)
    : editor.selection

  if (!selection) {
    return
  }

  const editorSelection = slateRangeToSelection({
    schema: context.schema,
    editor,
    range: selection,
  })
  const anchorOffset = editorSelection
    ? utils.selectionPointToBlockOffset({
        context: {
          ...context,
          value,
        },
        selectionPoint: editorSelection.anchor,
      })
    : undefined
  const focusOffset = editorSelection
    ? utils.selectionPointToBlockOffset({
        context: {
          ...context,
          value,
        },
        selectionPoint: editorSelection.focus,
      })
    : undefined

  if (!anchorOffset || !focusOffset) {
    throw new Error('Unable to find anchor or focus offset')
  }

  if (Range.isExpanded(selection)) {
    // Split if needed
    Transforms.setNodes(
      editor,
      {},
      {at: selection, match: Text.isText, split: true, hanging: true},
    )

    // The value might have changed after splitting
    const newValue = fromSlateValue(
      editor.children,
      context.schema.block.name,
      KEY_TO_VALUE_ELEMENT.get(editor),
    )
    // We need to find the new selection from the original offsets because the
    // split operation might have changed the value.
    const newSelection = utils.blockOffsetsToSelection({
      context: {
        ...context,
        value: newValue,
      },
      offsets: {anchor: anchorOffset, focus: focusOffset},
      backward: editorSelection?.backward,
    })

    const trimmedSelection = selectors.getTrimmedSelection({
      blockIndexMap: editor.blockIndexMap,
      context: {
        converters: [],
        keyGenerator: context.keyGenerator,
        readOnly: false,
        schema: context.schema,
        selection: newSelection,
        value: newValue,
      },
      decoratorState: editor.decoratorState,
    })

    if (!trimmedSelection) {
      throw new Error('Unable to find trimmed selection')
    }

    const newRange = toSlateRange({
      context: {
        schema: context.schema,
        value: operation.editor.value,
        selection: trimmedSelection,
      },
      blockIndexMap: operation.editor.blockIndexMap,
    })

    if (!newRange) {
      throw new Error('Unable to find new selection')
    }

    // Use new selection to find nodes to decorate
    const splitTextNodes = Range.isRange(newRange)
      ? [
          ...Editor.nodes(editor, {
            at: newRange,
            match: (node) => Text.isText(node),
          }),
        ]
      : []

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
        at: selection,
        match: (node) => editor.isTextSpan(node),
      }),
    )?.at(0)

    if (!selectedSpan) {
      return
    }

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
