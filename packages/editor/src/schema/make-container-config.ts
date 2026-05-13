import type {EditorSchema} from '../editor/editor-schema'
import type {
  ContainerConfig,
  ContainerDefinition,
} from '../renderers/renderer.types'
import {resolveContainerField} from './resolve-containers'

/**
 * Build a `ContainerConfig` from a `ContainerDefinition`, resolving the
 * child field declaration against the schema.
 *
 * Intended for unit tests that drive `resolveContainers` directly without
 * going through the `ContainerPlugin` React wrapper.
 */
export function makeContainerConfig(
  schema: EditorSchema,
  container: ContainerDefinition,
): ContainerConfig {
  const field = resolveContainerField(
    schema,
    container.type,
    container.childField,
  )
  if (!field) {
    throw new Error(
      `Field "${container.childField}" not found on type "${container.type}"`,
    )
  }
  return {container, field}
}
