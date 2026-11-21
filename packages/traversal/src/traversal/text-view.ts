import {isTextBlock} from '@portabletext/schema'
import type {Path} from '../engine/interfaces/path'
import {everyPath} from './every-field'
import type {TraversalSnapshot} from './traversal-snapshot'

export function textView(snapshot: TraversalSnapshot, path: Path) {
  const resolved = everyPath(snapshot, path)
  if (resolved.invalid) {
    return undefined
  }
  let root = resolved.nodes[0]
  for (let index = 0; index < resolved.nodes.length; index++) {
    const entry = resolved.nodes[index]!
    const parent = resolved.nodes[index - 1]
    if (
      isTextBlock(snapshot.context, entry.node) &&
      !(
        parent &&
        isTextBlock(snapshot.context, parent.node) &&
        entry.path[parent.path.length] === 'children'
      )
    ) {
      root = entry
    }
  }
  if (!root) {
    return undefined
  }
  return {
    snapshot: {
      context: {
        schema: snapshot.context.schema,
        value: [root.node],
        containers: new Map(),
      },
    },
    path: [0, ...path.slice(root.path.length)] as Path,
    prefix: root.path,
  }
}

export function restoreTextEntry<T>(
  view: NonNullable<ReturnType<typeof textView>>,
  entry: {node: T; path: Path} | undefined,
): {node: T; path: Path} | undefined {
  return entry
    ? {node: entry.node, path: [...view.prefix, ...entry.path.slice(1)]}
    : undefined
}
