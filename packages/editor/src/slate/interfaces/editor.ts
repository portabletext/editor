import type {PortableTextBlock, PortableTextSpan} from '@portabletext/schema'
import type {EditorSelection} from '../../types/editor'
import type {PortableTextSlateEditor} from '../../types/slate-editor'
import type {DOMEditor} from '../dom/plugin/dom-editor'
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
  selection: EditorSelection
  operations: Operation[]
  marks: EditorMarks | null
  dirtyPaths: Path[]
  dirtyPathKeys: Set<string>
  flushing: boolean
  normalizing: boolean
  pathRefs: Set<PathRef>
  pointRefs: Set<PointRef>
  rangeRefs: Set<RangeRef>

  // Overrideable core methods.

  apply: (operation: Operation) => void
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

export type Editor = BaseEditor & DOMEditor & PortableTextSlateEditor

export type EditorMarks = Omit<PortableTextSpan, 'text'>
