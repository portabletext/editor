import {
  isSpan,
  isTextBlock,
  type PortableTextBlock,
  type PortableTextChild,
} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {EditorContext} from '../editor/editor-snapshot'
import {getNodeChildren} from '../node-traversal/get-children'
import type {Path} from '../slate/interfaces/path'
import type {EditorSelectionPoint} from '../types/editor'
import {getSelectionEndPoint} from '../utils/util.get-selection-end-point'
import {getSelectionStartPoint} from '../utils/util.get-selection-start-point'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {sliceBlocks} from '../utils/util.slice-blocks'

type Edge = EditorSelectionPoint | 'array-start' | 'array-end'

type SliceContext = Pick<
  EditorContext,
  'schema' | 'selection' | 'value' | 'containers'
> & {keyGenerator?: () => string}

/**
 * Returns the portion of the document's value covered by the selection,
 * resolved at any depth.
 *
 * Containers fully inside the selection are preserved verbatim. Containers
 * on the selection boundary are recursed into so only the selected portion
 * of their content is kept. Text blocks on the boundary are span-sliced.
 *
 * @public
 */
export const getSelectedValue: EditorSelector<Array<PortableTextBlock>> = (
  snapshot,
) => {
  const selection = snapshot.context.selection

  if (!selection) {
    return []
  }

  const startPoint = getSelectionStartPoint(selection)
  const endPoint = getSelectionEndPoint(selection)

  if (!startPoint || !endPoint) {
    return []
  }

  return sliceArray({
    context: snapshot.context,
    blocks: snapshot.context.value,
    scopePath: '',
    pathPrefix: [],
    fieldNameInPrefix: undefined,
    startEdge: startPoint,
    endEdge: endPoint,
  })
}

function sliceArray({
  context,
  blocks,
  scopePath,
  pathPrefix,
  fieldNameInPrefix,
  startEdge,
  endEdge,
}: {
  context: SliceContext
  blocks: ReadonlyArray<PortableTextBlock>
  scopePath: string
  pathPrefix: Path
  fieldNameInPrefix: string | undefined
  startEdge: Edge
  endEdge: Edge
}): Array<PortableTextBlock> {
  if (blocks.length === 0) {
    return []
  }

  const startIdx = resolveIndex(blocks, pathPrefix, startEdge)
  const endIdx = resolveIndex(blocks, pathPrefix, endEdge)

  if (startIdx === -1 || endIdx === -1) {
    return []
  }

  const [lo, hi, loEdge, hiEdge] =
    startIdx <= endIdx
      ? [startIdx, endIdx, startEdge, endEdge]
      : [endIdx, startIdx, endEdge, startEdge]

  const result: Array<PortableTextBlock> = []

  for (let i = lo; i <= hi; i++) {
    const block = blocks[i]!
    const blockPath: Path = [
      ...pathPrefix,
      ...(fieldNameInPrefix ? [fieldNameInPrefix] : []),
      {_key: block._key},
    ]

    const startPointForBlock: Edge = i === lo ? loEdge : 'array-start'
    const endPointForBlock: Edge = i === hi ? hiEdge : 'array-end'

    const startInside = edgeIsInside(startPointForBlock, blockPath)
    const endInside = edgeIsInside(endPointForBlock, blockPath)

    if (!startInside && !endInside) {
      result.push(block)
      continue
    }

    if (isTextBlock({schema: context.schema}, block)) {
      const sliced = sliceBoundaryTextBlock({
        context,
        block,
        blockPath,
        startEdge: startPointForBlock,
        endEdge: endPointForBlock,
      })
      if (sliced) {
        result.push(sliced)
      }
      continue
    }

    const childInfo = getNodeChildren(
      {schema: context.schema, containers: context.containers},
      block,
      scopePath,
    )

    if (!childInfo) {
      result.push(block)
      continue
    }

    const innerSliced = sliceArray({
      context,
      blocks: childInfo.children as Array<PortableTextBlock>,
      scopePath: childInfo.scopePath,
      pathPrefix: blockPath,
      fieldNameInPrefix: childInfo.fieldName,
      startEdge: startPointForBlock,
      endEdge: endPointForBlock,
    })

    const updatedBlock: PortableTextBlock = {...block}
    ;(updatedBlock as Record<string, unknown>)[childInfo.fieldName] =
      innerSliced

    result.push(updatedBlock)
  }

  return result
}

function resolveIndex(
  blocks: ReadonlyArray<PortableTextBlock>,
  pathPrefix: Path,
  edge: Edge,
): number {
  if (edge === 'array-start') {
    return 0
  }
  if (edge === 'array-end') {
    return blocks.length - 1
  }
  return findBlockIndexForPoint(blocks, pathPrefix, edge)
}

function findBlockIndexForPoint(
  blocks: ReadonlyArray<PortableTextBlock>,
  pathPrefix: Path,
  point: EditorSelectionPoint,
): number {
  let nodeSegmentIndex = pathPrefix.length

  if (
    nodeSegmentIndex < point.path.length &&
    typeof point.path[nodeSegmentIndex] === 'string'
  ) {
    nodeSegmentIndex++
  }

  const segment = point.path[nodeSegmentIndex]

  if (segment === undefined) {
    return -1
  }

  if (isKeyedSegment(segment)) {
    return blocks.findIndex((block) => block._key === segment._key)
  }

  if (typeof segment === 'number') {
    return segment >= 0 && segment < blocks.length ? segment : -1
  }

  return -1
}

function edgeIsInside(edge: Edge, blockPath: Path): boolean {
  if (edge === 'array-start' || edge === 'array-end') {
    return false
  }
  return edge.path.length > blockPath.length
}

function sliceBoundaryTextBlock({
  context,
  block,
  blockPath,
  startEdge,
  endEdge,
}: {
  context: SliceContext
  block: PortableTextBlock
  blockPath: Path
  startEdge: Edge
  endEdge: Edge
}): PortableTextBlock | undefined {
  if (!isTextBlock({schema: context.schema}, block)) {
    return block
  }

  const firstChild = block.children[0]
  const lastChild = block.children[block.children.length - 1]

  // Build block-relative selection points. `sliceBlocks` assumes paths start
  // at the block level (e.g. `[{block}, 'children', {child}]`), so we strip
  // any ancestor container prefix from the path.
  const blockRelativeStart = stripPrefix(startEdge, blockPath, block, {
    fallback: 'block-start',
    firstChild,
  })
  const blockRelativeEnd = stripPrefix(endEdge, blockPath, block, {
    fallback: 'block-end',
    lastChild,
    context,
  })

  const sliced = sliceBlocks({
    context: {
      ...context,
      selection: {anchor: blockRelativeStart, focus: blockRelativeEnd},
    },
    blocks: [block],
  })

  return sliced[0]
}

function stripPrefix(
  edge: Edge,
  blockPath: Path,
  block: PortableTextBlock,
  opts: {
    fallback: 'block-start' | 'block-end'
    firstChild?: PortableTextChild
    lastChild?: PortableTextChild
    context?: SliceContext
  },
): EditorSelectionPoint {
  if (edge !== 'array-start' && edge !== 'array-end') {
    // Is the point inside this block? If yes, strip the prefix.
    if (edge.path.length > blockPath.length) {
      return {
        path: edge.path.slice(blockPath.length - 1),
        offset: edge.offset,
      }
    }
  }
  // Fall back to block start or end.
  if (opts.fallback === 'block-start') {
    return {
      path: [
        {_key: block._key},
        'children',
        {_key: opts.firstChild?._key ?? ''},
      ],
      offset: 0,
    }
  }
  return {
    path: [{_key: block._key}, 'children', {_key: opts.lastChild?._key ?? ''}],
    offset:
      opts.lastChild &&
      opts.context &&
      isSpan({schema: opts.context.schema}, opts.lastChild)
        ? opts.lastChild.text.length
        : 0,
  }
}
