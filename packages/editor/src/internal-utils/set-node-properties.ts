import {getNode} from '../node-traversal/get-node'
import type {Path} from '../slate/interfaces/path'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

/**
 * Apply property changes at a known path using primitive `set` and `unset`
 * operations.
 *
 * Properties set to `null` are treated as deletions.
 * When `_key` is among the properties, it is processed first so that
 * downstream patch consumers see the key change before any property
 * mutations that reference the new key.
 */
export function setNodeProperties(
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

  // Process _key first so that downstream patch consumers see the key
  // change before any property mutations that reference the new key.
  const keys = Object.keys(propsRecord)
  const keyIndex = keys.indexOf('_key')
  if (keyIndex !== -1) {
    keys.splice(keyIndex, 1)
    keys.unshift('_key')
  }

  let currentPath = path

  for (const key of keys) {
    if (propsRecord[key] !== nodeRecord[key]) {
      if (propsRecord[key] != null) {
        editor.apply({
          type: 'set',
          path: [...currentPath, key],
          value: propsRecord[key],
        })
        // After _key changes, update the path for subsequent operations
        if (key === '_key' && typeof propsRecord[key] === 'string') {
          const lastSegment = currentPath[currentPath.length - 1]
          if (isKeyedSegment(lastSegment)) {
            currentPath = [
              ...currentPath.slice(0, -1),
              {_key: propsRecord[key] as string},
            ]
          }
        }
      } else if (nodeRecord.hasOwnProperty(key)) {
        // Value is null/undefined and property exists on node: unset it
        editor.apply({
          type: 'unset',
          path: [...currentPath, key],
        })
      }
    }
  }
}
