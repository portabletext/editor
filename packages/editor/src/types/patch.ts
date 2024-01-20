import {type Path} from '@sanity/types'

export type JSONValue = number | string | boolean | {[key: string]: JSONValue} | JSONValue[]

export type Origin = 'remote' | 'local' | 'internal'

export type IncPatch = {
  path: Path
  origin?: Origin
  type: 'inc'
  value: JSONValue
}

export type DecPatch = {
  path: Path
  origin?: Origin
  type: 'dec'
  value: JSONValue
}

export type SetPatch = {
  path: Path
  type: 'set'
  origin?: Origin
  value: JSONValue
}

export type SetIfMissingPatch = {
  path: Path
  origin?: Origin
  type: 'setIfMissing'
  value: JSONValue
}

export type UnsetPatch = {
  path: Path
  origin?: Origin
  type: 'unset'
}

export type InsertPosition = 'before' | 'after' | 'replace'

export type InsertPatch = {
  path: Path
  origin?: Origin
  type: 'insert'
  position: InsertPosition
  items: JSONValue[]
}

export type DiffMatchPatch = {
  path: Path
  type: 'diffMatchPatch'
  origin?: Origin
  value: string
}

export type Patch =
  | SetPatch
  | SetIfMissingPatch
  | UnsetPatch
  | InsertPatch
  | DiffMatchPatch
  | IncPatch
  | DecPatch
