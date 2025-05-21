import {Transforms} from 'slate'
import {getActiveAnnotations} from '../editor/get-active-annotations'
import {getActiveDecorators} from '../editor/get-active-decorators'
import {getFocusSpan} from '../internal-utils/slate-utils'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const insertTextOperationImplementation: BehaviorOperationImplementation<
  'insert.text'
> = ({context, operation}) => {
  const activeDecorators = getActiveDecorators({
    decoratorState: operation.editor.decoratorState,
    markState: operation.editor.markState,
    schema: context.schema,
  })
  const activeAnnotations = getActiveAnnotations({
    markState: operation.editor.markState,
    schema: context.schema,
  })

  const [focusSpan] = getFocusSpan({
    editor: operation.editor,
  })

  if (!focusSpan) {
    Transforms.insertText(operation.editor, operation.text)
    return
  }

  if (
    operation.editor.markState &&
    operation.editor.markState.state === 'unchanged'
  ) {
    const markStateDecorators = (operation.editor.markState.marks ?? []).filter(
      (mark) =>
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
