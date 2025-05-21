import type {MarkState} from '../internal-utils/mark-state'
import type {EditorSchema} from './editor-schema'

export function getActiveAnnotations({
  markState,
  schema,
}: {
  markState: MarkState | undefined
  schema: EditorSchema
}) {
  return (markState?.marks ?? []).filter(
    (mark) =>
      !schema.decorators.map((decorator) => decorator.name).includes(mark),
  )
}
