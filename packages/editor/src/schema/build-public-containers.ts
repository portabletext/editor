import type {
  BlockObjectConfig,
  ContainerConfig,
  InlineObjectConfig,
  SpanConfig,
  TextBlockConfig,
} from '../renderers/renderer.types'
import type {
  Containers,
  RegisteredContainer,
  RegisteredPositional,
  ResolvedContainers,
} from './container-types'

/**
 * Walk the rich {@link ResolvedContainers} tree and emit the public
 * {@link Containers} map keyed by bare `_type`.
 *
 * Output preserves the positional `of` tree from each top-level
 * entry, so path-driven resolution (see `resolveContainerAt`) can
 * find same-`_type`-different-shape positional entries. The only
 * thing stripped from the rich tree is the render callback - render
 * is engine-internal and lives on `editorEngine.containers`.
 */
export function buildPublicContainers(
  resolved: ResolvedContainers,
): Containers {
  const projected = new Map<string, RegisteredContainer>()

  for (const [type, config] of resolved) {
    projected.set(type, toRegisteredContainer(config))
  }

  return projected
}

function toRegisteredContainer(config: ContainerConfig): RegisteredContainer {
  return {
    kind: 'container',
    type: config.container.type,
    field: config.field,
    ...(config.of
      ? {of: config.of.map(toRegisteredOfEntry).filter(isDefined)}
      : {}),
  }
}

function toRegisteredOfEntry(
  entry:
    | ContainerConfig
    | SpanConfig
    | BlockObjectConfig
    | InlineObjectConfig
    | TextBlockConfig,
): RegisteredContainer | RegisteredPositional | undefined {
  if ('container' in entry) {
    return toRegisteredContainer(entry)
  }
  if ('span' in entry) {
    return {kind: 'span', type: entry.span.type}
  }
  if ('blockObject' in entry) {
    return {kind: 'blockObject', type: entry.blockObject.type}
  }
  if ('inlineObject' in entry) {
    return {kind: 'inlineObject', type: entry.inlineObject.type}
  }
  // Text-block configs are not exposed on the public Containers tree -
  // they have their own `textBlocks` map on the editor context.
  return undefined
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined
}
