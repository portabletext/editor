import {getNode} from '../node-traversal/get-node'
import {resolveChildFieldName} from '../schema/resolve-child-field-name'
import type {Path} from '../slate/interfaces/path'
import {isObjectNode} from '../slate/node/is-object-node'
import {isSpanNode} from '../slate/node/is-span-node'
import {isTextBlockNode} from '../slate/node/is-text-block-node'
import type {PortableTextSlateEditor} from '../types/slate-editor'

/**
 * Apply a `set_node` operation at a known path.
 *
 * Properties set to `null` are treated as deletions.
 *
 * Skips the child array field on text blocks (`children`) and containers
 * (e.g. `rows`, `cells`, `content`) since child changes are managed by
 * dedicated `insert_node` and `remove_node` operations. Skips `text` on
 * spans since text changes are managed by `insert_text` and `remove_text`.
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

  // Resolve which field name holds children for this node type
  let childFieldName: string | undefined
  if (isTextBlockNode({schema: editor.schema}, node)) {
    childFieldName = 'children'
  } else if (isObjectNode({schema: editor.schema}, node)) {
    childFieldName = resolveChildFieldName(
      editor.schema,
      editor.editableTypes,
      node,
    )
  }

  const nodeRecord = node as Record<string, unknown>
  const propsRecord = props as Record<string, unknown>
  const properties: Record<string, unknown> = {}
  const newProperties: Record<string, unknown> = {}

  for (const key of Object.keys(propsRecord)) {
    // Skip the child array field - managed by insert_node/remove_node
    if (childFieldName && key === childFieldName) {
      continue
    }

    // Skip text on spans - managed by insert_text/remove_text
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
