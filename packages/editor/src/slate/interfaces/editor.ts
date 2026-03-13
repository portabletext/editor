import type {
  Descendant,
  Element,
  ExtendedType,
  Node,
  NodeEntry,
  Operation,
  Path,
  PathRef,
  PointRef,
  Range,
  RangeRef,
  Text,
} from '..'

/**
 * The `Editor` interface stores all the state of a Slate editor. It is extended
 * by plugins that wish to add their own helpers and implement new behaviors.
 */
export interface BaseEditor {
  // Core state.

  children: Descendant[]
  selection: Selection
  operations: Operation[]
  marks: EditorMarks | null
  dirtyPaths: Path[]
  dirtyPathKeys: Set<string>
  flushing: boolean
  normalizing: boolean
  batchingDirtyPaths: boolean
  pathRefs: Set<PathRef>
  pointRefs: Set<PointRef>
  rangeRefs: Set<RangeRef>

  // Overrideable core methods.

  apply: (operation: Operation) => void
  createSpan: () => Text
  getDirtyPaths: (operation: Operation) => Path[]
  isElementReadOnly: (element: Element) => boolean
  isInline: (element: Element) => boolean
  isSelectable: (element: Element) => boolean
  normalizeNode: (
    entry: NodeEntry,
    options?: {
      operation?: Operation
    },
  ) => void
  onChange: (options?: {operation?: Operation}) => void
  shouldNormalize: ({
    iteration,
    dirtyPaths,
    operation,
  }: {
    iteration: number
    initialDirtyPathsLength: number
    dirtyPaths: Path[]
    operation?: Operation
  }) => boolean
}

export type Editor = ExtendedType<'Editor', BaseEditor>

export type BaseSelection = Range | null

export type Selection = ExtendedType<'Selection', BaseSelection>

export type EditorMarks = Omit<Text, 'text'>

export interface EditorInterface {
  isElementReadOnly: (editor: Editor, element: Element) => boolean

  isInline: (editor: Editor, value: Element) => boolean

  isSelectable: (editor: Editor, element: Element) => boolean
}

// eslint-disable-next-line no-redeclare
export const Editor: EditorInterface = {
  isElementReadOnly(editor, element) {
    return editor.isElementReadOnly(element)
  },

  isInline(editor, value) {
    return editor.isInline(value)
  },

  isSelectable(editor: Editor, value: Element) {
    return editor.isSelectable(value)
  },
}

/**
 * A helper type for narrowing matched nodes with a predicate.
 */

export type NodeMatch<T extends Node> =
  | ((node: Node, path: Path) => node is T)
  | ((node: Node, path: Path) => boolean)

export type PropsCompare = (prop: Partial<Node>, node: Partial<Node>) => boolean
export type PropsMerge = (prop: Partial<Node>, node: Partial<Node>) => object
