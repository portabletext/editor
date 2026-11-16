import type {PortableTextObject} from '@portabletext/schema'
import type {Path} from '../engine/interfaces/path'
import {isInline} from './is-inline'
import {isLeafObject} from './is-leaf-object'
import {isObject} from './is-object'
import type {TraversalSnapshot} from './traversal-snapshot'

/** Counts a text block inside a text block as an object, because it is drawn as an unknown inline object. */
export function isObjectAtPath(
  snapshot: TraversalSnapshot,
  node: unknown,
  path: Path,
): node is PortableTextObject {
  return (
    isObject(snapshot, node) ||
    (isLeafObject(snapshot, node, path) && isInline(snapshot, path))
  )
}
