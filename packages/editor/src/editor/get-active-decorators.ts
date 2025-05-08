import {getMarkState} from '../internal-utils/mark-state'
import type {PortableTextSlateEditor} from '../types/editor'
import type {EditorSchema} from './editor-schema'

export function getActiveDecorators({
  schema,
  slateEditorInstance,
}: {
  schema: EditorSchema
  slateEditorInstance: PortableTextSlateEditor
}) {
  const decorators = schema.decorators.map((decorator) => decorator.name)

  const markState = getMarkState({
    editor: slateEditorInstance,
    schema,
  })
  const markStateDecorators = (markState?.marks ?? []).filter((mark) =>
    decorators.includes(mark),
  )

  let activeDecorators: Array<string> = markStateDecorators

  for (const decorator in slateEditorInstance.decoratorState) {
    if (slateEditorInstance.decoratorState[decorator] === false) {
      activeDecorators = activeDecorators.filter(
        (activeDecorator) => activeDecorator !== decorator,
      )
    } else if (slateEditorInstance.decoratorState[decorator] === true) {
      if (!activeDecorators.includes(decorator)) {
        activeDecorators.push(decorator)
      }
    }
  }

  return activeDecorators
}
