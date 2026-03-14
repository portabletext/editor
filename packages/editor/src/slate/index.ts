// Barrel kept for module augmentation in types/slate.ts.
// The `declare module '../slate/index'` pattern requires this file to exist
// and export the types being augmented. Downstream packages (plugin-input-rule,
// plugin-paste-link) resolve this module through project references.
export * from './create-editor'
export * from './interfaces/editor'
export * from './interfaces/element'
export * from './interfaces/location'
export * from './interfaces/node'
export * from './interfaces/operation'
export * from './interfaces/path'
export * from './interfaces/path-ref'
export * from './interfaces/point'
export * from './interfaces/point-ref'
export * from './interfaces/range'
export * from './interfaces/range-ref'
export * from './interfaces/text'
export * from './types/custom-types'
export * from './types/types'
export {isObject} from './utils/is-object'
