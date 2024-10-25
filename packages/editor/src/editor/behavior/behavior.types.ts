import type {KeyedSegment, PortableTextBlock} from '@sanity/types'
import type {
  EditorSelection,
  PortableTextMemberSchemaTypes,
  PortableTextSlateEditor,
} from '../../types/editor'

/**
 * @alpha
 */
export type BehaviorContext = {
  schema: PortableTextMemberSchemaTypes
  value: Array<PortableTextBlock>
  selection: NonNullable<EditorSelection>
}

/**
 * @alpha
 */
export type BehaviorEvent =
  | {
      type: 'key down'
      nativeEvent: KeyboardEvent
      editor: PortableTextSlateEditor
    }
  | {
      type: 'before insert text'
      nativeEvent: InputEvent
      editor: PortableTextSlateEditor
    }

/**
 * @alpha
 */
export type BehaviorGuard<
  TBehaviorEvent extends BehaviorEvent,
  TGuardResponse,
> = ({
  context,
  event,
}: {
  event: TBehaviorEvent
  context: BehaviorContext
}) => TGuardResponse | false

/**
 * @alpha
 */
export type BehaviorActionIntend =
  | {
      type: 'insert text'
      text: string
    }
  | {
      type: 'insert text block'
      decorators: Array<string>
    }
  | {
      type: 'apply block style'
      paths: Array<[KeyedSegment]>
      style: string
    }
  | {
      type: 'delete text'
      selection: NonNullable<EditorSelection>
    }

/**
 * @alpha
 */
export type BehaviorAction = BehaviorActionIntend & {
  editor: PortableTextSlateEditor
}

/**
 * @alpha
 */
export type Behavior<
  TBehaviorEventType extends BehaviorEvent['type'] = BehaviorEvent['type'],
  TGuardResponse = true,
> = {
  on: TBehaviorEventType
  guard?: BehaviorGuard<
    PickFromUnion<BehaviorEvent, 'type', TBehaviorEventType>,
    TGuardResponse
  >
  actions: Array<RaiseBehaviorActionIntend<TBehaviorEventType, TGuardResponse>>
}

/**
 * @alpha
 */
export type RaiseBehaviorActionIntend<
  TBehaviorEventType extends BehaviorEvent['type'] = BehaviorEvent['type'],
  TGuardResponse = true,
> = (
  {
    context,
    event,
  }: {
    context: BehaviorContext
    event: PickFromUnion<BehaviorEvent, 'type', TBehaviorEventType>
  },
  guardResponse: TGuardResponse,
) => BehaviorActionIntend | void

/**
 * @alpha
 */
export function defineBehavior<
  TBehaviorEventType extends BehaviorEvent['type'],
  TGuardResponse = true,
>(behavior: Behavior<TBehaviorEventType, TGuardResponse>): Behavior {
  return behavior as unknown as Behavior
}

/**
 * @alpha
 */
export type PickFromUnion<
  TUnion,
  TTagKey extends keyof TUnion,
  TPickedTags extends TUnion[TTagKey],
> = TUnion extends Record<TTagKey, TPickedTags> ? TUnion : never
