import type {PortableTextEditorEngine} from '../../types/editor-engine'
import type {OperationListener} from '../core/operation-channel'
import type {DOMEditor} from '../dom/plugin/dom-editor'
import type {DirtyPathEntry} from './dirty-path-entry'
import type {Location} from './location'
import type {Node} from './node'
import type {EngineOperation} from './operation'
import type {Path} from './path'
import type {PathRef} from './path-ref'
import type {PointRef} from './point-ref'
import type {Range} from './range'
import type {RangeRef} from './range-ref'

/**
 * What the local operations before a normalization pass touched, built from
 * the dirty entries at the start of the pass, as a tree keyed by resolved
 * path segment: keyed segments for nodes with a usable `_key`, sibling
 * indices for nodes without one. `touched` marks a node the operations
 * inserted or changed, and `rightEdge` starts equal to it. `boundaries` maps
 * a child to the next sibling a removal made it adjacent to. Span merges
 * update `rightEdge` and `boundaries`, and key repairs copy a subtree to the
 * repaired node's keyed segment.
 */
export type TouchedPaths = {
  touched: boolean
  rightEdge: boolean
  children?: Map<string, TouchedPaths>
  boundaries?: Map<string, string>
}

/**
 * The `Editor` interface stores all the state of a editor. It is extended
 * by plugins that wish to add their own helpers and implement new behaviors.
 */
export interface BaseEditor {
  // Core state.

  operations: EngineOperation[]
  operationListeners: {
    before: Array<OperationListener>
    after: Array<OperationListener>
  }
  dirtyPaths: DirtyPathEntry[]
  dirtyPathKeys: Map<string, DirtyPathEntry>
  flushing: boolean
  normalizing: boolean
  pathRefs: Set<PathRef>
  pointRefs: Set<PointRef>
  rangeRefs: Set<RangeRef>

  // Overrideable core methods.

  apply: (operation: EngineOperation) => void
  normalizeNode: (
    entry: [Editor | Node, Path],
    options?: {
      operation?: EngineOperation
      touched?: TouchedPaths
    },
  ) => void
  onChange: (options?: {operation?: EngineOperation}) => void
  shouldNormalize: ({
    iteration,
    dirtyPaths,
    operation,
  }: {
    iteration: number
    initialDirtyPathsLength: number
    dirtyPaths: Path[]
    operation?: EngineOperation
  }) => boolean

  // Overrideable commands.

  select: (target: Location) => void
  setSelection: (props: Partial<Range>) => void
}

export type Editor = BaseEditor & DOMEditor & PortableTextEditorEngine
