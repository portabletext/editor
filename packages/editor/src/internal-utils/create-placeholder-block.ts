import type {PortableTextSpan} from '@sanity/types'
import type {EditorContext} from '../editor/editor-snapshot'

export function createPlaceholderBlock(
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>,
) {
  return {
    _type: context.schema.block.name,
    _key: context.keyGenerator(),
    style: context.schema.styles[0].name ?? 'normal',
    markDefs: [],
    children: [
      {
        _type: context.schema.span.name,
        _key: context.keyGenerator(),
        text: '',
        marks: [],
      } as PortableTextSpan,
    ],
  }
}
