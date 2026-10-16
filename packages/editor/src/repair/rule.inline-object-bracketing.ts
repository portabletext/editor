import {isSpan, type PortableTextTextBlock} from '@portabletext/schema'
import type {Path} from '../types/paths'
import {createSpan} from './create-nodes'
import {isObjectNode} from './node-kinds'
import type {RepairContext, RepairInsertFix} from './types'

/**
 * Returns the next span the inline object at `index` needs, before it and
 * then, when it ends the block, after it. Called once per fix, against
 * `children` re-read after the previous fix, because the engine interleaves
 * it with span merging in a single pass over the block.
 */
export function repairInlineObjectBracketing(
  block: {children: PortableTextTextBlock['children']; path: Path},
  index: number,
  context: RepairContext,
): RepairInsertFix | undefined {
  const child = block.children[index]

  if (!isObjectNode(context.schema, child)) {
    return undefined
  }

  const previous = block.children[index - 1]

  if (previous == null || !isSpan({schema: context.schema}, previous)) {
    return {
      type: 'insert',
      path: [...block.path, 'children', {_key: child._key}],
      node: createSpan(context),
      position: 'before',
    }
  }

  if (index === block.children.length - 1) {
    return {
      type: 'insert',
      path: [...block.path, 'children', {_key: child._key}],
      node: createSpan(context),
      position: 'after',
    }
  }

  return undefined
}
