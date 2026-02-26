import type {EditorSchema} from '../editor/editor-schema'
import {
  getDirtyPaths,
  getFragment,
  insertBreak,
  insertFragment,
  insertText,
  normalizeNode,
  shouldNormalize,
  type Editor,
  type Text,
} from './'
import {apply} from './core'
import {
  above,
  after,
  before,
  edges,
  elementReadOnly,
  end,
  first,
  fragment,
  getVoid,
  hasBlocks,
  hasInlines,
  hasPath,
  hasTexts,
  isBlock,
  isEdge,
  isEmpty,
  isEnd,
  isNormalizing,
  isStart,
  last,
  leaf,
  levels,
  marks,
  next,
  node,
  nodes,
  normalize,
  parent,
  path,
  pathRef,
  pathRefs,
  point,
  pointRef,
  pointRefs,
  positions,
  previous,
  range,
  rangeRef,
  rangeRefs,
  setNormalizing,
  shouldMergeNodesRemovePrevNode,
  start,
  string,
  unhangRange,
  withoutNormalizing,
} from './editor'
import {
  insertNodes,
  liftNodes,
  mergeNodes,
  moveNodes,
  removeNodes,
  setNodes,
  splitNodes,
  unsetNodes,
  unwrapNodes,
  wrapNodes,
} from './transforms-node'
import {
  collapse,
  deselect,
  move,
  select,
  setSelection,
} from './transforms-selection'
import {deleteText} from './transforms-text'

/**
 * Create a new Slate `Editor` object.
 *
 * The editor is built incrementally — this factory creates the base object with
 * Slate core methods, then withReact/withDOM plugins add ReactEditor and
 * PortableTextSlateEditor methods. We use `as any` for the self-referencing
 * delegates because the object doesn't satisfy `Editor` until after plugin
 * application. This file gets rewritten in the PT-native fork (Step 3).
 */
export const createEditor = (context: {
  schema: EditorSchema
  keyGenerator: () => string
}): Editor => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const e: any = {
    children: [],
    operations: [],
    selection: null,
    marks: null,
    createSpan: () =>
      ({
        _type: context.schema.span.name,
        _key: context.keyGenerator(),
        text: '',
        marks: [],
      }) as Text,
    isElementReadOnly: () => false,
    isInline: () => false,
    isSelectable: () => true,
    isVoid: () => false,
    markableVoid: () => false,
    onChange: () => {},

    // Core
    apply: (...args: any[]) => (apply as any)(e, ...args),

    // Editor
    getFragment: (...args: any[]) => (getFragment as any)(e, ...args),
    insertBreak: (...args: any[]) => (insertBreak as any)(e, ...args),
    insertFragment: (...args: any[]) => (insertFragment as any)(e, ...args),
    insertText: (...args: any[]) => (insertText as any)(e, ...args),
    normalizeNode: (...args: any[]) => (normalizeNode as any)(e, ...args),
    getDirtyPaths: (...args: any[]) => (getDirtyPaths as any)(e, ...args),
    shouldNormalize: (...args: any[]) => (shouldNormalize as any)(e, ...args),

    // Editor interface
    above: (...args: any[]) => (above as any)(e, ...args),
    after: (...args: any[]) => (after as any)(e, ...args),
    before: (...args: any[]) => (before as any)(e, ...args),
    collapse: (...args: any[]) => (collapse as any)(e, ...args),
    delete: (...args: any[]) => (deleteText as any)(e, ...args),
    deselect: (...args: any[]) => (deselect as any)(e, ...args),
    edges: (...args: any[]) => (edges as any)(e, ...args),
    elementReadOnly: (...args: any[]) => (elementReadOnly as any)(e, ...args),
    end: (...args: any[]) => (end as any)(e, ...args),
    first: (...args: any[]) => (first as any)(e, ...args),
    fragment: (...args: any[]) => (fragment as any)(e, ...args),
    getMarks: (...args: any[]) => (marks as any)(e, ...args),
    hasBlocks: (...args: any[]) => (hasBlocks as any)(e, ...args),
    hasInlines: (...args: any[]) => (hasInlines as any)(e, ...args),
    hasPath: (...args: any[]) => (hasPath as any)(e, ...args),
    hasTexts: (...args: any[]) => (hasTexts as any)(e, ...args),
    insertNodes: (...args: any[]) => (insertNodes as any)(e, ...args),
    isBlock: (...args: any[]) => (isBlock as any)(e, ...args),
    isEdge: (...args: any[]) => (isEdge as any)(e, ...args),
    isEmpty: (...args: any[]) => (isEmpty as any)(e, ...args),
    isEnd: (...args: any[]) => (isEnd as any)(e, ...args),
    isNormalizing: (...args: any[]) => (isNormalizing as any)(e, ...args),
    isStart: (...args: any[]) => (isStart as any)(e, ...args),
    last: (...args: any[]) => (last as any)(e, ...args),
    leaf: (...args: any[]) => (leaf as any)(e, ...args),
    levels: (...args: any[]) => (levels as any)(e, ...args),
    liftNodes: (...args: any[]) => (liftNodes as any)(e, ...args),
    mergeNodes: (...args: any[]) => (mergeNodes as any)(e, ...args),
    move: (...args: any[]) => (move as any)(e, ...args),
    moveNodes: (...args: any[]) => (moveNodes as any)(e, ...args),
    next: (...args: any[]) => (next as any)(e, ...args),
    node: (...args: any[]) => (node as any)(e, ...args),
    nodes: (...args: any[]) => (nodes as any)(e, ...args),
    normalize: (...args: any[]) => (normalize as any)(e, ...args),
    parent: (...args: any[]) => (parent as any)(e, ...args),
    path: (...args: any[]) => (path as any)(e, ...args),
    pathRef: (...args: any[]) => (pathRef as any)(e, ...args),
    pathRefs: (...args: any[]) => (pathRefs as any)(e, ...args),
    point: (...args: any[]) => (point as any)(e, ...args),
    pointRef: (...args: any[]) => (pointRef as any)(e, ...args),
    pointRefs: (...args: any[]) => (pointRefs as any)(e, ...args),
    positions: (...args: any[]) => (positions as any)(e, ...args),
    previous: (...args: any[]) => (previous as any)(e, ...args),
    range: (...args: any[]) => (range as any)(e, ...args),
    rangeRef: (...args: any[]) => (rangeRef as any)(e, ...args),
    rangeRefs: (...args: any[]) => (rangeRefs as any)(e, ...args),
    removeNodes: (...args: any[]) => (removeNodes as any)(e, ...args),
    select: (...args: any[]) => (select as any)(e, ...args),
    setNodes: (...args: any[]) => (setNodes as any)(e, ...args),
    setNormalizing: (...args: any[]) => (setNormalizing as any)(e, ...args),
    setSelection: (...args: any[]) => (setSelection as any)(e, ...args),
    splitNodes: (...args: any[]) => (splitNodes as any)(e, ...args),
    start: (...args: any[]) => (start as any)(e, ...args),
    string: (...args: any[]) => (string as any)(e, ...args),
    unhangRange: (...args: any[]) => (unhangRange as any)(e, ...args),
    unsetNodes: (...args: any[]) => (unsetNodes as any)(e, ...args),
    unwrapNodes: (...args: any[]) => (unwrapNodes as any)(e, ...args),
    void: (...args: any[]) => (getVoid as any)(e, ...args),
    withoutNormalizing: (...args: any[]) =>
      (withoutNormalizing as any)(e, ...args),
    wrapNodes: (...args: any[]) => (wrapNodes as any)(e, ...args),
    shouldMergeNodesRemovePrevNode: (...args: any[]) =>
      (shouldMergeNodesRemovePrevNode as any)(e, ...args),
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return e as Editor
}
