/**
 * @alpha
 */
export type PickFromUnion<
  TUnion,
  TTagKey extends keyof TUnion,
  TPickedTags extends TUnion[TTagKey],
> = TUnion extends Record<TTagKey, TPickedTags> ? TUnion : never

/**
 * @alpha
 */
export type OmitFromUnion<
  TUnion,
  TTagKey extends keyof TUnion,
  TOmittedTags extends TUnion[TTagKey],
> = TUnion extends Record<TTagKey, TOmittedTags> ? never : TUnion
