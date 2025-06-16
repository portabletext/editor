import {Transforms} from 'slate'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import {
  getFocusSpan,
  slateRangeToSelection,
} from '../internal-utils/slate-utils'
import {getActiveAnnotationsMarks} from '../selectors/selector.get-active-annotation-marks'
import {getActiveDecorators} from '../selectors/selector.get-active-decorators'
import {getMarkState} from '../selectors/selector.get-mark-state'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const insertTextOperationImplementation: BehaviorOperationImplementation<
  'insert.text'
> = ({context, operation}) => {
  const snapshot: EditorSnapshot = {
    blockIndexMap: operation.editor.blockIndexMap,
    context: {
      value: operation.editor.value,
      selection: operation.editor.selection
        ? slateRangeToSelection({
            schema: context.schema,
            editor: operation.editor,
            range: operation.editor.selection,
          })
        : null,
      schema: context.schema,
      keyGenerator: context.keyGenerator,
      converters: [],
      readOnly: false,
    },
    decoratorState: operation.editor.decoratorState,
  }

  const markState = getMarkState(snapshot)
  const activeDecorators = getActiveDecorators(snapshot)
  const activeAnnotations = getActiveAnnotationsMarks(snapshot)

  const [focusSpan] = getFocusSpan({
    editor: operation.editor,
  })

  if (!focusSpan) {
    Transforms.insertText(operation.editor, operation.text)
    return
  }

  if (markState && markState.state === 'unchanged') {
    const markStateDecorators = (markState.marks ?? []).filter((mark) =>
      context.schema.decorators
        .map((decorator) => decorator.name)
        .includes(mark),
    )

    if (
      markStateDecorators.length === activeDecorators.length &&
      markStateDecorators.every((mark) => activeDecorators.includes(mark))
    ) {
      Transforms.insertText(operation.editor, operation.text)
      return
    }
  }

  Transforms.insertNodes(operation.editor, {
    _type: focusSpan._type,
    _key: context.keyGenerator(),
    text: operation.text,
    marks: [...activeDecorators, ...activeAnnotations],
  })

  operation.editor.decoratorState = {}
}
