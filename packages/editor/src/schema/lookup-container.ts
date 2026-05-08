import {compareSpecificity} from '../scope/compare-specificity'
import {matchScope} from '../scope/match-scope'
import type {ParsedScope} from '../scope/parse-scope'
import type {Container, Containers} from './resolve-containers'

/**
 * Look up the registered container for a node by its scoped type name.
 *
 * Tries an exact match first, which covers all candidates the resolver
 * pre-emitted from the schema walk. If no exact match exists (e.g. the
 * data nests deeper than the resolver's bounded cycle traversal), falls
 * back to scope-pattern matching: iterates registered configs by
 * specificity and returns the first whose `parsedScope` matches the
 * runtime type chain.
 */
export function lookupContainer(
  containers: Containers,
  scopedName: string,
): Container | undefined {
  const exact = containers.get(scopedName)
  if (exact) {
    return exact
  }

  const typePath = scopedName.split('.')
  // Internal cast: the map's value is `ContainerConfig` at runtime,
  // narrowed to `Container` for public consumption. `parsedScope` is
  // present when the value was created by `resolveContainers` (the
  // production path); it may be missing on hand-built test fixtures.
  const candidates = Array.from(
    new Set(
      Array.from(containers.values()) as unknown as ReadonlyArray<
        Container & {parsedScope?: ParsedScope}
      >,
    ),
  ).filter(
    (config): config is Container & {parsedScope: ParsedScope} =>
      config.parsedScope !== undefined,
  )
  candidates.sort(
    (left, right) => -compareSpecificity(left.parsedScope, right.parsedScope),
  )

  for (const config of candidates) {
    if (matchScope(config.parsedScope, typePath)) {
      return config
    }
  }

  return undefined
}
