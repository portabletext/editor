import {isSpan, isTextBlock} from '@portabletext/schema'
import type {EditorContext} from '../editor/editor-snapshot'

export function getTextMarks(
  context: Pick<EditorContext, 'schema' | 'value'>,
  text: string,
) {
  let marks: Array<string> = []

  for (const block of context.value) {
    if (isTextBlock(context, block)) {
      for (const child of block.children) {
        if (isSpan(context, child) && child.text === text) {
          marks = child.marks ?? []
          break
        }
      }
    }
  }

  return marks
}
