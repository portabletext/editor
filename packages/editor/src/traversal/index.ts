import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import {getAncestor as internalGetAncestor} from '../node-traversal/get-ancestor'
import {getAncestorTextBlock as internalGetAncestorTextBlock} from '../node-traversal/get-ancestor-text-block'
import {getChildren as internalGetChildren} from '../node-traversal/get-children'
import {getNode as internalGetNode} from '../node-traversal/get-node'
import {getParent as internalGetParent} from '../node-traversal/get-parent'
import {getSibling as internalGetSibling} from '../node-traversal/get-sibling'
import {getText as internalGetText} from '../node-traversal/get-text'
import {indexedPathToKeyedPath} from '../paths/indexed-path-to-keyed-path'
import {keyedPathToIndexedPath} from '../paths/keyed-path-to-indexed-path'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../types/paths'

/**
 * Any node in the portable text tree.
 *
 * @internal
 */
export type PortableTextNode =
  | PortableTextTextBlock
  | PortableTextObject
  | PortableTextSpan

function snapshotToContext(snapshot: EditorSnapshot): {
  schema: EditorSnapshot['context']['schema']
  editableTypes: Set<string>
  value: Array<Node>
} {
  return {
    schema: snapshot.context.schema,
    editableTypes: snapshot.editableTypes,
    value: snapshot.context.value,
  }
}

function resolveKeyedPath(snapshot: EditorSnapshot, path: Path) {
  return keyedPathToIndexedPath(
    {children: snapshot.context.value},
    path,
    snapshot.blockIndexMap,
  )
}

function toKeyedPath(snapshot: EditorSnapshot, indexedPath: Array<number>) {
  return indexedPathToKeyedPath(snapshotToContext(snapshot), indexedPath)
}

/**
 * Get the node at a keyed path.
 *
 * @internal
 */
export function getNode(
  snapshot: EditorSnapshot,
  path: Path,
): {node: PortableTextNode; path: Path} | undefined {
  const indexedPath = resolveKeyedPath(snapshot, path)

  if (!indexedPath) {
    return undefined
  }

  const result = internalGetNode(snapshotToContext(snapshot), indexedPath)

  if (!result) {
    return undefined
  }

  const keyedPath = toKeyedPath(snapshot, result.path)

  if (!keyedPath) {
    return undefined
  }

  return {node: result.node, path: keyedPath}
}

/**
 * Get the parent of the node at a keyed path.
 *
 * @internal
 */
export function getParent(
  snapshot: EditorSnapshot,
  path: Path,
): {node: PortableTextNode; path: Path} | undefined {
  const indexedPath = resolveKeyedPath(snapshot, path)

  if (!indexedPath) {
    return undefined
  }

  const result = internalGetParent(snapshotToContext(snapshot), indexedPath)

  if (!result) {
    return undefined
  }

  const keyedPath = toKeyedPath(snapshot, result.path)

  if (!keyedPath) {
    return undefined
  }

  return {node: result.node, path: keyedPath}
}

/**
 * Get the children of the node at a keyed path.
 *
 * @internal
 */
export function getChildren(
  snapshot: EditorSnapshot,
  path: Path,
): Array<{node: PortableTextNode; path: Path}> {
  const indexedPath = resolveKeyedPath(snapshot, path)

  if (!indexedPath) {
    return []
  }

  const results = internalGetChildren(snapshotToContext(snapshot), indexedPath)

  const keyedResults: Array<{node: PortableTextNode; path: Path}> = []

  for (const result of results) {
    const keyedPath = toKeyedPath(snapshot, result.path)

    if (keyedPath) {
      keyedResults.push({node: result.node, path: keyedPath})
    }
  }

  return keyedResults
}

/**
 * Find the first ancestor of the node at a keyed path that matches a predicate.
 * The `match` callback receives keyed paths.
 *
 * @internal
 */
export function getAncestor(
  snapshot: EditorSnapshot,
  path: Path,
  match: (node: PortableTextNode, path: Path) => boolean,
): {node: PortableTextNode; path: Path} | undefined {
  const indexedPath = resolveKeyedPath(snapshot, path)

  if (!indexedPath) {
    return undefined
  }

  const context = snapshotToContext(snapshot)

  const result = internalGetAncestor(
    context,
    indexedPath,
    (node, ancestorIndexedPath) => {
      const ancestorKeyedPath = toKeyedPath(snapshot, ancestorIndexedPath)

      if (!ancestorKeyedPath) {
        return false
      }

      return match(node, ancestorKeyedPath)
    },
  )

  if (!result) {
    return undefined
  }

  const keyedPath = toKeyedPath(snapshot, result.path)

  if (!keyedPath) {
    return undefined
  }

  return {node: result.node, path: keyedPath}
}

/**
 * Find the nearest text block ancestor of the node at a keyed path.
 *
 * @internal
 */
export function getAncestorTextBlock(
  snapshot: EditorSnapshot,
  path: Path,
): {node: PortableTextTextBlock; path: Path} | undefined {
  const indexedPath = resolveKeyedPath(snapshot, path)

  if (!indexedPath) {
    return undefined
  }

  const result = internalGetAncestorTextBlock(
    snapshotToContext(snapshot),
    indexedPath,
  )

  if (!result) {
    return undefined
  }

  const keyedPath = toKeyedPath(snapshot, result.path)

  if (!keyedPath) {
    return undefined
  }

  return {node: result.node, path: keyedPath}
}

/**
 * Get the next or previous sibling of the node at a keyed path.
 *
 * @internal
 */
export function getSibling(
  snapshot: EditorSnapshot,
  path: Path,
  direction: 'next' | 'previous',
): {node: PortableTextNode; path: Path} | undefined {
  const indexedPath = resolveKeyedPath(snapshot, path)

  if (!indexedPath) {
    return undefined
  }

  const result = internalGetSibling(
    snapshotToContext(snapshot),
    indexedPath,
    direction,
  )

  if (!result) {
    return undefined
  }

  const keyedPath = toKeyedPath(snapshot, result.path)

  if (!keyedPath) {
    return undefined
  }

  return {node: result.node, path: keyedPath}
}

/**
 * Get the concatenated text content of the node at a keyed path.
 *
 * @internal
 */
export function getText(snapshot: EditorSnapshot, path: Path): string {
  const indexedPath = resolveKeyedPath(snapshot, path)

  if (!indexedPath) {
    return ''
  }

  const result = internalGetText(snapshotToContext(snapshot), indexedPath)

  return result ?? ''
}
