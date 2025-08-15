import type {EditorContext} from '../editor/editor-snapshot'
import {isSpan, isTextBlock} from './parse-blocks'

export function getTextMarks(
  context: Pick<EditorContext, 'schema' | 'value'>,
  text: string,
) {
  let marks: Array<string> | undefined

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
