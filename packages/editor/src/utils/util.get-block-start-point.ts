import {isBlockObject, isContainerBlock} from '@portabletext/schema'
import type {PortableTextBlock} from '@sanity/types'
import type {EditorContext} from '../editor/editor-snapshot'
import type {EditorSelectionPoint} from '../types/editor'
import type {BlockPath} from '../types/paths'

/**
 * @public
 */
export function getBlockStartPoint({
  context,
  block,
}: {
  context: Pick<EditorContext, 'schema'>
  block: {
    node: PortableTextBlock
    path: BlockPath
  }
}): EditorSelectionPoint {
  if (isBlockObject(context, block.node)) {
    return {
      path: block.path,
      offset: 0,
    }
  }

  // For container blocks, recursively find the first text block/span
  if (isContainerBlock(context, block.node)) {
    return getFirstSpanPoint({
      context,
      block: block.node,
      blockPath: block.path,
    })
  }

  // For text blocks, return the first child span
  const nodeWithChildren = block.node as PortableTextBlock & {
    children?: Array<{_key: string}>
  }
  if (
    'children' in nodeWithChildren &&
    Array.isArray(nodeWithChildren.children) &&
    nodeWithChildren.children.length > 0
  ) {
    return {
      path: [
        ...block.path,
        'children',
        {_key: nodeWithChildren.children[0]._key},
      ],
      offset: 0,
    }
  }

  // Fallback for blocks without children
  return {
    path: block.path,
    offset: 0,
  }
}

/**
 * Recursively finds the first span in a container block structure
 */
function getFirstSpanPoint({
  context,
  block,
  blockPath,
}: {
  context: Pick<EditorContext, 'schema'>
  block: PortableTextBlock
  blockPath: BlockPath
}): EditorSelectionPoint {
  if (isBlockObject(context, block)) {
    return {
      path: blockPath,
      offset: 0,
    }
  }

  // Check if this block has children array
  if (!Array.isArray(block.children) || block.children.length === 0) {
    return {
      path: blockPath,
      offset: 0,
    }
  }

  const firstChild = block.children[0]

  // Check if the first child is a span (indicating this is a text block)
  if (firstChild._type === context.schema.span.name) {
    return {
      path: [...blockPath, 'children', {_key: firstChild._key}],
      offset: 0,
    }
  }

  // Otherwise, it's a container block - recursively traverse
  return getFirstSpanPoint({
    context,
    block: firstChild as PortableTextBlock,
    blockPath: [...blockPath, 'children', {_key: firstChild._key}],
  })
}
