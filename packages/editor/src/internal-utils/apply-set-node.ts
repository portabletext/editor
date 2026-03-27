import {getNode} from '../node-traversal/get-node'
import type {Path} from '../slate/interfaces/path'
import {isSpanNode} from '../slate/node/is-span-node'
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
  const nodeEntry = getNode(editor, path)

  if (!nodeEntry) {
    return
  }

  const node = nodeEntry.node
  const nodeRecord = node as Record<string, unknown>
  const propsRecord = props as Record<string, unknown>
  const properties: Record<string, unknown> = {}
  const newProperties: Record<string, unknown> = {}

  for (const key of Object.keys(propsRecord)) {
    if (key === 'children') {
      continue
    }

    if (key === 'text' && isSpanNode({schema: editor.schema}, node)) {
      continue
    }

    if (propsRecord[key] !== nodeRecord[key]) {
      if (nodeRecord.hasOwnProperty(key)) {
        properties[key] = nodeRecord[key]
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
