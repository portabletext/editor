import type {PortableTextTextBlock} from '@portabletext/schema'
import {isSpan} from '@portabletext/schema'
import type {Editor} from '../interfaces/editor'

export function hasInlines(
  editor: Editor,
  element: PortableTextTextBlock,
): boolean {
  return element.children.some((n) => {
    if (isSpan({schema: editor.schema}, n)) {
      return true
    }
    return editor.isInline(n)
  })
}
