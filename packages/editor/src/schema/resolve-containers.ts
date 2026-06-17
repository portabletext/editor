/**
 * Barrel re-export of the resolve-containers module. Split into
 * sibling files so bundlers tree-shake registration-time helpers
 * (`resolveContainerField`, `resolveContainers`,
 * `resolveNestedContainer`) out of subpath chunks that only consume
 * the runtime dispatch helpers (`descendToParent`,
 * `resolveContainerAt`, `resolveContainerByPath`).
 */

export type {
  ChildArrayField,
  Containers,
  RegisteredBlockObject,
  RegisteredContainer,
  RegisteredInlineObject,
  RegisteredPositional,
  RegisteredSpan,
  ResolvedContainers,
} from './container-types'
export {descendToParent} from './descend-to-parent'
export {resolveContainerAt} from './resolve-container-at'
export {resolveContainerByPath} from './resolve-container-by-path'
export {resolveContainerField} from './resolve-container-field'
export {resolveContainerOf} from './resolve-container-of'
export {
  resolveContainers,
  resolveContainersRich,
  resolveNestedContainer,
  resolveTextBlockConfig,
} from './resolve-containers-batch'
