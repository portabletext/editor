import {Editor} from 'slate'
import type {PortableTextSlateEditor} from '../types/editor'
import type {EditorSchema} from './define-schema'

export function getActiveDecorators({
  schema,
  slateEditorInstance,
}: {
  schema: EditorSchema
  slateEditorInstance: PortableTextSlateEditor
}) {
  const decorators = schema.decorators.map((decorator) => decorator.value)

  const marks =
    {
      ...(Editor.marks(slateEditorInstance) ?? {}),
    }.marks ?? []

  return marks.filter((mark) => decorators.includes(mark))
}
