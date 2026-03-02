import {Element, Node, type Path} from '../slate'
import type {PortableTextSlateEditor} from '../types/slate-editor'

/**
 * Apply a `set_node` operation at a known path.
 *
 * This replaces `Transforms.setNodes(editor, props, {at: path})` for the
 * common case where `at` is a concrete path (not a Range) and `split` is
 * not needed.
 *
 * Properties set to `null` are treated as deletions (matching the behavior
 * of `Transforms.unsetNodes`).
 *
 * Skips `children` since those are structural properties managed by dedicated
 * operations. Skips `text` on text nodes (spans) for the same reason, but
 * allows `text` on elements (inline/block objects) where it's a user-defined
 * property.
 */
export function applySetNode(
  editor: PortableTextSlateEditor,
  props: Record<string, unknown> | object,
  path: Path,
): void {
  const node = Node.get(editor, path) as Record<string, unknown>
  const propsRecord = props as Record<string, unknown>
  const properties: Record<string, unknown> = {}
  const newProperties: Record<string, unknown> = {}

  for (const key of Object.keys(propsRecord)) {
    if (key === 'children') {
      continue
    }

    // Only skip `text` on actual text nodes (spans), not on elements (inline/block objects)
    if (key === 'text' && !Element.isElement(node)) {
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
