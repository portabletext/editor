import type {ExtendedType} from '../types/custom-types'
import type {Element} from './element'
import type {Location} from './location'
import type {Descendant, Node, NodeEntry} from './node'
import type {Operation} from './operation'
import type {Path} from './path'
import type {PathRef} from './path-ref'
import type {PointRef} from './point-ref'
import type {Range} from './range'
import type {RangeRef} from './range-ref'
import type {Text} from './text'

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

  // Overrideable commands.

  select: (target: Location) => void
  setSelection: (props: Partial<Range>) => void
}

export type Editor = ExtendedType<'Editor', BaseEditor>

export type BaseSelection = Range | null

export type Selection = ExtendedType<'Selection', BaseSelection>

export type EditorMarks = Omit<Text, 'text'>

/**
 * A helper type for narrowing matched nodes with a predicate.
 */

export type NodeMatch<T extends Node> =
  | ((node: Node, path: Path) => node is T)
  | ((node: Node, path: Path) => boolean)
