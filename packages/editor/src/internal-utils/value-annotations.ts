import {isSpan, isTextBlock} from '@portabletext/schema'
import type {PortableTextBlock} from '@sanity/types'
import type {EditorSchema} from '../editor/editor-schema'

export function getValueAnnotations(
  schema: EditorSchema,
  value: Array<PortableTextBlock> | undefined,
): Array<string> {
  if (!value) {
    return []
  }

  const annotations: Array<string> = []

  for (const block of value) {
    if (isTextBlock({schema}, block)) {
      for (const child of block.children) {
        if (isSpan({schema}, child) && child.marks) {
          for (const mark of child.marks) {
            if (
              block.markDefs?.some((markDef) => markDef._key === mark) &&
              !annotations.includes(mark)
            ) {
              annotations.push(mark)
            }
          }
        }
      }
    }
  }

  return annotations
}
