import type {
  Behavior,
  BehaviorEvent,
  RaiseBehaviorActionIntend,
} from '../behaviors/behavior.types'
import type {PickFromUnion} from '../type-utils'

export type ConverterBehavior<
  TSerializeGuardResponse = true,
  TDeserializerGuardResponse = true,
> = {
  serialize: SerializeBehavior<TSerializeGuardResponse>
  deserialize: DeserializeBehavior<TDeserializerGuardResponse>
}

export function defineConverterBehavior<
  TSerializeGuardResponse = true,
  TDeserializerGuardResponse = true,
>({
  serialize,
  deserialize,
}: {
  serialize: Omit<SerializeBehavior<TSerializeGuardResponse>, 'on'>
  deserialize: Omit<DeserializeBehavior<TDeserializerGuardResponse>, 'on'>
}): {serialize: Behavior; deserialize: Behavior} {
  return {
    serialize: {
      ...serialize,
      on: 'serialize',
    } as Behavior,
    deserialize: {
      ...deserialize,
      on: 'deserialize',
    } as Behavior,
  }
}

export type SerializeBehavior<TGuardResponse = true> = Behavior<
  'serialize',
  TGuardResponse,
  PickFromUnion<BehaviorEvent, 'type', 'serialize'>,
  RaiseBehaviorActionIntend<
    PickFromUnion<
      BehaviorEvent,
      'type',
      'serialization.success' | 'serialization.failure'
    >
  >
>

export type DeserializeBehavior<TGuardResponse = true> = Behavior<
  'deserialize',
  TGuardResponse,
  PickFromUnion<BehaviorEvent, 'type', 'deserialize'>,
  RaiseBehaviorActionIntend<
    PickFromUnion<
      BehaviorEvent,
      'type',
      'deserialization.success' | 'deserialization.failure'
    >
  >
>
