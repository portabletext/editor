import type {
  AbstractBehaviorEventType,
  SyntheticBehaviorEvent,
} from '../behaviors/behavior.types.event'
import type {TraversalSnapshot} from '../node-traversal/traversal-snapshot'
import type {OmitFromUnion, PickFromUnion} from '../type-utils'
import type {PortableTextEditorEngine} from '../types/editor-engine'

export type OperationSnapshot = {
  context: TraversalSnapshot['context'] & {
    keyGenerator: () => string
  }
  blockIndexMap: TraversalSnapshot['blockIndexMap']
}

export type OperationImplementation<TOperationType extends Operation['type']> =
  ({
    snapshot,
    operation,
  }: {
    snapshot: OperationSnapshot
    operation: PickFromUnion<Operation, 'type', TOperationType>
  }) => void

export type Operation = OmitFromUnion<
  SyntheticBehaviorEvent,
  'type',
  AbstractBehaviorEventType
> & {
  editor: PortableTextEditorEngine
}

export type OperationImplementations = {
  [TOperationType in Operation['type']]: OperationImplementation<TOperationType>
}
