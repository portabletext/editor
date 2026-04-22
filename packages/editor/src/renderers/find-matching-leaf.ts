import type {LeafConfig} from '../renderers/renderer.types'
import {compareSpecificity} from '../scope/compare-specificity'
import {matchScope} from '../scope/match-scope'

/**
 * Pick the registered leaf-config whose scope best matches `typeChain`.
 *
 * When multiple configs match, the most specific wins (per JSONPath
 * specificity rules). Registration order breaks exact-duplicate ties
 * (last-wins, because the Map iteration preserves insertion order and
 * we re-consider the last match).
 */
export function findMatchingLeaf(
  leafs: ReadonlyMap<string, LeafConfig>,
  typeChain: ReadonlyArray<string>,
): LeafConfig | undefined {
  let best: LeafConfig | undefined
  for (const candidate of leafs.values()) {
    if (!matchScope(candidate.parsedScope, typeChain)) {
      continue
    }
    if (
      best === undefined ||
      compareSpecificity(candidate.parsedScope, best.parsedScope) >= 0
    ) {
      best = candidate
    }
  }
  return best
}
