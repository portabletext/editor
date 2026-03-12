import type {PortableTextSlateEditor} from '../types/slate-editor'
import {safeStringify} from './safe-json'

function isElement(node: unknown): boolean {
  if (typeof node !== 'object' || node === null || !('children' in node)) {
    return false
  }

  return Array.isArray(node.children)
}

function getNodeAtPath(
  root: unknown,
  path: ReadonlyArray<number | string>,
): Record<string, unknown> {
  let current: unknown = root

  for (const segment of path) {
    if (typeof current !== 'object' || current === null) {
      throw new Error(
        `Cannot navigate path ${safeStringify(path)}: hit non-object`,
      )
    }

    if (typeof segment === 'number') {
      const children = Array.isArray(current)
        ? current
        : 'children' in current
          ? (current.children as Array<unknown>)
          : undefined

      if (!children) {
        throw new Error(`Cannot find children at path ${safeStringify(path)}`)
      }

      current = children[segment]
    } else {
      current = (current as Record<string, unknown>)[segment]
    }

    if (current === undefined) {
      throw new Error(`Cannot find node at path ${safeStringify(path)}`)
    }
  }

  return current as Record<string, unknown>
}

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
  path: ReadonlyArray<number | string>,
): void {
  const node = getNodeAtPath(editor, path)
  const properties: Record<string, unknown> = {}
  const newProperties: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(props)) {
    if (key === 'children') {
      continue
    }

    if (key === 'text' && !isElement(node) && !editor.isObjectNode(node)) {
      continue
    }

    if (value !== node[key]) {
      if (node.hasOwnProperty(key)) {
        properties[key] = node[key]
      }

      if (value != null) {
        newProperties[key] = value
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
