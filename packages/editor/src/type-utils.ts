/**
 * @internal
 */
export type PickFromUnion<
  TUnion,
  TTagKey extends keyof TUnion,
  TPickedTags extends TUnion[TTagKey],
> = TUnion extends Record<TTagKey, TPickedTags> ? TUnion : never

/**
 * @internal
 */
export type OmitFromUnion<
  TUnion,
  TTagKey extends keyof TUnion,
  TOmittedTags extends TUnion[TTagKey],
> = TUnion extends Record<TTagKey, TOmittedTags> ? never : TUnion

export type NamespaceEvent<TEvent, TNamespace extends string> = TEvent extends {
  type: infer TEventType
}
  ? {
      [K in keyof TEvent]: K extends 'type'
        ? `${TNamespace}.${TEventType & string}`
        : TEvent[K]
    }
  : never

export type StrictExtract<T, U extends T> = U
