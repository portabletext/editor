import type {EditorSchema} from '../editor/editor-schema'
import type {Container, ContainerConfig} from '../renderers/renderer.types'
import {parseScope} from '../scope/parse-scope'
import {resolveContainerField} from './resolve-containers'

/**
 * Build a `ContainerConfig` from a `Container` definition, parsing the scope
 * and resolving the field against the schema.
 *
 * Intended for unit tests that drive `resolveContainers` directly without
 * going through the `ContainerPlugin` React wrapper.
 */
export function makeContainerConfig(
  schema: EditorSchema,
  container: Container,
): ContainerConfig {
  const parsedScope = parseScope(container.scope)
  if (!parsedScope) {
    throw new Error(`Invalid scope: ${container.scope}`)
  }
  const field = resolveContainerField(schema, container.scope, container.field)
  if (!field) {
    throw new Error(
      `Field "${container.field}" not found on terminal type of scope "${container.scope}"`,
    )
  }
  return {container, parsedScope, field}
}
