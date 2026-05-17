import type {OfDefinition} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {
  BlockObjectConfig,
  ContainerConfig,
  InlineObjectConfig,
  Container as PublicContainer,
  SpanConfig,
  TextBlock,
  TextBlockConfig,
} from '../renderers/renderer.types'
import {buildPublicContainers} from './build-public-containers'
import type {Containers, ResolvedContainers} from './container-types'
import {resolveContainerField} from './resolve-container-field'

/**
 * Test helper: resolve a list of top-level container registrations into
 * the engine's internal rich {@link ResolvedContainers} map.
 *
 * Mirrors the per-container resolution the editor machine performs on
 * `register` events, but in bulk for test setup. Throws on
 * unresolvable registrations rather than silently warning the way
 * runtime does - silent test-helper failures mask real bugs.
 */
export function resolveContainersRich(
  schema: EditorSchema,
  containers: Iterable<PublicContainer>,
): ResolvedContainers {
  const resolved: ResolvedContainers = new Map()
  for (const container of containers) {
    const config = resolveNestedContainer(schema, container, [], 'throw')
    if (!config) {
      throw new Error(
        `resolveContainers: failed to resolve container "${container.type}"`,
      )
    }
    resolved.set(container.type, config)
  }
  return resolved
}

/**
 * Test helper: resolve a list of top-level container registrations into
 * the narrow {@link Containers} map shape carried on
 * `EditorContext.containers`.
 */
export function resolveContainers(
  schema: EditorSchema,
  containers: Iterable<PublicContainer>,
): Containers {
  return buildPublicContainers(resolveContainersRich(schema, containers))
}

/**
 * Resolve a container registration into a {@link ContainerConfig},
 * pre-resolving nested `of` entries to their own ContainerConfigs (with
 * resolved `field`) and leaf-shaped config wrappers. Dispatch reads
 * pre-resolved data without re-walking the schema.
 *
 * `chain` is the list of ancestor type names (root-first) used to
 * produce a useful warning when a deeply-nested registration is
 * unresolvable.
 *
 * `onFailure`:
 *   - 'warn' (default): logs a warning and returns undefined.
 *   - 'throw': throws an Error - used by test helpers to surface
 *     authoring mistakes loudly.
 */
export function resolveNestedContainer(
  schema: EditorSchema,
  container: PublicContainer,
  chain: ReadonlyArray<string> = [],
  onFailure: 'warn' | 'throw' = 'warn',
  parentOf?: ReadonlyArray<OfDefinition>,
): ContainerConfig | undefined {
  const field = resolveContainerField(
    schema,
    container.type,
    container.arrayField,
    parentOf,
  )
  if (!field) {
    const location =
      chain.length > 0
        ? ` (nested inside ${chain.map((type) => `"${type}"`).join(' inside ')})`
        : ''
    const message = `registerNode: field "${container.arrayField}" not found on type "${container.type}"${location}. Registration skipped.`
    if (onFailure === 'throw') {
      throw new Error(message)
    }
    console.warn(message)
    return undefined
  }
  const nextChain = [...chain, container.type]
  const resolvedOf = container.of
    ? container.of.flatMap<
        ContainerConfig | BlockObjectConfig | TextBlockConfig
      >((entry) => {
        if (entry.kind === 'container') {
          const resolved = resolveNestedContainer(
            schema,
            entry,
            nextChain,
            onFailure,
            field.of,
          )
          return resolved ? [resolved] : []
        }
        if (entry.kind === 'textBlock') {
          return [resolveTextBlockConfig(entry)]
        }
        return [{blockObject: entry}]
      })
    : undefined
  return {container, field, ...(resolvedOf ? {of: resolvedOf} : {})}
}

/**
 * Resolve a TextBlock into TextBlockConfig, walking its `of` array
 * (if present) for inline-content positional overrides.
 */
export function resolveTextBlockConfig(textBlock: TextBlock): TextBlockConfig {
  const resolvedOf: ReadonlyArray<SpanConfig | InlineObjectConfig> | undefined =
    textBlock.of
      ? textBlock.of.flatMap<SpanConfig | InlineObjectConfig>((entry) => {
          if (entry.kind === 'span') {
            return [{span: entry}]
          }
          return [{inlineObject: entry}]
        })
      : undefined
  return {textBlock, ...(resolvedOf ? {of: resolvedOf} : {})}
}
