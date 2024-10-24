import type {PortableTextSpan} from '@sanity/types'
import {Node, Path} from 'slate'
import type {PortableTextSlateEditor} from '../types/editor'

export function getPreviousSpan({
  editor,
  blockPath,
  spanPath,
}: {
  editor: PortableTextSlateEditor
  blockPath: Path
  spanPath: Path
}): PortableTextSpan | undefined {
  let previousSpan: PortableTextSpan | undefined

  for (const [child, childPath] of Node.children(editor, blockPath, {
    reverse: true,
  })) {
    if (!editor.isTextSpan(child)) {
      continue
    }

    if (Path.isBefore(childPath, spanPath)) {
      previousSpan = child
      break
    }
  }

  return previousSpan
}

export function getNextSpan({
  editor,
  blockPath,
  spanPath,
}: {
  editor: PortableTextSlateEditor
  blockPath: Path
  spanPath: Path
}): PortableTextSpan | undefined {
  let nextSpan: PortableTextSpan | undefined

  for (const [child, childPath] of Node.children(editor, blockPath)) {
    if (!editor.isTextSpan(child)) {
      continue
    }

    if (Path.isAfter(childPath, spanPath)) {
      nextSpan = child
      break
    }
  }

  return nextSpan
}
