import type {EditorSchema} from '../../editor/editor-schema'
import type {SpanNode} from './is-span-node'

export function createSpanNode(context: {
  schema: EditorSchema
  keyGenerator: () => string
}): SpanNode {
  return {
    _type: context.schema.span.name,
    _key: context.keyGenerator(),
    text: '',
    marks: [],
  }
}
