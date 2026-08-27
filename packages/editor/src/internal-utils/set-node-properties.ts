import type {Path} from '../engine/interfaces/path'
import {resolveNode} from '../traversal/get-node'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {safeStringify} from './safe-json'

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
  editor: PortableTextEditorEngine,
  props: Record<string, unknown> | object,
  path: Path,
): void {
  const result = resolveNode(editor.snapshot, path)

  if (result.status === 'unreachable') {
    throw new Error(
      `Unable to set properties at structurally unreachable path ${safeStringify(path)}`,
    )
  }

  if (result.status === 'missing') {
    return
  }

  const node = result.entry.node
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
        const hadProperty = nodeRecord.hasOwnProperty(key)
        const lastSegment = currentPath[currentPath.length - 1]

        // Renaming the node's own `_key` moves how it resolves: from here
        // on it's found by the new key, so the inverse (which runs after
        // the rename) has to target that key too, or it can never find
        // the node to restore.
        const renamedPath =
          key === '_key' &&
          typeof propsRecord[key] === 'string' &&
          isKeyedSegment(lastSegment)
            ? [...currentPath.slice(0, -1), {_key: propsRecord[key] as string}]
            : undefined
        const inversePath = renamedPath
          ? [...renamedPath, key]
          : [...currentPath, key]

        editor.apply({
          type: 'set',
          path: [...currentPath, key],
          value: propsRecord[key],
          inverse: hadProperty
            ? {type: 'set', path: inversePath, value: nodeRecord[key]}
            : {type: 'unset', path: inversePath},
        })

        if (renamedPath) {
          currentPath = renamedPath
        }
      } else if (nodeRecord.hasOwnProperty(key)) {
        // Value is null/undefined and property exists on node: unset it
        editor.apply({
          type: 'unset',
          path: [...currentPath, key],
          inverse: {
            type: 'set',
            path: [...currentPath, key],
            value: nodeRecord[key],
          },
        })
      }
    }
  }
}
