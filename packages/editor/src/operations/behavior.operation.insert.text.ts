import {Transforms} from 'slate'
import {getActiveAnnotations} from '../editor/get-active-annotations'
import {getActiveDecorators} from '../editor/get-active-decorators'
import {getMarkState} from '../internal-utils/mark-state'
import {getFocusSpan} from '../internal-utils/slate-utils'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const insertTextOperationImplementation: BehaviorOperationImplementation<
  'insert.text'
> = ({context, operation}) => {
  const activeDecorators = getActiveDecorators({
    schema: context.schema,
    slateEditorInstance: operation.editor,
  })
  const activeAnnotations = getActiveAnnotations({
    schema: context.schema,
    editor: operation.editor,
  })

  const [focusSpan] = getFocusSpan({
    editor: operation.editor,
  })

  if (!focusSpan) {
    Transforms.insertText(operation.editor, operation.text)
    return
  }

  const markState = getMarkState({
    editor: operation.editor,
    schema: context.schema,
  })

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
