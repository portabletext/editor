import {isElement} from '../slate/element/is-element'
import type {KeyedPath} from '../slate/interfaces/operation'
import {getNode} from '../slate/node/get-node'
import {resolveKeyedPath} from '../slate/utils/resolve-keyed-path'
import type {PortableTextSlateEditor} from '../types/slate-editor'

export function applySetNodeKeyed(
  editor: PortableTextSlateEditor,
  props: Record<string, unknown> | object,
  path: KeyedPath,
): void {
  const indexedPath = resolveKeyedPath(editor, path, editor.blockIndexMap)

  if (!indexedPath) {
    return
  }

  const node = getNode(editor, indexedPath, editor.schema) as Record<
    string,
    unknown
  >
  const propsRecord = props as Record<string, unknown>
  const properties: Record<string, unknown> = {}
  const newProperties: Record<string, unknown> = {}

  for (const key of Object.keys(propsRecord)) {
    if (key === 'children') {
      continue
    }

    if (
      key === 'text' &&
      !isElement(node, editor.schema) &&
      !editor.isObjectNode(node)
    ) {
      continue
    }

    if (propsRecord[key] !== node[key]) {
      if (node.hasOwnProperty(key)) {
        properties[key] = node[key]
      }

      if (propsRecord[key] != null) {
        newProperties[key] = propsRecord[key]
      }
    }
  }

  if (
    Object.keys(newProperties).length > 0 ||
    Object.keys(properties).length > 0
  ) {
    editor.apply({type: 'set_node_keyed', path, properties, newProperties})
  }
}
