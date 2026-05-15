import {
  isSpan,
  isTextBlock,
  type PortableTextBlock,
  type PortableTextChild,
} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {EditorContext} from '../editor/editor-snapshot'
import {getNodeChildren} from '../node-traversal/get-children'
import {getRootAcceptedTypes} from '../schema/get-root-accepted-types'
import type {RegisteredContainer} from '../schema/resolve-containers'
import type {Node} from '../slate/interfaces/node'
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
 * Returns the selected portion of the document's value as the smallest
 * top-level-valid {@link PortableTextBlock} array.
 *
 * The result is the minimum slice of `value` that still parses as a
 * legal `Array<PortableTextBlock>` covering the selection:
 *
 * - Selection inside a single text block returns `[textBlockSliced]`.
 * - Selection spanning multiple top-level blocks at the editor root
 *   returns those blocks, with boundary blocks recursively sliced.
 * - Selection wholly inside a container whose child field accepts
 *   top-level types (e.g. a callout or a table cell whose
 *   `content.of` includes `block`) returns the container's children
 *   directly - the container envelope is dropped.
 * - Selection spanning sub-structural children that aren't valid at
 *   the top level (e.g. across two cells in one row) wraps upward
 *   through ancestors until reaching a level whose contents fit at
 *   the top level - the smallest enclosing container goes back into
 *   the result, sliced to the selected portion.
 *
 * No metadata is added to the result. The returned array is plain
 * portable text - same shape consumers see when reading
 * `editor.value`.
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

  const rootTypes = getRootAcceptedTypes(snapshot.context.schema)
  const emitTarget = findEmitTarget(
    snapshot.context,
    startPoint,
    endPoint,
    rootTypes,
  )

  if (!emitTarget) {
    return []
  }

  return sliceArray({
    context: snapshot.context,
    blocks: emitTarget.children as Array<PortableTextBlock>,
    pathPrefix: emitTarget.pathPrefix,
    fieldNameInPrefix: emitTarget.fieldNameInPrefix,
    startEdge: startPoint,
    endEdge: endPoint,
    parent: emitTarget.parent,
  })
}

/**
 * Find the emit target: the array of blocks to slice, framed by the
 * smallest enclosing scope whose contents fit at the top level.
 *
 * Walks down from root along the common-prefix of `startPoint.path`
 * and `endPoint.path` to find the lowest common ancestor (LCA) at the
 * node level. From there, decides whether the LCA's children can be
 * emitted directly, or whether to walk back up to an ancestor whose
 * children fit at the top level.
 */
function findEmitTarget(
  context: Pick<EditorContext, 'schema' | 'value' | 'containers'>,
  startPoint: EditorSelectionPoint,
  endPoint: EditorSelectionPoint,
  rootTypes: Set<string>,
):
  | {
      children: ReadonlyArray<Node>
      pathPrefix: Path
      fieldNameInPrefix: string | undefined
      parent: RegisteredContainer | undefined
    }
  | undefined {
  // Walk from root, descending into the deepest node whose key is a
  // prefix of both start.path and end.path. Track the parent
  // container so positional `of` lookups resolve.
  const descent = descendToLCA(context, startPoint.path, endPoint.path)

  if (!descent) {
    return undefined
  }

  // Walk back up the chain until the children field at the current
  // level accepts only types that are valid at the top level (or we
  // reach the root).
  let cursor = descent
  while (cursor.parentChain.length > 0) {
    if (childFieldFitsTopLevel(cursor.childInfo, context.schema, rootTypes)) {
      return {
        children: cursor.childInfo.children,
        pathPrefix: cursor.path,
        fieldNameInPrefix: cursor.childInfo.fieldName,
        parent: cursor.childInfo.parent,
      }
    }
    cursor = cursor.parentChain[cursor.parentChain.length - 1]!
  }

  // Reached root.
  return {
    children: context.value,
    pathPrefix: [],
    fieldNameInPrefix: undefined,
    parent: undefined,
  }
}

type DescentStep = {
  path: Path
  childInfo: {
    children: ReadonlyArray<Node>
    fieldName: string
    parent: RegisteredContainer | undefined
  }
  parentChain: ReadonlyArray<DescentStep>
}

/**
 * Descend from root following the common prefix of two paths. At each
 * matching node-level segment, capture the node's children info plus
 * the chain of ancestors leading to that node.
 *
 * Stops when:
 *
 * - The two paths diverge at the next node-level segment, OR
 * - One path terminates (the other endpoint sits on the boundary at
 *   this level), OR
 * - The current node is a text block (selection points inside text
 *   blocks share the text block as their LCA).
 *
 * Returns the deepest matching step. The step's `path` is the LCA
 * node's path; `childInfo` describes the LCA's children array.
 */
function descendToLCA(
  context: Pick<EditorContext, 'schema' | 'value' | 'containers'>,
  startPath: Path,
  endPath: Path,
): DescentStep | undefined {
  const rootInfo = getNodeChildren(context, {value: context.value as Node[]})

  if (!rootInfo) {
    return undefined
  }

  let current: DescentStep = {
    path: [],
    childInfo: rootInfo,
    parentChain: [],
  }

  // We compare path segments two at a time: a node-key segment plus
  // the following field-name segment that follows it (e.g. `{_key},
  // 'children'`). After descending through `{_key}`, the next segment
  // in each path should be the same field name and the same `_key`
  // for the paths to share an ancestor.
  let startIndex = 0
  let endIndex = 0

  while (true) {
    // Need at least one more node-level segment in each path to descend.
    const startSeg = startPath[startIndex]
    const endSeg = endPath[endIndex]

    if (startSeg === undefined || endSeg === undefined) {
      return current
    }

    if (!isKeyedSegment(startSeg) || !isKeyedSegment(endSeg)) {
      // Numeric segments at this layer would mean the points use
      // index addressing; both paths must use the same segment shape.
      if (typeof startSeg !== typeof endSeg) {
        return current
      }
      if (typeof startSeg === 'number' && startSeg !== endSeg) {
        return current
      }
    }

    if (
      isKeyedSegment(startSeg) &&
      isKeyedSegment(endSeg) &&
      startSeg._key !== endSeg._key
    ) {
      return current
    }

    if (
      typeof startSeg === 'number' &&
      typeof endSeg === 'number' &&
      startSeg !== endSeg
    ) {
      return current
    }

    const nodeKey = isKeyedSegment(startSeg) ? startSeg._key : undefined
    const node = nodeKey
      ? current.childInfo.children.find((c) => c._key === nodeKey)
      : typeof startSeg === 'number'
        ? current.childInfo.children.at(startSeg)
        : undefined

    if (!node) {
      return current
    }

    const nodePath: Path = [
      ...current.path,
      ...(current.childInfo.parent || current.path.length === 0
        ? [
            current.childInfo.fieldName === 'value'
              ? undefined
              : current.childInfo.fieldName,
          ]
        : []),
      isKeyedSegment(startSeg) ? {_key: nodeKey!} : (startSeg as number),
    ].filter((s): s is Path[number] => s !== undefined)

    // If the node is a text block, the LCA cannot descend further at
    // the node level - text-block children are spans/annotations, not
    // containers. Stop here.
    if (isTextBlock(context, node)) {
      // Build a step representing the text block.
      const textBlockInfo = getNodeChildren(context, node)
      if (!textBlockInfo) {
        return current
      }
      return {
        path: nodePath,
        childInfo: textBlockInfo,
        parentChain: [...current.parentChain, current],
      }
    }

    // Object node. Get its children for the next descent.
    const nextChildInfo = getNodeChildren(
      context,
      node,
      current.childInfo.parent,
    )

    if (!nextChildInfo) {
      return current
    }

    // Move to the next path-pair index. The next segment should be
    // the field-name segment (e.g. 'children', 'content'). Skip it in
    // both paths.
    let nextStartIndex = startIndex + 1
    let nextEndIndex = endIndex + 1

    if (
      typeof startPath[nextStartIndex] === 'string' &&
      typeof endPath[nextEndIndex] === 'string'
    ) {
      if (startPath[nextStartIndex] !== endPath[nextEndIndex]) {
        // Different field names - paths diverge here. The current
        // node IS the LCA.
        return {
          path: nodePath,
          childInfo: nextChildInfo,
          parentChain: [...current.parentChain, current],
        }
      }
      nextStartIndex++
      nextEndIndex++
    }

    current = {
      path: nodePath,
      childInfo: nextChildInfo,
      parentChain: [...current.parentChain, current],
    }
    startIndex = nextStartIndex
    endIndex = nextEndIndex
  }
}

/**
 * Returns true if every type accepted by `childInfo`'s field is
 * valid at the editor's top level.
 *
 * The check uses the schema's root accepted-types set
 * ({@link getRootAcceptedTypes}). A field accepting only `block` and
 * registered `blockObjects` types passes; a field accepting any
 * intermediate type (e.g. `cell`, `row`) does not.
 *
 * The root level - where `childInfo.parent` is `undefined` and the
 * field name is `value` - is trivially top-level valid.
 */
function childFieldFitsTopLevel(
  childInfo: {
    fieldName: string
    parent: RegisteredContainer | undefined
  },
  schema: EditorContext['schema'],
  rootTypes: Set<string>,
): boolean {
  if (!childInfo.parent) {
    // Root or text block. Text-block children (spans) are NOT
    // top-level. Discriminate by field name: root uses 'value'.
    return childInfo.fieldName === 'value'
  }

  const fieldOf = childInfo.parent.field.of

  for (const member of fieldOf) {
    const memberTypeName = acceptedTypeName(member, schema)
    if (!rootTypes.has(memberTypeName)) {
      return false
    }
  }

  return true
}

function acceptedTypeName(
  member: RegisteredContainer['field']['of'][number],
  schema: EditorContext['schema'],
): string {
  if (member.type === 'block') {
    return schema.block.name
  }
  if (member.type === 'object' && 'name' in member && member.name) {
    return member.name
  }
  return member.type
}

function sliceArray({
  context,
  blocks,
  pathPrefix,
  fieldNameInPrefix,
  startEdge,
  endEdge,
  parent,
}: {
  context: SliceContext
  blocks: ReadonlyArray<PortableTextBlock>
  pathPrefix: Path
  fieldNameInPrefix: string | undefined
  startEdge: Edge
  endEdge: Edge
  parent?: RegisteredContainer
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

    const childInfo = getNodeChildren(context, block, parent)

    if (!childInfo) {
      result.push(block)
      continue
    }

    const innerSliced = sliceArray({
      context,
      blocks: childInfo.children as Array<PortableTextBlock>,
      pathPrefix: blockPath,
      fieldNameInPrefix: childInfo.fieldName,
      startEdge: startPointForBlock,
      endEdge: endPointForBlock,
      parent: childInfo.parent,
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
