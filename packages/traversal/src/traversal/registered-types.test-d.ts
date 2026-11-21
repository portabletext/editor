import type {PortableTextBlock, PortableTextObject} from '@portabletext/schema'
import type {Containers, TraversalSnapshot} from '../index'
import {
  getAnnotation,
  getBlock,
  getContainer,
  getContainerChildren,
  getFirstChild,
  getLastChild,
  getLeaf,
  getNodes,
  getSibling,
  getSpan,
  getText,
  getTextBlock,
  getPathSubSchema,
  hasNode,
  isBlock,
  isInline,
  comparePoints,
  rangeIntersects,
  getAncestor,
  getAncestors,
  getChildren,
  getEnclosingBlock,
  getNode,
  getParent,
} from '../index'

type TableNode = PortableTextObject & {rows: Array<RowNode>}
type RowNode = PortableTextObject & {cells: Array<CellNode>}
type CellNode = PortableTextObject & {value: Array<PortableTextBlock>}

function createTableGuards(): {
  isTable: (node: PortableTextBlock) => node is TableNode
  isRow: (node: PortableTextBlock) => node is RowNode
  isCell: (node: PortableTextBlock) => node is CellNode
} {
  return {
    isTable: (node): node is TableNode =>
      node._type === 'table' &&
      Array.isArray('rows' in node ? node['rows'] : undefined),
    isRow: (node): node is RowNode =>
      node._type === 'row' &&
      Array.isArray('cells' in node ? node['cells'] : undefined),
    isCell: (node): node is CellNode => node._type === 'cell',
  }
}

function checkRegisteredTypes(
  snapshot: TraversalSnapshot & {context: {containers: Containers}},
) {
  const {isTable, isRow, isCell} = createTableGuards()
  const table: TableNode | undefined = getAncestor(snapshot, [], {
    match: isTable,
  })?.node
  const row: RowNode | undefined = getParent(snapshot, [], {match: isRow})?.node
  const cell: CellNode | undefined = getEnclosingBlock(snapshot, [], {
    match: isCell,
  })?.node
  const nodeKey: string = getNode(snapshot, [])!.node._key
  const parentType: string = getParent(snapshot, [])!.node._type
  const childKey: string = getChildren(snapshot, [])[0]!.node._key
  const ancestorKey: string = getAncestors(snapshot, [])[0]!.node._key
  const originRow = getEnclosingBlock(snapshot, [], {match: isRow})
  const originTable = originRow
    ? getParent(snapshot, originRow.path, {match: isTable})
    : undefined
  const originCell = getEnclosingBlock(snapshot, [], {match: isCell})
  const cellRow = originCell
    ? getParent(snapshot, originCell.path, {match: isRow})
    : undefined
  const anchorTable = originCell
    ? getEnclosingBlock(snapshot, originCell.path, {match: isTable})
    : undefined
  const containerChildKey: string | undefined = getContainerChildren(
    snapshot.context.containers,
    {_key: '', _type: 'table'},
  )?.children[0]!._key
  return {
    table,
    row,
    cell,
    nodeKey,
    parentType,
    childKey,
    ancestorKey,
    originTable,
    cellRow,
    anchorTable,
    containerChildKey,
  }
}

function checkOptionalRegistry(snapshot: TraversalSnapshot) {
  return [
    getAnnotation(snapshot, []),
    getBlock(snapshot, []),
    getContainer(snapshot, []),
    getFirstChild(snapshot, []),
    getLastChild(snapshot, []),
    getLeaf(snapshot, [], {edge: 'start'}),
    getNodes(snapshot),
    getSibling(snapshot, [], {direction: 'next'}),
    getSpan(snapshot, []),
    getText(snapshot, []),
    getTextBlock(snapshot, []),
    getPathSubSchema(snapshot, []),
    hasNode(snapshot, []),
    isBlock(snapshot, []),
    isInline(snapshot, []),
    comparePoints(snapshot, {path: [], offset: 0}, {path: [], offset: 0}),
    rangeIntersects(snapshot, null, []),
    getNode(snapshot, []),
    getChildren(snapshot, []),
    getAncestors(snapshot, []),
    getAncestor(snapshot, [], {match: () => true}),
    getParent(snapshot, []),
    getEnclosingBlock(snapshot, []),
  ]
}

void checkRegisteredTypes
void checkOptionalRegistry
