import {indexedPathToKeyedPath} from '../paths/indexed-path-to-keyed-path'
import {serializePath} from '../paths/serialize-path'
import type {Editor} from '../slate/interfaces/editor'

/**
 * Resolve the DOM node corresponding to an indexed path.
 */
export function getDomNode(
  editor: Editor,
  path: Array<number>,
): HTMLElement | undefined {
  const editorElement = editor.domElement

  if (!editorElement) {
    return undefined
  }

  if (path.length === 0) {
    return editorElement
  }

  const keyedPath = indexedPathToKeyedPath(
    {
      schema: editor.schema,
      editableTypes: editor.editableTypes,
      value: editor.children,
    },
    path,
  )

  if (!keyedPath) {
    return undefined
  }

  const serializedPath = serializePath(keyedPath)

  const blockIndex = path.at(0)

  if (blockIndex === undefined) {
    return undefined
  }

  const blockNode = editorElement.children[blockIndex]

  if (!(blockNode instanceof HTMLElement)) {
    return undefined
  }

  if (blockNode.matches(`[data-pt-path="${CSS.escape(serializedPath)}"]`)) {
    const ownerEditor = blockNode.closest('[data-slate-editor]')

    if (ownerEditor !== editorElement) {
      return undefined
    }

    return blockNode
  }

  const domNode = blockNode.querySelector(
    `[data-pt-path="${CSS.escape(serializedPath)}"]`,
  )

  if (!(domNode instanceof HTMLElement)) {
    return undefined
  }

  const ownerEditor = domNode.closest('[data-slate-editor]')

  if (ownerEditor !== editorElement) {
    return undefined
  }

  return domNode
}
