/**
 * Names for the registration kinds tracked by the editor's storage
 * maps. Container, text block, and span are exclusive with each other
 * AND with all leaf-shaped categories: a `_type` may be exactly one
 * of container/textBlock/span/blockObject/inlineObject when those
 * categories are mutually exclusive in the PT schema. Block-object
 * and inline-object can co-exist for the same `_type` (PT schema
 * legitimately permits a `_type` in both blockObjects and
 * inlineObjects arrays).
 */
export type RegistrationKind =
  | 'container'
  | 'textBlock'
  | 'span'
  | 'blockObject'
  | 'inlineObject'

/**
 * Return `true` when the given `type` is already claimed by an
 * exclusive registration map. Logs a contextual warning naming the
 * conflicting kind. The caller short-circuits its own register action
 * when this returns `true`.
 *
 * Exclusivity rules:
 *
 * - A `_type` registered as `container` cannot also be registered as
 *   `textBlock`, `span`, `blockObject`, or `inlineObject`.
 * - A `_type` registered as `textBlock` cannot also be registered as
 *   `container`, `span`, `blockObject`, or `inlineObject`.
 * - A `_type` registered as `span` cannot also be registered as
 *   `container`, `textBlock`, `blockObject`, or `inlineObject`.
 * - A `_type` may be registered as BOTH `blockObject` and
 *   `inlineObject` - PT schema permits the same `_type` in both
 *   `blockObjects` and `inlineObjects` arrays, with position
 *   discriminating at runtime.
 */
export function isTypeAlreadyRegistered(
  maps: {
    containers: ReadonlyMap<string, unknown>
    blockObjects: ReadonlyMap<string, unknown>
    inlineObjects: ReadonlyMap<string, unknown>
    spans: ReadonlyMap<string, unknown>
    textBlocks: ReadonlyMap<string, unknown>
  },
  attempting: RegistrationKind,
  type: string,
): boolean {
  const claimedAs = (kind: RegistrationKind): boolean => {
    switch (kind) {
      case 'container':
        return maps.containers.has(type)
      case 'textBlock':
        return maps.textBlocks.has(type)
      case 'span':
        return maps.spans.has(type)
      case 'blockObject':
        return maps.blockObjects.has(type)
      case 'inlineObject':
        return maps.inlineObjects.has(type)
    }
  }

  // Same-kind conflict. All kinds warn on duplicate re-registration.
  // blockObject+inlineObject co-existence is across DIFFERENT kinds
  // (same `_type` may be both a blockObject AND an inlineObject); it
  // does not relax the same-kind duplicate rule.
  if (claimedAs(attempting)) {
    console.warn(
      `registerNode: type "${type}" is already registered as a ${attempting}. Registration skipped.`,
    )
    return true
  }

  // Cross-kind exclusivity. blockObject and inlineObject can co-exist
  // with each other but not with container/textBlock/span. The
  // exclusive kinds (container/textBlock/span) are mutually exclusive
  // with every other kind including blockObject and inlineObject.
  const exclusiveKinds: ReadonlyArray<RegistrationKind> = [
    'container',
    'textBlock',
    'span',
  ]
  const allKinds: ReadonlyArray<RegistrationKind> = [
    'container',
    'textBlock',
    'span',
    'blockObject',
    'inlineObject',
  ]
  for (const otherKind of allKinds) {
    if (otherKind === attempting) {
      continue
    }
    // blockObject and inlineObject can co-exist, so skip that pairing.
    const bothLeafLike =
      (attempting === 'blockObject' && otherKind === 'inlineObject') ||
      (attempting === 'inlineObject' && otherKind === 'blockObject')
    if (bothLeafLike) {
      continue
    }
    // Only flag when at least one side is in the exclusive set, OR
    // when both sides are leaf-like (handled by the skip above).
    const attemptingIsExclusive = exclusiveKinds.includes(attempting)
    const otherIsExclusive = exclusiveKinds.includes(otherKind)
    if (!attemptingIsExclusive && !otherIsExclusive) {
      continue
    }
    if (claimedAs(otherKind)) {
      console.warn(
        `registerNode: type "${type}" is already registered as a ${otherKind}. A type must be exactly one of: container, textBlock, span, or co-registered as blockObject+inlineObject.`,
      )
      return true
    }
  }

  return false
}
