import type {MarkState} from '../internal-utils/mark-state'
import type {EditorSchema} from './editor-schema'

export function getActiveDecorators({
  decoratorState,
  markState,
  schema,
}: {
  decoratorState: Record<string, boolean | undefined>
  markState: MarkState | undefined
  schema: EditorSchema
}) {
  const decorators = schema.decorators.map((decorator) => decorator.name)

  const markStateDecorators = (markState?.marks ?? []).filter((mark) =>
    decorators.includes(mark),
  )

  let activeDecorators: Array<string> = markStateDecorators

  for (const decorator in decoratorState) {
    if (decoratorState[decorator] === false) {
      activeDecorators = activeDecorators.filter(
        (activeDecorator) => activeDecorator !== decorator,
      )
    } else if (decoratorState[decorator] === true) {
      if (!activeDecorators.includes(decorator)) {
        activeDecorators.push(decorator)
      }
    }
  }

  return activeDecorators
}
