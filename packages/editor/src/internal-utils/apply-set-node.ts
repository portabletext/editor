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
 * Skips `children` and `text` since those are structural properties managed
 * by dedicated operations.
 */
export function applySetNode(
  editor: PortableTextSlateEditor,
  props: Record<string, unknown>,
  path: Path,
): void {
  const node = Node.get(editor, path) as unknown as Record<string, unknown>
  const properties: Record<string, unknown> = {}
  const newProperties: Record<string, unknown> = {}

  for (const key of Object.keys(props)) {
    if (key === 'children' || key === 'text') {
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
