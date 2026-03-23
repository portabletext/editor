import type {Editor} from '../interfaces/editor'
import {isObject} from '../utils/is-object'

const EDITOR_BRAND = Symbol.for('slate-editor')

export function isEditor(value: unknown): value is Editor {
  return isObject(value) && (value as any)[EDITOR_BRAND] === true
}

export {EDITOR_BRAND}
