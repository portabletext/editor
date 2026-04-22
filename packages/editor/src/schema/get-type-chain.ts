import type {EditorSchema} from '../editor/editor-schema'
import {getAncestors} from '../node-traversal/get-ancestors'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import type {TraversalContainers} from './resolve-containers'

/**
 * Build the full type chain for a node at a given path, from root to the
 * node itself. Unlike `getContainerScopedName`, this includes text blocks
 * (`block`) so span and inline-object scopes that include `block.` as an
 * intermediate segment can match.
 *
 * For a span at
 * `[{_key:t1},'rows',{_key:r1},'cells',{_key:c1},'content',{_key:b1},'children',{_key:s1}]`
 * the chain is `['table', 'row', 'cell', 'block', 'span']`.
 */
export function getTypeChain(
  context: {
    schema: EditorSchema
    containers: TraversalContainers
    value: Array<Node>
  },
  node: Node,
  path: Path,
): Array<string> {
  const chain: Array<string> = []
  const ancestors = getAncestors(context, path)

  for (let i = ancestors.length - 1; i >= 0; i--) {
    chain.push(ancestors[i]!.node._type)
  }

  chain.push(node._type)

  return chain
}
