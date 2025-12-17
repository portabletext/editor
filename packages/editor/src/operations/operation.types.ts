import type {
  AbstractBehaviorEventType,
  SyntheticBehaviorEvent,
} from '../behaviors/behavior.types.event'
import type {EditorContext} from '../editor/editor-snapshot'
import type {OmitFromUnion, PickFromUnion} from '../type-utils'
import type {PortableTextSlateEditor} from '../types/slate-editor'

export type OperationContext = Pick<EditorContext, 'keyGenerator' | 'schema'>

export type OperationImplementation<TOperationType extends Operation['type']> =
  ({
    context,
    operation,
  }: {
    context: OperationContext
    operation: PickFromUnion<Operation, 'type', TOperationType>
  }) => void

export type Operation = OmitFromUnion<
  SyntheticBehaviorEvent,
  'type',
  AbstractBehaviorEventType
> & {
  editor: PortableTextSlateEditor
}

export type OperationImplementations = {
  [TOperationType in Operation['type']]: OperationImplementation<TOperationType>
}
