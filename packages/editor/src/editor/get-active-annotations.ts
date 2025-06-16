import {getMarkState} from '../selectors/selector.get-mark-state'
import type {EditorSnapshot} from './editor-snapshot'

export function getActiveAnnotations(snapshot: EditorSnapshot) {
  const schema = snapshot.context.schema
  const markState = getMarkState(snapshot)

  return (markState?.marks ?? []).filter(
    (mark) =>
      !schema.decorators.map((decorator) => decorator.name).includes(mark),
  )
}
