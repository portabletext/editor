/**
 * Names for the three exclusive registration maps. A given `_type` may
 * be registered as exactly one of these.
 */
export type RegistrationKind = 'container' | 'leaf' | 'text block'

const REGISTRATION_FN: Record<RegistrationKind, string> = {
  'container': 'registerContainer',
  'leaf': 'registerLeaf',
  'text block': 'registerTextBlock',
}

/**
 * Return `true` when the given `type` is already claimed by one of the
 * three exclusive registration maps. Logs a contextual warning naming
 * the conflicting kind. The caller short-circuits its own register
 * action when this returns `true`.
 *
 * A `_type` must be exactly one of: container, leaf, or text block.
 */
export function isTypeAlreadyRegistered(
  maps: {
    containers: ReadonlyMap<string, unknown>
    leaves: ReadonlyMap<string, unknown>
    textBlocks: ReadonlyMap<string, unknown>
  },
  attempting: RegistrationKind,
  type: string,
): boolean {
  const claimed: RegistrationKind | undefined = maps.containers.has(type)
    ? 'container'
    : maps.leaves.has(type)
      ? 'leaf'
      : maps.textBlocks.has(type)
        ? 'text block'
        : undefined
  if (!claimed) {
    return false
  }
  const fn = REGISTRATION_FN[attempting]
  if (claimed === attempting) {
    const label =
      attempting === 'text block'
        ? 'Text block'
        : attempting.charAt(0).toUpperCase() + attempting.slice(1)
    console.warn(
      `${fn}: type "${type}" is already registered as a ${claimed}. ${label} not registered.`,
    )
  } else {
    console.warn(
      `${fn}: type "${type}" is already registered as a ${claimed}. A type must be exactly one of: container, leaf, text block.`,
    )
  }
  return true
}
