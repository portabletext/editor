import {isElement} from '../slate/element/is-element'
import type {Path} from '../slate/interfaces/path'
import {getNode} from '../slate/node/get-node'
import type {PortableTextSlateEditor} from '../types/slate-editor'

/**
 * Apply a `set_node` operation at a known path.
 *
 * Properties set to `null` are treated as deletions.
 *
 * Skips `children` since those are structural properties managed by dedicated
 * operations. Skips `text` on text nodes (spans) for the same reason, but
 * allows `text` on elements and ObjectNodes where it's a user-defined
 * property.
 */
export function applySetNode(
  editor: PortableTextSlateEditor,
  props: Record<string, unknown> | object,
  path: Path,
): void {
  const node = getNode(editor, path, editor.schema) as Record<string, unknown>
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
    editor.apply({type: 'set_node', path, properties, newProperties})
  }
}
