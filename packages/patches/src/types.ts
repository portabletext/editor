/** @public */
export declare type IndexTuple = [number | '', number | '']

/** @public */
export declare type KeyedSegment = {
  _key: string
}

/** @public */
export type PathSegment = string | number | KeyedSegment | IndexTuple

/** @public */
export type Path = PathSegment[]

/** @public */
export type JSONValue =
  | number
  | string
  | boolean
  | {[key: string]: JSONValue}
  | JSONValue[]

/** @public */
export type Origin = 'remote' | 'local' | 'internal'

/** @public */
export type IncPatch = {
  path: Path
  origin?: Origin
  type: 'inc'
  value: JSONValue
}

/** @public */
export type DecPatch = {
  path: Path
  origin?: Origin
  type: 'dec'
  value: JSONValue
}

/** @public */
export type SetPatch = {
  path: Path
  type: 'set'
  origin?: Origin
  value: JSONValue
}

/** @public */
export type SetIfMissingPatch = {
  path: Path
  origin?: Origin
  type: 'setIfMissing'
  value: JSONValue
}

/** @public */
export type UnsetPatch = {
  path: Path
  origin?: Origin
  type: 'unset'
}

/** @public */
export type InsertPosition = 'before' | 'after' | 'replace'

/** @public */
export type InsertPatch = {
  path: Path
  origin?: Origin
  type: 'insert'
  position: InsertPosition
  items: JSONValue[]
}

/** @public */
export type DiffMatchPatch = {
  path: Path
  type: 'diffMatchPatch'
  origin?: Origin
  value: string
}

/** @public */
export type Patch =
  | SetPatch
  | SetIfMissingPatch
  | UnsetPatch
  | InsertPatch
  | DiffMatchPatch
  | IncPatch
  | DecPatch
