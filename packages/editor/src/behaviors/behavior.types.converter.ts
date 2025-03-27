import type {PickFromUnion} from '../type-utils'
import {RaiseBehaviorAction} from './behavior.types.action'
// import {RaiseBehaviorAction} from './behavior.types.action'
import {Behavior, defineBehavior} from './behavior.types.behavior'
import {BehaviorEvent, ResolveBehaviorEvent} from './behavior.types.event'

// export type ConverterBehavior<
//   TSerializeGuardResponse = true,
//   TDeserializerGuardResponse = true,
// > = {
//   serialize: SerializeBehavior<TSerializeGuardResponse>
//   deserialize: DeserializeBehavior<TDeserializerGuardResponse>
// }

// export function defineConverterBehavior<
//   TSerializeGuardResponse = true,
//   TDeserializerGuardResponse = true,
// >({
//   serialize,
//   deserialize,
// }: {
//   serialize: Omit<SerializeBehavior<TSerializeGuardResponse>, 'on'>
//   deserialize: Omit<DeserializeBehavior<TDeserializerGuardResponse>, 'on'>
// }): {serialize: Behavior; deserialize: Behavior} {
//   return {
//     serialize: {
//       ...serialize,
//       on: 'serialize',
//     } as Behavior,
//     deserialize: {
//       ...deserialize,
//       on: 'deserialize',
//     } as Behavior,
//   }
// }

type X = ResolveBehaviorEvent<'serialize' | `serialize.block.${string}`>

type SerializeBehavior = Behavior<'serialize' | `serialize.block.${string}`>

export function defineSerializeBehavior<
  TBehaviorEventType extends Extract<
    BehaviorEvent['type'],
    'serialize' | `serialize.block.${string}`
  >,
  TGuardResponse = true,
  TBehaviorEvent extends ResolveBehaviorEvent<
    TBehaviorEventType,
    never
  > = ResolveBehaviorEvent<TBehaviorEventType, never>,
  TBehaviorAction extends RaiseBehaviorAction<
    ResolveBehaviorEvent<'serialization.success' | 'serialization.failure'>
  > = RaiseBehaviorAction<
    ResolveBehaviorEvent<'serialization.success' | 'serialization.failure'>
  >,
>(behavior: Behavior<TBehaviorEventType, TGuardResponse, TBehaviorEvent>) {
  return behavior as unknown as Behavior
}

// export type SerializeBehavior<TGuardResponse = true> = Behavior<
//   'serialize',
//   TGuardResponse,
//   PickFromUnion<BehaviorEvent, 'type', 'serialize'>,
//   RaiseBehaviorActionIntend<
//     PickFromUnion<
//       BehaviorEvent,
//       'type',
//       'serialization.success' | 'serialization.failure'
//     >
//   >
// >

// export type DeserializeBehavior<TGuardResponse = true> = Behavior<
//   'deserialize',
//   TGuardResponse,
//   PickFromUnion<BehaviorEvent, 'type', 'deserialize'>,
//   RaiseBehaviorActionIntend<
//     PickFromUnion<
//       BehaviorEvent,
//       'type',
//       'deserialization.success' | 'deserialization.failure'
//     >
//   >
// >
