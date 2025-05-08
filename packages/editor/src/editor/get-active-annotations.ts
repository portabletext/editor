import {getMarkState} from '../internal-utils/mark-state'
import type {PortableTextSlateEditor} from '../types/editor'
import type {EditorSchema} from './editor-schema'

export function getActiveAnnotations({
  editor,
  schema,
}: {
  editor: PortableTextSlateEditor
  schema: EditorSchema
}) {
  const markState = getMarkState({
    editor,
    schema,
  })

  return (markState?.marks ?? []).filter(
    (mark) =>
      !schema.decorators.map((decorator) => decorator.name).includes(mark),
  )
}
