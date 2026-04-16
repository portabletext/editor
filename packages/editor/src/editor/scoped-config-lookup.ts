/**
 * Look up a config from a Map using progressive scope specificity.
 * Tries the exact scope first, then strips one prefix at a time:
 * 'code-block.block.span' → 'block.span' → 'span'
 */
export function findByScope<T>(
  configs: Map<string, T>,
  scope: string,
): T | undefined {
  let current = scope
  while (current) {
    const config = configs.get(current)
    if (config) {
      return config
    }
    const dotIndex = current.indexOf('.')
    if (dotIndex === -1) {
      break
    }
    current = current.slice(dotIndex + 1)
  }
  return undefined
}

/**
 * Build a scoped name by prepending the container scope.
 * Returns the bare name when there is no container scope.
 */
export function buildScopedName(
  containerScope: string | undefined,
  name: string,
): string {
  return containerScope ? `${containerScope}.${name}` : name
}
