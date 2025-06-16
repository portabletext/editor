import type {EditorSnapshot} from '../editor/editor-snapshot'
import {getMarkState} from './selector.get-mark-state'

export function getActiveAnnotationsMarks(snapshot: EditorSnapshot) {
  const schema = snapshot.context.schema
  const markState = getMarkState(snapshot)

  return (markState?.marks ?? []).filter(
    (mark) =>
      !schema.decorators.map((decorator) => decorator.name).includes(mark),
  )
}
