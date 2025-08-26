import {isSpan, isTextBlock} from '@portabletext/schema'
import type {EditorContext} from '../editor/editor-snapshot'

export function getTextBlockKey(
  context: Pick<EditorContext, 'schema' | 'value'>,
  text: string,
) {
  let blockKey: string | undefined

  for (const block of context.value) {
    if (isTextBlock(context, block)) {
      for (const child of block.children) {
        if (isSpan(context, child) && child.text === text) {
          blockKey = block._key
          break
        }
      }
    }
  }

  if (!blockKey) {
    throw new Error(`Unable to find block key for text "${text}"`)
  }

  return blockKey
}
