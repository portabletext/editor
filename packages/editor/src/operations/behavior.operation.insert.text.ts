import {Transforms} from 'slate'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import {getActiveAnnotations} from '../editor/get-active-annotations'
import {getActiveDecorators} from '../editor/get-active-decorators'
import {
  getFocusSpan,
  slateRangeToSelection,
} from '../internal-utils/slate-utils'
import {getMarkState} from '../selectors/selector.get-mark-state'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const insertTextOperationImplementation: BehaviorOperationImplementation<
  'insert.text'
> = ({context, operation}) => {
  const snapshot: EditorSnapshot = {
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
      decoratorState: operation.editor.decoratorState,
      converters: [],
      readOnly: false,
    },
  }

  const markState = getMarkState(snapshot)
  const activeDecorators = getActiveDecorators(snapshot)
  const activeAnnotations = getActiveAnnotations(snapshot)

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
