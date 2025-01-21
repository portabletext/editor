import type {TypedObject} from '@sanity/types'

export function isTypedObject(object: unknown): object is TypedObject {
  return isRecord(object) && typeof object._type === 'string'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && (typeof value === 'object' || typeof value === 'function')
}
