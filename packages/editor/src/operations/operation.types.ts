import type {
  AbstractBehaviorEventType,
  SyntheticBehaviorEvent,
} from '../behaviors/behavior.types.event'
import type {TraversalSnapshot} from '../traversal/traversal-snapshot'
import type {OmitFromUnion, PickFromUnion} from '../type-utils'
import type {PortableTextEditorEngine} from '../types/editor-engine'

export type OperationSnapshot = {
  context: TraversalSnapshot['context'] & {
    keyGenerator: () => string
  }
  indexMap: TraversalSnapshot['indexMap']
}

export type OperationImplementation<
  TOperationType extends InternalOperation['type'],
> = ({
  snapshot,
  operation,
}: {
  snapshot: OperationSnapshot
  operation: PickFromUnion<InternalOperation, 'type', TOperationType>
}) => void

export type InternalOperation = OmitFromUnion<
  SyntheticBehaviorEvent,
  'type',
  AbstractBehaviorEventType
> & {
  editor: PortableTextEditorEngine
}

export type OperationImplementations = {
  [TOperationType in InternalOperation['type']]: OperationImplementation<TOperationType>
}
