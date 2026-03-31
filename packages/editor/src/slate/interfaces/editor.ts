import type {
  PortableTextBlock,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import type {PortableTextSlateEditor} from '../../types/slate-editor'
import type {ReactEditor} from '../react/plugin/react-editor'
import type {Location} from './location'
import type {Node} from './node'
import type {Operation} from './operation'
import type {Path} from './path'
import type {PathRef} from './path-ref'
import type {PointRef} from './point-ref'
import type {Range} from './range'
import type {RangeRef} from './range-ref'

/**
 * The `Editor` interface stores all the state of a Slate editor. It is extended
 * by plugins that wish to add their own helpers and implement new behaviors.
 */
export interface BaseEditor {
  // Core state.

  children: PortableTextBlock[]
  readonly value: PortableTextBlock[]
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
  isInline: (element: PortableTextTextBlock | PortableTextObject) => boolean
  normalizeNode: (
    entry: [Editor | Node, Path],
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

export type Editor = BaseEditor & ReactEditor & PortableTextSlateEditor

export type Selection = Range | null

export type EditorMarks = Omit<PortableTextSpan, 'text'>

/**
 * A helper type for narrowing matched nodes with a predicate.
 */

export type NodeMatch<T extends Node> =
  | ((node: Node, path: Path) => node is T)
  | ((node: Node, path: Path) => boolean)
