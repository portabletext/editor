import {serializePath} from '../paths/serialize-path'
import type {Editor} from '../slate/interfaces/editor'
import type {Path} from '../types/paths'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

/**
 * Resolve the DOM node corresponding to a keyed path.
 */
export function getDomNode(
  editor: Editor,
  path: Path,
): HTMLElement | undefined {
  const editorElement = editor.domElement

  if (!editorElement) {
    return undefined
  }

  if (path.length === 0) {
    return editorElement
  }

  const serializedPath = serializePath(path)
  const selector = `[data-pt-path="${CSS.escape(serializedPath)}"]`

  const blockSegment = path[0]

  if (isKeyedSegment(blockSegment)) {
    const blockIndex = editor.blockIndexMap.get(blockSegment._key)

    if (blockIndex !== undefined) {
      const blockNode = editorElement.children[blockIndex]

      if (blockNode instanceof HTMLElement) {
        if (blockNode.matches(selector)) {
          const ownerEditor = blockNode.closest('[data-slate-editor]')

          if (ownerEditor !== editorElement) {
            return undefined
          }

          return blockNode
        }

        const domNode = blockNode.querySelector(selector)

        if (domNode instanceof HTMLElement) {
          const ownerEditor = domNode.closest('[data-slate-editor]')

          if (ownerEditor !== editorElement) {
            return undefined
          }

          return domNode
        }
      }
    }
  }

  const domNode = editorElement.querySelector(selector)

  if (!(domNode instanceof HTMLElement)) {
    return undefined
  }

  const ownerEditor = domNode.closest('[data-slate-editor]')

  if (ownerEditor !== editorElement) {
    return undefined
  }

  return domNode
}
