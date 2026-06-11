import type {PortableTextEditorEngine} from '../../types/editor-engine'
import type {OperationListener} from '../core/operation-channel'
import type {DOMEditor} from '../dom/plugin/dom-editor'
import type {Location} from './location'
import type {Node} from './node'
import type {EngineOperation} from './operation'
import type {Path} from './path'
import type {PathRef} from './path-ref'
import type {PointRef} from './point-ref'
import type {Range} from './range'
import type {RangeRef} from './range-ref'

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
  dirtyPaths: Path[]
  dirtyPathKeys: Set<string>
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
