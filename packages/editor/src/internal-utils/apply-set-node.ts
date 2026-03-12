import type {KeyedSegment, Path, PathSegment} from '../types/paths'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {safeStringify} from './safe-json'

/**
 * Apply a `set_node` operation at a known path.
 *
 * Supports both numeric Slate paths and PTE paths with keyed segments
 * and field name segments for navigating into block objects.
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
  const node = getNodeAtPath(editor, path) as Record<string, unknown>
  const propsRecord = props as Record<string, unknown>
  const properties: Record<string, unknown> = {}
  const newProperties: Record<string, unknown> = {}

  for (const key of Object.keys(propsRecord)) {
    if (key === 'children') {
      continue
    }

    if (key === 'text' && !isElement(node) && !editor.isObjectNode(node)) {
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

function getNodeAtPath(root: unknown, path: Path): unknown {
  let current: unknown = root

  for (const segment of path) {
    if (typeof segment === 'number') {
      current = (current as {children: unknown[]}).children[segment]
    } else if (typeof segment === 'string') {
      current = (current as Record<string, unknown>)[segment]
    } else if (isKeyedSegment(segment)) {
      const arr = Array.isArray(current)
        ? (current as Array<Record<string, unknown>>)
        : (current as {children: unknown[]}).children
      current = (arr as Array<Record<string, unknown>>).find(
        (item) => item['_key'] === segment._key,
      )
    }

    if (current === undefined) {
      throw new Error(`Cannot find node at path ${safeStringify(path)}`)
    }
  }

  return current
}

function isElement(node: Record<string, unknown>): boolean {
  return 'children' in node && Array.isArray(node['children'])
}

function isKeyedSegment(segment: PathSegment): segment is KeyedSegment {
  return (
    typeof segment === 'object' &&
    segment !== null &&
    '_key' in segment &&
    typeof (segment as KeyedSegment)._key === 'string'
  )
}
