import {Node, type Path} from '../slate'
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
 * Skips `children` since it is a structural property managed by dedicated
 * operations. Skips `text` only for text nodes (spans) where it is managed
 * by `insert_text`/`remove_text` operations.
 */
export function applySetNode(
  editor: PortableTextSlateEditor,
  props: Record<string, unknown>,
  path: Path,
): void {
  const node = Node.get(editor, path) as unknown as Record<string, unknown>
  const isTextNode =
    typeof node['text'] === 'string' && !Array.isArray(node['children'])
  const properties: Record<string, unknown> = {}
  const newProperties: Record<string, unknown> = {}

  for (const key of Object.keys(props)) {
    if (key === 'children') {
      continue
    }

    if (key === 'text' && isTextNode) {
      continue
    }

    if (props[key] !== node[key]) {
      if (node.hasOwnProperty(key)) {
        properties[key] = node[key]
      }

      if (props[key] != null) {
        newProperties[key] = props[key]
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
